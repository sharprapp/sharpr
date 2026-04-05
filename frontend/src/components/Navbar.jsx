import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Logo from './Logo';

function firstName(email = '') {
  if (!email) return '';
  const raw = (email.split('@')[0].split('.')[0]).replace(/\d+$/, '');
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

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
  const [alerts, setAlerts] = useState([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const bellRef = useRef(null);

  useEffect(() => {
    function addAlert(e) {
      const a = { id: Date.now(), text: e.detail?.text || 'New alert', ts: new Date().toISOString(), read: false };
      setAlerts(prev => [a, ...prev].slice(0, 20));
      setUnread(n => n + 1);
    }
    window.addEventListener('push-alert', addAlert);
    return () => window.removeEventListener('push-alert', addAlert);
  }, []);

  useEffect(() => {
    function handler(e) { if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function openBell() {
    setBellOpen(o => !o);
    setUnread(0);
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between" 
         style={{ 
           background: 'rgba(13, 13, 21, 0.7)', 
           backdropFilter: 'blur(20px)',
           WebkitBackdropFilter: 'blur(20px)',
           borderBottom: '1px solid rgba(108, 99, 255, 0.15)',
           boxShadow: '0 10px 30px rgba(0,0,0,0.4), 0 0 20px rgba(108,99,255,0.05)'
         }}>
      
      <Logo size="md" />

      <div className="flex items-center gap-5">
        {tier === 'pro' ? (
          <span style={{
            fontSize:12, fontWeight:800, padding:'6px 14px', borderRadius:100, 
            background:'rgba(108,99,255,0.1)', border:'1px solid rgba(108,99,255,0.4)', 
            color:'#6C63FF', boxShadow:'0 0 15px rgba(108,99,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.5px'
          }}>Pro</span>
        ) : (
          <Link to="/settings" style={{
            fontSize: 12, fontWeight: 800, padding: '6px 14px', borderRadius: 100,
            color: '#F0F0FF', background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.4)',
            textDecoration: 'none', transition: 'all 0.3s', boxShadow: '0 0 15px rgba(108,99,255,0.2)'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(108,99,255,0.3)'; e.currentTarget.style.boxShadow = '0 0 25px rgba(108,99,255,0.4)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(108,99,255,0.15)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(108,99,255,0.2)'; }}>
            Free · Upgrade
          </Link>
        )}

        <div className="relative" ref={bellRef}>
          <button onClick={openBell}
            style={{
              width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', 
              background: bellOpen ? 'rgba(108,99,255,0.2)' : 'rgba(17,17,32,0.6)', 
              color: bellOpen ? '#F0F0FF' : '#6B6B8A', 
              border: bellOpen ? '1px solid rgba(108,99,255,0.4)' : '1px solid rgba(108,99,255,0.1)', 
              cursor: 'pointer', position: 'relative', transition: 'all 0.3s',
              boxShadow: bellOpen ? '0 0 20px rgba(108,99,255,0.2)' : 'none'
            }}
            onMouseEnter={e => { if(!bellOpen) { e.currentTarget.style.background='rgba(108,99,255,0.1)'; e.currentTarget.style.color='#F0F0FF'; e.currentTarget.style.borderColor='rgba(108,99,255,0.3)'; } }}
            onMouseLeave={e => { if (!bellOpen) { e.currentTarget.style.background='rgba(17,17,32,0.6)'; e.currentTarget.style.color='#6B6B8A'; e.currentTarget.style.borderColor='rgba(108,99,255,0.1)'; } }}>
            <BellIcon />
            {unread > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', 
                background: '#FF4560', color: '#fff', fontSize: 10, fontWeight: 900, 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 10px rgba(255,69,96,0.5)'
              }}>{unread > 9 ? '9+' : unread}</span>
            )}
          </button>

          {bellOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 48, width: 320, borderRadius: 16, 
              background: 'rgba(17,17,32,0.95)', backdropFilter: 'blur(20px)',
              border: '1px solid rgba(108,99,255,0.3)', boxShadow: '0 30px 60px rgba(0,0,0,0.8), 0 0 30px rgba(108,99,255,0.15)', 
              zIndex: 50, overflow: 'hidden',
              animation: 'fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}>
              <style>{`
                @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
              `}</style>
              <div style={{padding: '16px 20px', borderBottom: '1px solid rgba(108,99,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(10,10,15,0.6)'}}>
                <span style={{fontSize: 14, fontWeight: 800, color: '#F0F0FF', letterSpacing: '-0.01em'}}>Notifications</span>
                {alerts.length > 0 && <button onClick={() => setAlerts([])} style={{fontSize: 12, fontWeight: 600, color: '#6B6B8A', cursor: 'pointer', background: 'none', border: 'none'}}>Clear</button>}
              </div>
              {alerts.length === 0 ? (
                <div style={{padding: '40px 20px', textAlign: 'center', fontSize: 13, fontWeight: 500, color: '#6B6B8A'}}>All caught up.</div>
              ) : (
                <div style={{maxHeight: 320, overflowY: 'auto'}}>
                  {alerts.map(a => (
                    <div key={a.id} style={{padding: '16px 20px', borderBottom: '1px solid rgba(10,10,15,0.8)', opacity: a.read ? 0.5 : 1, display: 'flex', gap: 16, transition: 'background 0.2s', cursor: 'pointer'}} onMouseEnter={e => e.currentTarget.style.background = 'rgba(108,99,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div style={{width: 8, height: 8, borderRadius: '50%', background: a.read ? '#2A2A3A' : '#00E5B4', marginTop: 6, flexShrink: 0, boxShadow: a.read ? 'none' : '0 0 10px rgba(0,229,180,0.5)'}} />
                      <div>
                        <p style={{fontSize: 13, fontWeight: 600, color: '#F0F0FF', margin: 0, lineHeight: 1.4}}>{a.text}</p>
                        <p style={{fontSize: 11, fontWeight: 600, color: '#6B6B8A', marginTop: 4}}>{new Date(a.ts).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {user && (
          <div style={{display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 10, borderLeft: '1px solid rgba(108,99,255,0.2)'}}>
             <span className="hidden sm:block" style={{fontSize: 14, color: '#F0F0FF', fontWeight: 800, letterSpacing: '-0.01em'}}>{firstName(user.email)}</span>
          </div>
        )}

      </div>
    </nav>
  );
}
