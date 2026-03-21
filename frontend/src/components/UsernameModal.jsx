import { useState } from 'react';
import { supabase } from '../lib/supabase';
import Logo from './Logo';

export default function UsernameModal({ onComplete }) {
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(null);

  function handleChange(e) {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
    setUsername(val);
    if (timer) clearTimeout(timer);
    if (val.length < 3) { setStatus(null); setStatusMsg(''); return; }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(val)) { setStatus('invalid'); setStatusMsg('Letters, numbers, underscores only'); return; }
    setStatus('checking'); setStatusMsg('Checking...');
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/user/check-username?username=${val}`);
        const data = await res.json();
        setStatus(data.available ? 'available' : 'taken');
        setStatusMsg(data.available ? 'Available' : (data.error || 'Already taken'));
      } catch { setStatus(null); setStatusMsg(''); }
    }, 500);
    setTimer(t);
  }

  async function handleSubmit() {
    if (status !== 'available' || loading) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/user/set-username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (data.success) onComplete(data.username);
      else { setStatus('taken'); setStatusMsg(data.error || 'Could not set username'); }
    } catch { setStatusMsg('Something went wrong'); }
    finally { setLoading(false); }
  }

  const sc = status === 'available' ? '#22c55e' : status === 'taken' || status === 'invalid' ? '#ef4444' : '#4a5a7a';

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#03030a', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ marginBottom: 40 }}><Logo size="lg" /></div>
      <div style={{ background: '#070712', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 40, width: '100%', maxWidth: 440, textAlign: 'center' }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#f0f4ff', marginBottom: 8 }}>Choose your username</div>
        <div style={{ fontSize: 14, color: '#4a5a7a', marginBottom: 32, lineHeight: 1.6 }}>This is how you'll appear on Sharpr.</div>
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#2a3a5a', fontWeight: 700, pointerEvents: 'none' }}>@</div>
          <input type="text" value={username} onChange={handleChange} onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder="yourname" autoFocus
            style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${status === 'available' ? 'rgba(34,197,94,0.4)' : status === 'taken' || status === 'invalid' ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 12, padding: '14px 16px 14px 36px', fontSize: 18, fontWeight: 600, color: '#f0f4ff', outline: 'none', boxSizing: 'border-box', letterSpacing: '0.5px' }} />
        </div>
        <div style={{ height: 20, fontSize: 12, fontWeight: 600, color: sc, marginBottom: 24, textAlign: 'left', paddingLeft: 4 }}>{statusMsg}</div>
        <button onClick={handleSubmit} disabled={status !== 'available' || loading}
          style={{ width: '100%', background: status === 'available' ? '#4f8ef7' : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 12, padding: 16, fontSize: 16, fontWeight: 700, color: status === 'available' ? 'white' : '#2a3a5a', cursor: status === 'available' ? 'pointer' : 'not-allowed' }}>
          {loading ? 'Setting username...' : 'Claim username'}
        </button>
        <div style={{ fontSize: 11, color: '#1a2535', marginTop: 16 }}>3-20 characters · letters, numbers, underscores</div>
      </div>
    </div>
  );
}
