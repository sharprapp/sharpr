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

  const JUNK_SIGNAL_RE = /weather|temperature|rain|snow|hurricane|entertainment|local.*election|mayor|city.*council/i;
  const qualitySignals = signals.filter(s =>
    (s.volume || 0) >= 20000 &&
    (s.type === 'polymarket' || Math.abs(s.edge || 0) >= 5) &&
    !JUNK_SIGNAL_RE.test(s.event || '') && !JUNK_SIGNAL_RE.test(s.title || '')
  );
  // Downgrade HIGH CONFIDENCE for sports signals with negative edge — they're opportunities but misleading as "high confidence"
  function effectiveConfidence(s) {
    if (s.confidence === 'HIGH' && s.type === 'sports' && s.edge != null && s.edge < 0) return 'MEDIUM';
    return s.confidence;
  }
  const filtered = qualitySignals.filter(s => filter === 'sports' ? s.type === 'sports' : filter === 'polymarket' ? s.type === 'polymarket' : filter === 'high' ? effectiveConfidence(s) === 'HIGH' : true);
  const fmtOdds = n => n == null ? '--' : n > 0 ? '+' + n : '' + n;
  const timeAgo = d => { if (!d) return ''; const s = Math.floor((Date.now() - d.getTime()) / 1000); return s < 60 ? s + 's ago' : s < 3600 ? Math.floor(s / 60) + 'm ago' : Math.floor(s / 3600) + 'h ago'; };
  const confStyle = c => c === 'HIGH' ? { bg: 'rgba(34,197,94,0.15)', color: '#0A0A0F', border: 'rgba(34,197,94,0.3)' } : c === 'MEDIUM' ? { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: 'rgba(245,158,11,0.3)' } : { bg: 'rgba(148,163,184,0.1)', color: '#94a3b8', border: 'rgba(148,163,184,0.2)' };
  const gc = { background: 'rgba(17,17,32,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#f0f4ff' }}>Sharp Signals</span>
            <span style={{ background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.3)', borderRadius: 100, padding: '3px 10px', fontSize: 10, fontWeight: 800, letterSpacing: '-0.03em', color: '#867fff' }}>BETA</span>
            {!isPro && <span style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 100, padding: '3px 10px', fontSize: 10, fontWeight: 800, letterSpacing: '-0.03em', color: '#fbbf24' }}>PRO</span>}
          </div>
          <div style={{ fontSize: 13, color: '#4E4E63' }}>Cross-referencing Polymarket vs sportsbook implied odds to find mispricings</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastUpdated && <span style={{ fontSize: 10, color: '#1a2535' }}>Updated {timeAgo(lastUpdated)}</span>}
          <button onClick={fetchSignals} style={{ background: '#1A1A24', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 8, padding: '6px 12px', fontSize: 11, color: '#4E4E63', cursor: 'pointer' }}>↻ Refresh</button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'flex', gap: 10, margin: '16px 0' }}>
          {[{ l: 'Total', v: stats.total, c: '#867fff' }, { l: 'Sports', v: stats.sports, c: '#0A0A0F' }, { l: 'Poly', v: stats.poly, c: '#a78bfa' }, { l: 'High Conf', v: signals.filter(s => s.confidence === 'HIGH').length, c: '#fbbf24' }].map(x => (
            <div key={x.l} style={{ ...gc, padding: '12px 16px', flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: x.c }}>{x.v}</div>
              <div style={{ fontSize: 10, color: '#2a3a5a', marginTop: 2 }}>{x.l}</div>
            </div>
          ))}
        </div>
      )}

      {/* How it works */}
      <div style={{ ...gc, padding: 16, marginBottom: 20, background: 'rgba(108,99,255,0.04)', borderColor: 'rgba(108,99,255,0.15)' }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '-0.03em', color: '#867fff', marginBottom: 8, letterSpacing: '1px', textTransform: 'uppercase' }}>How it works</div>
        <div style={{ fontSize: 12, color: '#4E4E63', lineHeight: 1.7 }}>
          Sharp Signals scans Polymarket prediction markets for high-volume opportunities. When a market has significant money behind it and closes within 90 days, it appears here as a signal worth tracking.
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[{ k: 'all', l: 'All Signals' }, { k: 'high', l: '⚡ High Confidence' }, { k: 'sports', l: '🏆 Sports' }, { k: 'polymarket', l: '🎯 Polymarket' }].map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)} style={{ padding: '7px 14px', borderRadius: 100, fontSize: 11, fontWeight: 800, letterSpacing: '-0.03em', cursor: 'pointer', background: filter === f.k ? 'rgba(108,99,255,0.15)' : '#111118', border: `1px solid ${filter === f.k ? 'rgba(108,99,255,0.4)' : 'rgba(108,99,255,0.2)'}`, color: filter === f.k ? '#867fff' : '#4E4E63' }}>{f.l}</button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#2a3a5a', alignSelf: 'center' }}>{filtered.length} signals</span>
      </div>

      {/* Explanation */}
      {isPro && filtered.length > 0 && (
        <div style={{ fontSize: 12, color: '#4E4E63', marginBottom: 12, fontStyle: 'italic' }}>These markets have high volume and notable pricing — worth watching for edge opportunities.</div>
      )}

      {/* Pro gate */}
      {!isPro && (
        <div style={{ position: 'relative' }}>
          <div style={{ filter: 'blur(4px)', pointerEvents: 'none' }}>{[1, 2, 3].map(i => <div key={i} style={{ ...gc, padding: 20, marginBottom: 12, height: 120 }} />)}</div>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(3,3,10,0.8)', backdropFilter: 'blur(8px)', borderRadius: 16 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#f0f4ff', marginBottom: 8 }}>Sharp Signals — Pro Feature</div>
            <div style={{ fontSize: 13, color: '#4E4E63', marginBottom: 20, textAlign: 'center', maxWidth: 360 }}>Cross-referenced mispricings between Polymarket and sportsbooks.</div>
            <button onClick={() => window.dispatchEvent(new CustomEvent('open-upgrade'))} style={{ background: '#6C63FF', border: 'none', borderRadius: 12, padding: '12px 32px', fontSize: 14, fontWeight: 800, letterSpacing: '-0.03em', color: 'white', cursor: 'pointer' }}>Upgrade to Pro — $19/mo</button>
          </div>
        </div>
      )}

      {/* Signals */}
      {isPro && loading && <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{[1, 2, 3, 4].map(i => <div key={i} style={{ ...gc, height: 140, animation: 'pulse 1.5s infinite' }} />)}</div>}
      {isPro && !loading && error && <div style={{ ...gc, padding: 32, textAlign: 'center', color: '#FF4560', fontSize: 13 }}>{error} — <button onClick={fetchSignals} style={{ color: '#867fff', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>retry</button></div>}
      {isPro && !loading && !error && filtered.length === 0 && <div style={{ ...gc, padding: 48, textAlign: 'center' }}><div style={{ fontSize: 40, marginBottom: 14 }}>📡</div><div style={{ fontSize: 18, fontWeight: 800, color: '#f0f4ff', marginBottom: 10 }}>Signals are being monitored</div><div style={{ fontSize: 13, color: '#6a7a9a', maxWidth: 440, margin: '0 auto', lineHeight: 1.7 }}>Quality signals appear here when Polymarket and sportsbook odds diverge by 8%+ on markets with $75K+ volume. Check back throughout the day as odds update.</div></div>}

      {isPro && !loading && filtered.map(sig => {
        const conf = effectiveConfidence(sig);
        const cs = confStyle(conf);
        return (
          <div key={sig.id} style={{ ...gc, padding: 20, marginBottom: 12, transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(108,99,255,0.3)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
            {/* Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 800, letterSpacing: '-0.03em', color: '#867fff' }}>{sig.sport === 'MULTI' ? 'PREDICTION MARKET' : sig.sport}</span>
              <span style={{ background: cs.bg, border: `1px solid ${cs.border}`, borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 800, letterSpacing: '-0.03em', color: cs.color }}>{conf === 'HIGH' ? 'HIGH CONFIDENCE' : conf === 'MEDIUM' ? 'MEDIUM CONFIDENCE' : conf}</span>
              {sig.edge != null && <span style={{ background: Math.abs(sig.edge) > 10 ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)', border: `1px solid ${Math.abs(sig.edge) > 10 ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`, borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 800, letterSpacing: '-0.03em', color: Math.abs(sig.edge) > 10 ? '#22c55e' : '#fbbf24' }}>{sig.edge > 0 ? '+' : ''}{sig.edge}% EDGE</span>}
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.03em', color: '#f0f4ff', marginBottom: 4 }}>{sig.event || sig.polyMarket}</div>
            {sig.type === 'sports' && sig.polyMarket !== sig.event && <div style={{ fontSize: 11, color: '#2a3a5a', marginBottom: 8 }}>Poly: {sig.polyMarket}</div>}

            {/* Sports cross-ref card layout */}
            {sig.type === 'sports' && sig.edge != null && (() => {
              const polyHigher = sig.edge > 0;
              const bookName = sig.book || 'Sportsbook';
              const polyProb = sig.polymarket_prob || sig.polyYesProb;
              const bookProb = sig.book_prob || sig.bookHomeProb;
              const odds = sig.bookOdds || sig.bookHomeML;
              const volStr = sig.volume >= 1e6 ? '$' + (sig.volume / 1e6).toFixed(1) + 'M' : '$' + (sig.volume / 1000).toFixed(0) + 'K';
              const edgeColor = polyHigher ? '#00E5B4' : '#FF4560';
              return (<>
                {/* Probability comparison row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, marginBottom: 14, alignItems: 'center' }}>
                  <div style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: '#a78bfa', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>Polymarket YES</div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: '#a78bfa', lineHeight: 1 }}>{polyProb}%</div>
                    <div style={{ fontSize: 10, color: '#4E4E63', marginTop: 2 }}>{polyProb}¢ per share</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: edgeColor }}>{sig.edge > 0 ? '+' : ''}{sig.edge}%</div>
                    <div style={{ fontSize: 8, color: '#4E4E63', letterSpacing: '1px', textTransform: 'uppercase' }}>edge</div>
                  </div>
                  <div style={{ background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: '#867fff', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>{bookName}</div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: '#867fff', lineHeight: 1 }}>{bookProb}%</div>
                    <div style={{ fontSize: 10, color: '#4E4E63', marginTop: 2 }}>{odds != null ? fmtOdds(odds) : 'implied'}</div>
                  </div>
                </div>

                {/* HOW TO PLAY IT — two action cards */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 9, color: '#4E4E63', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 800, marginBottom: 8 }}>How to play it</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>

                    {/* Sportsbook action */}
                    <div style={{
                      borderRadius: 10, padding: '12px 14px',
                      background: polyHigher ? 'rgba(0,229,180,0.08)' : 'rgba(17,17,32,0.6)',
                      border: polyHigher ? '1px solid rgba(0,229,180,0.35)' : '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <div style={{ fontSize: 9, color: polyHigher ? '#00E5B4' : '#4E4E63', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 800, marginBottom: 6 }}>
                        🎰 {bookName}
                      </div>
                      {polyHigher ? (<>
                        <div style={{ fontSize: 13, fontWeight: 900, color: '#00E5B4', marginBottom: 4, letterSpacing: '-0.02em' }}>
                          Back YES{odds != null ? ` @ ${fmtOdds(odds)}` : ''}
                        </div>
                        <div style={{ fontSize: 11, color: '#6B6B8A', lineHeight: 1.5 }}>
                          Sportsbook has YES at {bookProb}% — {sig.edge}% cheaper than Polymarket. Best value is here.
                        </div>
                      </>) : (<>
                        <div style={{ fontSize: 13, fontWeight: 900, color: '#4E4E63', marginBottom: 4, letterSpacing: '-0.02em' }}>
                          No edge at book
                        </div>
                        <div style={{ fontSize: 11, color: '#4E4E63', lineHeight: 1.5 }}>
                          {bookName} is pricing YES at {bookProb}% — {Math.abs(sig.edge)}% above Polymarket. Book is overpriced here.
                        </div>
                      </>)}
                    </div>

                    {/* Polymarket action */}
                    <div style={{
                      borderRadius: 10, padding: '12px 14px',
                      background: !polyHigher ? 'rgba(167,139,250,0.1)' : 'rgba(17,17,32,0.6)',
                      border: !polyHigher ? '1px solid rgba(167,139,250,0.4)' : '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <div style={{ fontSize: 9, color: !polyHigher ? '#a78bfa' : '#4E4E63', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 800, marginBottom: 6 }}>
                        📊 Polymarket
                      </div>
                      {!polyHigher ? (<>
                        <div style={{ fontSize: 13, fontWeight: 900, color: '#a78bfa', marginBottom: 4, letterSpacing: '-0.02em' }}>
                          Buy YES @ {polyProb}¢
                        </div>
                        <div style={{ fontSize: 11, color: '#6B6B8A', lineHeight: 1.5 }}>
                          Polymarket has YES at {polyProb}% — {Math.abs(sig.edge)}% cheaper than {bookName}. Buy YES here.
                        </div>
                      </>) : (<>
                        <div style={{ fontSize: 13, fontWeight: 900, color: '#4E4E63', marginBottom: 4, letterSpacing: '-0.02em' }}>
                          Already priced in @ {polyProb}¢
                        </div>
                        <div style={{ fontSize: 11, color: '#4E4E63', lineHeight: 1.5 }}>
                          Polymarket has this at {polyProb}% — edge is at the book, not here.
                        </div>
                      </>)}
                    </div>

                  </div>
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 11, color: '#4E4E63' }}>{volStr} volume · Closes in {Math.round(sig.daysToClose)} days</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {sig.polyUrl && <a href={sig.polyUrl} target="_blank" rel="noopener noreferrer" style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 800, color: '#a78bfa', textDecoration: 'none' }}>Polymarket →</a>}
                    <button onClick={() => setHedgeModal(sig)} style={{ background: 'rgba(0,229,180,0.1)', border: '1px solid rgba(0,229,180,0.25)', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 800, color: '#00E5B4', cursor: 'pointer' }}>Hedge Calc</button>
                  </div>
                </div>
              </>);
            })()}

            {/* Poly-only card layout */}
            {(sig.type === 'polymarket' || (sig.type === 'sports' && sig.edge == null)) && (() => {
              const prob = sig.polyYesProb;
              const volStr = sig.volume >= 1e6 ? '$' + (sig.volume / 1e6).toFixed(1) + 'M' : '$' + (sig.volume / 1000).toFixed(0) + 'K';
              const strongYes = prob >= 65;
              const weakYes = prob >= 50 && prob < 65;
              const weakNo = prob < 50 && prob >= 35;
              const strongNo = prob < 35;
              const direction = strongYes ? 'BUY YES' : weakYes ? 'LEAN YES' : weakNo ? 'LEAN NO' : 'BUY NO';
              const dirColor = (strongYes || weakYes) ? '#00E5B4' : '#FF4560';
              const tradePrice = (strongYes || weakYes) ? prob : 100 - prob;
              const tradeLabel = (strongYes || weakYes) ? 'YES' : 'NO';
              return (<>
                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                  <div style={{ background: 'rgba(17,17,32,0.8)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: '#4E4E63', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>YES price</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#a78bfa' }}>{prob}¢</div>
                  </div>
                  <div style={{ background: 'rgba(17,17,32,0.8)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: '#4E4E63', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>NO price</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#6B6B8A' }}>{100 - prob}¢</div>
                  </div>
                  <div style={{ background: 'rgba(17,17,32,0.8)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: '#4E4E63', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>Volume</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#867fff' }}>{volStr}</div>
                  </div>
                </div>

                {/* Polymarket trade action */}
                <div style={{ background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
                  <div style={{ fontSize: 9, color: '#a78bfa', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 800, marginBottom: 6 }}>📊 Polymarket trade</div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: dirColor, letterSpacing: '-0.02em', marginBottom: 4 }}>
                    {direction} at {tradePrice}¢
                  </div>
                  <div style={{ fontSize: 11, color: '#6B6B8A', lineHeight: 1.5 }}>
                    {strongYes && `Market is pricing YES at ${prob}% — strong majority probability. Buy YES at ${prob}¢ if you agree.`}
                    {weakYes && `Market leans YES at ${prob}% — modest probability edge. Consider YES at ${prob}¢.`}
                    {weakNo && `Market leans NO at ${100 - prob}% — YES is minority at ${prob}¢. Consider NO at ${100 - prob}¢ if you disagree.`}
                    {strongNo && `Market has YES at only ${prob}% — strong NO probability. Buy NO at ${100 - prob}¢ if you agree.`}
                  </div>
                  <div style={{ fontSize: 10, color: '#4E4E63', marginTop: 6 }}>No sportsbook comparison — signal based on volume and close date</div>
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 11, color: '#4E4E63' }}>Closes in {Math.round(sig.daysToClose)} days</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {sig.polyUrl && <a href={sig.polyUrl} target="_blank" rel="noopener noreferrer" style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 800, color: '#a78bfa', textDecoration: 'none' }}>Trade on Polymarket →</a>}
                  </div>
                </div>
              </>);
            })()}
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
      <div style={{ background: '#0A0A0F', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 20, padding: 32, width: '100%', maxWidth: 440, position: 'relative' }}>
        <div onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, cursor: 'pointer', color: '#4E4E63', fontSize: 18 }}>✕</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#f0f4ff', marginBottom: 4 }}>Hedge Calculator</div>
        <div style={{ fontSize: 12, color: '#4E4E63', marginBottom: 24 }}>{signal.event}</div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#4E4E63', marginBottom: 8 }}>Polymarket stake ($)</div>
          <input type="number" value={stake} onChange={e => setStake(e.target.value)} style={{ width: '100%', background: '#1A1A24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#f0f4ff', fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em', boxSizing: 'border-box' }} />
        </div>
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { l: 'Poly stake', v: '$' + stake, c: '#867fff' },
              { l: 'Hedge bet', v: '$' + result.hedgeStake, c: '#fbbf24' },
              { l: 'Locked profit', v: '$' + result.lockedProfit, c: '#00E5B4' },
              { l: 'ROI if YES', v: result.roiIfYes + '%', c: '#F0F0FF' },
              { l: 'ROI if NO', v: result.roiIfNo + '%', c: '#f59e0b' },
            ].map(x => (
              <div key={x.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
                <span style={{ fontSize: 13, color: '#4E4E63' }}>{x.l}</span>
                <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.03em', color: x.c }}>{x.v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
