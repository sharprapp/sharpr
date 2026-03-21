import { useState, useEffect } from 'react';
import api from '../lib/api';
import GameDetailModal from './GameDetailModal';

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
    setLoading(true); setError('');
    const oddsKey = ODDS_API_KEY_MAP[sport] || sport.toLowerCase();
    try {
      const { data } = await api.get(`/api/odds/games?sport=${oddsKey}`);
      if (data.error && data.error.includes('ODDS_API_KEY')) {
        setError('Odds API key not configured — contact admin');
        setGames([]);
      } else {
        setGames(data.games || []);
        if (data.requestsRemaining != null) setRequestsRemaining(data.requestsRemaining);
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Could not load games');
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: 4, borderRadius: 12, background: '#0a0f1e' }}>
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
        <div style={{ fontSize: 11, color: '#2a3a5a' }}>
          {!loading && games.length > 0 && `${games.length} games found`}
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
      {!loading && games.map(game => {
        const hasOdds = game.homeML != null || game.awayML != null;

        return (
          <div key={game.id} style={{ ...gc, overflow: 'hidden', cursor: 'pointer' }}
            onClick={() => setSelectedGame(game)}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(79,142,247,0.3)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}>

            <div style={{ padding: 20 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(79,142,247,0.1)', color: '#7aaff8', textTransform: 'uppercase' }}>{SPORT_LABELS[sport] || sport}</span>
                <span style={{ fontSize: 11, color: '#4a5a7a' }}>{fmtDate(game.commenceTime)}</span>
              </div>

              {/* Teams */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#F5F5FA' }}>{game.awayTeam}</span>
                    <span style={{ fontSize: 10, color: '#2a3a5a' }}>Away</span>
                  </div>
                  {game.awayML != null && <span style={{ fontSize: 14, fontWeight: 700, color: game.awayML > 0 ? '#22c55e' : '#F5F5FA' }}>{formatOdds(game.awayML)}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#F5F5FA' }}>{game.homeTeam}</span>
                    <span style={{ fontSize: 10, color: '#2a3a5a' }}>Home</span>
                  </div>
                  {game.homeML != null && <span style={{ fontSize: 14, fontWeight: 700, color: game.homeML > 0 ? '#22c55e' : '#F5F5FA' }}>{formatOdds(game.homeML)}</span>}
                </div>
              </div>

              {/* Odds grid */}
              {hasOdds ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                  <div style={{ background: '#0a0f1e', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: '#2a3a5a', marginBottom: 4 }}>SPREAD</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#F5F5FA' }}>
                      {formatSpread(game.awaySpread)} <span style={{ fontSize: 10, color: '#4a5a7a' }}>({formatOdds(game.awaySpreadOdds)})</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#F5F5FA' }}>
                      {formatSpread(game.homeSpread)} <span style={{ fontSize: 10, color: '#4a5a7a' }}>({formatOdds(game.homeSpreadOdds)})</span>
                    </div>
                  </div>
                  <div style={{ background: '#0a0f1e', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: '#2a3a5a', marginBottom: 4 }}>MONEYLINE</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: game.awayML > 0 ? '#22c55e' : '#F5F5FA' }}>{formatOdds(game.awayML)}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: game.homeML > 0 ? '#22c55e' : '#F5F5FA' }}>{formatOdds(game.homeML)}</div>
                  </div>
                  <div style={{ background: '#0a0f1e', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: '#2a3a5a', marginBottom: 4 }}>TOTAL</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#F5F5FA' }}>O {game.overTotal || '--'} <span style={{ fontSize: 10, color: '#4a5a7a' }}>({formatOdds(game.overOdds)})</span></div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#F5F5FA' }}>U {game.overTotal || '--'} <span style={{ fontSize: 10, color: '#4a5a7a' }}>({formatOdds(game.underOdds)})</span></div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#2a3a5a', marginBottom: 12 }}>Odds not yet available</div>
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
