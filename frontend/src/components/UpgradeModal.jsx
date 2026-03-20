import { useState, useEffect } from 'react';
import api from '../lib/api';

export default function UpgradeModal() {
  const [open, setOpen]       = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function handler(e) {
      setMessage(e.detail?.message || 'Upgrade to Pro to access this feature.');
      setOpen(true);
    }
    window.addEventListener('upgrade-required', handler);
    return () => window.removeEventListener('upgrade-required', handler);
  }, []);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const { data } = await api.post('/api/stripe/create-checkout');
      window.location.href = data.url;
    } catch {
      alert('Could not start checkout.');
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)'}}
      onClick={() => setOpen(false)}>
      <div className="glass-card max-w-sm w-full mx-4 p-6" onClick={e => e.stopPropagation()}
        style={{background: '#0f1729', border: '1px solid rgba(37,99,235,0.3)', boxShadow: '0 0 60px rgba(37,99,235,0.15)'}}>

        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background: 'rgba(37,99,235,0.2)'}}>
            <span className="text-xl">⚡</span>
          </div>
          <div>
            <div className="font-bold text-base" style={{color: '#F5F5FA'}}>Upgrade to Pro</div>
            <div className="text-xs" style={{color: '#64748b'}}>Unlock everything</div>
          </div>
        </div>

        <p className="text-sm mb-4" style={{color: '#94A3B8'}}>{message}</p>

        <div className="rounded-xl p-4 mb-4" style={{background: '#0a0f1e', border: '1px solid #1e2a4a'}}>
          <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{color: '#64748b'}}>Pro includes</div>
          <div className="flex flex-col gap-2">
            {[
              'Unlimited AI research queries',
              'Live odds (NFL, NBA, MLB, Soccer, UFC)',
              'Unlimited trade & bet journal entries',
              'CSV export',
              'Priority support',
            ].map(f => (
              <div key={f} className="flex items-center gap-2 text-sm" style={{color: '#cbd5e1'}}>
                <span className="text-green-400 font-bold">✓</span> {f}
              </div>
            ))}
          </div>
        </div>

        <button onClick={handleUpgrade} disabled={loading}
          className="glass-btn-blue w-full py-3 text-sm disabled:opacity-50">
          {loading ? 'Loading…' : 'Upgrade — $19/month'}
        </button>
        <button onClick={() => setOpen(false)}
          className="w-full mt-2 py-2 text-sm transition-colors" style={{color: '#475569'}}
          onMouseEnter={e => e.currentTarget.style.color='#94A3B8'}
          onMouseLeave={e => e.currentTarget.style.color='#475569'}>
          Maybe later
        </button>
      </div>
    </div>
  );
}
