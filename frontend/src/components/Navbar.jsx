import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Logo from './Logo';

function firstName(email = '') {
  const raw = (email.split('@')[0].split('.')[0]).replace(/\d+$/, '');
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}

export default function Navbar() {
  const { user, tier, signOut } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts]     = useState([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [unread, setUnread]     = useState(0);
  const bellRef                 = useRef(null);

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
    <nav className="glass-nav px-6 py-3 flex items-center justify-between">
      <Logo size="md" />
      <div className="flex items-center gap-3">
        {tier === 'pro' ? (
          <span style={{fontSize:12, fontWeight:600, padding:'4px 12px', borderRadius:100, background:'rgba(79,142,247,0.15)', border:'1px solid rgba(79,142,247,0.3)', color:'#7aaff8'}}>Pro</span>
        ) : (
          <Link to="/settings" className="glass-pill" style={{color:'#fbbf24', background:'rgba(245,158,11,0.1)', borderColor:'rgba(245,158,11,0.25)', textDecoration:'none'}}>
            Free · Upgrade
          </Link>
        )}

        <div className="relative" ref={bellRef}>
          <button onClick={openBell}
            style={{width:32, height:32, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', background:bellOpen?'rgba(79,142,247,0.15)':'transparent', color:'#4a5a7a', border:'1px solid transparent', cursor:'pointer', position:'relative'}}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.06)'; }}
            onMouseLeave={e => { if (!bellOpen) e.currentTarget.style.background='transparent'; }}>
            <BellIcon />
            {unread > 0 && (
              <span style={{position:'absolute', top:-2, right:-2, width:16, height:16, borderRadius:'50%', background:'#ef4444', color:'#fff', fontSize:9, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center'}}>{unread > 9 ? '9+' : unread}</span>
            )}
          </button>

          {bellOpen && (
            <div style={{position:'absolute', right:0, top:40, width:280, borderRadius:16, background:'#070712', border:'1px solid rgba(255,255,255,0.08)', boxShadow:'0 20px 60px rgba(0,0,0,0.6)', zIndex:50, overflow:'hidden'}}>
              <div style={{padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                <span style={{fontSize:14, fontWeight:600, color:'#F5F5FA'}}>Alerts</span>
                {alerts.length > 0 && <button onClick={() => setAlerts([])} style={{fontSize:12, color:'#4a5a7a', cursor:'pointer', background:'none', border:'none'}}>Clear all</button>}
              </div>
              {alerts.length === 0 ? (
                <div style={{padding:'32px 16px', textAlign:'center', fontSize:13, color:'#2a3a5a'}}>No alerts yet</div>
              ) : (
                <div style={{maxHeight:280, overflowY:'auto'}}>
                  {alerts.map(a => (
                    <div key={a.id} style={{padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.04)', opacity:a.read?0.6:1, display:'flex', gap:12}}>
                      <div style={{width:6, height:6, borderRadius:'50%', background:a.read?'#1a2535':'#4f8ef7', marginTop:4, flexShrink:0}} />
                      <div>
                        <p style={{fontSize:12, color:'#cbd5e1', margin:0}}>{a.text}</p>
                        <p style={{fontSize:11, color:'#2a3a5a', marginTop:2}}>{new Date(a.ts).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <span className="hidden sm:block" style={{fontSize:13, color:'#4a5a7a', fontWeight:500}}>{firstName(user?.email)}</span>

        <button onClick={async () => { await signOut(); navigate('/login'); }} className="glass-btn" style={{fontSize:12, padding:'6px 14px', borderRadius:8}}>
          Sign out
        </button>
      </div>
    </nav>
  );
}
