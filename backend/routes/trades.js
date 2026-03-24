const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');
const { TIER_LIMITS } = require('../lib/stripe');

// GET all trades for user
router.get('/', requireAuth, async (req, res) => {
  console.log('[trades GET] user:', req.user?.id);
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST new trade
router.post('/', requireAuth, async (req, res) => {
  console.log('[trades POST] user:', req.user?.id, 'tier:', req.tier, 'body:', req.body);

  // Check entry limit for free users
  if (req.tier === 'free') {
    const { count } = await supabase
      .from('trades')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    console.log('[trades POST] free tier count:', count, 'limit:', TIER_LIMITS.free.trade_entries);
    if (count >= TIER_LIMITS.free.trade_entries) {
      return res.status(403).json({
        error: 'Trade entry limit reached',
        upgrade: true,
        message: `Free plan allows ${TIER_LIMITS.free.trade_entries} trades. Upgrade for unlimited.`
      });
    }
  }

  const { ticker, direction, entry, exit, qty, setup, status, notes, multiplier, pnl: rawPnl } = req.body;
  if (!ticker || !direction || !entry || !qty) {
    return res.status(400).json({ error: 'ticker, direction, entry, qty required' });
  }

  // P&L is manually entered by user — no auto-calculation
  const pnl = rawPnl != null && rawPnl !== '' ? parseFloat(rawPnl) : null;
  // Manual status always takes priority; only auto-detect from P&L if status is 'open' or missing
  const finalStatus = (status && status !== 'open')
    ? status
    : pnl != null ? (pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'be') : (status || 'open');

  const insertPayload = {
    user_id: req.user.id,
    ticker: ticker.toUpperCase(),
    direction, entry: parseFloat(entry), exit: exit ? parseFloat(exit) : null, qty: parseFloat(qty), multiplier: parseFloat(multiplier) || 1, setup,
    status: finalStatus,
    notes, pnl: pnl != null ? Math.round(pnl * 100) / 100 : null
  };
  console.log('[trades POST] inserting:', insertPayload);

  const { data, error } = await supabase
    .from('trades')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.error('[trades POST] Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }
  console.log('[trades POST] success, id:', data?.id);
  res.status(201).json(data);
});

// PATCH update trade (e.g. set exit price, mark win/loss)
router.patch('/:id', requireAuth, async (req, res) => {
  const { exit, status, notes } = req.body;

  const { data: existing } = await supabase
    .from('trades').select('*').eq('id', req.params.id).eq('user_id', req.user.id).single();
  if (!existing) return res.status(404).json({ error: 'Trade not found' });

  const { pnl: rawPnl } = req.body;
  const newExit = exit ?? existing.exit;
  // P&L validation — reject NaN
  if (rawPnl != null && rawPnl !== '' && isNaN(parseFloat(rawPnl))) {
    return res.status(400).json({ error: 'P&L must be a valid number' });
  }
  const pnl = rawPnl != null && rawPnl !== '' ? Math.round(parseFloat(rawPnl) * 100) / 100 : (rawPnl === '' ? null : existing.pnl);
  // Manual status takes priority; only auto-detect from P&L if status not explicitly set
  const newStatus = (status && status !== existing.status) ? status : pnl != null ? (pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'be') : (status ?? existing.status);

  const { data, error } = await supabase
    .from('trades')
    .update({ exit: newExit, status: newStatus, notes: notes ?? existing.notes, pnl })
    .eq('id', req.params.id)
    .select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE trade
router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await supabase
    .from('trades')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ deleted: true });
});

// GET stats summary
router.get('/stats', requireAuth, async (req, res) => {
  const { data } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', req.user.id);

  if (!data) return res.json({});
  const closed = data.filter(t => t.status !== 'open');
  const wins = closed.filter(t => t.status === 'win');
  const totalPnl = closed.reduce((s, t) => s + (t.pnl || 0), 0);

  res.json({
    total: data.length,
    closed: closed.length,
    wins: wins.length,
    losses: closed.filter(t => t.status === 'loss').length,
    win_rate: closed.length ? Math.round(wins.length / closed.length * 100) : 0,
    total_pnl: parseFloat(totalPnl.toFixed(2)),
    avg_winner: wins.length ? parseFloat((wins.reduce((s, t) => s + t.pnl, 0) / wins.length).toFixed(2)) : 0
  });
});

module.exports = router;
