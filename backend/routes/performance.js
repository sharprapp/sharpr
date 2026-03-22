const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');
const { analyzeAll } = require('../lib/performanceAnalysis');

const cache = new Map();

router.get('/insights', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const cacheKey = `perf_${userId}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < 3600000) return res.json(cached.data);

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

    const [betsRes, tradesRes] = await Promise.all([
      supabase.from('bets').select('*').eq('user_id', userId).gte('created_at', thirtyDaysAgo),
      supabase.from('trades').select('*').eq('user_id', userId).gte('created_at', thirtyDaysAgo),
    ]);

    const bets = betsRes.data || [];
    const trades = tradesRes.data || [];
    const insights = analyzeAll(bets, trades);

    // Summary stats
    const allSettled = [...bets.filter(b => b.result !== 'pending'), ...trades.filter(t => t.status !== 'open')];
    const wins = allSettled.filter(r => r.result === 'win' || r.status === 'win').length;
    const totalPnl = allSettled.reduce((s, r) => s + (r.pnl || 0), 0);

    const result = {
      insights,
      summary: {
        totalBets: bets.length,
        totalTrades: trades.length,
        settled: allSettled.length,
        winRate: allSettled.length ? Math.round(wins / allSettled.length * 100) : 0,
        totalPnl: Math.round(totalPnl * 100) / 100,
        period: '30 days',
      },
      generatedAt: new Date().toISOString(),
    };

    // AI coaching for Pro users
    if ((req.tier === 'pro' || req.tier === 'elite') && insights.length >= 2) {
      try {
        const anthropic = require('../lib/anthropic');
        const prompt = `Based on these betting/trading patterns:\n${insights.map(i => `- ${i.message}`).join('\n')}\n\nGive 3 specific, actionable recommendations to improve profitability. Be direct and specific, not generic. Max 2 sentences each. Return as JSON array: ["rec1","rec2","rec3"]`;
        const msg = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514', max_tokens: 300,
          messages: [{ role: 'user', content: prompt }],
        });
        const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('');
        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        result.aiCoaching = JSON.parse(cleaned);
      } catch (e) {
        console.warn('AI coaching error:', e.message);
      }
    }

    cache.set(cacheKey, { data: result, ts: Date.now() });
    res.json(result);
  } catch (e) {
    console.error('Performance insights error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
