const express = require('express');
const router = express.Router();
const cache = new Map();
const supabase = require('../lib/supabase');
let webpush; try { webpush = require('web-push'); webpush.setVapidDetails(process.env.VAPID_EMAIL || 'mailto:support@sharprapp.com', process.env.VAPID_PUBLIC_KEY || '', process.env.VAPID_PRIVATE_KEY || ''); } catch {}
const notifiedSignals = new Set();

function americanToProb(odds) {
  if (!odds) return null;
  return odds > 0 ? 100 / (odds + 100) : Math.abs(odds) / (Math.abs(odds) + 100);
}

function probToAmerican(prob) {
  if (!prob || prob <= 0 || prob >= 1) return null;
  return prob >= 0.5 ? Math.round(-(prob / (1 - prob)) * 100) : Math.round(((1 - prob) / prob) * 100);
}

function normalize(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

function eventsMatch(polyTitle, t1, t2) {
  const p = normalize(polyTitle);
  const match = (team) => normalize(team).split(' ').some(w => w.length > 3 && p.includes(w));
  return match(t1) && match(t2);
}

router.get('/signals', async (req, res) => {
  try {
    const cacheKey = 'sharp_signals';
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < 120000) return res.json(cached.data);

    const API_KEY = process.env.ODDS_API_KEY;
    const signals = [];
    let polyMarkets = [];

    try {
      const r = await fetch('https://gamma-api.polymarket.com/markets?limit=200&active=true&closed=false', { headers: { Accept: 'application/json' } });
      if (r.ok) { const d = await r.json(); polyMarkets = Array.isArray(d) ? d : (d.markets || []); }
    } catch {}

    const allGames = [];
    if (API_KEY) {
      await Promise.allSettled(['basketball_nba', 'americanfootball_nfl', 'baseball_mlb', 'icehockey_nhl'].map(async sport => {
        try {
          const r = await fetch(`https://api.the-odds-api.com/v4/sports/${sport}/odds?apiKey=${API_KEY}&regions=us&markets=h2h&oddsFormat=american`, { headers: { Accept: 'application/json' } });
          if (r.ok) { const d = await r.json(); allGames.push(...(d || []).map(g => ({ ...g, sport }))); }
        } catch {}
      }));
    }

    for (const game of allGames) {
      const matching = polyMarkets.filter(m => eventsMatch(m.question || m.title || '', game.home_team, game.away_team));
      let bestHomeML = null, bestAwayML = null;
      for (const bk of game.bookmakers || []) {
        const h2h = bk.markets?.find(m => m.key === 'h2h');
        if (!h2h) continue;
        const hP = h2h.outcomes?.find(o => o.name === game.home_team)?.price;
        const aP = h2h.outcomes?.find(o => o.name === game.away_team)?.price;
        if (hP && (!bestHomeML || hP > bestHomeML)) bestHomeML = hP;
        if (aP && (!bestAwayML || aP > bestAwayML)) bestAwayML = aP;
      }
      if (!bestHomeML || !bestAwayML) continue;
      const bookHP = americanToProb(bestHomeML), bookAP = americanToProb(bestAwayML);

      for (const poly of matching) {
        let prices = []; try { prices = JSON.parse(poly.outcomePrices || '[]'); } catch {}
        const polyYes = prices[0] ? parseFloat(prices[0]) : null;
        if (!polyYes || polyYes < 0.05 || polyYes > 0.95) continue;
        const hEdge = ((polyYes - bookHP) / bookHP) * 100;
        const aEdge = ((polyYes - bookAP) / bookAP) * 100;
        const edge = Math.abs(hEdge) > Math.abs(aEdge) ? hEdge : aEdge;
        if (Math.abs(edge) < 5) continue;
        signals.push({
          id: `${game.id}-${poly.id}`, type: 'sports',
          sport: game.sport?.replace(/basketball_|americanfootball_|baseball_|icehockey_/g, '').toUpperCase(),
          event: `${game.away_team} @ ${game.home_team}`, awayTeam: game.away_team, homeTeam: game.home_team,
          commenceTime: game.commence_time, polyMarket: poly.question || poly.title,
          polyUrl: `https://polymarket.com/event/${poly.slug}`,
          polyYesProb: Math.round(polyYes * 100), bookHomeProb: Math.round(bookHP * 100), bookAwayProb: Math.round(bookAP * 100),
          bookHomeML: bestHomeML, bookAwayML: bestAwayML,
          edge: Math.round(edge * 10) / 10,
          direction: edge > 0 ? 'POLY_HIGHER' : 'BOOK_HIGHER',
          signal: edge > 0 ? 'Polymarket overvaluing — fade or bet sportsbook' : 'Sportsbook overvaluing — consider Polymarket YES',
          confidence: Math.abs(edge) > 15 ? 'HIGH' : Math.abs(edge) > 8 ? 'MEDIUM' : 'LOW',
          volume: parseFloat(poly.volume || 0),
        });
      }
    }

    // Pure Polymarket signals
    for (const m of polyMarkets.slice(0, 100)) {
      let prices = []; try { prices = JSON.parse(m.outcomePrices || '[]'); } catch {}
      const prob = prices[0] ? parseFloat(prices[0]) : null;
      if (!prob || prob < 0.05 || prob > 0.95) continue;
      const vol = parseFloat(m.volume || 0);
      if (vol < 10000) continue;
      const close = new Date(m.endDate || m.closeTime);
      const days = (close - Date.now()) / 86400000;
      if (days < 0 || days > 30) continue;
      signals.push({
        id: `poly-${m.id}`, type: 'polymarket', sport: 'POLITICS',
        event: m.question || m.title, polyMarket: m.question || m.title,
        polyUrl: `https://polymarket.com/event/${m.slug}`,
        polyYesProb: Math.round(prob * 100), edge: null, direction: 'POLY_ONLY',
        signal: vol > 100000 ? 'High volume — sharp money active' : 'Active market near close',
        confidence: vol > 500000 ? 'HIGH' : vol > 100000 ? 'MEDIUM' : 'LOW',
        volume: vol, daysToClose: Math.round(days * 10) / 10,
      });
    }

    signals.sort((a, b) => (Math.abs(b.edge || 0) + (b.confidence === 'HIGH' ? 10 : b.confidence === 'MEDIUM' ? 5 : 0)) - (Math.abs(a.edge || 0) + (a.confidence === 'HIGH' ? 10 : a.confidence === 'MEDIUM' ? 5 : 0)));

    // Notify Pro users on high-edge signals (>10%)
    if (webpush) {
      const highEdge = signals.filter(s => s.type === 'sports' && Math.abs(s.edge || 0) > 10 && !notifiedSignals.has(s.id));
      if (highEdge.length > 0) {
        (async () => {
          try {
            const { data: subs } = await supabase.from('push_subscriptions').select('subscription');
            for (const sig of highEdge.slice(0, 3)) {
              notifiedSignals.add(sig.id);
              const payload = JSON.stringify({ title: 'Sharp Signal', body: `${sig.event} — ${sig.edge > 0 ? '+' : ''}${sig.edge}% edge detected`, url: '/dashboard' });
              for (const sub of subs || []) {
                try { await webpush.sendNotification(sub.subscription, payload); } catch {}
              }
            }
          } catch {}
        })();
      }
    }

    const result = { signals: signals.slice(0, 50), total: signals.length, sportsSignals: signals.filter(s => s.type === 'sports').length, polySignals: signals.filter(s => s.type === 'polymarket').length, generatedAt: new Date().toISOString() };
    cache.set(cacheKey, { data: result, ts: Date.now() });
    res.json(result);
  } catch (e) {
    console.error('Sharp signal error:', e);
    res.status(500).json({ error: e.message, signals: [] });
  }
});

router.get('/hedge-calc', (req, res) => {
  const { polyProb, bookOdds, stake } = req.query;
  const prob = parseFloat(polyProb) / 100, odds = parseFloat(bookOdds), s = parseFloat(stake) || 100;
  if (!prob || !odds) return res.status(400).json({ error: 'Missing params' });
  const bp = americanToProb(odds);
  const payout = odds > 0 ? s * (odds / 100) : s * (100 / Math.abs(odds));
  const hedge = (prob * s * (1 + payout / s)) / (1 + bp);
  res.json({ polyStake: s, hedgeStake: Math.round(hedge * 100) / 100, lockedProfit: Math.round((prob * payout - (1 - prob) * hedge) * 100) / 100, roiIfYes: Math.round(((payout - hedge) / s) * 1000) / 10, roiIfNo: Math.round(((hedge * (100 / Math.abs(odds)) - s) / s) * 1000) / 10 });
});

module.exports = router;
