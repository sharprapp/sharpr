import { useState, useEffect } from 'react';
import api from '../lib/api';

const SPORTS = ['NFL', 'NBA', 'MLB', 'NHL', 'Soccer', 'MLS', 'UFC', 'Tennis', 'Golf', 'NASCAR', 'NCAAF', 'NCAAB'];

function fmtML(ml) {
  if (ml == null) return 'N/A';
  return ml > 0 ? `+${ml}` : `${ml}`;
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
}

function StatusBadge({ status }) {
  if (status.state === 'in') {
    return <span className="text-xs font-bold text-red-400 px-2 py-0.5 rounded-full animate-pulse" style={{background: 'rgba(239,68,68,0.15)'}}>LIVE · {status.detail}</span>;
  }
  if (status.completed) {
    return <span className="text-xs font-semibold text-slate-500 px-2 py-0.5 rounded-full" style={{background: 'rgba(148,163,184,0.1)'}}>Final</span>;
  }
  return <span className="text-xs text-slate-500">{status.detail}</span>;
}

export default function SportsOdds() {
  const [sport, setSport]     = useState('NBA');
  const [games, setGames]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => { fetchGames(); }, [sport]);

  async function fetchGames() {
    setLoading(true); setError('');
    try {
      const { data } = await api.get(`/api/espn/${sport}`);
      setGames(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Could not load games.');
      setGames([]);
    }
    setLoading(false);
  }

  function betGame(game) {
    const match = game.away && game.home
      ? `${game.away.name} @ ${game.home.name}`
      : game.name;
    window.dispatchEvent(new CustomEvent('bet-prefill', { detail: { sport, match } }));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Sport selector */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 p-1 rounded-xl" style={{background: '#0a0f1e'}}>
          {SPORTS.map(s => (
            <button key={s} onClick={() => setSport(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
              style={sport === s
                ? {background: '#2563EB', color: '#fff'}
                : {color: '#94A3B8'}}
              onMouseEnter={e => { if (sport !== s) e.currentTarget.style.color='#F5F5FA'; }}
              onMouseLeave={e => { if (sport !== s) e.currentTarget.style.color='#94A3B8'; }}>
              {s}
            </button>
          ))}
        </div>
        <button onClick={fetchGames} disabled={loading}
          className="text-xs border rounded-xl px-3 py-1.5 transition-colors disabled:opacity-50 whitespace-nowrap self-start"
          style={{color: '#94A3B8', borderColor: '#1e2a4a'}}
          onMouseEnter={e => { e.currentTarget.style.color='#F5F5FA'; e.currentTarget.style.borderColor='#2563EB'; }}
          onMouseLeave={e => { e.currentTarget.style.color='#94A3B8'; e.currentTarget.style.borderColor='#1e2a4a'; }}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>

      {error && <p className="text-sm text-red-400 rounded-xl px-4 py-3" style={{background: 'rgba(239,68,68,0.1)'}}>{error}</p>}

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="rounded-2xl p-5 animate-pulse" style={{background: '#0f1729', border: '1px solid #1e2a4a'}}>
              <div className="h-3 rounded w-1/3 mb-4" style={{background: '#1e2a4a'}} />
              <div className="h-5 rounded w-2/3 mb-2" style={{background: '#1e2a4a'}} />
              <div className="h-5 rounded w-2/3 mb-4" style={{background: '#1e2a4a'}} />
              <div className="h-8 rounded" style={{background: '#1e2a4a'}} />
            </div>
          ))}
        </div>
      )}

      {!loading && games.length === 0 && !error && (
        <div className="rounded-2xl px-6 py-12 text-center" style={{background: '#0f1729', border: '1px solid #1e2a4a'}}>
          <div className="text-2xl mb-2">🏟️</div>
          <div className="text-sm font-medium" style={{color: '#94A3B8'}}>No {sport} games scheduled today</div>
          <div className="text-xs mt-1" style={{color: '#64748b'}}>Check back on game days</div>
        </div>
      )}

      {!loading && games.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map(game => (
            <div key={game.id}
              className="rounded-2xl p-5 flex flex-col gap-4 transition-all cursor-default"
              style={{background: '#0f1729', border: '1px solid #1e2a4a'}}
              onMouseEnter={e => e.currentTarget.style.borderColor='rgba(37,99,235,0.4)'}
              onMouseLeave={e => e.currentTarget.style.borderColor='#1e2a4a'}>
              {/* Status + date */}
              <div className="flex items-center justify-between">
                <StatusBadge status={game.status} />
                <span className="text-xs" style={{color: '#64748b'}}>{fmtDate(game.date)}</span>
              </div>

              {/* Teams + score */}
              <div className="flex flex-col gap-2">
                {[game.away, game.home].map((team, ti) => team && (
                  <div key={ti} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      {team.logo && <img src={team.logo} alt="" className="w-6 h-6 object-contain" onError={e => e.target.style.display='none'} />}
                      <span className="text-sm font-semibold truncate" style={{color: '#F5F5FA'}}>{team.name}</span>
                      <span className="text-xs" style={{color: '#64748b'}}>{ti === 0 ? 'Away' : 'Home'}</span>
                    </div>
                    {team.score != null && (
                      <span className="text-lg font-bold tabular-nums" style={{color: '#F5F5FA'}}>{team.score}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Odds */}
              {game.odds ? (
                <div className="pt-3" style={{borderTop: '1px solid #1e2a4a'}}>
                  <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{color: '#64748b'}}>
                    {game.odds.provider || 'Odds'}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-xl p-2" style={{background: '#0a0f1e'}}>
                      <div className="mb-0.5" style={{color: '#64748b'}}>Away ML</div>
                      <div className={`font-bold ${game.odds.awayML > 0 ? 'text-green-500' : 'text-slate-300'}`}>{fmtML(game.odds.awayML)}</div>
                    </div>
                    <div className="rounded-xl p-2" style={{background: '#0a0f1e'}}>
                      <div className="mb-0.5" style={{color: '#64748b'}}>Spread</div>
                      <div className="font-bold text-slate-300">{game.odds.spread || 'N/A'}</div>
                    </div>
                    <div className="rounded-xl p-2" style={{background: '#0a0f1e'}}>
                      <div className="mb-0.5" style={{color: '#64748b'}}>Home ML</div>
                      <div className={`font-bold ${game.odds.homeML > 0 ? 'text-green-500' : 'text-slate-300'}`}>{fmtML(game.odds.homeML)}</div>
                    </div>
                  </div>
                  {game.odds.total && (
                    <div className="text-center text-xs mt-1.5" style={{color: '#64748b'}}>O/U {game.odds.total}</div>
                  )}
                </div>
              ) : (
                <div className="pt-3 text-xs text-slate-600" style={{borderTop: '1px solid #1e2a4a'}}>Odds not available</div>
              )}

              {/* Bet button */}
              {!game.status.completed && (
                <button
                  onClick={() => betGame(game)}
                  className="w-full rounded-xl py-2.5 text-xs font-semibold transition-colors mt-auto"
                  style={{background: '#2563EB', color: '#fff'}}
                  onMouseEnter={e => e.currentTarget.style.background='#1d4ed8'}
                  onMouseLeave={e => e.currentTarget.style.background='#2563EB'}>
                  Bet this game ↗
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
