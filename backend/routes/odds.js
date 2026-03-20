const express = require('express');
const router = express.Router();
const axios = require('axios');
const { requireAuth } = require('../middleware/auth');
const { requirePro } = require('../middleware/tier');

// Polymarket category keyword map
const CATEGORY_FILTERS = {
  Politics:  ['election', 'president', 'congress', 'senate', 'trump', 'democrat', 'republican', 'vote', 'political'],
  Crypto:    ['bitcoin', 'btc', 'eth', 'ethereum', 'solana', 'crypto', 'blockchain', 'sol', 'defi'],
  Finance:   ['fed', 'rate', 'inflation', 'recession', 's&p', 'nasdaq', 'stock', 'gdp', 'dollar', 'interest'],
  Sports:    ['nba', 'nfl', 'mlb', 'nhl', 'championship', 'super bowl', 'world series', 'soccer', 'ufc', 'sport'],
  Econ:      ['tariff', 'trade', 'china', 'economy', 'unemployment', 'jobs', 'cpi', 'debt'],
};

// Live Polymarket markets — Pro users only
router.get('/:category', requireAuth, requirePro, async (req, res) => {
  const { category } = req.params;
  const keywords = CATEGORY_FILTERS[category];
  if (!keywords) return res.status(400).json({ error: 'Invalid category. Use: Politics, Crypto, Finance, Sports, Econ' });

  try {
    const response = await axios.get('https://gamma-api.polymarket.com/markets', {
      params: { limit: 100, active: true, closed: false, order: 'volume', ascending: false }
    });

    const markets = response.data
      .filter(m => {
        if (!m.question || !m.outcomePrices) return false;
        const q = m.question.toLowerCase();
        return keywords.some(kw => q.includes(kw));
      })
      .slice(0, 20)
      .map(m => {
        let prices = [];
        try { prices = JSON.parse(m.outcomePrices); } catch (e) {}
        return {
          id: m.id,
          title: m.question,
          yes: prices.length ? Math.round(parseFloat(prices[0]) * 100) : 50,
          no: prices.length > 1 ? Math.round(parseFloat(prices[1]) * 100) : 50,
          volume: m.volume ? parseFloat(m.volume) : 0,
          liquidity: m.liquidity ? parseFloat(m.liquidity) : 0,
          end_date: m.endDate || null,
          category,
        };
      });

    res.json(markets);
  } catch (err) {
    console.error('Polymarket API error:', err.message);
    res.status(500).json({ error: 'Failed to fetch Polymarket data' });
  }
});

module.exports = router;
