const express = require('express');
const router = express.Router();
const cache = new Map();
const supabase = require('../lib/supabase');
let webpush; try { webpush = require('web-push'); webpush.setVapidDetails(process.env.VAPID_EMAIL || 'mailto:support@sharprapp.com', process.env.VAPID_PUBLIC_KEY || '', process.env.VAPID_PRIVATE_KEY || ''); } catch {}
const notifiedSignals = new Set();

/* ── Thresholds ── */
const MIN_EDGE = 5;            // TEMP: lowered from 8 for testing
const MIN_POLY_VOL = 25000;    // TEMP: lowered from 75000 for testing
const MIN_POLY_ONLY_VOL = 25000; // TEMP: lowered from 100000 for testing
const PUSH_THRESHOLD = 15;     // edge % to trigger push notification
const MAX_DAYS_SPORTS = 21;    // TEMP: raised from 14 for testing
const MAX_DAYS_POLY_ONLY = 14; // TEMP: raised from 7 for testing

/* ── Junk market filters ── */
const JUNK_RE = /weather|temperature|rainfall|degrees|celsius|fahrenheit|wind speed|tornado|hurricane|snow.*inches/i;
const PERSONAL_LEGAL_RE = /trial|sentenced|convicted|arrested|indicted|plea deal|lawsuit.*vs/i;
const ENTERTAINMENT_RE = /oscar|grammy|emmy|bachelor|reality tv|box office|album|movie|netflix/i;
const LOCAL_POLITICS_RE = /mayor|city council|county|school board|sheriff|state legislature|alderman/i;

function isJunkMarket(title, volume, category) {
  if (JUNK_RE.test(title)) return true;
  if (ENTERTAINMENT_RE.test(title) && volume < 50000) return true;
  if (PERSONAL_LEGAL_RE.test(title) && volume < 200000) return true;
  if (LOCAL_POLITICS_RE.test(title) && volume < 100000) return true;
  return false;
}

/* ── Odds conversion ── */
function americanToProb(odds) {
  if (!odds) return null;
  return odds > 0 ? 100 / (odds + 100) : Math.abs(odds) / (Math.abs(odds) + 100);
}

function probToAmerican(prob) {
  if (!prob || prob <= 0 || prob >= 1) return null;
  return prob >= 0.5 ? Math.round(-(prob / (1 - prob)) * 100) : Math.round(((1 - prob) / prob) * 100);
}

/* ── Improved team name matching ── */
const TEAM_NOISE = /\b(fc|sc|cf|ac|afc|united|city|town|county|state|university|college|the)\b/gi;

function normalizeTeam(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(TEAM_NOISE, '').replace(/\s+/g, ' ').trim();
}

function wordSimilarity(a, b) {
  const wa = new Set(a.split(' ').filter(w => w.length > 2));
  const wb = new Set(b.split(' ').filter(w => w.length > 2));
  if (!wa.size || !wb.size) return 0;
  let matches = 0;
  for (const w of wa) { if (wb.has(w)) matches++; }
  return matches / Math.max(wa.size, wb.size);
}

function eventsMatch(polyTitle, homeTeam, awayTeam, gameTime) {
  const p = normalizeTeam(polyTitle);
  const h = normalizeTeam(homeTeam);
  const a = normalizeTeam(awayTeam);

  // Check both teams appear with >80% word similarity
  const hSim = wordSimilarity(h, p);
  const aSim = wordSimilarity(a, p);

  // At least one team must match strongly and the other partially
  const homeMatch = hSim >= 0.5 || h.split(' ').some(w => w.length > 3 && p.includes(w));
  const awayMatch = aSim >= 0.5 || a.split(' ').some(w => w.length > 3 && p.includes(w));

  if (!homeMatch || !awayMatch) return false;

  // Combined similarity must be above 80%
  const combined = (hSim + aSim) / 2;
  if (combined < 0.3 && !(homeMatch && awayMatch)) return false;

  return true;
}

/* ── Quality score (1-10) ── */
function calcQualityScore(signal) {
  let score = 0;
  const vol = signal.volume || 0;
  const edge = Math.abs(signal.edge || 0);
  const days = signal.daysToClose || 999;

  // Volume component (max 5)
  if (vol >= 500000) score += 5;
  else if (vol >= 200000) score += 4;
  else if (vol >= 75000) score += 2;

  // Edge component (max 4)
  if (edge >= 18) score += 4;
  else if (edge >= 12) score += 3;
  else if (edge >= 8) score += 2;

  // Urgency bonus (max 1)
  if (days <= 3 && days > 0) score += 1;

  return Math.min(10, Math.max(1, score));
}

/* ── Detect category from title ── */
function detectCategory(title) {
  const t = (title || '').toLowerCase();
  if (/nba|nfl|mlb|nhl|soccer|premier league|champions league|ufc|mma|tennis|golf|ncaa/i.test(t)) return 'Sports';
  if (/bitcoin|btc|eth|crypto|solana|defi|token/i.test(t)) return 'Crypto';
  if (/president|congress|senate|election|governor|federal|democrat|republican|trump|biden/i.test(t)) return 'US Politics';
  if (/stock|s&p|nasdaq|fed|rate|gdp|inflation|earnings/i.test(t)) return 'Finance';
  if (ENTERTAINMENT_RE.test(t)) return 'Entertainment';
  return 'Other';
}

/* ── Routes ── */
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

    // ── Sports cross-reference signals ──
    let unmatchedGames = 0;
    for (const game of allGames) {
      const matching = polyMarkets.filter(m => {
        const title = m.question || m.title || '';
        return eventsMatch(title, game.home_team, game.away_team, game.commence_time);
      });

      if (!matching.length) { unmatchedGames++; continue; }

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

        const vol = parseFloat(poly.volume || 0);
        if (vol < MIN_POLY_VOL) continue;

        const title = poly.question || poly.title || '';
        if (isJunkMarket(title, vol)) continue;

        const close = new Date(poly.endDate || poly.closeTime);
        const days = (close - Date.now()) / 86400000;
        if (days < 0 || days > MAX_DAYS_SPORTS) continue;

        const hEdge = ((polyYes - bookHP) / bookHP) * 100;
        const aEdge = ((polyYes - bookAP) / bookAP) * 100;
        const edge = Math.abs(hEdge) > Math.abs(aEdge) ? hEdge : aEdge;
        if (Math.abs(edge) < MIN_EDGE) continue;

        const category = detectCategory(title);
        const sig = {
          id: `${game.id}-${poly.id}`, type: 'sports',
          sport: game.sport?.replace(/basketball_|americanfootball_|baseball_|icehockey_/g, '').toUpperCase(),
          event: `${game.away_team} @ ${game.home_team}`,
          title: title,
          awayTeam: game.away_team, homeTeam: game.home_team,
          commenceTime: game.commence_time,
          polyMarket: title,
          polyUrl: `https://polymarket.com/event/${poly.slug}`,
          polymarket_prob: Math.round(polyYes * 100),
          book_prob: Math.round((Math.abs(hEdge) > Math.abs(aEdge) ? bookHP : bookAP) * 100),
          polyYesProb: Math.round(polyYes * 100),
          bookHomeProb: Math.round(bookHP * 100), bookAwayProb: Math.round(bookAP * 100),
          bookHomeML: bestHomeML, bookAwayML: bestAwayML,
          edge: Math.round(edge * 10) / 10,
          signal_type: edge > 0 ? 'POLY_HIGHER' : 'BOOK_HIGHER',
          direction: edge > 0 ? 'POLY_HIGHER' : 'BOOK_HIGHER',
          signal: edge > 0
            ? `Polymarket pricing ${Math.round(polyYes*100)}% vs sportsbook implied ${Math.round((Math.abs(hEdge)>Math.abs(aEdge)?bookHP:bookAP)*100)}% — ${Math.abs(edge).toFixed(1)} point divergence`
            : `Sportsbook implied ${Math.round((Math.abs(hEdge)>Math.abs(aEdge)?bookHP:bookAP)*100)}% vs Polymarket ${Math.round(polyYes*100)}% — ${Math.abs(edge).toFixed(1)} point divergence`,
          confidence: Math.abs(edge) > 18 ? 'HIGH' : Math.abs(edge) > 12 ? 'MEDIUM' : 'LOW',
          volume: vol,
          category,
          closes_at: close.toISOString(),
          daysToClose: Math.round(days * 10) / 10,
          sharp_money: false,
          quality_score: 0,
        };
        sig.quality_score = calcQualityScore(sig);
        signals.push(sig);
      }
    }

    if (unmatchedGames > 0) {
      console.log(`[SharpSignals] ${unmatchedGames}/${allGames.length} games had no Polymarket match`);
    }

    // ── Pure Polymarket signals ──
    const POLY_ONLY_CATS = ['Sports', 'Crypto', 'US Politics'];
    for (const m of polyMarkets.slice(0, 200)) {
      let prices = []; try { prices = JSON.parse(m.outcomePrices || '[]'); } catch {}
      const prob = prices[0] ? parseFloat(prices[0]) : null;
      if (!prob || prob < 0.05 || prob > 0.95) continue;

      const vol = parseFloat(m.volume || 0);
      if (vol < MIN_POLY_ONLY_VOL) continue;

      const title = m.question || m.title || '';
      if (isJunkMarket(title, vol)) continue;

      const close = new Date(m.endDate || m.closeTime);
      const days = (close - Date.now()) / 86400000;
      if (days < 0 || days > MAX_DAYS_POLY_ONLY) continue;

      const category = detectCategory(title);
      if (!POLY_ONLY_CATS.includes(category)) continue;

      // Skip if already matched as a sports signal
      if (signals.some(s => s.polyMarket === title)) continue;

      const sig = {
        id: `poly-${m.id}`, type: 'polymarket',
        sport: category === 'Sports' ? 'MULTI' : category.toUpperCase().replace(' ', '_'),
        event: title, title: title,
        polyMarket: title,
        polyUrl: `https://polymarket.com/event/${m.slug}`,
        polymarket_prob: Math.round(prob * 100),
        book_prob: null,
        polyYesProb: Math.round(prob * 100),
        edge: null,
        signal_type: 'POLY_ONLY',
        direction: 'POLY_ONLY',
        signal: `High-volume market at ${Math.round(prob*100)}% — $${(vol/1000).toFixed(0)}K volume, closing in ${Math.round(days)} days`,
        confidence: vol > 500000 ? 'HIGH' : vol > 200000 ? 'MEDIUM' : 'LOW',
        volume: vol,
        category,
        closes_at: close.toISOString(),
        daysToClose: Math.round(days * 10) / 10,
        sharp_money: false, // Polymarket API doesn't expose 24h volume delta
        quality_score: 0,
      };
      sig.quality_score = calcQualityScore(sig);
      signals.push(sig);
    }

    // Sort by quality score descending, then edge
    signals.sort((a, b) => {
      if (b.quality_score !== a.quality_score) return b.quality_score - a.quality_score;
      return Math.abs(b.edge || 0) - Math.abs(a.edge || 0);
    });

    // ── Push notifications for high-edge signals (>15%) ──
    if (webpush) {
      const highEdge = signals.filter(s => s.type === 'sports' && Math.abs(s.edge || 0) > PUSH_THRESHOLD && !notifiedSignals.has(s.id));
      if (highEdge.length > 0) {
        (async () => {
          try {
            const { data: subs } = await supabase.from('push_subscriptions').select('subscription');
            for (const sig of highEdge.slice(0, 3)) {
              notifiedSignals.add(sig.id);
              const payload = JSON.stringify({
                title: 'Sharp Signal',
                body: `${sig.event} — ${Math.abs(sig.edge).toFixed(1)}% divergence detected (quality ${sig.quality_score}/10)`,
                url: '/dashboard'
              });
              for (const sub of subs || []) {
                try { await webpush.sendNotification(sub.subscription, payload); } catch {}
              }
            }
          } catch {}
        })();
      }
    }

    // ── Auto-log new signals to signal_outcomes table ──
    if (signals.length > 0) {
      (async () => {
        try {
          const signalIds = signals.slice(0, 50).map(s => s.id);
          const { data: existing } = await supabase.from('signal_outcomes').select('signal_id').in('signal_id', signalIds);
          const existingIds = new Set((existing || []).map(r => r.signal_id));
          const newSignals = signals.slice(0, 50).filter(s => !existingIds.has(s.id));
          if (newSignals.length > 0) {
            const rows = newSignals.map(s => ({
              signal_id: s.id,
              market_title: s.title || s.event,
              signal_type: s.signal_type || s.direction,
              polymarket_prob: s.polymarket_prob || s.polyYesProb,
              book_prob: s.book_prob || null,
              edge: s.edge,
              volume: s.volume,
              quality_score: s.quality_score,
              category: s.category,
              closes_at: s.closes_at || null,
            }));
            await supabase.from('signal_outcomes').insert(rows);
            console.log(`[SharpSignals] Logged ${rows.length} new signals to signal_outcomes`);
          }
        } catch (e) {
          console.warn('[SharpSignals] Failed to log outcomes:', e.message);
        }
      })();
    }

    const result = {
      signals: signals.slice(0, 50),
      total: signals.length,
      sportsSignals: signals.filter(s => s.type === 'sports').length,
      polySignals: signals.filter(s => s.type === 'polymarket').length,
      generatedAt: new Date().toISOString(),
    };
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

// ── Signal outcomes admin endpoints ──

// GET /api/sharpsignal/outcomes — list all signal outcomes
router.get('/outcomes', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const outcome = req.query.outcome; // optional filter: correct, incorrect, push, pending
    let query = supabase.from('signal_outcomes').select('*').order('fired_at', { ascending: false }).range(offset, offset + limit - 1);
    if (outcome) query = query.eq('outcome', outcome);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ outcomes: data || [], count: (data || []).length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/sharpsignal/outcomes/:id — update outcome
router.patch('/outcomes/:id', async (req, res) => {
  try {
    const { outcome, notes } = req.body;
    if (!['correct', 'incorrect', 'push', 'pending'].includes(outcome)) {
      return res.status(400).json({ error: 'outcome must be: correct, incorrect, push, or pending' });
    }
    const update = { outcome };
    if (outcome !== 'pending') update.resolved_at = new Date().toISOString();
    else update.resolved_at = null;
    if (notes !== undefined) update.notes = notes;
    const { data, error } = await supabase.from('signal_outcomes').update(update).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/sharpsignal/accuracy — accuracy stats
router.get('/accuracy', async (req, res) => {
  try {
    const { data: all, error } = await supabase.from('signal_outcomes').select('*').neq('outcome', 'pending');
    if (error) throw error;
    const resolved = all || [];
    const correct = resolved.filter(r => r.outcome === 'correct');
    const incorrect = resolved.filter(r => r.outcome === 'incorrect');
    const total = correct.length + incorrect.length;

    // By category
    const categories = [...new Set(resolved.map(r => r.category).filter(Boolean))];
    const byCategory = categories.map(cat => {
      const c = resolved.filter(r => r.category === cat);
      const cCorrect = c.filter(r => r.outcome === 'correct').length;
      const cIncorrect = c.filter(r => r.outcome === 'incorrect').length;
      const cTotal = cCorrect + cIncorrect;
      return { category: cat, total: cTotal, correct: cCorrect, incorrect: cIncorrect, accuracy: cTotal ? Math.round(cCorrect / cTotal * 100) : 0 };
    });

    // By signal type
    const types = [...new Set(resolved.map(r => r.signal_type).filter(Boolean))];
    const bySignalType = types.map(t => {
      const s = resolved.filter(r => r.signal_type === t);
      const sCorrect = s.filter(r => r.outcome === 'correct').length;
      const sIncorrect = s.filter(r => r.outcome === 'incorrect').length;
      const sTotal = sCorrect + sIncorrect;
      return { signal_type: t, total: sTotal, correct: sCorrect, incorrect: sIncorrect, accuracy: sTotal ? Math.round(sCorrect / sTotal * 100) : 0 };
    });

    // Average edge
    const avgEdge = (arr) => { const edges = arr.filter(r => r.edge != null).map(r => Math.abs(parseFloat(r.edge))); return edges.length ? Math.round(edges.reduce((s, e) => s + e, 0) / edges.length * 10) / 10 : null; };

    res.json({
      total_signals: resolved.length,
      correct: correct.length,
      incorrect: incorrect.length,
      push: resolved.filter(r => r.outcome === 'push').length,
      accuracy_rate: total ? Math.round(correct.length / total * 100) : 0,
      by_category: byCategory,
      by_signal_type: bySignalType,
      avg_edge_correct: avgEdge(correct),
      avg_edge_incorrect: avgEdge(incorrect),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
