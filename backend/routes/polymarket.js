const express    = require('express');
const router     = express.Router();
const axios      = require('axios');
const { requireAuth } = require('../middleware/auth');

let cache   = null;
let cacheTs = 0;
const TTL   = 5 * 60 * 1000; // 5 minutes

async function fetchAllMarkets() {
  const all   = [];
  const limit = 100;
  const max   = 15; // up to 1 500 markets

  for (let page = 0; page < max; page++) {
    const { data } = await axios.get('https://gamma-api.polymarket.com/markets', {
      params: { limit, offset: page * limit, active: true, closed: false, order: 'volume', ascending: false },
      timeout: 12000,
    });
    all.push(...data);
    if (data.length < limit) break; // last page reached
  }

  return all
    .filter(m => m.question && m.outcomePrices)
    .map(m => {
      let prices = [];
      try { prices = JSON.parse(m.outcomePrices); } catch {}
      return {
        id:        m.id,
        title:     m.question,
        yes:       prices.length     ? Math.round(parseFloat(prices[0]) * 100) : 50,
        no:        prices.length > 1 ? Math.round(parseFloat(prices[1]) * 100) : 50,
        volume:    m.volume    ? parseFloat(m.volume)    : 0,
        liquidity: m.liquidity ? parseFloat(m.liquidity) : 0,
        endDate:   m.endDate || null,
        slug:      m.slug    || null,
      };
    });
}

router.get('/', requireAuth, async (req, res) => {
  if (cache && Date.now() - cacheTs < TTL) return res.json(cache);

  try {
    const markets = await fetchAllMarkets();
    cache   = markets;
    cacheTs = Date.now();
    res.json(markets);
  } catch (err) {
    console.error('Polymarket error:', err.message);
    if (cache) return res.json(cache); // stale cache on error
    res.status(500).json({ error: 'Failed to fetch Polymarket data' });
  }
});

module.exports = router;
