import { useState, useEffect } from 'react';
import api from '../lib/api';

const typeStyle = {
  strength: { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)', color: '#4ade80' },
  warning: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', color: '#fbbf24' },
  tip: { bg: 'rgba(79,142,247,0.08)', border: 'rgba(79,142,247,0.2)', color: '#7aaff8' },
};

export default function PerformanceInsights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchInsights(); }, []);

  async function fetchInsights() {
    setLoading(true);
    try {
      const { data: d } = await api.get('/api/performance/insights');
      setData(d);
    } catch {}
    finally { setLoading(false); }
  }

  function timeAgo(d) {
    if (!d) return '';
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    return s < 60 ? 'just now' : s < 3600 ? Math.floor(s / 60) + 'm ago' : Math.floor(s / 3600) + 'h ago';
  }

  const gc = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 };

  if (loading) return (
    <div style={{ ...gc, padding: 20, animation: 'pulse 1.5s infinite', height: 120 }} />
  );

  if (!data || (!data.insights?.length && !data.aiCoaching?.length)) return (
    <div style={{ ...gc, padding: 28, textAlign: 'center' }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>🧠</div>
      <div style={{ fontSize: 13, color: '#4a5a7a' }}>Log at least 5 bets or trades to unlock your performance insights</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, color: '#1a2535' }}>Updated {timeAgo(data.generatedAt)}</span>
        <button onClick={fetchInsights} style={{ fontSize: 10, color: '#4a5a7a', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}>↻ Refresh</button>
      </div>

      {data.insights.map((ins, i) => {
        const s = typeStyle[ins.type] || typeStyle.tip;
        return (
          <div key={i} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>{ins.icon}</span>
            <span style={{ fontSize: 13, color: s.color, fontWeight: 600, lineHeight: 1.5 }}>{ins.message}</span>
          </div>
        );
      })}

      {data.aiCoaching && data.aiCoaching.length > 0 && (
        <div style={{ ...gc, padding: 16, background: 'rgba(79,142,247,0.04)', borderColor: 'rgba(79,142,247,0.15)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', color: '#7aaff8', textTransform: 'uppercase', marginBottom: 10 }}>✨ AI Coach</div>
          {data.aiCoaching.map((rec, i) => (
            <div key={i} style={{ fontSize: 13, color: '#6a7a9a', lineHeight: 1.6, padding: '6px 0', borderBottom: i < data.aiCoaching.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              {i + 1}. {rec}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
