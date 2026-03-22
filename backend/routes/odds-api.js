const express = require('express');
const router = express.Router();
const cache = new Map();
const prevOdds = new Map(); // tracks previous spreads for line movement detection
const supabase = require('../lib/supabase');
let webpush; try { webpush = require('web-push'); webpush.setVapidDetails(process.env.VAPID_EMAIL || 'mailto:support@sharprapp.com', process.env.VAPID_PUBLIC_KEY || '', process.env.VAPID_PRIVATE_KEY || ''); } catch {}
const notifiedMoves = new Set(); // prevent duplicate notifications

const ODDS_BASE = 'https://api.the-odds-api.com/v4';
const API_KEY = process.env.ODDS_API_KEY;

const SPORT_KEYS = {
  nba: 'basketball_nba', nfl: 'americanfootball_nfl', mlb: 'baseball_mlb',
  nhl: 'icehockey_nhl', ncaab: 'basketball_ncaab', ncaaf: 'americanfootball_ncaaf',
  cfl: 'americanfootball_cfl', wnba: 'basketball_wnba',
  soccer_epl: 'soccer_epl', soccer_mls: 'soccer_usa_mls',
  soccer_laliga: 'soccer_spain_la_liga', soccer_bundesliga: 'soccer_germany_bundesliga',
  soccer_seriea: 'soccer_italy_serie_a', soccer_ligue1: 'soccer_france_ligue_one',
  soccer_champions: 'soccer_uefa_champs_league', soccer_europa: 'soccer_uefa_europa_league',
  ufc: 'mma_mixed_martial_arts', boxing: 'boxing_boxing',
  tennis_atp: 'tennis_atp_french_open', tennis_wta: 'tennis_wta_french_open',
  golf_pga: 'golf_pga_championship', f1: 'motorsport_formula_1_constructor',
  rugby: 'rugbyleague_nrl', cricket: 'cricket_icc_world_cup', afl: 'aussierules_afl',
};

const BOOKS = 'draftkings,fanduel,betmgm,caesars,pointsbet';

function fmtML(n) { return n == null ? null : n > 0 ? `+${n}` : `${n}`; }

// GET /api/odds/games?sport=nba
router.get('/games', async (req, res) => {
  const sport = (req.query.sport || 'nba').toLowerCase();
  const sportKey = SPORT_KEYS[sport] || sport;
  const cacheKey = `odds_${sportKey}`;

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < 300000) return res.json(cached.data);

  if (!API_KEY) {
    return res.json({ games: [], sport, error: 'ODDS_API_KEY not configured', requestsRemaining: null });
  }

  try {
    const r = await fetch(
      `${ODDS_BASE}/sports/${sportKey}/odds?apiKey=${API_KEY}&regions=us&markets=h2h,spreads,totals&oddsFormat=american&bookmakers=${BOOKS}`,
      { headers: { Accept: 'application/json' } }
    );
    const remaining = r.headers.get('x-requests-remaining');
    if (!r.ok) {
      const errText = await r.text();
      let errData = {}; try { errData = JSON.parse(errText); } catch {}
      if (errData.error_code === 'OUT_OF_USAGE_CREDITS' || r.status === 422) {
        return res.json({ error: 'odds_quota_exceeded', message: 'Odds data temporarily unavailable', games: [], quotaExceeded: true });
      }
      return res.status(r.status).json({ error: 'odds_unavailable', message: 'Could not load odds', games: [] });
    }

    const data = await r.json();
    const games = data.map(g => {
      const getOdds = (market, team) => {
        for (const b of g.bookmakers || []) {
          const m = b.markets?.find(x => x.key === market);
          const o = m?.outcomes?.find(x => x.name === team);
          if (o) return { price: o.price, point: o.point, book: b.title };
        }
        return null;
      };
      const homeML = getOdds('h2h', g.home_team);
      const awayML = getOdds('h2h', g.away_team);
      const homeSpread = getOdds('spreads', g.home_team);
      const awaySpread = getOdds('spreads', g.away_team);
      let over = null, under = null;
      for (const b of g.bookmakers || []) {
        const m = b.markets?.find(x => x.key === 'totals');
        if (m) { over = m.outcomes?.find(x => x.name === 'Over'); under = m.outcomes?.find(x => x.name === 'Under'); if (over) break; }
      }
      return {
        id: g.id, sport, homeTeam: g.home_team, awayTeam: g.away_team,
        commenceTime: g.commence_time,
        homeML: homeML?.price, awayML: awayML?.price,
        homeSpread: homeSpread?.point, homeSpreadOdds: homeSpread?.price,
        awaySpread: awaySpread?.point, awaySpreadOdds: awaySpread?.price,
        overTotal: over?.point, overOdds: over?.price, underOdds: under?.price,
        bookmakers: g.bookmakers?.map(b => b.title),
        allBookmakers: g.bookmakers || [],
      };
    });
    // Line movement detection — notify Pro users on moves > 3 points
    if (webpush) {
      for (const g of games) {
        const key = g.id + '_spread';
        const prev = prevOdds.get(key);
        if (prev != null && g.homeSpread != null) {
          const move = Math.abs(g.homeSpread - prev);
          if (move >= 3 && !notifiedMoves.has(key + '_' + g.homeSpread)) {
            notifiedMoves.add(key + '_' + g.homeSpread);
            const dir = g.homeSpread > prev ? 'up' : 'down';
            // Fire and forget — don't block response
            (async () => {
              try {
                const { data: subs } = await supabase.from('push_subscriptions').select('subscription');
                const payload = JSON.stringify({ title: 'Line Movement', body: `${g.homeTeam}: spread moved ${dir} from ${prev} to ${g.homeSpread}`, url: '/dashboard' });
                for (const sub of subs || []) {
                  try { await webpush.sendNotification(sub.subscription, payload); } catch {}
                }
              } catch {}
            })();
          }
        }
        if (g.homeSpread != null) prevOdds.set(key, g.homeSpread);
      }
    }

    const result = { games, sport, total: games.length, requestsRemaining: remaining };
    cache.set(cacheKey, { data: result, ts: Date.now() });
    res.set('Cache-Control', 'public, max-age=30');
    res.json(result);
  } catch (e) {
    console.error('Odds API error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/odds/live-scores-ticker
router.get('/live-scores-ticker', async (req, res) => {
  const cacheKey = 'live_scores_ticker';
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < 30000) return res.json(cached.data);

  const sports = [
    { key: 'nba', path: 'basketball/nba', label: 'NBA' },
    { key: 'nfl', path: 'football/nfl', label: 'NFL' },
    { key: 'mlb', path: 'baseball/mlb', label: 'MLB' },
    { key: 'nhl', path: 'hockey/nhl', label: 'NHL' },
  ];
  const allScores = [];
  await Promise.allSettled(sports.map(async s => {
    try {
      const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${s.path}/scoreboard`);
      const data = await r.json();
      (data.events || []).slice(0, 3).forEach(ev => {
        const home = ev.competitions?.[0]?.competitors?.find(c => c.homeAway === 'home');
        const away = ev.competitions?.[0]?.competitors?.find(c => c.homeAway === 'away');
        const status = ev.status?.type?.description;
        allScores.push({
          sport: s.label,
          homeTeam: home?.team?.abbreviation || home?.team?.displayName,
          awayTeam: away?.team?.abbreviation || away?.team?.displayName,
          homeScore: home?.score, awayScore: away?.score,
          isLive: status === 'In Progress', isFinal: status === 'Final',
          period: ev.status?.period, clock: ev.status?.displayClock, date: ev.date,
        });
      });
    } catch {}
  }));
  cache.set(cacheKey, { data: allScores, ts: Date.now() });
  res.json(allScores);
});

// GET /api/odds/props?sport=nba&gameId=X
router.get('/props', async (req, res) => {
  const { sport = 'nba', gameId } = req.query;
  if (!gameId) return res.status(400).json({ error: 'gameId required' });
  if (!API_KEY) return res.json({ props: {}, error: 'ODDS_API_KEY not configured' });

  const sportKey = SPORT_KEYS[sport] || sport;
  const cacheKey = `props_${gameId}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < 60000) return res.json(cached.data);

  try {
    const markets = sport === 'nba' ? 'player_points,player_rebounds,player_assists,player_threes'
      : sport === 'nfl' ? 'player_pass_tds,player_pass_yds,player_rush_yds,player_reception_yds'
      : 'player_points,player_rebounds,player_assists';
    const r = await fetch(
      `${ODDS_BASE}/sports/${sportKey}/events/${gameId}/odds?apiKey=${API_KEY}&regions=us&markets=${markets}&oddsFormat=american`,
      { headers: { Accept: 'application/json' } }
    );
    if (!r.ok) return res.json({ props: {} });
    const data = await r.json();
    const playerProps = {};
    for (const book of data.bookmakers || []) {
      for (const market of book.markets || []) {
        const stat = market.key.replace('player_', '').replace(/_/g, ' ');
        for (const o of market.outcomes || []) {
          if (!o.description) continue;
          if (!playerProps[o.description]) playerProps[o.description] = {};
          if (!playerProps[o.description][stat]) playerProps[o.description][stat] = { line: o.point };
          if (o.name === 'Over') playerProps[o.description][stat].over = o.price;
          if (o.name === 'Under') playerProps[o.description][stat].under = o.price;
        }
      }
    }
    const result = { props: playerProps, gameId, sport };
    cache.set(cacheKey, { data: result, ts: Date.now() });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/odds/scores?sport=nba
router.get('/scores', async (req, res) => {
  const sport = (req.query.sport || 'nba').toLowerCase();
  const espnMap = { nba: 'basketball/nba', nfl: 'football/nfl', mlb: 'baseball/mlb', nhl: 'hockey/nhl', soccer: 'soccer/eng.1', ufc: 'mma/ufc' };
  try {
    const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${espnMap[sport] || 'basketball/nba'}/scoreboard`);
    const data = await r.json();
    const scores = (data.events || []).map(ev => ({
      id: ev.id, name: ev.name,
      status: ev.status?.type?.description,
      homeTeam: ev.competitions?.[0]?.competitors?.find(c => c.homeAway === 'home')?.team?.displayName,
      awayTeam: ev.competitions?.[0]?.competitors?.find(c => c.homeAway === 'away')?.team?.displayName,
      homeScore: ev.competitions?.[0]?.competitors?.find(c => c.homeAway === 'home')?.score,
      awayScore: ev.competitions?.[0]?.competitors?.find(c => c.homeAway === 'away')?.score,
      date: ev.date,
    }));
    res.json({ scores, sport });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
