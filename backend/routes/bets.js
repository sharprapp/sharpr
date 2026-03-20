const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');
const { TIER_LIMITS } = require('../lib/stripe');

function americanPayout(odds, stake) {
  const o = parseInt(odds);
  if (isNaN(o)) return 0;
  return o > 0 ? stake * (o / 100) : stake * (100 / Math.abs(o));
}

router.get('/', requireAuth, async (req, res) => {
  const { sport } = req.query;
  let query = supabase.from('bets').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false });
  if (sport) query = query.eq('sport', sport);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', requireAuth, async (req, res) => {
  if (req.tier === 'free') {
    const { count } = await supabase
      .from('bets').select('*', { count: 'exact', head: true }).eq('user_id', req.user.id);
    if (count >= TIER_LIMITS.free.bet_entries) {
      return res.status(403).json({ error: 'Bet entry limit reached', upgrade: true });
    }
  }

  const { sport, type, match, odds, stake, result, notes } = req.body;
  if (!match || !odds || !stake) return res.status(400).json({ error: 'match, odds, stake required' });

  const to_win = parseFloat(americanPayout(odds, stake).toFixed(2));
  const pnl = result === 'win' ? to_win : result === 'loss' ? -parseFloat(stake) : result === 'push' ? 0 : null;

  const { data, error } = await supabase
    .from('bets')
    .insert({ user_id: req.user.id, sport, type, match, odds, stake: parseFloat(stake), to_win, result: result || 'pending', notes, pnl })
    .select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.patch('/:id', requireAuth, async (req, res) => {
  const { result, notes } = req.body;
  const { data: existing } = await supabase.from('bets').select('*').eq('id', req.params.id).eq('user_id', req.user.id).single();
  if (!existing) return res.status(404).json({ error: 'Bet not found' });

  const pnl = result === 'win' ? existing.to_win : result === 'loss' ? -existing.stake : result === 'push' ? 0 : null;
  const { data, error } = await supabase
    .from('bets').update({ result, notes: notes ?? existing.notes, pnl }).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await supabase.from('bets').delete().eq('id', req.params.id).eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ deleted: true });
});

router.get('/stats', requireAuth, async (req, res) => {
  const { data } = await supabase.from('bets').select('*').eq('user_id', req.user.id);
  if (!data) return res.json({});
  const settled = data.filter(b => b.result !== 'pending');
  const wins = settled.filter(b => b.result === 'win');
  const totalStaked = settled.reduce((s, b) => s + b.stake, 0);
  const totalPnl = settled.reduce((s, b) => s + (b.pnl || 0), 0);
  const bySport = {};
  ['NFL','NBA','MLB','Soccer','UFC'].forEach(sp => {
    const s = settled.filter(b => b.sport === sp);
    bySport[sp] = { bets: s.length, pnl: parseFloat(s.reduce((sum, b) => sum + (b.pnl || 0), 0).toFixed(2)) };
  });
  res.json({
    total: data.length, settled: settled.length,
    wins: wins.length, losses: settled.filter(b => b.result === 'loss').length,
    win_rate: settled.length ? Math.round(wins.length / settled.length * 100) : 0,
    total_pnl: parseFloat(totalPnl.toFixed(2)),
    roi: totalStaked ? parseFloat((totalPnl / totalStaked * 100).toFixed(1)) : 0,
    by_sport: bySport
  });
});

module.exports = router;
