import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import Logo from '../components/Logo';

export default function Success() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [status, setStatus] = useState('verifying');

  useEffect(() => {
    (async () => {
      try {
        await new Promise(r => setTimeout(r, 2000));
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { navigate('/'); return; }
        let attempts = 0;
        const poll = async () => {
          const { data: profile } = await supabase.from('profiles').select('tier, plan').eq('id', session.user.id).single();
          const isPro = profile?.plan === 'pro' || profile?.tier === 'pro';
          console.log('[Success] poll attempt', attempts, '| profile:', profile);
          if (isPro || attempts > 5) {
            // Force refresh the global auth state so Dashboard picks up pro
            await refreshProfile();
            setStatus('success');
          } else {
            attempts++;
            setTimeout(poll, 2000);
          }
        };
        poll();
      } catch { setStatus('success'); }
    })();
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#03030a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ marginBottom: 40 }}><Logo size="lg" /></div>

      {status === 'verifying' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: '#4f8ef7', animation: `pulse 1.2s infinite ${i * 0.2}s` }} />)}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#f0f4ff', marginBottom: 8 }}>Activating your Pro account...</div>
          <div style={{ fontSize: 14, color: '#4a5a7a' }}>This takes just a moment</div>
        </div>
      )}

      {status === 'success' && (
        <div style={{ textAlign: 'center', maxWidth: 480 }}>
          <div style={{ fontSize: 64, marginBottom: 24 }}>⚡</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#f0f4ff', marginBottom: 12, letterSpacing: '-0.5px' }}>
            Welcome to <span style={{ color: '#4f8ef7' }}>Pro</span>
          </div>
          <div style={{ fontSize: 16, color: '#4a5a7a', lineHeight: 1.6, marginBottom: 32 }}>
            You now have access to all 8,300+ markets, AI analysis on every game, real-time props, Sharpr Score, and unlimited journal entries.
          </div>
          <div style={{ background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: 16, padding: 24, marginBottom: 32, textAlign: 'left' }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '2px', color: '#4f8ef7', textTransform: 'uppercase', marginBottom: 16 }}>What you unlocked</div>
            {['All 8,300+ live Polymarket markets', 'AI analysis on every game & market', 'Real-time player props', 'Sharpr Score & analytics', 'Unlimited journal', '50 AI queries/day', 'CSV export'].map((item, i) => (
              <div key={i} style={{ fontSize: 14, color: '#8899bb', padding: '6px 0', borderBottom: i < 6 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>✓ {item}</div>
            ))}
          </div>
          <button onClick={() => navigate('/dashboard')}
            style={{ background: '#4f8ef7', border: 'none', borderRadius: 14, padding: '16px 40px', fontSize: 16, fontWeight: 700, color: 'white', cursor: 'pointer', width: '100%', marginBottom: 12 }}>
            Go to Dashboard →
          </button>
          <div style={{ fontSize: 12, color: '#2a3a5a' }}>Manage your subscription anytime from account settings</div>
        </div>
      )}
      <style>{`@keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}`}</style>
    </div>
  );
}
