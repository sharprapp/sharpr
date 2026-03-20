const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const Parser  = require('rss-parser');

/* ── RSS parser with media namespace support ── */
const parser = new Parser({
  timeout: 10000,
  customFields: {
    item: [
      ['media:content',   'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['enclosure',       'enclosure'],
    ],
  },
});

/* ── Simple in-memory cache ── */
const cache = {};
function getCached(key, ttlMs) {
  const h = cache[key];
  return h && Date.now() - h.ts < ttlMs ? h.value : null;
}
function setCached(key, value) { cache[key] = { value, ts: Date.now() }; }

/* ── ESPN public JSON API endpoints (tested, all 200) ── */
const ESPN_APIS = {
  NBA:    'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news',
  NFL:    'https://site.api.espn.com/apis/site/v2/sports/football/nfl/news',
  MLB:    'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/news',
  NHL:    'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/news',
  Soccer: 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/news',
  Golf:   'https://site.api.espn.com/apis/site/v2/sports/golf/pga/news',
  Tennis: 'https://site.api.espn.com/apis/site/v2/sports/tennis/atp/news',
  UFC:    'https://site.api.espn.com/apis/site/v2/sports/mma/ufc/news',
};

/* ── Financial/trading RSS feeds in priority order ── */
const TRADING_FEEDS = [
  { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html',              source: 'CNBC' },
  { url: 'https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines',  source: 'MarketWatch' },
  { url: 'https://feeds.bloomberg.com/markets/news.rss',                       source: 'Bloomberg' },
  { url: 'https://seekingalpha.com/feed.xml',                                  source: 'Seeking Alpha' },
];

const AXIOS_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Accept':     'application/json',
};

/* ── Helpers ── */
function detectSentiment(text) {
  const t = (text || '').toLowerCase();
  if (/injur|out\b|suspend|scratch|doubtful|miss|ruled out|dnp|absent|hurt|sidelined/.test(t)) return 'negative';
  if (/return|healthy|back|streak|win|extends|record|star|deal|sign|surpass/.test(t))           return 'positive';
  return 'neutral';
}

function detectImpact(text) {
  const t = (text || '').toLowerCase();
  if (/injur|suspend|fire|coach|trade|star|key|major|critical|crucial/.test(t)) return 'HIGH';
  if (/update|report|watch|might|could|consider|possible|questionable/.test(t))  return 'MED';
  return 'LOW';
}

/* ── Normalize ESPN API article → common shape ── */
function normalizeEspn(article, sport) {
  const title = (article.headline   || '').replace(/\s+/g, ' ').trim();
  const desc  = (article.description || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().substring(0, 160);
  return {
    title,
    description: desc,
    link:      article.links?.web?.href || '',
    pubDate:   article.published || article.lastModified || '',
    image:     article.images?.[0]?.url || null,
    source:    'ESPN',
    sport,
    sentiment: detectSentiment(title + ' ' + desc),
    impact:    detectImpact(title + ' ' + desc),
  };
}

/* ── Extract image from RSS item ── */
function extractRssImage(item) {
  if (item.enclosure?.url)             return item.enclosure.url;
  if (item.mediaContent?.['$']?.url)   return item.mediaContent['$'].url;
  if (item.mediaThumbnail?.['$']?.url) return item.mediaThumbnail['$'].url;
  const html = item['content:encoded'] || item.content || '';
  const m = html.match(/src="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i);
  return m ? m[1] : null;
}

/* ── Normalize RSS item → common shape ── */
function normalizeRss(item, source) {
  const title = (item.title || '').replace(/\s+/g, ' ').trim();
  const desc  = (item.contentSnippet || item.summary || '')
    .replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().substring(0, 160);
  return {
    title,
    description: desc,
    link:      item.link || '',
    pubDate:   item.isoDate || item.pubDate || '',
    image:     extractRssImage(item),
    source,
    sentiment: detectSentiment(title + ' ' + desc),
    impact:    detectImpact(title + ' ' + desc),
  };
}

/* ─────────────────────────────────────────
   GET /api/news/sports?sport=NBA
   ESPN public JSON API — no auth, no RSS
───────────────────────────────────────── */
router.get('/sports', async (req, res) => {
  const sport   = (req.query.sport || 'NBA').toUpperCase();
  const apiUrl  = ESPN_APIS[sport];

  if (!apiUrl) {
    return res.status(400).json({ error: `Unknown sport: ${sport}`, items: [] });
  }

  const cacheKey = `espn_${sport}`;
  const cached   = getCached(cacheKey, 10 * 60 * 1000); // 10 min
  if (cached) {
    res.set('Cache-Control', 'public, max-age=600');
    return res.json(cached);
  }

  try {
    const { data } = await axios.get(apiUrl, {
      headers: AXIOS_HEADERS,
      timeout: 8000,
      params:  { limit: 20 },
    });

    const articles = data.articles || data.news || [];
    const items    = articles.map(a => normalizeEspn(a, sport));

    const payload = { items, sport, source: 'ESPN', timestamp: new Date().toISOString() };
    setCached(cacheKey, payload);
    res.set('Cache-Control', 'public, max-age=600');
    return res.json(payload);

  } catch (err) {
    console.error(`ESPN API (${sport}) error:`, err.response?.status || err.message);
    // Return graceful empty — frontend shows "News temporarily unavailable"
    return res.json({
      items: [],
      sport,
      timestamp: new Date().toISOString(),
      unavailable: true,
    });
  }
});

/* ─────────────────────────────────────────
   GET /api/news/trading
   CNBC + MarketWatch + Bloomberg RSS
   Fetched in parallel, sorted by date
───────────────────────────────────────── */
router.get('/trading', async (req, res) => {
  const cacheKey = 'trading_news';
  const cached   = getCached(cacheKey, 5 * 60 * 1000); // 5 min
  if (cached) {
    res.set('Cache-Control', 'public, max-age=300');
    return res.json(cached);
  }

  // Fetch all feeds in parallel — any that fail are silently skipped
  const results = await Promise.allSettled(
    TRADING_FEEDS.map(({ url, source }) =>
      parser.parseURL(url).then(feed =>
        (feed.items || []).slice(0, 15).map(item => normalizeRss(item, source))
      )
    )
  );

  const allItems = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      allItems.push(...r.value);
    } else {
      console.warn(`Trading RSS (${TRADING_FEEDS[i].source}) failed:`, r.reason?.message?.substring(0, 60));
    }
  });

  if (allItems.length === 0) {
    return res.json({
      items: [],
      timestamp: new Date().toISOString(),
      unavailable: true,
    });
  }

  // Sort by date descending, deduplicate by title similarity
  allItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  const seen  = new Set();
  const deduped = allItems.filter(item => {
    const key = item.title.toLowerCase().substring(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const payload = { items: deduped.slice(0, 40), timestamp: new Date().toISOString() };
  setCached(cacheKey, payload);
  res.set('Cache-Control', 'public, max-age=300');
  return res.json(payload);
});

/* ─────────────────────────────────────────
   GET /api/news/economic
   Forex Factory public JSON calendar
   Fields: title, country (currency), date (ISO),
           impact, forecast, previous, actual
───────────────────────────────────────── */
router.get('/economic', async (req, res) => {
  const cacheKey = 'economic_calendar';
  const cached   = getCached(cacheKey, 60 * 60 * 1000); // 60 min
  if (cached) { res.set('Cache-Control', 'public, max-age=3600'); return res.json(cached); }

  const FF_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';

  try {
    const { data } = await axios.get(FF_URL, {
      headers: { 'User-Agent': 'Sharpr/1.0', Accept: 'application/json' },
      timeout: 8000,
    });

    // FF API returns: { title, country, date (ISO w/ tz), impact, forecast, previous, actual }
    // "country" is actually the currency code (USD, EUR, GBP, etc.)
    const events = data
      .filter(e => e.title && e.country)
      .map(e => {
        // Split ISO date into date and time parts
        const d       = new Date(e.date);
        const dateStr = e.date.split('T')[0];
        const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/New_York' });
        return {
          date:     dateStr,
          time:     timeStr,
          currency: e.country,   // "USD", "EUR", "GBP", etc.
          title:    e.title,
          impact:   e.impact || 'Low',   // "Low" | "Medium" | "High"
          forecast: e.forecast || '—',
          previous: e.previous || '—',
          actual:   e.actual   || null,
        };
      })
      .sort((a, b) => {
        // Sort by datetime ascending
        return new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time);
      });

    const payload = { events };
    setCached(cacheKey, payload);
    res.set('Cache-Control', 'public, max-age=3600');
    return res.json(payload);

  } catch (err) {
    console.error('Economic calendar error:', err.message);
    // Return empty gracefully — frontend shows placeholder
    return res.json({ events: [], unavailable: true });
  }
});

module.exports = router;
