import { useState, useEffect } from 'react';
import api from '../lib/api';
import GameDetailModal from './GameDetailModal';
import TeamLogo from './TeamLogo';

const SPORTS = ['NBA', 'NFL', 'MLB', 'NHL', 'NCAAB', 'NCAAF', 'WNBA', 'soccer_epl', 'soccer_mls', 'soccer_champions', 'UFC', 'boxing', 'tennis_atp', 'golf_pga', 'F1'];
const SPORT_LABELS = { soccer_epl: 'EPL', soccer_mls: 'MLS', soccer_champions: 'UCL', tennis_atp: 'ATP', golf_pga: 'PGA' };

// Map frontend sport keys to Odds API lowercase keys
const ODDS_API_KEY_MAP = {
  NBA: 'nba', NFL: 'nfl', MLB: 'mlb', NHL: 'nhl', NCAAB: 'ncaab', NCAAF: 'ncaaf',
  WNBA: 'wnba', soccer_epl: 'soccer_epl', soccer_mls: 'soccer_mls', soccer_champions: 'soccer_champions',
  UFC: 'ufc', boxing: 'boxing', tennis_atp: 'tennis_atp', golf_pga: 'golf_pga', F1: 'f1',
};

function formatOdds(odds) {
  if (odds === null || odds === undefined) return '--';
  return odds > 0 ? '+' + odds : '' + odds;
}

function formatSpread(spread) {
  if (spread === null || spread === undefined) return '--';
  return spread > 0 ? '+' + spread : '' + spread;
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return 'Today ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function timeAgo(date) {
  if (!date) return '';
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 10) return 'just now';
  if (secs < 60) return secs + 's ago';
  if (secs < 3600) return Math.floor(secs / 60) + 'm ago';
  return Math.floor(secs / 3600) + 'h ago';
}

const oddsCache = {};

export default function SportsOdds({ initialSport, tier }) {
  const normalizeSport = (s) => {
    if (!s) return 'NBA';
    if (SPORTS.includes(s)) return s;
    const upper = s.toUpperCase();
    if (SPORTS.includes(upper)) return upper;
    return s;
  };

  const [sport, setSport] = useState(normalizeSport(initialSport));
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedGame, setSelectedGame] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [requestsRemaining, setRequestsRemaining] = useState(null);
  const [sortByEdge, setSortByEdge] = useState(false);

  useEffect(() => {
    if (initialSport) {
      const n = normalizeSport(initialSport);
      if (n !== sport) setSport(n);
    }
  }, [initialSport]);

  useEffect(() => { fetchGames(); }, [sport]);

  useEffect(() => {
    const interval = setInterval(() => fetchGames(), 60000);
    return () => clearInterval(interval);
  }, [sport]);

  async function fetchGames() {
    const oddsKey = ODDS_API_KEY_MAP[sport] || sport.toLowerCase();
    const cacheKey = 'odds_' + oddsKey;
    // Check frontend cache (5 min TTL)
    if (oddsCache[cacheKey] && Date.now() - oddsCache[cacheKey].ts < 300000) {
      setGames(oddsCache[cacheKey].games);
      if (oddsCache[cacheKey].remaining != null) setRequestsRemaining(oddsCache[cacheKey].remaining);
      setLastUpdated(new Date(oddsCache[cacheKey].ts));
      setLoading(false);
      return;
    }
    setLoading(true); setError('');
    try {
      const { data } = await api.get(`/api/odds/games?sport=${oddsKey}`);
      if (data.quotaExceeded) {
        setError('Live odds temporarily unavailable — quota refreshes daily');
        setGames([]);
      } else if (data.error && !data.games?.length) {
        setError(data.message || 'Could not load odds right now');
        setGames([]);
      } else {
        setGames(data.games || []);
        if (data.requestsRemaining != null) setRequestsRemaining(data.requestsRemaining);
        oddsCache[cacheKey] = { games: data.games || [], remaining: data.requestsRemaining, ts: Date.now() };
      }
    } catch (e) {
      setError('Could not load games — try refreshing');
      setGames([]);
    }
    setLastUpdated(new Date());
    setLoading(false);
  }

  function betGame(game, betType) {
    const match = `${game.awayTeam} @ ${game.homeTeam}`;
    const detail = betType ? ` (${betType})` : '';
    window.dispatchEvent(new CustomEvent('bet-prefill', { detail: { sport, match: match + detail } }));
  }

  function analyzeGame(game) {
    const topic = `${game.awayTeam} vs ${game.homeTeam} ${SPORT_LABELS[sport] || sport} — spread ${formatSpread(game.awaySpread)}, ML ${formatOdds(game.awayML)}/${formatOdds(game.homeML)}, total ${game.overTotal || 'N/A'}`;
    window.dispatchEvent(new CustomEvent('ai-prefill', { detail: { topic, type: 'sports' } }));
  }

  const gc = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, transition: 'all 0.2s ease' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Sport selector */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12, background: '#0a0f1e', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {SPORTS.map(s => (
            <button key={s} onClick={() => setSport(s)}
              style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: 'none', whiteSpace: 'nowrap', transition: 'all 0.15s',
                background: sport === s ? '#2563EB' : 'transparent',
                color: sport === s ? '#fff' : '#94A3B8',
              }}
              onMouseEnter={e => { if (sport !== s) e.currentTarget.style.color = '#F5F5FA'; }}
              onMouseLeave={e => { if (sport !== s) e.currentTarget.style.color = '#94A3B8'; }}>
              {SPORT_LABELS[s] || s}
            </button>
          ))}
        </div>
      </div>

      {/* Status bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: '#2a3a5a' }}>{!loading && games.length > 0 && `${games.length} games`}</span>
          {!loading && games.length > 0 && (
            <button onClick={() => setSortByEdge(s => !s)}
              style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 100, cursor: 'pointer', border: '1px solid', background: sortByEdge ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.03)', borderColor: sortByEdge ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)', color: sortByEdge ? '#4ade80' : '#4a5a7a' }}>
              {sortByEdge ? '⚡ Edge sorted' : '⚡ Sort by Edge'}
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {lastUpdated && <span style={{ fontSize: 10, color: '#1a2535' }}>Updated {timeAgo(lastUpdated)}</span>}
          {requestsRemaining != null && (
            <span style={{ fontSize: 10, color: parseInt(requestsRemaining) > 100 ? '#22c55e' : parseInt(requestsRemaining) > 50 ? '#f59e0b' : '#ef4444' }}>
              {requestsRemaining} API calls left
            </span>
          )}
          <button onClick={fetchGames} disabled={loading}
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '4px 10px', fontSize: 10, color: '#4a5a7a', cursor: 'pointer' }}>
            {loading ? '...' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {error && <div style={{ ...gc, padding: 16, borderColor: 'rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 13 }}>{error}</div>}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => <div key={i} style={{ ...gc, padding: 20, height: 160, animation: 'pulse 1.5s infinite' }} />)}
        </div>
      )}

      {!loading && games.length === 0 && !error && (
        <div style={{ ...gc, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🏟️</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#94A3B8' }}>No {SPORT_LABELS[sport] || sport} games right now</div>
          <div style={{ fontSize: 12, color: '#4a5a7a', marginTop: 4 }}>Check back on game days</div>
        </div>
      )}

      {/* Game cards */}
      {!loading && [...games].sort((a, b) => sortByEdge ? (b.edgeScore?.score || 0) - (a.edgeScore?.score || 0) : 0).map(game => {
        const hasOdds = game.homeML != null || game.awayML != null;
        const edge = game.edgeScore;

        return (
          <div key={game.id} style={{ ...gc, overflow: 'hidden', cursor: 'pointer' }}
            onClick={() => setSelectedGame(game)}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(79,142,247,0.3)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}>

            <div style={{ padding: 20 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(79,142,247,0.1)', color: '#7aaff8', textTransform: 'uppercase' }}>{SPORT_LABELS[sport] || sport}</span>
                  {game.isLive && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 10, background: 'rgba(239,68,68,0.15)', color: '#ef4444', animation: 'pulse 1.5s infinite' }}>LIVE</span>}
                  {edge && edge.score > 30 && (
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 10, background: edge.score >= 81 ? 'rgba(34,197,94,0.15)' : edge.score >= 61 ? 'rgba(245,158,11,0.15)' : 'rgba(251,191,36,0.1)', color: edge.color, border: `1px solid ${edge.color}30` }}>
                      {edge.score >= 81 ? '⚡ ' : ''}{edge.score} Edge
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 11, color: '#4a5a7a' }}>{fmtDate(game.commenceTime)}</span>
              </div>

              {/* Odds grid: 2 rows (away/home) × 3 columns (spread/ml/total) */}
              {hasOdds ? (
                <div style={{ marginBottom: 12 }}>
                  {/* Column headers */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(3, 100px)', gap: 6, marginBottom: 6 }}>
                    <div />
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', color: '#1a2535', textTransform: 'uppercase', textAlign: 'center' }}>Spread</div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', color: '#1a2535', textTransform: 'uppercase', textAlign: 'center' }}>Moneyline</div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', color: '#1a2535', textTransform: 'uppercase', textAlign: 'center' }}>Total</div>
                  </div>
                  {/* Away row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(3, 100px)', gap: 6, marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <TeamLogo teamName={game.awayTeam} size={24} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#F5F5FA', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{game.awayTeam}</span>
                    </div>
                    <div style={{ background: '#0a0f1e', borderRadius: 8, padding: '8px 6px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#8899bb' }}>
                      {formatSpread(game.awaySpread)} <span style={{ fontSize: 10, color: '#4a5a7a' }}>({formatOdds(game.awaySpreadOdds)})</span>
                    </div>
                    <div style={{ background: '#0a0f1e', borderRadius: 8, padding: '8px 6px', textAlign: 'center', fontSize: 13, fontWeight: 800, color: game.awayML > 0 ? '#22c55e' : '#ef4444' }}>
                      {formatOdds(game.awayML)}
                    </div>
                    <div style={{ background: '#0a0f1e', borderRadius: 8, padding: '8px 6px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#8899bb' }}>
                      O {game.overTotal || '--'} <span style={{ fontSize: 10, color: '#4a5a7a' }}>({formatOdds(game.overOdds)})</span>
                    </div>
                  </div>
                  {/* Home row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(3, 100px)', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <TeamLogo teamName={game.homeTeam} size={24} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#F5F5FA', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{game.homeTeam}</span>
                    </div>
                    <div style={{ background: '#0a0f1e', borderRadius: 8, padding: '8px 6px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#8899bb' }}>
                      {formatSpread(game.homeSpread)} <span style={{ fontSize: 10, color: '#4a5a7a' }}>({formatOdds(game.homeSpreadOdds)})</span>
                    </div>
                    <div style={{ background: '#0a0f1e', borderRadius: 8, padding: '8px 6px', textAlign: 'center', fontSize: 13, fontWeight: 800, color: game.homeML > 0 ? '#22c55e' : '#ef4444' }}>
                      {formatOdds(game.homeML)}
                    </div>
                    <div style={{ background: '#0a0f1e', borderRadius: 8, padding: '8px 6px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#8899bb' }}>
                      U {game.overTotal || '--'} <span style={{ fontSize: 10, color: '#4a5a7a' }}>({formatOdds(game.underOdds)})</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TeamLogo teamName={game.awayTeam} size={24} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#F5F5FA' }}>{game.awayTeam}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TeamLogo teamName={game.homeTeam} size={24} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#F5F5FA' }}>{game.homeTeam}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#2a3a5a', marginTop: 4 }}>Odds not yet available</div>
                </div>
              )}

              {/* Action row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={e => { e.stopPropagation(); betGame(game); }}
                  style={{ background: '#2563EB', border: 'none', borderRadius: 10, padding: '7px 16px', fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
                  Log bet
                </button>
                <button onClick={e => { e.stopPropagation(); analyzeGame(game); }}
                  style={{ background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.25)', borderRadius: 10, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#60a5fa', cursor: 'pointer' }}>
                  Analyze
                </button>
                {game.bookmakers?.length > 0 && (
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: '#2a3a5a' }}>
                    via {game.bookmakers[0]}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {selectedGame && <GameDetailModal game={selectedGame} onClose={() => setSelectedGame(null)} userPlan={tier} />}
    </div>
  );
}
