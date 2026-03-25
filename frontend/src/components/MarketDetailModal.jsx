import { useState, useEffect, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import api from '../lib/api';
import { useAIStream } from '../lib/useAIStream';
import posthog from 'posthog-js';

const CAT_COLORS = {
  Politics: { background: 'rgba(167,139,250,0.15)', color: '#c084fc' },
  Crypto: { background: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
  Sports: { background: 'rgba(34,197,94,0.15)', color: '#4ade80' },
  Finance: { background: 'rgba(79,142,247,0.15)', color: '#7aaff8' },
  Science: { background: 'rgba(20,184,166,0.15)', color: '#2dd4bf' },
  Entertainment: { background: 'rgba(244,63,94,0.15)', color: '#fb7185' },
  Economics: { background: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
  Other: { background: 'rgba(148,163,184,0.15)', color: '#94a3b8' },
};

export default function MarketDetailModal({ market: m, onClose, userPlan }) {
  const { text: aiResult, loading: aiLoading, error: aiError, done: aiDone, stream: startAIStream } = useAIStream();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const pct = m.yes ?? 50;
  const fill = pct > 66 ? '#22c55e' : pct > 40 ? '#f59e0b' : '#ef4444';
  const vol = m.volume >= 1e6 ? '$' + (m.volume / 1e6).toFixed(1) + 'M' : m.volume >= 1000 ? '$' + (m.volume / 1000).toFixed(0) + 'K' : '$' + Math.round(m.volume || 0);
  const catStyle = CAT_COLORS[m.cat] || CAT_COLORS.Other;
  const isPro = userPlan === 'pro' || userPlan === 'elite';

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    let resizeTimer;
    const r = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => setIsMobile(window.innerWidth < 768), 150); };
    window.addEventListener('keydown', h);
    window.addEventListener('resize', r);
    return () => { window.removeEventListener('keydown', h); window.removeEventListener('resize', r); clearTimeout(resizeTimer); };
  }, [onClose]);

  // Auto-load AI analysis for pro users — streaming
  useEffect(() => {
    if (!isPro) return;
    startAIStream(
      `Analyze this prediction market: "${m.title}". Current YES probability: ${pct}%. Volume: ${vol}. Give: 1) Key factors driving probability 2) Whether market is fairly priced or has edge 3) Clear verdict: does YES or NO have the edge and why. Be concise and sharp.`,
      'polymarket', true
    );
  }, [m.id]);

  // Mock probability chart data
  const probHistory = useMemo(() => {
    const seed = (m.id || '').split('').reduce((s, c) => s + c.charCodeAt(0), 0);
    return Array.from({ length: 7 }, (_, i) => {
      const noise = ((seed * (i + 1) * 7 + 13) % 21) - 10;
      return Math.max(5, Math.min(95, pct + noise - (i * 0.5)));
    }).reverse();
  }, [m.id, pct]);

  const chartLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  const chartData = {
    labels: chartLabels,
    datasets: [{
      data: probHistory,
      borderColor: fill,
      backgroundColor: fill + '14',
      fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: fill, borderWidth: 2,
    }],
  };
  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ctx.parsed.y.toFixed(1) + '%' } } },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#2a3a5a', font: { size: 10 } } },
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#2a3a5a', font: { size: 10 }, callback: v => v + '%' }, min: Math.max(0, pct - 25), max: Math.min(100, pct + 25) },
    },
  };

  function goDeepResearch() {
    window.dispatchEvent(new CustomEvent('ai-prefill', { detail: { topic: m.title, type: 'polymarket' } }));
    onClose();
  }

  function trackReferral() {
    posthog.capture('polymarket_referral', { market_id: m.id, title: m.title });
  }

  // --- AI Analysis block (shared between desktop and mobile) ---
  const aiBlock = (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#7aaff8' }}>Sharpr AI Analysis</span>
      </div>
      <div style={{ fontSize: 11, color: '#2a3a5a', marginBottom: 12 }}>Powered by Claude + web search</div>

      {!isPro ? (
        <div style={{ background: 'rgba(79,142,247,0.05)', border: '1px solid rgba(79,142,247,0.15)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>🔒</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f4ff', marginBottom: 4 }}>AI Analysis</div>
          <div style={{ fontSize: 12, color: '#4a5a7a', marginBottom: 12 }}>Upgrade to Pro for instant AI analysis on every market</div>
          <button onClick={() => window.dispatchEvent(new CustomEvent('open-upgrade'))}
            style={{ background: '#4f8ef7', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 20px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Upgrade to Pro
          </button>
        </div>
      ) : aiLoading && !aiResult ? (
        <div style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#4f8ef7', animation: `pulse 1.2s infinite ${i * 0.2}s` }} />
            ))}
          </div>
          <div style={{ fontSize: 12, color: '#4a5a7a', marginTop: 8 }}>Analyzing with web search...</div>
        </div>
      ) : aiError && !aiResult ? (
        <div style={{ fontSize: 12, color: '#ef4444', background: 'rgba(239,68,68,0.08)', borderRadius: 8, padding: 12 }}>{aiError}</div>
      ) : aiResult ? (
        <div style={{ fontSize: 12, color: '#6a7a9a', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
          {aiResult.split('\n').map((line, i) => {
            const isKeyFactors = /^key factors/i.test(line.trim());
            return <div key={i} style={{ color: isKeyFactors ? '#60a5fa' : '#6a7a9a', fontWeight: isKeyFactors ? 700 : 400 }}>{line || '\u00A0'}</div>;
          })}
        </div>
      ) : null}
    </div>
  );

  // ===================== MOBILE LAYOUT =====================
  if (isMobile) {
    return (
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.95)',
      }}>
        <div onClick={e => e.stopPropagation()} style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: '#070712', overflowY: 'auto', WebkitOverflowScrolling: 'touch',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Fixed close button */}
          <button onClick={onClose} style={{
            position: 'fixed', top: 12, right: 12, zIndex: 1010,
            width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.15)',
            color: '#94a3b8', cursor: 'pointer', fontSize: 18, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          }}>✕</button>

          {/* Header */}
          <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, ...catStyle }}>{m.cat}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'rgba(79,142,247,0.1)', color: '#7aaff8' }}>POLYMARKET</span>
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#f0f4ff', margin: 0, lineHeight: 1.4, paddingRight: 40, wordBreak: 'break-word' }}>{m.title}</h2>
          </div>

          {/* Content */}
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Probability hero */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 12 }}>
                <span style={{ fontSize: 36, fontWeight: 900, color: fill, lineHeight: 1 }}>{pct}%</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: '#ef4444', opacity: 0.7 }}>{m.no ?? 100 - pct}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 4 }}>
                <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>YES</span>
                <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>NO</span>
              </div>
              {/* Progress bar */}
              <div style={{ height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 10, display: 'flex' }}>
                <div style={{ width: pct + '%', background: '#22c55e', borderRadius: '4px 0 0 4px' }} />
                <div style={{ flex: 1, background: '#ef4444', borderRadius: '0 4px 4px 0' }} />
              </div>
            </div>

            {/* Stats row - 3 equal columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                ['Volume', vol],
                ['Closes', m.endDate ? new Date(m.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD'],
                ['Liquidity', m.liquidity >= 1000 ? '$' + (m.liquidity / 1000).toFixed(0) + 'K' : '$' + Math.round(m.liquidity || 0)],
              ].map(([label, value]) => (
                <div key={label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#2a3a5a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#F5F5FA' }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Buy YES / Buy NO buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <a href={m.url || (m.slug ? `https://polymarket.com/event/${m.slug}` : `https://polymarket.com/search?q=${encodeURIComponent(m.title || '')}`)} target="_blank" rel="noopener noreferrer" onClick={trackReferral}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 16px', borderRadius: 10, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80', fontSize: 13, fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}>
                Buy YES @ {pct}c
              </a>
              <a href={m.url || (m.slug ? `https://polymarket.com/event/${m.slug}` : `https://polymarket.com/search?q=${encodeURIComponent(m.title || '')}`)} target="_blank" rel="noopener noreferrer" onClick={trackReferral}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontSize: 13, fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}>
                Buy NO @ {m.no ?? 100 - pct}c
              </a>
            </div>

            {/* 7-day chart - full width */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#2a3a5a', marginBottom: 8 }}>7-Day Probability</div>
              <div style={{ height: 140 }}>
                <Line data={chartData} options={chartOpts} />
              </div>
            </div>

            {/* AI Analysis - full width */}
            {aiBlock}

            {/* Deep research button - full width */}
            <button onClick={goDeepResearch}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.2)', color: '#7aaff8', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,142,247,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(79,142,247,0.1)'}>
              Deep research in AI tab →
            </button>

            {/* Bottom spacer for iOS safe area */}
            <div style={{ height: 20 }} />
          </div>
        </div>
      </div>
    );
  }

  // ===================== DESKTOP LAYOUT =====================
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 1000, maxHeight: '90vh', overflowY: 'auto',
        background: '#070712', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, ...catStyle }}>{m.cat}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'rgba(79,142,247,0.1)', color: '#7aaff8' }}>POLYMARKET</span>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#f0f4ff', margin: 0, lineHeight: 1.4 }}>{m.title}</h2>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            color: '#6a7a9a', cursor: 'pointer', fontSize: 16, flexShrink: 0,
          }}>✕</button>
        </div>

        {/* Body: two panels */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Left panel */}
          <div style={{ flex: '0 0 60%', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Probability hero */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 12 }}>
                <span style={{ fontSize: 56, fontWeight: 900, color: fill, lineHeight: 1 }}>{pct}%</span>
                <span style={{ fontSize: 28, fontWeight: 700, color: '#ef4444', opacity: 0.7 }}>{m.no ?? 100 - pct}%</span>
              </div>
              <div style={{ fontSize: 12, color: '#2a3a5a', marginTop: 4 }}>YES probability</div>
              <div style={{ height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 12, display: 'flex' }}>
                <div style={{ width: pct + '%', background: '#22c55e', borderRadius: '4px 0 0 4px' }} />
                <div style={{ flex: 1, background: '#ef4444', borderRadius: '0 4px 4px 0' }} />
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                ['Volume', vol],
                ['Closes', m.endDate ? new Date(m.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD'],
                ['Liquidity', m.liquidity >= 1000 ? '$' + (m.liquidity / 1000).toFixed(0) + 'K' : '$' + Math.round(m.liquidity || 0)],
              ].map(([label, value]) => (
                <div key={label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#2a3a5a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#F5F5FA' }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <a href={m.url || (m.slug ? `https://polymarket.com/event/${m.slug}` : `https://polymarket.com/search?q=${encodeURIComponent(m.title || '')}`)} target="_blank" rel="noopener noreferrer" onClick={trackReferral}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80', fontSize: 13, fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}>
                Buy YES @ {pct}c
              </a>
              <a href={m.url || (m.slug ? `https://polymarket.com/event/${m.slug}` : `https://polymarket.com/search?q=${encodeURIComponent(m.title || '')}`)} target="_blank" rel="noopener noreferrer" onClick={trackReferral}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontSize: 13, fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}>
                Buy NO @ {m.no ?? 100 - pct}c
              </a>
            </div>

            {/* 7-day chart */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#2a3a5a', marginBottom: 8 }}>7-Day Probability</div>
              <div style={{ height: 140 }}>
                <Line data={chartData} options={chartOpts} />
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div style={{ flex: '0 0 40%', padding: 20, background: 'rgba(79,142,247,0.03)', borderLeft: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {aiBlock}

            {/* Quick actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
              <button onClick={goDeepResearch}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.2)', color: '#7aaff8', fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,142,247,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(79,142,247,0.1)'}>
                Deep research in AI tab →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
