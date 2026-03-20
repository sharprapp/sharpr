import { useState, useEffect } from 'react';
import api from '../lib/api';

function fmtOdds(n) { return n == null ? '--' : n > 0 ? '+' + n : '' + n; }
function fmtSpread(n) { return n == null ? '--' : n > 0 ? '+' + n : '' + n; }

export default function GameDetailModal({ game: g, onClose, userPlan }) {
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [props, setProps] = useState(null);
  const [propsLoading, setPropsLoading] = useState(false);
  const isPro = userPlan === 'pro' || userPlan === 'elite';

  useEffect(() => {
    if (!isPro) return;
    setAiLoading(true);
    api.post('/api/ai/query', {
      query: `Sharp betting analysis: ${g.awayTeam} vs ${g.homeTeam}. Sport: ${g.sport}. Spread: ${g.awayTeam} ${fmtSpread(g.awaySpread)} / ${g.homeTeam} ${fmtSpread(g.homeSpread)}. ML: ${g.awayTeam} ${fmtOdds(g.awayML)} / ${g.homeTeam} ${fmtOdds(g.homeML)}. Total: ${g.overTotal || 'N/A'}. Give key matchup factors, sharp money context, and a CLEAR best bet with confidence.`,
      type: 'sports', use_web_search: true,
    }).then(r => setAiResult(r.data.result)).catch(e => setAiError(e.response?.data?.message || 'Analysis failed')).finally(() => setAiLoading(false));
  }, [g.id]);

  useEffect(() => {
    if (!isPro || !g.id) return;
    setPropsLoading(true);
    api.get(`/api/odds/props?sport=${g.sport}&gameId=${g.id}`).then(r => setProps(r.data.props || {})).catch(() => setProps(null)).finally(() => setPropsLoading(false));
  }, [g.id]);

  const mockBetPct = g.awayML > 0 ? 35 : 55;
  const mockMoneyPct = g.awayML > 0 ? 48 : 42;

  function logBet(betType) {
    const match = `${g.awayTeam} @ ${g.homeTeam}`;
    window.dispatchEvent(new CustomEvent('bet-prefill', { detail: { sport: g.sport, match: `${match} (${betType})` } }));
    onClose();
  }

  const gc = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 16 };
  const gameTime = g.commenceTime ? new Date(g.commenceTime).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 900, maxHeight: '92vh', overflowY: 'auto', background: '#070712', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20 }}>

        {/* Header */}
        <div style={{ padding: 24, background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#f0f4ff' }}>{g.awayTeam} <span style={{ color: '#2a3a5a', fontWeight: 400 }}>@</span> {g.homeTeam}</div>
            <div style={{ fontSize: 12, color: '#4a5a7a', marginTop: 4, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>{gameTime}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(79,142,247,0.1)', color: '#7aaff8', textTransform: 'uppercase' }}>{g.sport}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#6a7a9a', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Odds table */}
          <div style={gc}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#4a5a7a', marginBottom: 12 }}>Main Lines</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div style={{ background: '#0a0f1e', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#2a3a5a', marginBottom: 6 }}>SPREAD</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#F5F5FA', marginBottom: 2 }}>{g.awayTeam?.split(' ').pop()} {fmtSpread(g.awaySpread)} <span style={{ fontSize: 11, color: '#4a5a7a' }}>({fmtOdds(g.awaySpreadOdds)})</span></div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#F5F5FA' }}>{g.homeTeam?.split(' ').pop()} {fmtSpread(g.homeSpread)} <span style={{ fontSize: 11, color: '#4a5a7a' }}>({fmtOdds(g.homeSpreadOdds)})</span></div>
              </div>
              <div style={{ background: '#0a0f1e', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#2a3a5a', marginBottom: 6 }}>MONEYLINE</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: g.awayML > 0 ? '#22c55e' : '#F5F5FA', marginBottom: 2 }}>{g.awayTeam?.split(' ').pop()} {fmtOdds(g.awayML)}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: g.homeML > 0 ? '#22c55e' : '#F5F5FA' }}>{g.homeTeam?.split(' ').pop()} {fmtOdds(g.homeML)}</div>
              </div>
              <div style={{ background: '#0a0f1e', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#2a3a5a', marginBottom: 6 }}>TOTAL</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#F5F5FA', marginBottom: 2 }}>Over {g.overTotal || '--'} <span style={{ fontSize: 11, color: '#4a5a7a' }}>({fmtOdds(g.overOdds)})</span></div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#F5F5FA' }}>Under {g.overTotal || '--'} <span style={{ fontSize: 11, color: '#4a5a7a' }}>({fmtOdds(g.underOdds)})</span></div>
              </div>
            </div>
          </div>

          {/* Sharp money mock */}
          <div style={gc}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#4a5a7a', marginBottom: 12 }}>Betting Action</div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: '#2a3a5a', marginBottom: 6 }}>Bet %</div>
                <div style={{ height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex', background: '#1e2a4a' }}>
                  <div style={{ width: mockBetPct + '%', background: '#4f8ef7', borderRadius: '4px 0 0 4px' }} />
                  <div style={{ flex: 1, background: '#ef4444', borderRadius: '0 4px 4px 0' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#6a7a9a', marginTop: 4 }}>
                  <span>{g.awayTeam?.split(' ').pop()} {mockBetPct}%</span>
                  <span>{g.homeTeam?.split(' ').pop()} {100 - mockBetPct}%</span>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: '#2a3a5a', marginBottom: 6 }}>Money %</div>
                <div style={{ height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex', background: '#1e2a4a' }}>
                  <div style={{ width: mockMoneyPct + '%', background: '#22c55e', borderRadius: '4px 0 0 4px' }} />
                  <div style={{ flex: 1, background: '#f59e0b', borderRadius: '0 4px 4px 0' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#6a7a9a', marginTop: 4 }}>
                  <span>{mockMoneyPct}%</span><span>{100 - mockMoneyPct}%</span>
                </div>
              </div>
            </div>
            {Math.abs(mockBetPct - mockMoneyPct) > 12 && (
              <div style={{ marginTop: 8, fontSize: 11, color: '#f59e0b', background: 'rgba(245,158,11,0.08)', padding: '6px 10px', borderRadius: 8 }}>
                Sharp action detected — money and bets diverging
              </div>
            )}
          </div>

          {/* Player props */}
          <div style={gc}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#4a5a7a', marginBottom: 12 }}>Player Props</div>
            {!isPro ? (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <div style={{ fontSize: 20, marginBottom: 8 }}>🔒</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f0f4ff', marginBottom: 4 }}>Player Props — Pro Feature</div>
                <div style={{ fontSize: 11, color: '#4a5a7a', marginBottom: 12 }}>Upgrade for full player prop odds</div>
                <button onClick={() => window.dispatchEvent(new CustomEvent('open-upgrade'))} style={{ background: '#4f8ef7', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 20px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Upgrade to Pro</button>
              </div>
            ) : propsLoading ? (
              <div style={{ textAlign: 'center', padding: 16, fontSize: 12, color: '#4a5a7a' }}>Loading props...</div>
            ) : props && Object.keys(props).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Object.entries(props).slice(0, 8).map(([player, stats]) => (
                  <div key={player} style={{ background: '#0a0f1e', borderRadius: 8, padding: '8px 12px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#F5F5FA', marginBottom: 4 }}>{player}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {Object.entries(stats).map(([stat, val]) => (
                        <div key={stat} style={{ fontSize: 10, color: '#6a7a9a', background: 'rgba(255,255,255,0.03)', padding: '3px 8px', borderRadius: 6 }}>
                          {stat} {val.line} <span style={{ color: '#22c55e' }}>O{fmtOdds(val.over)}</span> <span style={{ color: '#ef4444' }}>U{fmtOdds(val.under)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#2a3a5a', textAlign: 'center', padding: 12 }}>Props not yet available for this game</div>
            )}
          </div>

          {/* AI Analysis */}
          <div style={gc}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#7aaff8', marginBottom: 12 }}>AI Game Analysis</div>
            {!isPro ? (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <div style={{ fontSize: 20, marginBottom: 8 }}>🔒</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f0f4ff', marginBottom: 4 }}>AI Game Analysis — Pro Feature</div>
                <div style={{ fontSize: 11, color: '#4a5a7a', marginBottom: 12 }}>Get sharp AI analysis on every game</div>
                <button onClick={() => window.dispatchEvent(new CustomEvent('open-upgrade'))} style={{ background: '#4f8ef7', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 20px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Upgrade to Pro</button>
              </div>
            ) : aiLoading ? (
              <div style={{ textAlign: 'center', padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>{[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#4f8ef7', animation: `pulse 1.2s infinite ${i*0.2}s` }} />)}</div>
                <div style={{ fontSize: 12, color: '#4a5a7a', marginTop: 8 }}>Analyzing matchup...</div>
              </div>
            ) : aiError ? (
              <div style={{ fontSize: 12, color: '#ef4444' }}>{aiError}</div>
            ) : aiResult ? (
              <div style={{ fontSize: 12, color: '#6a7a9a', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {aiResult.split('\n').map((line, i) => {
                  const isVerdict = line.startsWith('VERDICT:');
                  const isConf = line.startsWith('Confidence:');
                  if (isVerdict) return (
                    <div key={i} style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '8px 12px', marginTop: 8 }}>
                      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a5a7a', marginBottom: 4 }}>Best Bet</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#4ade80' }}>{line.replace('VERDICT:', '').trim()}</div>
                    </div>
                  );
                  return <div key={i} style={{ color: isConf ? '#60a5fa' : '#6a7a9a', fontWeight: isConf ? 700 : 400 }}>{line || '\u00A0'}</div>;
                })}
              </div>
            ) : null}
          </div>

          {/* Quick bet */}
          <div style={gc}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#4a5a7a', marginBottom: 12 }}>Quick Bet</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[
                { label: `${g.awayTeam?.split(' ').pop()} ${fmtSpread(g.awaySpread)}`, type: `${g.awayTeam} ${fmtSpread(g.awaySpread)}` },
                { label: `${g.homeTeam?.split(' ').pop()} ${fmtSpread(g.homeSpread)}`, type: `${g.homeTeam} ${fmtSpread(g.homeSpread)}` },
                { label: `${g.awayTeam?.split(' ').pop()} ML ${fmtOdds(g.awayML)}`, type: `${g.awayTeam} ML ${fmtOdds(g.awayML)}` },
                { label: `${g.homeTeam?.split(' ').pop()} ML ${fmtOdds(g.homeML)}`, type: `${g.homeTeam} ML ${fmtOdds(g.homeML)}` },
                { label: `Over ${g.overTotal || '--'}`, type: `Over ${g.overTotal}` },
                { label: `Under ${g.overTotal || '--'}`, type: `Under ${g.overTotal}` },
              ].map(b => (
                <button key={b.label} onClick={() => logBet(b.type)}
                  style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#F5F5FA', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#4f8ef7'; e.currentTarget.style.background = 'rgba(79,142,247,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}>
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
