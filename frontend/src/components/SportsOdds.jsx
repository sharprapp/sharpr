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
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function StatusBadge({ status }) {
  if (status?.state === 'in') {
    return <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', padding: '2px 8px', borderRadius: 20, background: 'rgba(239,68,68,0.15)', animation: 'pulse 1.5s infinite' }}>LIVE · {status.detail}</span>;
  }
  if (status?.completed) {
    return <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', padding: '2px 8px', borderRadius: 20, background: 'rgba(148,163,184,0.1)' }}>Final</span>;
  }
  return <span style={{ fontSize: 11, color: '#64748b' }}>{status?.detail || ''}</span>;
}

export default function SportsOdds({ initialSport }) {
  const [sport, setSport] = useState(initialSport || 'NBA');
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { fetchGames(); }, [sport]);

  async function fetchGames() {
    setLoading(true); setError(''); setExpandedId(null);
    try {
      const { data } = await api.get(`/api/espn/${sport}`);
      setGames(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Could not load games.');
      setGames([]);
    }
    setLoading(false);
  }

  function betGame(game, betType) {
    const match = game.away && game.home ? `${game.away.name} @ ${game.home.name}` : game.name;
    const detail = betType ? ` (${betType})` : '';
    window.dispatchEvent(new CustomEvent('bet-prefill', { detail: { sport, match: match + detail } }));
  }

  function analyzeGame(game) {
    const topic = game.away && game.home
      ? `${game.away.name} vs ${game.home.name} ${sport} analysis — odds, matchup, and betting angle`
      : `${game.name} ${sport} analysis`;
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
              {s}
            </button>
          ))}
        </div>
        <button onClick={fetchGames} disabled={loading}
          style={{ fontSize: 12, color: '#94A3B8', border: '1px solid #1e2a4a', borderRadius: 10, padding: '6px 12px', cursor: 'pointer', background: 'transparent' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#F5F5FA'; e.currentTarget.style.borderColor = '#2563EB'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.borderColor = '#1e2a4a'; }}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && <div style={{ ...gc, padding: 16, borderColor: 'rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 13 }}>{error}</div>}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ ...gc, padding: 20, height: 140, animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      )}

      {!loading && games.length === 0 && !error && (
        <div style={{ ...gc, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🏟️</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#94A3B8' }}>No {sport} games scheduled today</div>
          <div style={{ fontSize: 12, color: '#4a5a7a', marginTop: 4 }}>Check back on game days</div>
        </div>
      )}

      {/* Game cards - full width, stacked */}
      {!loading && games.map(game => {
        const isExpanded = expandedId === game.id;
        const hasOdds = !!game.odds;

        return (
          <div key={game.id} style={{ ...gc, overflow: 'hidden' }}
            onMouseEnter={e => { if (!isExpanded) { e.currentTarget.style.borderColor = 'rgba(79,142,247,0.3)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)'; } }}
            onMouseLeave={e => { if (!isExpanded) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; } }}>

            {/* Collapsed section */}
            <div style={{ padding: 20 }}>
              {/* Header: status + date */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <StatusBadge status={game.status} />
                <span style={{ fontSize: 11, color: '#4a5a7a' }}>{fmtDate(game.date)}</span>
              </div>

              {/* Teams */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {[game.away, game.home].map((team, ti) => team && (
                  <div key={ti} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {team.logo && <img src={team.logo} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} onError={e => e.target.style.display = 'none'} />}
                      <span style={{ fontSize: 15, fontWeight: 600, color: '#F5F5FA' }}>{team.name}</span>
                      <span style={{ fontSize: 11, color: '#4a5a7a', padding: '1px 6px', borderRadius: 6, background: 'rgba(255,255,255,0.04)' }}>{ti === 0 ? 'Away' : 'Home'}</span>
                    </div>
                    {team.score != null && (
                      <span style={{ fontSize: 22, fontWeight: 800, color: '#F5F5FA', tabularNums: true }}>{team.score}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Odds grid */}
              {hasOdds && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                  <div style={{ background: '#0a0f1e', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: '#4a5a7a', marginBottom: 4 }}>Spread</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#F5F5FA' }}>{game.odds.spread || 'N/A'}</div>
                  </div>
                  <div style={{ background: '#0a0f1e', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: '#4a5a7a', marginBottom: 4 }}>Moneyline</div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: game.odds.awayML > 0 ? '#22c55e' : '#F5F5FA' }}>{fmtML(game.odds.awayML)}</span>
                      <span style={{ color: '#1e2a4a' }}>|</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: game.odds.homeML > 0 ? '#22c55e' : '#F5F5FA' }}>{fmtML(game.odds.homeML)}</span>
                    </div>
                  </div>
                  <div style={{ background: '#0a0f1e', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: '#4a5a7a', marginBottom: 4 }}>Total</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#F5F5FA' }}>{game.odds.total ? `O/U ${game.odds.total}` : 'N/A'}</div>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {!game.status?.completed && (
                  <button onClick={() => betGame(game)}
                    style={{ background: '#2563EB', border: 'none', borderRadius: 10, padding: '7px 16px', fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1d4ed8'}
                    onMouseLeave={e => e.currentTarget.style.background = '#2563EB'}>
                    Log bet
                  </button>
                )}
                <button onClick={() => analyzeGame(game)}
                  style={{ background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.25)', borderRadius: 10, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#60a5fa', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,142,247,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(79,142,247,0.1)'}>
                  Analyze
                </button>
                <button onClick={() => setExpandedId(isExpanded ? null : game.id)}
                  style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#6a7a9a', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#94A3B8'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#6a7a9a'; }}>
                  {isExpanded ? 'Collapse ▲' : 'Details ▼'}
                </button>
              </div>
            </div>

            {/* Expanded section */}
            {isExpanded && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: 20, background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                  {/* Betting options */}
                  {hasOdds && (
                    <div style={{ background: '#0a0f1e', borderRadius: 12, padding: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#4a5a7a', marginBottom: 12 }}>Quick Bet</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {game.odds.spread && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => betGame(game, `${game.away?.abbr || 'Away'} ${game.odds.spread}`)}
                              style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #1e2a4a', background: 'transparent', color: '#F5F5FA', fontSize: 12, cursor: 'pointer', textAlign: 'center' }}
                              onMouseEnter={e => e.currentTarget.style.borderColor = '#2563EB'}
                              onMouseLeave={e => e.currentTarget.style.borderColor = '#1e2a4a'}>
                              {game.away?.abbr || 'Away'} {game.odds.spread}
                            </button>
                            <button onClick={() => betGame(game, `${game.home?.abbr || 'Home'} ${game.odds.spread > 0 ? '-' : '+'}${Math.abs(parseFloat(game.odds.spread))}`)}
                              style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #1e2a4a', background: 'transparent', color: '#F5F5FA', fontSize: 12, cursor: 'pointer', textAlign: 'center' }}
                              onMouseEnter={e => e.currentTarget.style.borderColor = '#2563EB'}
                              onMouseLeave={e => e.currentTarget.style.borderColor = '#1e2a4a'}>
                              {game.home?.abbr || 'Home'} {game.odds.spread > 0 ? '-' : '+'}{Math.abs(parseFloat(game.odds.spread) || 0)}
                            </button>
                          </div>
                        )}
                        {game.odds.total && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => betGame(game, `Over ${game.odds.total}`)}
                              style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #1e2a4a', background: 'transparent', color: '#22c55e', fontSize: 12, cursor: 'pointer', textAlign: 'center' }}
                              onMouseEnter={e => e.currentTarget.style.borderColor = '#22c55e'}
                              onMouseLeave={e => e.currentTarget.style.borderColor = '#1e2a4a'}>
                              Over {game.odds.total}
                            </button>
                            <button onClick={() => betGame(game, `Under ${game.odds.total}`)}
                              style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #1e2a4a', background: 'transparent', color: '#ef4444', fontSize: 12, cursor: 'pointer', textAlign: 'center' }}
                              onMouseEnter={e => e.currentTarget.style.borderColor = '#ef4444'}
                              onMouseLeave={e => e.currentTarget.style.borderColor = '#1e2a4a'}>
                              Under {game.odds.total}
                            </button>
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => betGame(game, `${game.away?.name} ML ${fmtML(game.odds.awayML)}`)}
                            style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #1e2a4a', background: 'transparent', color: '#F5F5FA', fontSize: 12, cursor: 'pointer', textAlign: 'center' }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = '#2563EB'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = '#1e2a4a'}>
                            {game.away?.abbr || 'Away'} ML {fmtML(game.odds.awayML)}
                          </button>
                          <button onClick={() => betGame(game, `${game.home?.name} ML ${fmtML(game.odds.homeML)}`)}
                            style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #1e2a4a', background: 'transparent', color: '#F5F5FA', fontSize: 12, cursor: 'pointer', textAlign: 'center' }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = '#2563EB'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = '#1e2a4a'}>
                            {game.home?.abbr || 'Home'} ML {fmtML(game.odds.homeML)}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Game info */}
                  <div style={{ background: '#0a0f1e', borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#4a5a7a', marginBottom: 12 }}>Game Info</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: '#4a5a7a' }}>Sport</span>
                        <span style={{ color: '#F5F5FA', fontWeight: 600 }}>{sport}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: '#4a5a7a' }}>Date</span>
                        <span style={{ color: '#F5F5FA' }}>{fmtDate(game.date)}</span>
                      </div>
                      {game.odds?.provider && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <span style={{ color: '#4a5a7a' }}>Odds provider</span>
                          <span style={{ color: '#F5F5FA' }}>{game.odds.provider}</span>
                        </div>
                      )}
                      {game.odds?.overUnder && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <span style={{ color: '#4a5a7a' }}>Over/Under</span>
                          <span style={{ color: '#F5F5FA', fontWeight: 600 }}>{game.odds.overUnder}</span>
                        </div>
                      )}
                      <div style={{ borderTop: '1px solid #1e2a4a', paddingTop: 8, marginTop: 4 }}>
                        <button onClick={() => analyzeGame(game)}
                          style={{ width: '100%', background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.25)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#60a5fa', cursor: 'pointer', fontWeight: 600 }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,142,247,0.2)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(79,142,247,0.1)'}>
                          Deep analysis with AI →
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
