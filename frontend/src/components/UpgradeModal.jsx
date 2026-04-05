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
    <div onClick={onClose} style={{ 
      position: 'fixed', inset: 0, zIndex: 1000, 
      background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(20px)', 
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; backdrop-filter: blur(0px); } to { opacity: 1; backdrop-filter: blur(20px); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
      
      <div onClick={e => e.stopPropagation()} style={{ 
        width: '100%', maxWidth: 480, 
        background: 'rgba(17,17,32,0.95)', border: '1px solid rgba(108,99,255,0.5)', 
        borderRadius: 24, padding: 32, position: 'relative',
        boxShadow: '0 40px 80px rgba(0,0,0,0.8), 0 0 50px rgba(108,99,255,0.15)',
        animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}>
        
        {/* Header Glow */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120, background: 'linear-gradient(180deg, rgba(108,99,255,0.15) 0%, rgba(108,99,255,0) 100%)', borderTopLeftRadius: 24, borderTopRightRadius: 24, pointerEvents: 'none' }}></div>

        <button onClick={onClose} style={{ 
          position: 'absolute', top: 20, right: 20, width: 32, height: 32, borderRadius: 10, 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)', 
          color: '#6B6B8A', cursor: 'pointer', fontSize: 16, transition: 'all 0.2s', zIndex: 10
        }} onMouseEnter={e => { e.currentTarget.style.color = '#F0F0FF'; e.currentTarget.style.background = 'rgba(108,99,255,0.3)'; }} onMouseLeave={e => { e.currentTarget.style.color = '#6B6B8A'; e.currentTarget.style.background = 'rgba(108,99,255,0.1)'; }}>✕</button>

        <div style={{ textAlign: 'center', marginBottom: 32, position: 'relative', zIndex: 5 }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#F0F0FF', marginBottom: 8, letterSpacing: '-0.03em', textShadow: '0 0 20px rgba(108,99,255,0.3)' }}>Find Your Edge</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#6B6B8A' }}>Upgrade to Pro for the full experience</div>
        </div>

        <div style={{ 
          background: 'rgba(10,10,15,0.6)', border: '1px solid rgba(108,99,255,0.2)', 
          borderRadius: 16, padding: 24, position: 'relative' 
        }}>
          <div style={{ 
            position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', 
            fontSize: 10, fontWeight: 900, padding: '6px 16px', borderRadius: 20, 
            background: '#6C63FF', color: '#F0F0FF', textTransform: 'uppercase', letterSpacing: '0.1em',
            boxShadow: '0 0 15px rgba(108,99,255,0.6)' 
          }}>Most popular</div>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6, marginBottom: 28, marginTop: 12 }}>
            <span style={{ fontSize: 48, fontWeight: 900, color: '#F0F0FF', textShadow: '0 0 20px rgba(108,99,255,0.5)' }}>$19</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#6B6B8A' }}>/mo</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
            {[
              'All 8,300+ Polymarket markets',
              'AI analysis on every game & market',
              'Real-time props (DraftKings, FanDuel, BetMGM)',
              'Sharpr Score & analytics',
              'Unlimited journal',
              '50 AI queries/day',
              'CSV export',
            ].map((f, i) => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 600, color: '#F0F0FF', animation: `slideUp 0.4s ease-out ${0.1 + i * 0.05}s both` }}>
                <span style={{ color: '#00E5B4', fontSize: 16, textShadow: '0 0 10px rgba(0,229,180,0.5)', fontWeight: 900 }}>✓</span> {f}
              </div>
            ))}
          </div>

          <button onClick={handleUpgrade} disabled={loading}
            style={{ 
              width: '100%', background: loading ? 'rgba(108,99,255,0.5)' : '#6C63FF', 
              border: '1px solid rgba(134,127,255,0.8)', borderRadius: 12, padding: '16px 24px', 
              fontSize: 15, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#F0F0FF', 
              cursor: loading ? 'wait' : 'pointer', transition: 'all 0.3s',
              boxShadow: '0 0 25px rgba(108,99,255,0.4)'
            }}
            onMouseEnter={e => { if(!loading){ e.currentTarget.style.background = '#8179ff'; e.currentTarget.style.boxShadow = '0 0 40px rgba(108,99,255,0.7)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
            onMouseLeave={e => { if(!loading){ e.currentTarget.style.background = '#6C63FF'; e.currentTarget.style.boxShadow = '0 0 25px rgba(108,99,255,0.4)'; e.currentTarget.style.transform = 'translateY(0)'; } }}>
            {loading ? 'Initializing Secure Vault...' : 'Upgrade to Pro'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, fontWeight: 600, color: '#6B6B8A' }}>
            Cancel anytime · Billed monthly
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B6B8A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#6B6B8A', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Secured by Stripe</span>
        </div>
      </div>
    </div>
  );
}
