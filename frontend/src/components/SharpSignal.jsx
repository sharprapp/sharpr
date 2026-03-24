import { useState, useEffect } from 'react';

export default function SharpSignal({ userPlan }) {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [stats, setStats] = useState(null);
  const [hedgeModal, setHedgeModal] = useState(null);
  const isPro = userPlan === 'pro' || userPlan === 'elite';

  useEffect(() => { fetchSignals(); const i = setInterval(fetchSignals, 120000); return () => clearInterval(i); }, []);

  async function fetchSignals() {
    setLoading(true);
    try {
      const r = await fetch(`${import.meta.env.VITE_API_URL}/api/sharpsignal/signals`);
      const d = await r.json();
      setSignals(d.signals || []);
      setStats({ total: d.total, sports: d.sportsSignals, poly: d.polySignals });
      setLastUpdated(new Date());
      setError(null);
    } catch { setError('Could not load signals'); }
    finally { setLoading(false); }
  }

  // Quality filter: min $25K volume, min 7% edge, exclude junk categories
  const JUNK_SIGNAL_RE = /weather|temperature|rain|snow|hurricane|entertainment|local.*election|mayor|city.*council/i;
  const qualitySignals = signals.filter(s =>
    (s.volume || 0) >= 25000 &&
    Math.abs(s.edge || 0) >= 7 &&
    !JUNK_SIGNAL_RE.test(s.event || '') && !JUNK_SIGNAL_RE.test(s.title || '')
  );
  const filtered = qualitySignals.filter(s => filter === 'sports' ? s.type === 'sports' : filter === 'polymarket' ? s.type === 'polymarket' : filter === 'high' ? s.confidence === 'HIGH' : true);
  const fmtOdds = n => n == null ? '--' : n > 0 ? '+' + n : '' + n;
  const timeAgo = d => { if (!d) return ''; const s = Math.floor((Date.now() - d.getTime()) / 1000); return s < 60 ? s + 's ago' : s < 3600 ? Math.floor(s / 60) + 'm ago' : Math.floor(s / 3600) + 'h ago'; };
  const confStyle = c => c === 'HIGH' ? { bg: 'rgba(34,197,94,0.15)', color: '#4ade80', border: 'rgba(34,197,94,0.3)' } : c === 'MEDIUM' ? { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: 'rgba(245,158,11,0.3)' } : { bg: 'rgba(148,163,184,0.1)', color: '#94a3b8', border: 'rgba(148,163,184,0.2)' };
  const gc = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#f0f4ff' }}>Sharp Signals</span>
            <span style={{ background: 'rgba(79,142,247,0.15)', border: '1px solid rgba(79,142,247,0.3)', borderRadius: 100, padding: '3px 10px', fontSize: 10, fontWeight: 700, color: '#7aaff8' }}>BETA</span>
            {!isPro && <span style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 100, padding: '3px 10px', fontSize: 10, fontWeight: 700, color: '#fbbf24' }}>PRO</span>}
          </div>
          <div style={{ fontSize: 13, color: '#4a5a7a' }}>Cross-referencing Polymarket vs sportsbook implied odds to find mispricings</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastUpdated && <span style={{ fontSize: 10, color: '#1a2535' }}>Updated {timeAgo(lastUpdated)}</span>}
          <button onClick={fetchSignals} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 12px', fontSize: 11, color: '#4a5a7a', cursor: 'pointer' }}>↻ Refresh</button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'flex', gap: 10, margin: '16px 0' }}>
          {[{ l: 'Total', v: stats.total, c: '#7aaff8' }, { l: 'Sports', v: stats.sports, c: '#22c55e' }, { l: 'Poly', v: stats.poly, c: '#a78bfa' }, { l: 'High Conf', v: signals.filter(s => s.confidence === 'HIGH').length, c: '#fbbf24' }].map(x => (
            <div key={x.l} style={{ ...gc, padding: '12px 16px', flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: x.c }}>{x.v}</div>
              <div style={{ fontSize: 10, color: '#2a3a5a', marginTop: 2 }}>{x.l}</div>
            </div>
          ))}
        </div>
      )}

      {/* How it works */}
      <div style={{ ...gc, padding: 16, marginBottom: 20, background: 'rgba(79,142,247,0.04)', borderColor: 'rgba(79,142,247,0.15)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#7aaff8', marginBottom: 8, letterSpacing: '1px', textTransform: 'uppercase' }}>How it works</div>
        <div style={{ fontSize: 12, color: '#4a5a7a', lineHeight: 1.7 }}>
          We compare Polymarket YES probabilities against implied probabilities from DraftKings, FanDuel, and BetMGM. When they diverge by &gt;5%, there may be a mispricing. <span style={{ color: '#22c55e' }}>POLY_HIGHER</span> = Polymarket overvalues, consider sportsbook side. <span style={{ color: '#f59e0b' }}>BOOK_HIGHER</span> = sportsbooks overvalue, consider Polymarket YES.
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[{ k: 'all', l: 'All Signals' }, { k: 'high', l: '⚡ High Confidence' }, { k: 'sports', l: '🏆 Sports' }, { k: 'polymarket', l: '🎯 Polymarket' }].map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)} style={{ padding: '7px 14px', borderRadius: 100, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: filter === f.k ? 'rgba(79,142,247,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${filter === f.k ? 'rgba(79,142,247,0.4)' : 'rgba(255,255,255,0.08)'}`, color: filter === f.k ? '#7aaff8' : '#4a5a7a' }}>{f.l}</button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#2a3a5a', alignSelf: 'center' }}>{filtered.length} signals</span>
      </div>

      {/* Pro gate */}
      {!isPro && (
        <div style={{ position: 'relative' }}>
          <div style={{ filter: 'blur(4px)', pointerEvents: 'none' }}>{[1, 2, 3].map(i => <div key={i} style={{ ...gc, padding: 20, marginBottom: 12, height: 120 }} />)}</div>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(3,3,10,0.8)', backdropFilter: 'blur(8px)', borderRadius: 16 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#f0f4ff', marginBottom: 8 }}>Sharp Signals — Pro Feature</div>
            <div style={{ fontSize: 13, color: '#4a5a7a', marginBottom: 20, textAlign: 'center', maxWidth: 360 }}>Cross-referenced mispricings between Polymarket and sportsbooks.</div>
            <button onClick={() => window.dispatchEvent(new CustomEvent('open-upgrade'))} style={{ background: '#4f8ef7', border: 'none', borderRadius: 12, padding: '12px 32px', fontSize: 14, fontWeight: 700, color: 'white', cursor: 'pointer' }}>Upgrade to Pro — $19/mo</button>
          </div>
        </div>
      )}

      {/* Signals */}
      {isPro && loading && <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{[1, 2, 3, 4].map(i => <div key={i} style={{ ...gc, height: 140, animation: 'pulse 1.5s infinite' }} />)}</div>}
      {isPro && !loading && error && <div style={{ ...gc, padding: 32, textAlign: 'center', color: '#ef4444', fontSize: 13 }}>{error} — <button onClick={fetchSignals} style={{ color: '#7aaff8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>retry</button></div>}
      {isPro && !loading && !error && filtered.length === 0 && <div style={{ ...gc, padding: 40, textAlign: 'center' }}><div style={{ fontSize: 32, marginBottom: 12 }}>📡</div><div style={{ fontSize: 16, fontWeight: 700, color: '#f0f4ff', marginBottom: 8 }}>No actionable signals right now</div><div style={{ fontSize: 13, color: '#4a5a7a' }}>Signals update every 15 minutes. Only showing divergences over 7% with $25K+ volume.</div></div>}

      {isPro && !loading && filtered.map(sig => {
        const cs = confStyle(sig.confidence);
        return (
          <div key={sig.id} style={{ ...gc, padding: 20, marginBottom: 12, transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(79,142,247,0.3)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
            {/* Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700, color: '#7aaff8' }}>{sig.sport}</span>
              <span style={{ background: cs.bg, border: `1px solid ${cs.border}`, borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700, color: cs.color }}>{sig.confidence}</span>
              {sig.edge != null && <span style={{ background: Math.abs(sig.edge) > 10 ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)', border: `1px solid ${Math.abs(sig.edge) > 10 ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`, borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700, color: Math.abs(sig.edge) > 10 ? '#4ade80' : '#fbbf24' }}>{sig.edge > 0 ? '+' : ''}{sig.edge}% EDGE</span>}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f0f4ff', marginBottom: 4 }}>{sig.event || sig.polyMarket}</div>
            {sig.type === 'sports' && sig.polyMarket !== sig.event && <div style={{ fontSize: 11, color: '#2a3a5a', marginBottom: 8 }}>Poly: {sig.polyMarket}</div>}

            {/* Stats grid */}
            {sig.type === 'sports' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div style={{ background: '#0a0f1e', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: '#2a3a5a', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>Polymarket YES</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#a78bfa' }}>{sig.polyYesProb}¢</div>
                </div>
                <div style={{ background: '#0a0f1e', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: '#2a3a5a', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>Book Implied</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#7aaff8' }}>{sig.bookHomeProb}%</div>
                  <div style={{ fontSize: 10, color: '#4a5a7a' }}>{fmtOdds(sig.bookHomeML)} ML</div>
                </div>
                <div style={{ background: '#0a0f1e', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: '#2a3a5a', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>Mispricing</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: sig.edge > 0 ? '#4ade80' : '#f59e0b' }}>{sig.edge > 0 ? '+' : ''}{sig.edge}%</div>
                </div>
              </div>
            )}
            {sig.type === 'polymarket' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div style={{ background: '#0a0f1e', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: '#2a3a5a', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>YES Price</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#a78bfa' }}>{sig.polyYesProb}¢</div>
                </div>
                <div style={{ background: '#0a0f1e', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: '#2a3a5a', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>Volume</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#7aaff8' }}>${sig.volume >= 1e6 ? (sig.volume / 1e6).toFixed(1) + 'M' : (sig.volume / 1000).toFixed(0) + 'K'}</div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12, color: '#4a5a7a', fontStyle: 'italic' }}>💡 {sig.signal}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {sig.polyUrl && <a href={sig.polyUrl} target="_blank" rel="noopener noreferrer" style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 700, color: '#a78bfa', textDecoration: 'none' }}>View on Poly →</a>}
                {sig.type === 'sports' && <button onClick={() => setHedgeModal(sig)} style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 700, color: '#4ade80', cursor: 'pointer' }}>Hedge Calc</button>}
              </div>
            </div>
          </div>
        );
      })}

      {/* Hedge modal */}
      {hedgeModal && <HedgeModal signal={hedgeModal} onClose={() => setHedgeModal(null)} />}
    </div>
  );
}

function HedgeModal({ signal, onClose }) {
  const [stake, setStake] = useState('100');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (signal.bookHomeML == null || signal.polyYesProb == null) return;
    fetch(`${import.meta.env.VITE_API_URL}/api/sharpsignal/hedge-calc?polyProb=${signal.polyYesProb}&bookOdds=${signal.bookHomeML}&stake=${stake}`)
      .then(r => r.json()).then(setResult).catch(() => {});
  }, [stake]);

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#070712', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 32, width: '100%', maxWidth: 440, position: 'relative' }}>
        <div onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, cursor: 'pointer', color: '#4a5a7a', fontSize: 18 }}>✕</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#f0f4ff', marginBottom: 4 }}>Hedge Calculator</div>
        <div style={{ fontSize: 12, color: '#4a5a7a', marginBottom: 24 }}>{signal.event}</div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#4a5a7a', marginBottom: 8 }}>Polymarket stake ($)</div>
          <input type="number" value={stake} onChange={e => setStake(e.target.value)} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#f0f4ff', fontSize: 16, fontWeight: 600, boxSizing: 'border-box' }} />
        </div>
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { l: 'Poly stake', v: '$' + stake, c: '#7aaff8' },
              { l: 'Hedge bet', v: '$' + result.hedgeStake, c: '#fbbf24' },
              { l: 'Locked profit', v: '$' + result.lockedProfit, c: '#4ade80' },
              { l: 'ROI if YES', v: result.roiIfYes + '%', c: '#22c55e' },
              { l: 'ROI if NO', v: result.roiIfNo + '%', c: '#f59e0b' },
            ].map(x => (
              <div key={x.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
                <span style={{ fontSize: 13, color: '#4a5a7a' }}>{x.l}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: x.c }}>{x.v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
