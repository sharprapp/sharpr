const express = require('express');
const router = express.Router();
const axios = require('axios');
const anthropic = require('../lib/anthropic');
const { requireAuth } = require('../middleware/auth');
const supabase = require('../lib/supabase');

const FREE_DAILY_LIMIT = 5;

// ── Sleeper player cache (24h) ───────────────────────────────────────────────
let _sleeperPlayers = null;
let _sleeperAt = 0;
const SLEEPER_TTL = 24 * 60 * 60 * 1000;
const SKILL_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE', 'K', 'DEF']);

async function getSleeperPlayers() {
  if (_sleeperPlayers && Date.now() - _sleeperAt < SLEEPER_TTL) return _sleeperPlayers;
  const { data } = await axios.get('https://api.sleeper.app/v1/players/nfl', { timeout: 20000 });
  _sleeperPlayers = Object.values(data)
    .filter(p => p.active && p.full_name && SKILL_POSITIONS.has(p.position))
    .map(p => ({
      id: p.player_id,
      name: p.full_name,
      position: p.position,
      team: p.team || 'FA',
      number: p.number || null,
      injuryStatus: p.injury_status || null,
      yearsExp: p.years_exp || 0,
      headshot: `https://sleepercdn.com/content/nfl/players/${p.player_id}.jpg`,
    }))
    .sort((a, b) => b.yearsExp - a.yearsExp); // veteran-first ordering
  _sleeperAt = Date.now();
  console.log(`[fantasy] Sleeper cache loaded: ${_sleeperPlayers.length} players`);
  return _sleeperPlayers;
}

// ── ESPN team cache (6h) ─────────────────────────────────────────────────────
let _espnTeams = null;
let _espnTeamsAt = 0;

async function getESPNTeams() {
  if (_espnTeams && Date.now() - _espnTeamsAt < 6 * 60 * 60 * 1000) return _espnTeams;
  const { data } = await axios.get(
    'https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams',
    { timeout: 8000 }
  );
  _espnTeams = (data.sports?.[0]?.leagues?.[0]?.teams || []).map(t => ({
    id: t.team.id,
    abbr: t.team.abbreviation,
    name: t.team.displayName,
    shortName: t.team.shortDisplayName,
    logo: t.team.logos?.[0]?.href || null,
    color: `#${t.team.color || '6C63FF'}`,
  }));
  _espnTeamsAt = Date.now();
  return _espnTeams;
}

// ── GET /api/fantasy/players?q= ──────────────────────────────────────────────
router.get('/players', requireAuth, async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.status(400).json({ error: 'Query too short' });
  try {
    const all = await getSleeperPlayers();
    const lo = q.toLowerCase();
    const results = all
      .filter(p => p.name.toLowerCase().includes(lo))
      .slice(0, 10);
    res.json({ players: results });
  } catch (err) {
    console.error('[fantasy] players search error:', err.message);
    res.status(500).json({ error: 'Search failed', players: [] });
  }
});

// ── GET /api/fantasy/trending ────────────────────────────────────────────────
router.get('/trending', requireAuth, async (req, res) => {
  try {
    const [{ data: raw }, all] = await Promise.all([
      axios.get('https://api.sleeper.app/v1/players/nfl/trending/add?lookback_hours=24&limit=20', { timeout: 8000 }),
      getSleeperPlayers(),
    ]);
    const map = {};
    all.forEach(p => { map[p.id] = p; });
    const trending = raw
      .map(t => map[t.player_id] ? { ...map[t.player_id], addCount: t.count } : null)
      .filter(Boolean)
      .slice(0, 12);
    res.json({ trending });
  } catch (err) {
    console.error('[fantasy] trending error:', err.message);
    res.status(500).json({ error: 'Trending unavailable', trending: [] });
  }
});

// ── GET /api/fantasy/projections?season=&week= ───────────────────────────────
router.get('/projections', requireAuth, async (req, res) => {
  const season = req.query.season || new Date().getFullYear();
  const week = req.query.week || 1;
  try {
    const { data } = await axios.get(
      `https://api.sleeper.app/v1/projections/nfl/regular/${season}/${week}`,
      { timeout: 10000 }
    );
    res.json({ projections: data, season, week });
  } catch (err) {
    console.error('[fantasy] projections error:', err.message);
    res.status(500).json({ error: 'Projections unavailable', projections: {} });
  }
});

// ── GET /api/fantasy/teams ───────────────────────────────────────────────────
router.get('/teams', requireAuth, async (req, res) => {
  try {
    const teams = await getESPNTeams();
    res.json({ teams });
  } catch (err) {
    console.error('[fantasy] teams error:', err.message);
    res.status(500).json({ error: 'Teams unavailable', teams: [] });
  }
});

// ── GET /api/fantasy/roster?team= ───────────────────────────────────────────
// Returns full roster for an ESPN team abbreviation from Sleeper cache
router.get('/roster', requireAuth, async (req, res) => {
  const { team } = req.query;
  if (!team) return res.status(400).json({ error: 'Team required' });
  try {
    const all = await getSleeperPlayers();
    const roster = all.filter(p => p.team?.toLowerCase() === team.toLowerCase());
    res.json({ roster });
  } catch (err) {
    console.error('[fantasy] roster error:', err.message);
    res.status(500).json({ error: 'Roster unavailable', roster: [] });
  }
});

// ── Walter system prompt ─────────────────────────────────────────────────────
const WALTER_SYSTEM_PROMPT = `You are Walter, a sharp fantasy football analyst with deep knowledge of NFL player trends, usage rates, target shares, injury reports, and matchup data. You give direct, confident recommendations — not hedged non-answers. Always lead with a clear recommendation (Start X, Take the trade, Pick up X), then support it with 2-3 concise analytical reasons. Use fantasy-relevant stats and terminology. Keep responses under 200 words unless complexity requires more. Never use generic disclaimers.`;

// ── Usage helpers ────────────────────────────────────────────────────────────
async function getUsageToday(userId) {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('fantasy_usage')
    .select('count')
    .eq('user_id', userId)
    .eq('date', today)
    .single();
  return data?.count || 0;
}

async function upsertUsage(userId) {
  const today = new Date().toISOString().split('T')[0];
  const { data: existing } = await supabase
    .from('fantasy_usage')
    .select('count')
    .eq('user_id', userId)
    .eq('date', today)
    .single();
  if (existing) {
    await supabase.from('fantasy_usage').update({ count: existing.count + 1 }).eq('user_id', userId).eq('date', today);
    return existing.count + 1;
  }
  await supabase.from('fantasy_usage').insert({ user_id: userId, date: today, count: 1 });
  return 1;
}

// ── POST /api/fantasy/chat ───────────────────────────────────────────────────
router.post('/chat', requireAuth, async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message required' });

  const isPro = req.tier === 'pro' || req.tier === 'elite';
  if (!isPro) {
    const used = await getUsageToday(req.user.id);
    if (used >= FREE_DAILY_LIMIT) {
      return res.status(429).json({ error: `Daily limit reached`, limitHit: true, usageRemaining: 0 });
    }
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: WALTER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: message.trim() }],
    });
    const reply = response.content.filter(b => b.type === 'text').map(b => b.text).join('');
    let usageRemaining = null;
    if (!isPro) {
      const newCount = await upsertUsage(req.user.id);
      usageRemaining = Math.max(0, FREE_DAILY_LIMIT - newCount);
    }
    res.json({ reply, usageRemaining });
  } catch (err) {
    console.error('[fantasy] chat error:', err.message);
    res.status(500).json({ error: 'AI query failed' });
  }
});

module.exports = router;
