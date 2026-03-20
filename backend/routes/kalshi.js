const express = require('express');
const router = express.Router();
const axios = require('axios');

const KALSHI_BASE = 'https://trading-api.kalshi.com/trade-api/v2';
const cache = {};
const TTL = 60 * 1000;

function getCached(key) {
  const c = cache[key];
  return c && Date.now() - c.ts < TTL ? c.data : null;
}

const CATEGORY_KEYWORDS = {
  Politics: ['election', 'president', 'congress', 'senate', 'trump', 'democrat', 'republican', 'vote', 'political', 'biden', 'governor'],
  Economics: ['fed', 'rate', 'inflation', 'recession', 'gdp', 'unemployment', 'cpi', 'jobs', 'tariff', 'trade', 'debt'],
  Sports: ['nba', 'nfl', 'mlb', 'nhl', 'championship', 'super bowl', 'world series', 'soccer', 'ufc', 'sport', 'game', 'playoff'],
  Entertainment: ['oscar', 'emmy', 'grammy', 'movie', 'show', 'celebrity', 'music', 'box office', 'streaming'],
  Climate: ['temperature', 'weather', 'hurricane', 'storm', 'climate', 'wildfire', 'drought', 'flood', 'earthquake'],
  Tech: ['ai', 'tech', 'apple', 'google', 'meta', 'tesla', 'spacex', 'launch', 'robot', 'crypto', 'bitcoin', 'ethereum'],
  Finance: ['stock', 'market', 's&p', 'nasdaq', 'dow', 'bond', 'yield', 'dollar', 'gold', 'oil', 'commodity'],
};

function categorize(title) {
  const t = (title || '').toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => t.includes(k))) return cat;
  }
  return 'Other';
}

router.get('/markets', async (req, res) => {
  try {
    const cached = getCached('kalshi_markets');
    if (cached) {
      res.set('Cache-Control', 'public, max-age=60');
      return res.json(cached);
    }

    const { data } = await axios.get(`${KALSHI_BASE}/markets`, {
      params: { limit: 200, status: 'open' },
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Sharpr/1.0' },
      timeout: 10000,
    });

    const markets = (data.markets || []).map(m => {
      const yesPrice = m.yes_ask != null ? m.yes_ask : m.last_price != null ? m.last_price : 50;
      return {
        id: m.ticker || m.id,
        title: m.title || m.question || '',
        yes: Math.round(yesPrice * 100) > 100 ? yesPrice : Math.round(yesPrice * 100),
        no: Math.round((1 - yesPrice) * 100) > 100 ? 100 - yesPrice : Math.round((1 - yesPrice) * 100),
        volume: m.volume || 0,
        openInterest: m.open_interest || 0,
        endDate: m.expiration_time || m.close_time || null,
        ticker: m.ticker || '',
        cat: categorize(m.title || m.question || ''),
      };
    });

    const payload = { markets, total: markets.length, timestamp: new Date().toISOString() };
    cache['kalshi_markets'] = { data: payload, ts: Date.now() };
    res.set('Cache-Control', 'public, max-age=60');
    res.json(payload);
  } catch (e) {
    console.error('Kalshi API error:', e.response?.status || e.message);
    const cached = getCached('kalshi_markets');
    if (cached) return res.json(cached);
    res.status(500).json({ error: 'Failed to fetch Kalshi markets', detail: e.message });
  }
});

router.get('/markets/:ticker', async (req, res) => {
  try {
    const { data } = await axios.get(`${KALSHI_BASE}/markets/${req.params.ticker}`, {
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Sharpr/1.0' },
      timeout: 8000,
    });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
