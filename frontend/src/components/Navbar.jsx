import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Logo from './Logo';

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}

export default function Navbar() {
  const { user, tier, signOut } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts]         = useState([]);
  const [bellOpen, setBellOpen]     = useState(false);
  const [unread, setUnread]         = useState(0);
  const bellRef                     = useRef(null);

  // Listen for alert events dispatched from other components
  useEffect(() => {
    function addAlert(e) {
      const a = { id: Date.now(), text: e.detail?.text || 'New alert', ts: new Date().toISOString(), read: false };
      setAlerts(prev => [a, ...prev].slice(0, 20));
      setUnread(n => n + 1);
    }
    window.addEventListener('push-alert', addAlert);
    return () => window.removeEventListener('push-alert', addAlert);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) { if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function handleSignOut() { await signOut(); navigate('/login'); }

  function openBell() {
    setBellOpen(o => !o);
    setUnread(0);
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
  }

  return (
    <nav className="glass-nav px-4 py-3 flex items-center justify-between">
      <Logo />
      <div className="flex items-center gap-3">
        {/* Tier badge */}
        {tier === 'pro' ? (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{background: 'rgba(37,99,235,0.3)', border: '1px solid rgba(37,99,235,0.5)', color: '#93c5fd'}}>Pro</span>
        ) : (
          <Link to="/settings"
            className="text-xs font-semibold px-2.5 py-1 rounded-full transition-all"
            style={{background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24'}}
            onMouseEnter={e => e.currentTarget.style.background='rgba(245,158,11,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(245,158,11,0.12)'}>
            Free · Upgrade
          </Link>
        )}

        {/* Bell */}
        <div className="relative" ref={bellRef}>
          <button onClick={openBell}
            className="flex items-center justify-center w-8 h-8 rounded-xl transition-all"
            style={{background: bellOpen ? 'rgba(37,99,235,0.2)' : 'transparent', color: '#94A3B8', border: '1px solid transparent'}}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'; }}
            onMouseLeave={e => { if (!bellOpen) { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='transparent'; } }}>
            <BellIcon />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-xs font-bold flex items-center justify-center"
                style={{background: '#ef4444', color: '#fff', fontSize: 10}}>{unread > 9 ? '9+' : unread}</span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 top-10 w-72 rounded-2xl z-50 overflow-hidden"
              style={{background: '#0f1729', border: '1px solid #1e2a4a', boxShadow: '0 20px 60px rgba(0,0,0,0.5)'}}>
              <div className="px-4 py-3 flex items-center justify-between" style={{borderBottom: '1px solid #1e2a4a'}}>
                <span className="text-sm font-semibold" style={{color: '#F5F5FA'}}>Alerts</span>
                {alerts.length > 0 && (
                  <button onClick={() => setAlerts([])} className="text-xs" style={{color: '#475569'}}
                    onMouseEnter={e => e.currentTarget.style.color='#94A3B8'}
                    onMouseLeave={e => e.currentTarget.style.color='#475569'}>Clear all</button>
                )}
              </div>
              {alerts.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm" style={{color: '#475569'}}>No alerts yet</div>
              ) : (
                <div className="flex flex-col max-h-80 overflow-y-auto">
                  {alerts.map(a => (
                    <div key={a.id} className="px-4 py-3 flex items-start gap-3" style={{borderBottom: '1px solid rgba(30,42,74,0.5)', opacity: a.read ? 0.6 : 1}}>
                      <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{background: a.read ? '#334155' : '#2563EB'}} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs leading-snug" style={{color: '#cbd5e1'}}>{a.text}</p>
                        <p className="text-xs mt-0.5" style={{color: '#475569'}}>{new Date(a.ts).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User email */}
        <Link to="/settings" className="hidden sm:block text-sm transition-colors" style={{color: '#64748b'}}
          onMouseEnter={e => e.currentTarget.style.color='#94A3B8'}
          onMouseLeave={e => e.currentTarget.style.color='#64748b'}>
          {user?.email}
        </Link>

        <button onClick={handleSignOut} className="glass-btn text-xs px-3 py-1.5"
          style={{borderRadius: '10px', fontSize: '12px'}}>
          Sign out
        </button>
      </div>
    </nav>
  );
}
