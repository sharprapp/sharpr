const express = require('express');
const router  = express.Router();
const supabase = require('../lib/supabase');
const { optionalAuth } = require('../middleware/auth');

// ── Content moderation ──────────────────────────────────────────────────────
const BAD_WORDS = [
  'fuck','shit','bitch','cunt','cock','pussy','asshole','bastard',
  'nigger','nigga','faggot','kike','spic','chink','retard',
  'kill yourself','kys','die bitch','rape','molest',
];

function sanitize(str) {
  return (str || '').replace(/<[^>]*>/g, '').trim();
}

function isClean(text) {
  const lower = text.toLowerCase();
  return !BAD_WORDS.some(w =>
    w.includes(' ') ? lower.includes(w) : new RegExp(`\\b${w}\\b`).test(lower)
  );
}

// ── GET /api/community/trending ─────────────────────────────────────────────
router.get('/trending', async (req, res) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('is_flagged', false)
    .gte('created_at', since)
    .order('upvotes', { ascending: false })
    .limit(5);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// ── GET /api/community/verified-users ───────────────────────────────────────
router.get('/verified-users', async (req, res) => {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, created_at');
  if (error) return res.status(500).json({ error: error.message });

  const ids = profiles.map(p => p.id);
  const { data: postRows } = await supabase
    .from('posts').select('user_id').in('user_id', ids);

  const counts = {};
  (postRows || []).forEach(r => { counts[r.user_id] = (counts[r.user_id] || 0) + 1; });

  const users = profiles
    .map(p => ({
      id: p.id,
      username: p.email?.split('@')[0] || 'user',
      postCount: counts[p.id] || 0,
      joinDate: p.created_at,
    }))
    .sort((a, b) => b.postCount - a.postCount);

  res.json(users);
});

// ── GET /api/community/posts?channel=trading&sort=new&page=0 ────────────────
router.get('/posts', async (req, res) => {
  const { channel = 'trading', sort = 'new', page = 0 } = req.query;
  const VALID = ['trading', 'polymarket', 'betting', 'news'];
  if (!VALID.includes(channel)) return res.status(400).json({ error: 'Invalid channel' });

  const limit = 25;
  const offset = parseInt(page) * limit;

  let q = supabase
    .from('posts')
    .select('*')
    .eq('channel', channel)
    .eq('is_flagged', false)
    .range(offset, offset + limit - 1);

  q = sort === 'top'
    ? q.order('upvotes', { ascending: false })
    : q.order('created_at', { ascending: false });

  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// ── POST /api/community/posts ────────────────────────────────────────────────
router.post('/posts', optionalAuth, async (req, res) => {
  const { channel, display_name, content, device_id } = req.body;
  const VALID = ['trading', 'polymarket', 'betting', 'news'];

  if (!channel || !VALID.includes(channel))
    return res.status(400).json({ error: 'Valid channel required' });

  const name = sanitize(display_name);
  const body = sanitize(content);

  if (!name || name.length < 2 || name.length > 30)
    return res.status(400).json({ error: 'Display name must be 2–30 characters' });
  if (!body || body.length < 2 || body.length > 1000)
    return res.status(400).json({ error: 'Post must be 2–1000 characters' });
  if (!isClean(name) || !isClean(body))
    return res.status(400).json({ error: 'Content violates community guidelines' });

  const { data, error } = await supabase
    .from('posts')
    .insert({ channel, display_name: name, user_id: req.user?.id || null, content: body, device_id: device_id || null })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// ── GET /api/community/posts/:id (with replies) ──────────────────────────────
router.get('/posts/:id', async (req, res) => {
  const { data: post, error } = await supabase
    .from('posts').select('*').eq('id', req.params.id).single();
  if (error || !post) return res.status(404).json({ error: 'Post not found' });

  const { data: replies } = await supabase
    .from('replies').select('*').eq('post_id', req.params.id).order('created_at', { ascending: true });

  res.json({ ...post, replies: replies || [] });
});

// ── POST /api/community/posts/:id/reply ──────────────────────────────────────
router.post('/posts/:id/reply', optionalAuth, async (req, res) => {
  const name = sanitize(req.body.display_name);
  const body = sanitize(req.body.content);

  if (!name || name.length < 2) return res.status(400).json({ error: 'Name required' });
  if (!body || body.length < 2 || body.length > 500)
    return res.status(400).json({ error: 'Reply must be 2–500 characters' });
  if (!isClean(name) || !isClean(body))
    return res.status(400).json({ error: 'Content violates community guidelines' });

  const { data, error } = await supabase
    .from('replies')
    .insert({ post_id: req.params.id, display_name: name, user_id: req.user?.id || null, content: body })
    .select().single();

  if (error) return res.status(500).json({ error: error.message });

  await supabase.rpc('increment_reply_count', { post_id: req.params.id });
  res.status(201).json(data);
});

// ── POST /api/community/posts/:id/upvote ─────────────────────────────────────
router.post('/posts/:id/upvote', async (req, res) => {
  const { error } = await supabase.rpc('increment_post_upvotes', { post_id: req.params.id });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ── POST /api/community/replies/:id/upvote ───────────────────────────────────
router.post('/replies/:id/upvote', async (req, res) => {
  const { error } = await supabase.rpc('increment_reply_upvotes', { reply_id: req.params.id });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ── POST /api/community/posts/:id/report ─────────────────────────────────────
router.post('/posts/:id/report', async (req, res) => {
  const reason = sanitize(req.body.reason || 'inappropriate').slice(0, 100);

  await supabase.from('post_reports').insert({ post_id: req.params.id, reason });

  // Auto-flag after 3 reports
  const { count } = await supabase
    .from('post_reports').select('*', { count: 'exact', head: true }).eq('post_id', req.params.id);
  if (count >= 3) {
    await supabase.from('posts').update({ is_flagged: true }).eq('id', req.params.id);
  }

  res.json({ reported: true });
});

// ── GET /api/community/leaderboard ───────────────────────────────────────────
// Returns top users with journal_public=true from profiles + aggregated trade stats
router.get('/leaderboard', async (req, res) => {
  try {
    // Try to get profiles with public journals + trade stats
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .eq('journal_public', true)
      .limit(20);

    if (!profiles || profiles.length === 0) {
      return res.json([]); // frontend falls back to mock data
    }

    // For each profile, aggregate their trades
    const leaders = await Promise.all(profiles.map(async (p, idx) => {
      const { data: trades } = await supabase
        .from('trades').select('status,pnl').eq('user_id', p.id);
      const { data: bets } = await supabase
        .from('bets').select('result,pnl,sport').eq('user_id', p.id);

      const allItems = [...(trades||[]).map(t => ({result: t.status, pnl: t.pnl})), ...(bets||[]).map(b => ({result: b.result, pnl: b.pnl}))];
      const settled = allItems.filter(i => i.result !== 'open' && i.result !== 'pending');
      const wins    = settled.filter(i => i.result === 'win');
      const pnl     = settled.reduce((s, i) => s + (i.pnl || 0), 0);
      const wr      = settled.length ? Math.round(wins.length / settled.length * 100) : 0;
      const topBet  = settled.sort((a,b) => (b.pnl||0)-(a.pnl||0))[0];
      const topSport = bets?.length ? (bets.sort((a,b)=>(b.pnl||0)-(a.pnl||0))[0]?.sport || 'Trading') : 'Trading';

      return {
        rank: idx + 1,
        username: p.display_name || p.username || 'User',
        sport: topSport,
        wins: wins.length,
        losses: settled.length - wins.length,
        pnl: Math.round(pnl * 100) / 100,
        wr,
        badge: idx === 0 ? '🏆' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null,
        bestBet: topBet ? `+$${(topBet.pnl||0).toFixed(0)}` : '—',
      };
    }));

    res.json(leaders.sort((a, b) => b.pnl - a.pnl).map((u, i) => ({ ...u, rank: i + 1, badge: i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : null })));
  } catch (e) {
    console.error('Leaderboard error:', e.message);
    res.json([]); // frontend falls back to mock data
  }
});

module.exports = router;
