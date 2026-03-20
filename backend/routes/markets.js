const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const { requireAuth } = require('../middleware/auth');

// Per-page cache: { [offset]: { data, ts } }
const pageCache = {};
const TTL = 60 * 1000; // 60 seconds

function normalizeMarket(m) {
  let prices = [];
  try { prices = JSON.parse(m.outcomePrices); } catch {}
  return {
    id:        m.id,
    title:     m.question,
    yes:       prices.length     ? Math.round(parseFloat(prices[0]) * 100) : 50,
    no:        prices.length > 1 ? Math.round(parseFloat(prices[1]) * 100) : 50,
    volume:    m.volume    ? parseFloat(m.volume)    : 0,
    liquidity: m.liquidity ? parseFloat(m.liquidity) : 0,
    endDate:   m.endDate   || null,
    slug:      m.slug      || null,
  };
}

// GET /api/markets/polymarket?offset=0
// Returns one page (100 markets). Frontend calls repeatedly with offset=0,100,200…
// until hasMore=false.
router.get('/polymarket', requireAuth, async (req, res) => {
  const offset = Math.max(0, parseInt(req.query.offset) || 0);
  const limit  = 100;

  // Serve from cache if fresh
  const cached = pageCache[offset];
  if (cached && Date.now() - cached.ts < TTL) {
    res.set('Cache-Control', 'public, max-age=60');
    return res.json(cached.data);
  }

  try {
    const { data } = await axios.get('https://gamma-api.polymarket.com/markets', {
      params: {
        limit,
        offset,
        active:    true,
        closed:    false,
        order:     'volume',
        ascending: false,
      },
      headers: {
        'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept':          'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer':         'https://polymarket.com/',
        'Origin':          'https://polymarket.com',
      },
      timeout: 10000,
    });

    const markets = data.filter(m => m.question && m.outcomePrices).map(normalizeMarket);

    const payload = {
      markets,
      hasMore: data.length === limit,
      offset,
    };

    pageCache[offset] = { data: payload, ts: Date.now() };
    res.set('Cache-Control', 'public, max-age=60');
    res.json(payload);
  } catch (err) {
    console.error(`Polymarket /markets offset=${offset} error:`, err.response?.status, err.response?.data || err.message);
    // Serve stale cache on error rather than failing
    if (cached) return res.json(cached.data);
    res.status(500).json({ error: 'Failed to fetch Polymarket data', detail: err.message });
  }
});

module.exports = router;
