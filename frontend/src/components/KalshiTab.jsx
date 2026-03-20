import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../lib/api';

const KALSHI_CATS = ['All', 'Politics', 'Economics', 'Sports', 'Entertainment', 'Climate', 'Tech', 'Finance', 'Other'];

export default function KalshiTab() {
  const [markets, setMarkets] = useState([]);
  const [source, setSource] = useState(null);
  const [q, setQ] = useState('');
  const [filt, setFilt] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [visibleCount, setVisibleCount] = useState(50);
  const sentinelRef = useRef(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) setVisibleCount(n => n + 50);
    }, { rootMargin: '200px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => { setVisibleCount(50); }, [filt, q]);

  useEffect(() => { fetchMarkets(); }, []);

  async function fetchMarkets() {
    setLoading(true); setError('');
    try {
      const { data } = await api.get('/api/kalshi/markets');
      setMarkets(data.markets || []);
      setSource(data.source || null);
    } catch (e) {
      setError('Kalshi markets temporarily unavailable');
      setMarkets([]);
    }
    setLoading(false);
  }

  const catCounts = useMemo(() => {
    const counts = { All: markets.length };
    KALSHI_CATS.slice(1).forEach(c => { counts[c] = markets.filter(m => m.cat === c).length; });
    return counts;
  }, [markets]);

  const filtered = useMemo(() => markets.filter(m =>
    (filt === 'All' || m.cat === filt) &&
    (!q || m.title.toLowerCase().includes(q.toLowerCase()))
  ), [markets, filt, q]);

  const visible = filtered.slice(0, visibleCount);

  function analyzeWithAI(title) {
    window.dispatchEvent(new CustomEvent('ai-prefill', { detail: { topic: title, type: 'polymarket' } }));
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-5">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col gap-1 w-48 shrink-0 sticky top-20 self-start">
          {KALSHI_CATS.map(c => (
            <button key={c} onClick={() => setFilt(c)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s', border: 'none',
                background: filt === c ? 'rgba(0,194,160,0.15)' : 'transparent',
                color: filt === c ? '#00C2A0' : '#4a5a7a',
              }}
              onMouseEnter={e => { if (filt !== c) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { if (filt !== c) e.currentTarget.style.background = 'transparent'; }}>
              {c}
              {catCounts[c] > 0 && <span style={{ fontSize: 11, opacity: 0.6 }}>{catCounts[c]}</span>}
            </button>
          ))}
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Search + filter bar */}
          <div className="flex flex-col gap-3">
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(0,194,160,0.05)', border: '1px solid rgba(0,194,160,0.15)',
              borderRadius: 12, padding: '4px 4px 4px 14px',
            }}>
              <input value={q} onChange={e => setQ(e.target.value)}
                placeholder="Search Kalshi markets..."
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#f0f4ff', fontSize: 14, padding: '8px 0' }} />
              <div style={{ fontSize: 11, fontWeight: 700, padding: '6px 12px', borderRadius: 8, background: 'rgba(0,194,160,0.1)', color: '#00C2A0' }}>
                {filtered.length} markets
              </div>
            </div>

            {/* Mobile category pills */}
            <div className="flex gap-1.5 flex-wrap lg:hidden">
              {KALSHI_CATS.map(c => (
                <button key={c} onClick={() => setFilt(c)}
                  style={{
                    fontSize: 12, padding: '4px 12px', borderRadius: 20, cursor: 'pointer', border: 'none',
                    background: filt === c ? 'rgba(0,194,160,0.2)' : 'rgba(255,255,255,0.04)',
                    color: filt === c ? '#00C2A0' : '#6a7a9a',
                  }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Source badge */}
          {source && !loading && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: source === 'live' ? '#00C2A0' : '#6a7a9a',
              padding: '6px 12px', borderRadius: 8,
              background: source === 'live' ? 'rgba(0,194,160,0.08)' : 'rgba(255,255,255,0.03)',
              border: source === 'live' ? '1px solid rgba(0,194,160,0.15)' : '1px solid rgba(255,255,255,0.06)',
              width: 'fit-content',
            }}>
              {source === 'live' ? 'Live Kalshi data' : 'Curated markets — live API coming soon'}
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#ef4444' }}>{error}</span>
              <button onClick={fetchMarkets} style={{ fontSize: 12, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '4px 12px', cursor: 'pointer' }}>Retry</button>
            </div>
          )}

          {/* Skeleton */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ background: 'rgba(0,194,160,0.05)', border: '1px solid rgba(0,194,160,0.1)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ height: 16, width: '40%', borderRadius: 8, background: '#1e2a4a', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ height: 14, borderRadius: 6, background: '#1e2a4a', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ height: 8, borderRadius: 4, background: '#1e2a4a', animation: 'pulse 1.5s infinite' }} />
                </div>
              ))}
            </div>
          )}

          {/* Market cards */}
          {!loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {visible.map(m => {
                const pct = m.yes ?? 50;
                const fill = '#00C2A0';
                const vol = m.volume >= 1e6 ? (m.volume / 1e6).toFixed(1) + 'M' : m.volume >= 1000 ? (m.volume / 1000).toFixed(0) + 'k' : String(m.volume || 0);
                return (
                  <div key={m.id} style={{
                    background: 'rgba(0,194,160,0.04)', border: '1px solid rgba(0,194,160,0.12)',
                    borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
                    transition: 'all 0.2s ease', cursor: 'default',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,194,160,0.35)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,194,160,0.12)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'rgba(0,194,160,0.1)', color: '#00C2A0' }}>{m.cat}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: 'rgba(0,194,160,0.08)', color: '#00997a', letterSpacing: '0.04em' }}>KALSHI</span>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#F5F5FA', lineHeight: 1.4, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{m.title}</p>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: '#4a5a7a' }}>YES</span>
                        <span style={{ fontSize: 28, fontWeight: 900, color: fill }}>{pct}%</span>
                        <span style={{ fontSize: 11, color: '#4a5a7a' }}>NO {m.no ?? 100 - pct}%</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 4, background: 'rgba(0,194,160,0.1)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 4, background: fill, width: pct + '%', transition: 'width 0.3s' }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <button onClick={() => analyzeWithAI(m.title)}
                        style={{ background: 'rgba(0,194,160,0.1)', border: '1px solid rgba(0,194,160,0.25)', borderRadius: 8, padding: '5px 12px', fontSize: 12, color: '#00C2A0', cursor: 'pointer', fontWeight: 600 }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,194,160,0.2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,194,160,0.1)'}>
                        Analyze ↗
                      </button>
                      <span style={{ fontSize: 11, color: '#4a5a7a' }}>
                        Vol ${vol}
                        {m.endDate && <span style={{ marginLeft: 6 }}>· Closes {new Date(m.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div ref={sentinelRef} style={{ height: 1 }} />

          {visible.length < filtered.length && !loading && (
            <div style={{ textAlign: 'center', fontSize: 12, color: '#4a5a7a', padding: 8 }}>
              Scroll for more · {visible.length} of {filtered.length}
            </div>
          )}

          {/* Powered by badge */}
          <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 11, color: '#1a2535' }}>
            Powered by Kalshi
          </div>
        </div>
      </div>
    </div>
  );
}
