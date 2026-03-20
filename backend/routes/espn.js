const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const { requireAuth } = require('../middleware/auth');

const SPORTS = {
  NFL:    { sport: 'football',   league: 'nfl' },
  NBA:    { sport: 'basketball', league: 'nba' },
  MLB:    { sport: 'baseball',   league: 'mlb' },
  NHL:    { sport: 'hockey',     league: 'nhl' },
  Soccer: { sport: 'soccer',     league: 'eng.1' },
  MLS:    { sport: 'soccer',     league: 'usa.1' },
  UFC:    { sport: 'mma',        league: 'ufc' },
  Tennis: { sport: 'tennis',     league: 'atp' },
  Golf:   { sport: 'golf',       league: 'pga' },
  NASCAR: { sport: 'racing',     league: 'nascar-premier-series' },
  NCAAF:  { sport: 'football',   league: 'college-football' },
  NCAAB:  { sport: 'basketball', league: 'mens-college-basketball' },
};

const cache = {};
const TTL   = 3 * 60 * 1000; // 3 minutes

function normalizeGame(event, sportKey) {
  const comp = event.competitions?.[0];
  if (!comp) return null;

  const home = comp.competitors?.find(c => c.homeAway === 'home');
  const away = comp.competitors?.find(c => c.homeAway === 'away');
  const odds   = comp.odds?.[0] || null;
  const status = comp.status?.type || {};

  return {
    id:        event.id,
    name:      event.name,
    shortName: event.shortName || event.name,
    sport:     sportKey,
    date:      event.date,
    home: home ? {
      name:  home.team?.displayName || '',
      abbr:  home.team?.abbreviation || '',
      score: home.score ?? null,
      logo:  home.team?.logo || null,
    } : null,
    away: away ? {
      name:  away.team?.displayName || '',
      abbr:  away.team?.abbreviation || '',
      score: away.score ?? null,
      logo:  away.team?.logo || null,
    } : null,
    status: {
      state:     status.state     || 'pre',
      detail:    status.shortDetail || status.description || '',
      completed: !!status.completed,
    },
    odds: odds ? {
      homeML:   odds.homeTeamOdds?.moneyLine ?? null,
      awayML:   odds.awayTeamOdds?.moneyLine ?? null,
      spread:   odds.details      ?? null,
      total:    odds.overUnder    ?? null,
      provider: odds.provider?.name || '',
    } : null,
    venue: event.competitions?.[0]?.venue?.fullName || null,
  };
}

// GET /api/espn/:sport
router.get('/:sport', requireAuth, async (req, res) => {
  const { sport } = req.params;
  const cfg = SPORTS[sport];
  if (!cfg) return res.status(400).json({ error: `Invalid sport. Use: ${Object.keys(SPORTS).join(', ')}` });

  if (cache[sport] && Date.now() - cache[sport].ts < TTL) return res.json(cache[sport].value);

  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${cfg.sport}/${cfg.league}/scoreboard`;
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 Sharpr/1.0', Accept: 'application/json' },
      timeout: 8000,
    });

    const games = (data.events || [])
      .map(e => normalizeGame(e, sport))
      .filter(Boolean);

    cache[sport] = { value: games, ts: Date.now() };
    res.json(games);
  } catch (err) {
    console.error(`ESPN ${sport} error:`, err.message);
    if (cache[sport]) return res.json(cache[sport].value);
    res.status(500).json({ error: `Failed to fetch ${sport} scoreboard` });
  }
});

module.exports = router;
