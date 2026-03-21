import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function UpgradeModal({ onClose }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/stripe/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ plan: 'pro' }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || 'Something went wrong');
    } catch { alert('Failed to start checkout. Please try again.'); }
    finally { setLoading(false); }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: '#070712', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 32, position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#6a7a9a', cursor: 'pointer', fontSize: 16 }}>✕</button>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#f0f4ff', marginBottom: 6 }}>Find Your Edge</div>
          <div style={{ fontSize: 14, color: '#4a5a7a' }}>Upgrade to Pro for the full experience</div>
        </div>

        <div style={{ background: 'rgba(79,142,247,0.05)', border: '2px solid rgba(79,142,247,0.3)', borderRadius: 16, padding: 24, position: 'relative' }}>
          <div style={{ position: 'absolute', top: -10, right: 16, fontSize: 10, fontWeight: 700, padding: '3px 12px', borderRadius: 20, background: '#f59e0b', color: '#000', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Most popular</div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 20 }}>
            <span style={{ fontSize: 48, fontWeight: 900, color: '#4f8ef7' }}>$19</span>
            <span style={{ fontSize: 18, color: '#4a5a7a' }}>/mo</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {[
              'All 8,300+ Polymarket markets',
              'AI analysis on every game & market',
              'Real-time props (DraftKings, FanDuel, BetMGM)',
              'Sharpr Score & analytics',
              'Unlimited journal',
              '50 AI queries/day',
              'CSV export',
            ].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#8899bb' }}>
                <span style={{ color: '#4f8ef7', fontSize: 14 }}>✓</span> {f}
              </div>
            ))}
          </div>

          <button onClick={handleUpgrade} disabled={loading}
            style={{ width: '100%', background: loading ? 'rgba(79,142,247,0.3)' : '#4f8ef7', border: 'none', borderRadius: 12, padding: '14px 24px', fontSize: 15, fontWeight: 700, color: 'white', cursor: loading ? 'wait' : 'pointer' }}>
            {loading ? 'Loading...' : 'Upgrade to Pro — $19/mo'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: '#2a3a5a' }}>
            Cancel anytime · Billed monthly
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2a3a5a" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span style={{ fontSize: 11, color: '#2a3a5a' }}>Secured by Stripe</span>
        </div>
      </div>
    </div>
  );
}
