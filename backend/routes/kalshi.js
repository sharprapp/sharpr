const express = require('express');
const router = express.Router();
const cache = new Map();

const CATEGORY_KEYWORDS = {
  Politics: ['election', 'president', 'congress', 'senate', 'trump', 'democrat', 'republican', 'vote', 'political', 'biden', 'governor', 'midterm'],
  Economics: ['fed', 'rate', 'inflation', 'recession', 'gdp', 'unemployment', 'cpi', 'jobs', 'tariff', 'trade', 'debt'],
  Sports: ['nba', 'nfl', 'mlb', 'nhl', 'championship', 'super bowl', 'world series', 'soccer', 'ufc', 'sport', 'game', 'playoff', 'celtics', 'lakers', 'warriors'],
  Entertainment: ['oscar', 'emmy', 'grammy', 'movie', 'show', 'celebrity', 'music', 'box office', 'streaming'],
  Climate: ['temperature', 'weather', 'hurricane', 'storm', 'climate', 'wildfire', 'drought', 'flood', 'earthquake'],
  Tech: ['ai', 'tech', 'apple', 'google', 'meta', 'spacex', 'launch', 'robot'],
  Crypto: ['crypto', 'bitcoin', 'btc', 'ethereum', 'solana'],
  Finance: ['stock', 'market', 's&p', 'nasdaq', 'dow', 'bond', 'yield', 'dollar', 'gold', 'oil', 'commodity', 'nvidia', 'tesla'],
};

function categorize(title) {
  const t = (title || '').toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => t.includes(k))) return cat;
  }
  return 'Other';
}

const CURATED_MARKETS = [
  { ticker: 'PRES-2026-DEM', title: 'Will Democrats win the 2026 midterms?', yes_bid: 42, volume: 1250000, category: 'Politics', close_time: '2026-11-03' },
  { ticker: 'FED-MAY-CUT', title: 'Will Fed cut rates in May 2026?', yes_bid: 31, volume: 890000, category: 'Economics', close_time: '2026-05-07' },
  { ticker: 'BTC-100K-2026', title: 'Will Bitcoin hit $100k before July 2026?', yes_bid: 58, volume: 2100000, category: 'Crypto', close_time: '2026-06-30' },
  { ticker: 'NBA-CELTICS-CHAMP', title: 'Will Celtics win the 2026 NBA Championship?', yes_bid: 28, volume: 670000, category: 'Sports', close_time: '2026-06-30' },
  { ticker: 'RECESSION-2026', title: 'US recession declared in 2026?', yes_bid: 22, volume: 445000, category: 'Economics', close_time: '2026-12-31' },
  { ticker: 'SP500-5500', title: 'S&P 500 above 5,500 end of Q2 2026?', yes_bid: 61, volume: 780000, category: 'Finance', close_time: '2026-06-30' },
  { ticker: 'TRUMP-APPROVAL-50', title: 'Trump approval above 50% in April?', yes_bid: 18, volume: 330000, category: 'Politics', close_time: '2026-04-30' },
  { ticker: 'NVIDIA-200', title: 'NVIDIA stock above $200 by June 2026?', yes_bid: 45, volume: 560000, category: 'Finance', close_time: '2026-06-30' },
  { ticker: 'UKRAINE-CEASEFIRE', title: 'Ukraine ceasefire agreement by July 2026?', yes_bid: 52, volume: 1890000, category: 'Politics', close_time: '2026-07-01' },
  { ticker: 'APPLE-4T', title: 'Apple market cap hits $4T in 2026?', yes_bid: 38, volume: 420000, category: 'Finance', close_time: '2026-12-31' },
  { ticker: 'INFLATION-3', title: 'US CPI below 3% by June 2026?', yes_bid: 67, volume: 990000, category: 'Economics', close_time: '2026-06-30' },
  { ticker: 'GOLDEN-STATE-PLAYOFFS', title: 'Warriors make 2026 NBA playoffs?', yes_bid: 71, volume: 280000, category: 'Sports', close_time: '2026-04-15' },
];

function normalizeMarkets(rawMarkets) {
  return rawMarkets.map(m => {
    const yesRaw = m.yes_bid ?? m.yes_ask ?? m.last_price ?? 50;
    const yes = yesRaw > 1 ? yesRaw : Math.round(yesRaw * 100);
    return {
      id: m.ticker || m.id,
      title: m.title || m.question || '',
      yes,
      no: 100 - yes,
      volume: m.volume || 0,
      endDate: m.close_time || m.expiration_time || null,
      ticker: m.ticker || '',
      cat: m.category ? m.category : categorize(m.title || m.question || ''),
    };
  });
}

router.get('/markets', async (req, res) => {
  try {
    const cacheKey = 'kalshi_markets';
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 120000) {
      return res.json(cached.data);
    }

    let data = null;
    const headers = { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' };
    if (process.env.KALSHI_API_KEY) {
      headers['Authorization'] = `Bearer ${process.env.KALSHI_API_KEY}`;
    }

    // Try approach 1: Kalshi public API v2
    try {
      const r1 = await fetch('https://trading-api.kalshi.com/trade-api/v2/markets?limit=200&status=open', { headers });
      if (r1.ok) data = await r1.json();
    } catch {}

    // Try approach 2: Kalshi demo API
    if (!data) {
      try {
        const r2 = await fetch('https://demo-api.kalshi.co/trade-api/v2/markets?limit=200&status=open', { headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' } });
        if (r2.ok) data = await r2.json();
      } catch {}
    }

    // Fallback: curated static markets
    if (!data || !data.markets || data.markets.length === 0) {
      const payload = { markets: normalizeMarkets(CURATED_MARKETS), source: 'curated', timestamp: new Date().toISOString() };
      cache.set(cacheKey, { data: payload, timestamp: Date.now() });
      return res.json(payload);
    }

    const payload = { markets: normalizeMarkets(data.markets), source: 'live', timestamp: new Date().toISOString() };
    cache.set(cacheKey, { data: payload, timestamp: Date.now() });
    res.set('Cache-Control', 'public, max-age=60');
    res.json(payload);
  } catch (e) {
    console.error('Kalshi error:', e.message);
    // Serve curated on any error
    res.json({ markets: normalizeMarkets(CURATED_MARKETS), source: 'curated', timestamp: new Date().toISOString() });
  }
});

module.exports = router;
