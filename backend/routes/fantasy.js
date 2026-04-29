const express = require('express');
const router = express.Router();
const axios = require('axios');
const anthropic = require('../lib/anthropic');
const { requireAuth } = require('../middleware/auth');
const supabase = require('../lib/supabase');

const FREE_DAILY_LIMIT = 5;

// ESPN player search
router.get('/player', requireAuth, async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.status(400).json({ error: 'Query too short' });
  try {
    const { data } = await axios.get('https://site.api.espn.com/apis/common/v3/search', {
      params: { query: q, limit: 8, type: 'player', sport: 'football', league: 'nfl' },
      timeout: 5000,
    });
    const contents = data.results?.find(r => r.type === 'player')?.contents || [];
    const players = contents.map(p => {
      const desc = p.description || '';
      const [pos, team] = desc.split(' - ').map(s => s.trim());
      return {
        id: p.id,
        name: p.displayName || p.description,
        position: pos || '',
        team: team || '',
        headshot: `https://a.espncdn.com/i/headshots/nfl/players/full/${p.id}.png`,
      };
    });
    res.json({ players });
  } catch (err) {
    console.error('[fantasy] player search error:', err.message);
    res.status(500).json({ error: 'Player search failed', players: [] });
  }
});

const WALTER_SYSTEM_PROMPT = `You are Walter, a sharp fantasy football analyst with deep knowledge of NFL player trends, usage rates, target shares, injury reports, and matchup data. You give direct, confident recommendations — not hedged non-answers. Always lead with a clear recommendation (Start X, Take the trade, Pick up X), then support it with 2-3 concise analytical reasons. Use fantasy-relevant stats and terminology. Keep responses under 200 words unless complexity requires more. Never use generic disclaimers.`;

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
    await supabase
      .from('fantasy_usage')
      .update({ count: existing.count + 1 })
      .eq('user_id', userId)
      .eq('date', today);
    return existing.count + 1;
  } else {
    await supabase
      .from('fantasy_usage')
      .insert({ user_id: userId, date: today, count: 1 });
    return 1;
  }
}

router.post('/chat', requireAuth, async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message required' });

  const isPro = req.tier === 'pro' || req.tier === 'elite';

  if (!isPro) {
    const used = await getUsageToday(req.user.id);
    if (used >= FREE_DAILY_LIMIT) {
      return res.status(429).json({
        error: `Daily limit reached (${FREE_DAILY_LIMIT}/day on free plan)`,
        limitHit: true,
        usageRemaining: 0,
      });
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
