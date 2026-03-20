import { useNavigate } from 'react-router-dom';

export default function UpgradeModal({ onClose }) {
  const navigate = useNavigate();

  function goUpgrade() {
    onClose();
    navigate('/settings');
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 680, background: '#070712',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 32,
        position: 'relative',
      }}>
        {/* Close */}
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
          color: '#6a7a9a', cursor: 'pointer', fontSize: 16,
        }}>✕</button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: '#f0f4ff', margin: 0, marginBottom: 6 }}>Find Your Edge</h2>
          <p style={{ fontSize: 13, color: '#4a5a7a', margin: 0 }}>Choose the plan that fits your game</p>
        </div>

        {/* 3 tiers */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          {/* Free */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#94A3B8', marginBottom: 4 }}>Free</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#F5F5FA' }}>$0<span style={{ fontSize: 13, fontWeight: 400, color: '#4a5a7a' }}>/mo</span></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#6a7a9a', flex: 1 }}>
              {['50 markets', '5 AI/day', 'Basic journal', 'EV calc', 'Community'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#22c55e', fontSize: 12 }}>✓</span> {f}
                </div>
              ))}
            </div>
            <div style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', color: '#4a5a7a', textAlign: 'center', fontSize: 12, fontWeight: 600 }}>Current plan</div>
          </div>

          {/* Pro */}
          <div style={{ background: 'rgba(79,142,247,0.04)', border: '2px solid rgba(79,142,247,0.4)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 14, position: 'relative' }}>
            <div style={{ position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)', fontSize: 9, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: '#4f8ef7', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Most popular</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#7aaff8', marginBottom: 4 }}>Pro</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#F5F5FA' }}>$19<span style={{ fontSize: 13, fontWeight: 400, color: '#4a5a7a' }}>/mo</span></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#6a7a9a', flex: 1 }}>
              {['All 8,300+ markets', '50 AI/day', 'Market AI analysis', 'Sports props', 'Sharpr Score', 'Unlimited journal', 'CSV export'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#4f8ef7', fontSize: 12 }}>✓</span> {f}
                </div>
              ))}
            </div>
            <button onClick={goUpgrade} style={{ padding: '8px 16px', borderRadius: 10, background: '#4f8ef7', border: 'none', color: '#fff', textAlign: 'center', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Upgrade to Pro — $19/mo</button>
          </div>

          {/* Elite */}
          <div style={{ background: 'rgba(251,191,36,0.03)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', marginBottom: 4 }}>Elite</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#F5F5FA' }}>$49<span style={{ fontSize: 13, fontWeight: 400, color: '#4a5a7a' }}>/mo</span></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#6a7a9a', flex: 1 }}>
              {['Everything in Pro', 'Unlimited AI', 'Options flow (soon)', 'Sharp alerts (soon)', 'Priority AI', 'Early access'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#fbbf24', fontSize: 12 }}>✓</span> {f}
                </div>
              ))}
            </div>
            <button onClick={goUpgrade} style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24', textAlign: 'center', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Go Elite — $49/mo</button>
          </div>
        </div>
      </div>
    </div>
  );
}
