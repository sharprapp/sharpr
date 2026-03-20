import { useState, useEffect, useMemo, useRef, memo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Logo from '../components/Logo';
import TradingViewTicker from '../components/TradingViewTicker';
import api from '../lib/api';
import BettingCalendar from '../components/BettingCalendar';
import TradingCalendar from '../components/TradingCalendar';
import SportsOdds from '../components/SportsOdds';
import CommunityTab from '../components/CommunityTab';
import MarketDetailModal from '../components/MarketDetailModal';
import HomeTab from '../components/HomeTab';
import UpgradeModal from '../components/UpgradeModal';
import SportsTicker from '../components/SportsTicker';
import OddsBoard from '../components/OddsBoard';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend,
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend);

const NAV_GROUPS = [
  { label: 'Trade', items: [
    { key: 'dt-journal', label: 'Journal', emoji: '📓', desc: 'Trade log & calendar' },
    { key: 'dt-premarket', label: 'Pre-Market', emoji: '🌅', desc: 'Morning prep & levels' },
    { key: 'dt-riskcalc', label: 'Risk Calc', emoji: '🎯', desc: 'Position sizing & R:R' },
    { key: 'dt-reports', label: 'Reports', emoji: '📊', desc: 'Performance analytics' },
  ]},
  { label: 'Bet', items: [
    { key: 'sb-journal', label: 'Journal', emoji: '📓', desc: 'Bet log & calendar' },
    { key: 'sb-arbitrage', label: 'Arbitrage', emoji: '⚖️', desc: 'Find +EV across books' },
    { key: 'sb-parlay', label: 'Parlay', emoji: '🎰', desc: 'Optimize parlay EV' },
    { key: 'sb-analytics', label: 'Analytics', emoji: '📈', desc: 'ROI & performance' },
  ]},
  { label: 'Predict', items: [
    { key: 'Polymarket', label: 'Polymarket', emoji: '🎯', desc: '8,300+ live markets' },
    { key: 'EV Calc', label: 'EV Calc', emoji: '🧮', desc: 'Expected value calculator' },
  ]},
  { label: 'Social', items: [{ key: 'Community', label: 'Community', emoji: '💬', desc: 'Trading chat' }] },
  { label: 'Info', items: [{ key: 'News', label: 'News', emoji: '📰', desc: 'Market & sports news' }] },
];
const STANDALONE_TABS_LEFT = ['Home'];
const STANDALONE_TABS_RIGHT = ['AI Research'];
const ALL_TABS = [...STANDALONE_TABS_LEFT, ...NAV_GROUPS.flatMap(g => g.items.map(i => i.key)), ...STANDALONE_TABS_RIGHT];

/* ── Polymarket localStorage cache (5 min) ── */
const PM_LS_KEY = 'pm_markets_v2';
const PM_LS_TTL = 5 * 60 * 1000;
function getPMCache() {
  try {
    const c = JSON.parse(localStorage.getItem(PM_LS_KEY) || 'null');
    if (c && Date.now() - c.ts < PM_LS_TTL) return c.markets;
  } catch {}
  return null;
}
function setPMCache(markets) {
  try { localStorage.setItem(PM_LS_KEY, JSON.stringify({ markets, ts: Date.now() })); } catch {}
}

/* ── shared input / select style helpers ── */
const inp = 'outline-none transition-colors';
const inpStyle = { background: '#0a0f1e', border: '1px solid #1e2a4a', color: '#F5F5FA' };
const inpFocus  = e => { e.target.style.borderColor = '#2563EB'; };
const inpBlur   = e => { e.target.style.borderColor = '#1e2a4a'; };

export default function Dashboard() {
  const [tab, setTab]     = useState(() => {
    const saved = sessionStorage.getItem('openTab');
    if (saved) { sessionStorage.removeItem('openTab'); return saved; }
    return 'Home';
  });
  const [aiFill, setAiFill]       = useState(null);
  const [visitedTabs, setVisitedTabs] = useState(() => {
    const saved = sessionStorage.getItem('openTab');
    return [saved || 'Home'];
  });
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [oddsSport, setOddsSport] = useState('NBA');
  const { tier } = useAuth();

  // Warm up Railway backend immediately
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/health`).catch(() => {});
  }, []);

  useEffect(() => {
    function handler(e) { setAiFill(e.detail); setTab('AI Research'); setVisitedTabs(prev => [...new Set([...prev, 'AI Research'])]); }
    window.addEventListener('ai-prefill', handler);
    return () => window.removeEventListener('ai-prefill', handler);
  }, []);

  useEffect(() => {
    function handler() { setShowUpgrade(true); }
    window.addEventListener('open-upgrade', handler);
    return () => window.removeEventListener('open-upgrade', handler);
  }, []);

  function switchTab(t) {
    setTab(t);
    setVisitedTabs(prev => [...new Set([...prev, t])]);
  }

  return (
    <div className="min-h-screen">
      <DashboardNav tab={tab} setTab={switchTab} tier={tier} onOddsSport={setOddsSport} />
      <TradingViewTicker />
      <SportsTicker />

      {tab === 'Home' ? (
        <div className="tab-content" style={{maxWidth: 1400, margin: '0 auto', padding: '32px 24px'}}>
          <HomeTab onSwitchTab={switchTab} />
        </div>
      ) : tab === 'Events' ? (
        <div className="tab-content" style={{maxWidth: 1400, margin: '0 auto', padding: '32px 24px'}}>
          <OddsBoard initialSport={oddsSport} />
        </div>
      ) : tab.startsWith('dt-') ? (
        <div className="tab-content" style={{padding: '32px 24px'}}>
          <DayTradingTab activeSubTab={tab.replace('dt-', '')} />
        </div>
      ) : tab.startsWith('sb-') ? (
        <div className="tab-content" style={{maxWidth: 1400, margin: '0 auto', padding: '32px 24px'}}>
          <SportsBettingTab tier={tier} activeSubTab={tab.replace('sb-', '')} />
        </div>
      ) : (
        <div className="tab-content" style={{maxWidth: 1400, margin: '0 auto', padding: '32px 24px'}}>
          {visitedTabs.includes('Polymarket')     && <div style={{display: tab==='Polymarket'     ? 'block' : 'none'}}><PolymarketTab tier={tier} /></div>}
          {visitedTabs.includes('EV Calc')        && <div style={{display: tab==='EV Calc'        ? 'block' : 'none'}}><EVCalcTab /></div>}
          {visitedTabs.includes('AI Research')    && <div style={{display: tab==='AI Research'    ? 'block' : 'none'}}><AIResearchTab prefill={aiFill} onPrefillConsumed={() => setAiFill(null)} /></div>}
          {visitedTabs.includes('News')           && <div style={{display: tab==='News'           ? 'block' : 'none'}}><NewsTab /></div>}
          {visitedTabs.includes('Community')      && <div style={{display: tab==='Community'      ? 'block' : 'none'}}><CommunityTab /></div>}
        </div>
      )}
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </div>
  );
}

const SPORT_GROUPS = [
  { label: 'American', sports: [
    { key: 'nba', label: 'NBA', emoji: '🏀' }, { key: 'nfl', label: 'NFL', emoji: '🏈' },
    { key: 'mlb', label: 'MLB', emoji: '⚾' }, { key: 'nhl', label: 'NHL', emoji: '🏒' },
    { key: 'ncaab', label: 'NCAAB', emoji: '🏀' }, { key: 'ncaaf', label: 'NCAAF', emoji: '🏈' },
    { key: 'wnba', label: 'WNBA', emoji: '🏀' },
  ]},
  { label: 'Soccer', sports: [
    { key: 'soccer_epl', label: 'EPL', emoji: '⚽' }, { key: 'soccer_mls', label: 'MLS', emoji: '⚽' },
    { key: 'soccer_laliga', label: 'La Liga', emoji: '⚽' }, { key: 'soccer_champions', label: 'UCL', emoji: '⚽' },
  ]},
  { label: 'Combat', sports: [
    { key: 'ufc', label: 'UFC', emoji: '🥊' }, { key: 'boxing', label: 'Boxing', emoji: '🥊' },
  ]},
  { label: 'Other', sports: [
    { key: 'tennis_atp', label: 'ATP', emoji: '🎾' }, { key: 'golf_pga', label: 'PGA', emoji: '⛳' },
    { key: 'f1', label: 'F1', emoji: '🏎️' }, { key: 'rugby', label: 'Rugby', emoji: '🏉' },
  ]},
];

function NavGroups({ tab, setTab, onOddsSport }) {
  const [openGroup, setOpenGroup] = useState(null);
  const navRef = useRef(null);

  useEffect(() => {
    function handler(e) { if (navRef.current && !navRef.current.contains(e.target)) setOpenGroup(null); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const activeGroup = NAV_GROUPS.find(g => g.items.some(i => i.key === tab))?.label || '';

  function StandaloneBtn({ t }) {
    return (
      <button onClick={() => { setTab(t); setOpenGroup(null); }}
        style={{
          background: tab === t ? 'rgba(79,142,247,0.15)' : 'transparent',
          border: tab === t ? '1px solid rgba(79,142,247,0.3)' : '1px solid transparent',
          borderBottom: tab === t ? '2px solid #4f8ef7' : '2px solid transparent',
          color: tab === t ? '#7aaff8' : '#2a3a5a',
          borderRadius: 8, padding: '6px 16px', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
        }}
        onMouseEnter={e => { if (tab !== t) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#6a7a9a'; } }}
        onMouseLeave={e => { if (tab !== t) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#2a3a5a'; } }}>
        {t}
      </button>
    );
  }

  return (
    <div ref={navRef} style={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative' }}>
      {STANDALONE_TABS_LEFT.map(t => <StandaloneBtn key={t} t={t} />)}

      {/* Odds with sport dropdown */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => openGroup === 'Events' ? setOpenGroup(null) : setOpenGroup('Events')}
          style={{
            background: tab === 'Events' ? 'rgba(79,142,247,0.15)' : openGroup === 'Events' ? 'rgba(255,255,255,0.05)' : 'transparent',
            border: tab === 'Events' ? '1px solid rgba(79,142,247,0.3)' : '1px solid transparent',
            borderBottom: tab === 'Events' ? '2px solid #4f8ef7' : '2px solid transparent',
            color: tab === 'Events' ? '#7aaff8' : openGroup === 'Events' ? '#94A3B8' : '#2a3a5a',
            borderRadius: 8, padding: '6px 16px', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { if (tab !== 'Events' && openGroup !== 'Events') { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#6a7a9a'; } }}
          onMouseLeave={e => { if (tab !== 'Events' && openGroup !== 'Events') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#2a3a5a'; } }}
        >
          Events <span style={{ marginLeft: 4, fontSize: 9, opacity: 0.5 }}>{openGroup === 'Events' ? '\u25B2' : '\u25BC'}</span>
        </button>
        {openGroup === 'Events' && (
          <div style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            marginTop: 8, background: '#070712', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12, padding: 12, zIndex: 100, maxHeight: 400, overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)', minWidth: 280,
          }}>
            {SPORT_GROUPS.map(g => (
              <div key={g.label} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#2a3a5a', padding: '4px 8px' }}>{g.label}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {g.sports.map(s => (
                    <button key={s.key} onClick={() => { onOddsSport(s.key); setTab('Events'); setOpenGroup(null); }}
                      style={{
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                        color: '#6a7a9a', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 600,
                        cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(79,142,247,0.15)'; e.currentTarget.style.color = '#7aaff8'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#6a7a9a'; }}>
                      <span style={{ fontSize: 12 }}>{s.emoji}</span> {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {NAV_GROUPS.map(g => {
        const isActive = g.items.some(i => i.key === tab);
        const isOpen = openGroup === g.label;
        return (
          <div key={g.label} style={{ position: 'relative' }}>
            <button
              onClick={() => {
                if (g.items.length === 1) { setTab(g.items[0].key); setOpenGroup(null); }
                else setOpenGroup(isOpen ? null : g.label);
              }}
              style={{
                background: isActive ? 'rgba(79,142,247,0.15)' : isOpen ? 'rgba(255,255,255,0.05)' : 'transparent',
                border: isActive ? '1px solid rgba(79,142,247,0.3)' : '1px solid transparent',
                borderBottom: isActive ? '2px solid #4f8ef7' : '2px solid transparent',
                color: isActive ? '#7aaff8' : isOpen ? '#94A3B8' : '#2a3a5a',
                borderRadius: 8, padding: '6px 16px', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!isActive && !isOpen) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#6a7a9a'; } }}
              onMouseLeave={e => { if (!isActive && !isOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#2a3a5a'; } }}
            >
              {g.label}
              {g.items.length > 1 && <span style={{ marginLeft: 4, fontSize: 9, opacity: 0.5 }}>{isOpen ? '\u25B2' : '\u25BC'}</span>}
            </button>
            {isOpen && g.items.length > 1 && (
              <div style={{
                position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                marginTop: 8, background: '#070712',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14,
                padding: 8, zIndex: 100, minWidth: 220,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}>
                {g.items.map(item => {
                  const isItemActive = tab === item.key;
                  return (
                    <button key={item.key} onClick={() => { setTab(item.key); setOpenGroup(null); }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px', borderRadius: 8, border: 'none',
                        borderLeft: isItemActive ? '2px solid #4f8ef7' : '2px solid transparent',
                        background: isItemActive ? 'rgba(79,142,247,0.12)' : 'transparent',
                        cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
                      }}
                      onMouseEnter={e => { if (!isItemActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                      onMouseLeave={e => { if (!isItemActive) e.currentTarget.style.background = 'transparent'; }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{item.emoji}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: isItemActive ? '#7aaff8' : '#f0f4ff' }}>{item.label}</div>
                        <div style={{ fontSize: 10, color: '#2a3a5a', marginTop: 1 }}>{item.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      {STANDALONE_TABS_RIGHT.map(t => <StandaloneBtn key={t} t={t} />)}
    </div>
  );
}

/* ─────────────────────────────────────────
   UNIFIED DASHBOARD NAVBAR
───────────────────────────────────────── */
function DashboardNav({ tab, setTab, tier, onOddsSport }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts]     = useState([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [unread, setUnread]     = useState(0);
  const bellRef                 = useRef(null);

  function firstName(email = '') {
    const raw = (email.split('@')[0].split('.')[0]).replace(/\d+$/, '');
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

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
    <div className="sticky top-0 z-40 glass-nav">
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', height: 64 }}>

        {/* Left: Logo */}
        <div style={{ flex: 1 }}>
          <Logo size="lg" />
        </div>

        {/* Center: Grouped Nav */}
        <NavGroups tab={tab} setTab={setTab} onOddsSport={onOddsSport} />

        {/* Right: User controls */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
          {tier === 'elite' ? (
            <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 14px', borderRadius: 100, background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.35)', color: '#fbbf24' }}>⚡ Elite</span>
          ) : tier === 'pro' ? (
            <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 14px', borderRadius: 100, background: 'rgba(79,142,247,0.15)', border: '1px solid rgba(79,142,247,0.3)', color: '#7aaff8' }}>✓ Pro</span>
          ) : (
            <button onClick={() => navigate('/settings')} style={{ fontSize: 11, fontWeight: 700, padding: '4px 14px', borderRadius: 100, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24', cursor: 'pointer' }}>
              Upgrade
            </button>
          )}

          {/* Bell */}
          <div className="relative" ref={bellRef}>
            <button onClick={openBell}
              style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: bellOpen ? 'rgba(79,142,247,0.15)' : 'transparent', color: '#4a5a7a', border: '1px solid transparent', cursor: 'pointer', position: 'relative' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={e => { if (!bellOpen) e.currentTarget.style.background = 'transparent'; }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {unread > 0 && <span style={{ position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: '50%', background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unread > 9 ? '9+' : unread}</span>}
            </button>

            {bellOpen && (
              <div style={{ position: 'absolute', right: 0, top: 40, width: 280, borderRadius: 16, background: '#070712', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', zIndex: 50, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#F5F5FA' }}>Alerts</span>
                  {alerts.length > 0 && <button onClick={() => setAlerts([])} style={{ fontSize: 12, color: '#4a5a7a', cursor: 'pointer', background: 'none', border: 'none' }}>Clear all</button>}
                </div>
                {alerts.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 13, color: '#2a3a5a' }}>No alerts yet</div>
                ) : (
                  <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                    {alerts.map(a => (
                      <div key={a.id} style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', opacity: a.read ? 0.6 : 1, display: 'flex', gap: 12 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: a.read ? '#1a2535' : '#4f8ef7', marginTop: 4, flexShrink: 0 }} />
                        <div>
                          <p style={{ fontSize: 12, color: '#cbd5e1', margin: 0 }}>{a.text}</p>
                          <p style={{ fontSize: 11, color: '#2a3a5a', marginTop: 2 }}>{new Date(a.ts).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <span className="hidden sm:block" style={{ fontSize: 13, color: '#2a3a5a', fontWeight: 500 }}>{firstName(user?.email)}</span>

          <button onClick={async () => { await signOut(); navigate('/login'); }} className="glass-btn" style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8 }}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   PORTFOLIO PANEL (Polymarket sub-tab)
───────────────────────────────────────── */
function PortfolioPanel() {
  const [positions, setPositions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pm_positions') || '[]'); } catch { return []; }
  });
  const [form, setForm] = useState({ title: '', side: 'YES', shares: '', avgPrice: '', currentPrice: '' });
  const [adding, setAdding] = useState(false);

  function save(next) { setPositions(next); localStorage.setItem('pm_positions', JSON.stringify(next)); }

  function addPosition() {
    if (!form.title || !form.shares || !form.avgPrice) return;
    save([{ id: Date.now(), title: form.title, side: form.side,
      shares: parseFloat(form.shares), avgPrice: parseFloat(form.avgPrice),
      currentPrice: parseFloat(form.currentPrice) || parseFloat(form.avgPrice),
      openedAt: new Date().toISOString() }, ...positions]);
    setForm({ title: '', side: 'YES', shares: '', avgPrice: '', currentPrice: '' });
    setAdding(false);
  }

  function updateCurrent(id, price) {
    save(positions.map(p => p.id === id ? { ...p, currentPrice: parseFloat(price) || p.currentPrice } : p));
  }

  const totalPnl = positions.reduce((sum, p) => {
    return sum + (p.currentPrice - p.avgPrice) * p.shares * (p.side === 'YES' ? 1 : -1);
  }, 0);

  const card = { background: '#0f1729', border: '1px solid #1e2a4a', borderRadius: 16, padding: 20 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {[
          ['Open positions', positions.length, '#F5F5FA'],
          ['Unrealized P&L', (totalPnl >= 0 ? '+' : '') + '$' + Math.abs(totalPnl).toFixed(2), totalPnl >= 0 ? '#22c55e' : '#ef4444'],
          ['Avg cost basis', positions.length ? '$' + (positions.reduce((s,p) => s + p.shares * p.avgPrice, 0) / positions.length).toFixed(2) : '—', '#F5F5FA'],
        ].map(([l, v, c]) => (
          <div key={l} style={card}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: c }}>{v}</div>
          </div>
        ))}
      </div>

      {!adding ? (
        <button onClick={() => setAdding(true)} className="glass-btn-blue self-start" style={{ padding: '9px 20px', fontSize: 13, borderRadius: 10 }}>
          + Track position
        </button>
      ) : (
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#F5F5FA', marginBottom: 14 }}>New position</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginBottom: 10 }}>
            <input value={form.title} onChange={e => setForm({...form, title: e.target.value})}
              placeholder="Market title…" className={inp}
              style={{ ...inpStyle, padding: '9px 12px', borderRadius: 10 }} onFocus={inpFocus} onBlur={inpBlur} />
            <select value={form.side} onChange={e => setForm({...form, side: e.target.value})}
              className={inp} style={{ ...inpStyle, padding: '9px 12px', borderRadius: 10, width: 80 }} onFocus={inpFocus} onBlur={inpBlur}>
              <option>YES</option><option>NO</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 12 }}>
            {[['Shares', 'shares', '100'], ['Avg price (¢)', 'avgPrice', '55'], ['Current price (¢)', 'currentPrice', '—']].map(([label, key, ph]) => (
              <div key={key}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{label}</div>
                <input type="number" value={form[key]} onChange={e => setForm({...form, [key]: e.target.value})}
                  placeholder={ph} className={inp}
                  style={{ ...inpStyle, padding: '9px 12px', borderRadius: 10, width: '100%' }} onFocus={inpFocus} onBlur={inpBlur} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addPosition} className="glass-btn-blue" style={{ padding: '8px 18px', fontSize: 13, borderRadius: 9 }}>Add</button>
            <button onClick={() => setAdding(false)} className="glass-btn" style={{ padding: '8px 18px', fontSize: 13, borderRadius: 9 }}>Cancel</button>
          </div>
        </div>
      )}

      {positions.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>💼</div>
          <div style={{ fontSize: 14, color: '#64748b' }}>No positions tracked yet.</div>
          <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>Add markets you hold shares in to track unrealized P&L.</div>
        </div>
      ) : (
        <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #1e2a4a' }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0a0f1e', borderBottom: '1px solid #1e2a4a' }}>
                {['Market','Side','Shares','Avg ¢','Cur ¢','P&L',''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {positions.map((p, i) => {
                const pnl = (p.currentPrice - p.avgPrice) * p.shares * (p.side === 'YES' ? 1 : -1);
                return (
                  <tr key={p.id} style={{ borderBottom: i < positions.length - 1 ? '1px solid rgba(30,42,74,0.5)' : 'none', background: '#0f1729' }}>
                    <td style={{ padding: '10px 14px', color: '#F5F5FA', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: p.side === 'YES' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: p.side === 'YES' ? '#22c55e' : '#ef4444' }}>{p.side}</span>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#94A3B8' }}>{p.shares}</td>
                    <td style={{ padding: '10px 14px', color: '#94A3B8' }}>{p.avgPrice}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <input type="number" defaultValue={p.currentPrice}
                        onBlur={e => updateCurrent(p.id, e.target.value)}
                        style={{ background: 'transparent', border: 'none', borderBottom: '1px solid #1e2a4a', color: '#F5F5FA', width: 46, fontSize: 13, outline: 'none' }} />
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: pnl >= 0 ? '#22c55e' : '#ef4444' }}>
                      {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <button onClick={() => save(positions.filter(x => x.id !== p.id))}
                        style={{ color: '#334155', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}
                        onMouseEnter={e => e.currentTarget.style.color='#ef4444'}
                        onMouseLeave={e => e.currentTarget.style.color='#334155'}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ fontSize: 11, color: '#475569', textAlign: 'right' }}>
        Stored locally. Edit "Cur ¢" column to update prices and recalculate P&L.
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   ALERTS PANEL (Polymarket sub-tab)
───────────────────────────────────────── */
function AlertsPanel() {
  const [alertsList, setAlertsList] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pm_alerts') || '[]'); } catch { return []; }
  });
  const [form, setForm] = useState({ title: '', condition: 'above', threshold: '' });

  function save(next) { setAlertsList(next); localStorage.setItem('pm_alerts', JSON.stringify(next)); }

  function addAlert() {
    if (!form.title || !form.threshold) return;
    const a = { id: Date.now(), title: form.title, condition: form.condition,
      threshold: parseFloat(form.threshold), createdAt: new Date().toISOString(), triggered: false };
    save([a, ...alertsList]);
    setForm({ title: '', condition: 'above', threshold: '' });
    window.dispatchEvent(new CustomEvent('push-alert', {
      detail: { text: `Alert set: "${a.title}" — YES% ${a.condition} ${a.threshold}%` }
    }));
  }

  const card = { background: '#0f1729', border: '1px solid #1e2a4a', borderRadius: 16, padding: 20 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 560 }}>
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#F5F5FA', marginBottom: 4 }}>🔔 Price Alerts</div>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
          Get notified in-app when a market's YES% crosses your threshold.
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Market title (partial match)</div>
          <input value={form.title} onChange={e => setForm({...form, title: e.target.value})}
            placeholder="e.g. Will BTC hit $120k" className={inp}
            style={{ ...inpStyle, padding: '9px 12px', borderRadius: 10, width: '100%' }} onFocus={inpFocus} onBlur={inpBlur} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Condition</div>
            <select value={form.condition} onChange={e => setForm({...form, condition: e.target.value})}
              className={inp} style={{ ...inpStyle, padding: '9px 12px', borderRadius: 10, width: '100%' }} onFocus={inpFocus} onBlur={inpBlur}>
              <option value="above">YES% rises above</option>
              <option value="below">YES% falls below</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Threshold (%)</div>
            <input type="number" min="1" max="99" value={form.threshold}
              onChange={e => setForm({...form, threshold: e.target.value})}
              placeholder="60" className={inp}
              style={{ ...inpStyle, padding: '9px 12px', borderRadius: 10, width: '100%' }} onFocus={inpFocus} onBlur={inpBlur} />
          </div>
        </div>
        <button onClick={addAlert} disabled={!form.title || !form.threshold}
          className="glass-btn-blue" style={{ padding: '9px 20px', fontSize: 13, borderRadius: 10 }}>
          + Set alert
        </button>
      </div>

      {alertsList.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🔕</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>No alerts set. Add one above.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {alertsList.map(a => (
            <div key={a.id} style={{ ...card, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: '#F5F5FA', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  Fire when YES% {a.condition} <span style={{ color: '#fbbf24', fontWeight: 700 }}>{a.threshold}%</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, fontWeight: 600, background: a.triggered ? 'rgba(34,197,94,0.15)' : 'rgba(37,99,235,0.15)', color: a.triggered ? '#22c55e' : '#60a5fa' }}>
                  {a.triggered ? '✓ Triggered' : '⏳ Watching'}
                </span>
                <button onClick={() => save(alertsList.filter(x => x.id !== a.id))}
                  style={{ color: '#334155', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}
                  onMouseEnter={e => e.currentTarget.style.color='#ef4444'}
                  onMouseLeave={e => e.currentTarget.style.color='#334155'}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ fontSize: 11, color: '#475569' }}>
        Alerts stored locally. Refresh the Markets tab to check live prices against thresholds.
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   POLYMARKET TAB
───────────────────────────────────────── */
const PM_SIDEBAR_CATS = ['All', 'Politics', 'Crypto', 'Finance', 'Sports', 'Economics', 'Entertainment', 'Science', 'Other'];

function PolymarketTab({ tier }) {
  const [pmTab, setPmTab]       = useState('markets');
  const [markets, setMarkets]   = useState(() => getPMCache() || []);
  const [q, setQ]               = useState('');
  const [filt, setFilt]         = useState('All');
  const [loading, setLoading]   = useState(() => !getPMCache()); // no spinner if cache hit
  const [fetching, setFetching] = useState(false);
  const [error, setError]       = useState('');
  const [totalLoaded, setTotalLoaded] = useState(() => getPMCache()?.length || 0);
  const [visibleCount, setVisibleCount] = useState(50); // show 50 at a time
  const sentinelRef = useRef(null);
  const [selectedMarket, setSelectedMarket] = useState(null);

  // IntersectionObserver — load 50 more when user nears the bottom
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) setVisibleCount(n => n + 50);
    }, { rootMargin: '200px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [pmTab]); // re-attach when switching back to markets sub-tab

  // Reset visible count when filter or search changes
  useEffect(() => { setVisibleCount(50); }, [filt, q]);

  useEffect(() => { fetchMarkets(false); }, []);

  async function fetchMarkets(forceRefresh = true) {
    if (forceRefresh) { setLoading(true); setError(''); setMarkets([]); setTotalLoaded(0); setVisibleCount(50); }
    try {
      // Fetch first page immediately so user sees data fast
      const first = await api.get('/api/markets/polymarket?offset=0');
      const firstMarkets = first.data.markets.map(m => ({ ...m, cat: pmCat(m.title) }));
      setMarkets(firstMarkets);
      setTotalLoaded(firstMarkets.length);
      setLoading(false);

      // Fetch remaining pages in background
      let allMarkets = [...firstMarkets];
      if (first.data.hasMore) {
        setFetching(true);
        let offset = 100;
        while (true) {
          try {
            const page = await api.get(`/api/markets/polymarket?offset=${offset}`);
            const pageMarkets = page.data.markets.map(m => ({ ...m, cat: pmCat(m.title) }));
            if (pageMarkets.length === 0) break;
            allMarkets = [...allMarkets, ...pageMarkets];
            setMarkets(prev => [...prev, ...pageMarkets]);
            setTotalLoaded(prev => prev + pageMarkets.length);
            if (!page.data.hasMore) break;
            offset += 100;
          } catch {
            break;
          }
        }
        setFetching(false);
        setPMCache(allMarkets); // persist full set to localStorage
      } else {
        setPMCache(allMarkets);
      }
    } catch (e) {
      const cached = getPMCache();
      if (cached && cached.length) {
        setMarkets(cached);
        setTotalLoaded(cached.length);
        setError('Using cached data — refresh to reload.');
      } else {
        setError('Could not load markets — showing sample data.');
        setMarkets(SAMPLE_PM);
      }
      setLoading(false);
    }
  }

  const catCounts = useMemo(() => {
    const counts = { All: markets.length };
    PM_SIDEBAR_CATS.slice(1).forEach(c => { counts[c] = markets.filter(m => m.cat === c).length; });
    return counts;
  }, [markets]);

  const filtered = useMemo(() => markets.filter(m =>
    (filt === 'All' || m.cat === filt) &&
    (!q || m.title.toLowerCase().includes(q.toLowerCase()))
  ), [markets, filt, q]);

  const visible = filtered.slice(0, visibleCount);

  const PM_SUBTABS = [
    { id: 'markets',   label: '📊 Markets' },
    { id: 'portfolio', label: '💼 Portfolio' },
    { id: 'alerts',    label: '🔔 Alerts' },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Sub-tab bar */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{background: '#0a0f1e'}}>
        {PM_SUBTABS.map(t => (
          <button key={t.id} onClick={() => setPmTab(t.id)}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={pmTab===t.id ? {background: '#2563EB', color: '#fff'} : {color: '#94A3B8'}}>
            {t.label}
          </button>
        ))}
      </div>

      {pmTab === 'portfolio' && <PortfolioPanel />}
      {pmTab === 'alerts'    && <AlertsPanel />}

      {pmTab === 'markets' && (
        <div className="flex gap-5">
          {/* Sidebar */}
          <aside className="hidden lg:flex flex-col gap-1 w-48 shrink-0 sticky top-20 self-start">
            <div className="text-xs font-semibold uppercase tracking-wider px-3 mb-2" style={{color: '#64748b'}}>Categories</div>
            {PM_SIDEBAR_CATS.map(c => (
              <button key={c} onClick={() => setFilt(c)}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all"
                style={filt === c
                  ? {background: '#2563EB', color: '#fff'}
                  : {color: '#94A3B8'}}
                onMouseEnter={e => { if (filt !== c) { e.currentTarget.style.background='#1e2a4a'; e.currentTarget.style.color='#F5F5FA'; } }}
                onMouseLeave={e => { if (filt !== c) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#94A3B8'; } }}>
                <span>{c}</span>
                <span className="text-xs tabular-nums" style={{color: filt === c ? 'rgba(255,255,255,0.6)' : '#475569'}}>{catCounts[c] || 0}</span>
              </button>
            ))}
          </aside>

          {/* Main */}
          <div className="flex flex-col gap-5 flex-1 min-w-0">
            <div className="flex gap-3 flex-col sm:flex-row">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{color: '#475569'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <input className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm ${inp}`} placeholder="Search markets…"
                  value={q} onChange={e => setQ(e.target.value)}
                  style={{...inpStyle, paddingLeft: '2.5rem'}}
                  onFocus={inpFocus} onBlur={inpBlur} />
              </div>
              <button onClick={() => fetchMarkets(true)} disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
                style={{border: '1px solid #1e2a4a', color: '#94A3B8', background: 'transparent'}}
                onMouseEnter={e => { e.currentTarget.style.borderColor='#2563EB'; e.currentTarget.style.color='#F5F5FA'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='#1e2a4a'; e.currentTarget.style.color='#94A3B8'; }}>
                {loading ? 'Loading…' : '↻ Refresh'}
              </button>
            </div>

            {/* Mobile pills */}
            <div className="flex gap-2 flex-wrap lg:hidden">
              {PM_SIDEBAR_CATS.map(c => (
                <button key={c} onClick={() => setFilt(c)}
                  className="text-xs px-3.5 py-1.5 rounded-full font-medium transition-all"
                  style={filt === c
                    ? {background: '#2563EB', color: '#fff', border: '1px solid #2563EB'}
                    : {border: '1px solid #1e2a4a', color: '#94A3B8'}}>
                  {c} {catCounts[c] > 0 && <span style={{opacity: 0.6}}>{catCounts[c]}</span>}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs" style={{color: '#64748b'}}>
                {loading && markets.length === 0 ? 'Loading…' : `${visible.length} of ${filtered.length}${filt !== 'All' ? ` in ${filt}` : ''}`}
                {totalLoaded > 0 && filt === 'All' && !loading && (
                  <span style={{color: '#475569'}}> ({totalLoaded} total)</span>
                )}
              </div>
              {(loading || fetching) && (
                <div className="flex items-center gap-1.5 text-xs animate-pulse" style={{color: '#64748b'}}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{background: '#2563EB'}} />
                  {loading ? 'Loading markets…' : `Fetching more… (${totalLoaded})`}
                </div>
              )}
            </div>

            {error && <p className="text-xs rounded-xl px-4 py-2" style={{color: '#f59e0b', background: 'rgba(245,158,11,0.1)'}}>{error}</p>}

            {/* Loading skeleton grid — shown while fetching with empty cache */}
            {loading && markets.length === 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({length: 6}).map((_, i) => (
                  <div key={i} className="rounded-2xl p-5 flex flex-col gap-4" style={{background: '#0f1729', border: '1px solid #1e2a4a'}}>
                    <div className="skeleton" style={{height: 20, width: '40%', borderRadius: 8}} />
                    <div className="skeleton" style={{height: 16, borderRadius: 6}} />
                    <div className="skeleton" style={{height: 14, width: '75%', borderRadius: 6}} />
                    <div className="skeleton" style={{height: 8, borderRadius: 4}} />
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {visible.map((m) => <MarketCard key={m.id} market={m} onClick={() => setSelectedMarket(m)} />)}
            </div>

            {/* Sentinel div — IntersectionObserver triggers loading more */}
            <div ref={sentinelRef} style={{height: 1}} />

            {visible.length < filtered.length && !loading && (
              <div className="text-center text-xs py-2" style={{color: '#475569'}}>
                Scroll for more · showing {visible.length} of {filtered.length}
              </div>
            )}
          </div>
        </div>
      )}
      {selectedMarket && <MarketDetailModal market={selectedMarket} onClose={() => setSelectedMarket(null)} userPlan={tier} />}
    </div>
  );
}

const CAT_COLORS = {
  Politics: { background: 'rgba(167,139,250,0.15)', color: '#c084fc' },
  Crypto: { background: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
  Sports: { background: 'rgba(34,197,94,0.15)', color: '#4ade80' },
  Finance: { background: 'rgba(79,142,247,0.15)', color: '#7aaff8' },
  Science: { background: 'rgba(20,184,166,0.15)', color: '#2dd4bf' },
  Entertainment: { background: 'rgba(244,63,94,0.15)', color: '#fb7185' },
  Economics: { background: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
  Other: { background: 'rgba(148,163,184,0.15)', color: '#94a3b8' },
};
function catColor(cat) { return CAT_COLORS[cat] || CAT_COLORS.Other; }

const MarketCard = memo(function MarketCard({ market: m, onClick }) {
  const [expanded, setExpanded] = useState(false);
  const pct      = m.yes ?? 50;
  const vol      = m.volume >= 1e6 ? '$'+(m.volume/1e6).toFixed(1)+'M' : m.volume >= 1000 ? '$'+(m.volume/1000).toFixed(0)+'k' : '$'+Math.round(m.volume||0);
  const fill     = pct > 66 ? '#22c55e' : pct > 40 ? '#f59e0b' : '#ef4444';
  const isSharp  = m.volume >= 1000000; // 🔥 sharp activity: volume > $1M

  // Mock 7-day probability history (seeded from market id for consistency)
  const probHistory = useMemo(() => {
    const seed = (m.id || '').split('').reduce((s, c) => s + c.charCodeAt(0), 0);
    const base = pct;
    return Array.from({ length: 7 }, (_, i) => {
      const noise = ((seed * (i + 1) * 7 + 13) % 21) - 10;
      return Math.max(5, Math.min(95, base + noise - (i * 0.5)));
    }).reverse();
  }, [m.id, pct]);

  const chartData = {
    labels: ['7d ago','6d','5d','4d','3d','2d','Today'],
    datasets: [{
      data: probHistory,
      borderColor: fill, backgroundColor: fill+'22',
      tension: 0.4, fill: true, pointRadius: 3, pointBackgroundColor: fill,
    }],
  };
  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ctx.raw.toFixed(1)+'%' } } },
    scales: {
      x: { grid: { color: 'rgba(30,42,74,0.6)' }, ticks: { color: '#475569', font: { size: 10 } } },
      y: { grid: { color: 'rgba(30,42,74,0.6)' }, ticks: { color: '#475569', font: { size: 10 }, callback: v => v+'%' }, min: 0, max: 100 },
    },
  };

  return (
    <div className="rounded-2xl p-5 flex flex-col gap-4 transition-all"
      style={{background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', transition: 'all 0.2s ease', cursor: 'pointer'}}
      onClick={onClick}
      onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(79,142,247,0.3)'; e.currentTarget.style.boxShadow='0 8px 32px rgba(0,0,0,0.3)'; e.currentTarget.style.transform='translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='translateY(0)'; }}>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={catColor(m.cat)}>{m.cat}</span>
          {isSharp && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{background: 'rgba(239,68,68,0.15)', color: '#f87171'}}>🔥 Sharp</span>
          )}
        </div>
        <span className="text-xs font-medium" style={{color: '#64748b'}}>Vol {vol}</span>
      </div>

      <p style={{fontSize: 13, fontWeight: 500, color: '#F5F5FA', lineHeight: 1.4, flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', margin: 0}}>{m.title}</p>

      <div>
        <div className="flex justify-between items-baseline mb-1.5">
          <span className="text-xs" style={{color: '#64748b'}}>YES</span>
          <span style={{fontSize: 28, fontWeight: 900, color: fill}}>{pct}%</span>
          <span className="text-xs" style={{color: '#64748b'}}>NO {m.no ?? 100 - pct}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{background: '#1e2a4a'}}>
          <div className="h-full rounded-full transition-all" style={{width: pct+'%', background: fill}} />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <AIAnalyzeButton topic={m.title} type="polymarket" />
        <button onClick={() => setExpanded(e => !e)}
          className="text-xs transition-colors" style={{color: '#475569'}}
          onMouseEnter={e => e.currentTarget.style.color='#94A3B8'}
          onMouseLeave={e => e.currentTarget.style.color='#475569'}>
          {expanded ? '▲ Hide chart' : '▼ 7-day chart'}
        </button>
      </div>

      {expanded && (
        <div style={{height: 120}}>
          <Line data={chartData} options={chartOpts} />
        </div>
      )}
    </div>
  );
});

/* ─────────────────────────────────────────
   DAY TRADING TAB
───────────────────────────────────────── */
function DayTradingTab({ activeSubTab }) {
  const subTab = activeSubTab || 'journal';
  const [trades, setTrades]   = useState([]);
  const [form, setForm]       = useState({ ticker:'', direction:'LONG', entry:'', exit:'', qty:'', setup:'Breakout', status:'open', notes:'' });
  const [loading, setLoading] = useState(false);
  const [view, setView]       = useState('calendar');

  const [monthGoal,  setMonthGoal]  = useState(() => parseFloat(localStorage.getItem('dt_month_goal')  || '1000'));
  const [dailyLimit, setDailyLimit] = useState(() => parseFloat(localStorage.getItem('dt_daily_limit') || '200'));
  const [wrTarget,   setWrTarget]   = useState(() => parseFloat(localStorage.getItem('dt_wr_target')   || '55'));

  useEffect(() => { api.get('/api/trades').then(r => setTrades(r.data)).catch(() => {}); }, []);

  function sendPrompt(text) {
    window.dispatchEvent(new CustomEvent('ai-prefill', { detail: { topic: text, type: 'trading' } }));
  }

  const now = new Date();
  const thisMonth  = useMemo(() => trades.filter(t => { const d = new Date(t.created_at); return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth(); }), [trades]);
  const todayTrades = useMemo(() => trades.filter(t => new Date(t.created_at).toDateString() === now.toDateString()), [trades]);

  const monthPnl  = useMemo(() => thisMonth.filter(t => t.status!=='open').reduce((s,t) => s+(t.pnl||0), 0), [thisMonth]);
  const todayPnl  = useMemo(() => todayTrades.filter(t => t.status!=='open').reduce((s,t) => s+(t.pnl||0), 0), [todayTrades]);
  const monthWins = useMemo(() => thisMonth.filter(t => t.status==='win').length, [thisMonth]);
  const monthSett = useMemo(() => thisMonth.filter(t => t.status!=='open').length, [thisMonth]);
  const monthWR   = monthSett ? Math.round(monthWins/monthSett*100) : 0;
  const maxDD     = useMemo(() => calcMaxDrawdown(thisMonth), [thisMonth]);
  const stats     = calcDTStats(trades);

  async function addTrade() {
    if (!form.ticker || !form.entry || !form.qty) return alert('Fill in ticker, entry, and qty.');
    setLoading(true);
    try {
      const { data } = await api.post('/api/trades', {...form, entry:parseFloat(form.entry), exit:form.exit?parseFloat(form.exit):null, qty:parseFloat(form.qty)});
      setTrades([data, ...trades]);
      setForm({ ticker:'', direction:'LONG', entry:'', exit:'', qty:'', setup:'Breakout', status:'open', notes:'' });
    } catch(e) { alert(e.response?.data?.error || 'Failed to add trade'); }
    setLoading(false);
  }

  async function deleteTrade(id) {
    await api.delete(`/api/trades/${id}`).catch(() => {});
    setTrades(trades.filter(t => t.id !== id));
  }

  return (
    <div className="flex flex-col gap-6">

      {subTab === 'premarket' && <PreMarketPanel />}
      {subTab === 'riskcalc'  && <RiskCalcPanel />}
      {subTab === 'reports'   && <ReportsPanel trades={trades} />}

      {subTab === 'journal' && (<>
        <MonthlyTracker
          monthPnl={monthPnl} monthGoal={monthGoal} todayPnl={todayPnl} dailyLimit={dailyLimit}
          monthWR={monthWR} wrTarget={wrTarget} maxDD={maxDD}
          onGoalChange={v  => { setMonthGoal(v);  localStorage.setItem('dt_month_goal',  v); }}
          onLimitChange={v => { setDailyLimit(v); localStorage.setItem('dt_daily_limit', v); }}
          onTargetChange={v => { setWrTarget(v);  localStorage.setItem('dt_wr_target',   v); }}
        />
        {/* Hero P&L */}
        <div className="rounded-2xl p-6" style={{background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center'}}>
          <div className="text-xs font-medium uppercase tracking-wide mb-2" style={{color: '#64748b'}}>Total P&L</div>
          <div style={{fontSize: 48, fontWeight: 900, color: stats.pnl >= 0 ? '#22c55e' : '#ef4444', letterSpacing: '-0.02em', lineHeight: 1}}>
            {(stats.pnl>=0?'+':'')+'$'+stats.pnl.toFixed(2)}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[['Win Rate', stats.wr+'%', '#F5F5FA', 28], ['Max Drawdown', maxDD ? '-$'+Math.abs(maxDD).toFixed(0) : '$0', maxDD < 0 ? '#ef4444' : '#F5F5FA', 28], ['Total Trades', stats.total, '#F5F5FA', 28]].map(([l,v,c,sz]) => (
            <div key={l} className="rounded-2xl p-5" style={{background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center', transition: 'all 0.2s ease'}}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 32px rgba(0,0,0,0.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none'; }}>
              <div className="text-xs font-medium uppercase tracking-wide mb-2" style={{color: '#64748b'}}>{l}</div>
              <div style={{fontSize: sz, fontWeight: 700, color: c}}>{v}</div>
            </div>
          ))}
        </div>
        <ViewToggle view={view} setView={setView} />
        {view === 'calendar' ? (
          <TradingCalendar trades={trades} />
        ) : (
          <>
            <TradeForm form={form} setForm={setForm} loading={loading} onAdd={addTrade} />
            <DarkTable
              headers={['Ticker','Dir','Setup','Entry','Exit','P&L','Status','']}
              empty="No trades yet. Log your first trade above.">
              {trades.map(t => {
                const cls = t.status==='win'?'text-green-500':t.status==='loss'?'text-red-500':'text-slate-500';
                return (
                  <tr key={t.id} className="transition-colors" style={{borderBottom: '1px solid #1e2a4a'}}
                    onMouseEnter={e => e.currentTarget.style.background='rgba(30,42,74,0.4)'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <td className="px-5 py-3.5 font-semibold" style={{color: '#F5F5FA'}}>{t.ticker}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${t.direction==='LONG'?'bg-green-500/20 text-green-400':'bg-red-500/20 text-red-400'}`}>{t.direction}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400">{t.setup}</td>
                    <td className="px-5 py-3.5 text-slate-300">${parseFloat(t.entry).toFixed(2)}</td>
                    <td className="px-5 py-3.5 text-slate-300">{t.exit?'$'+parseFloat(t.exit).toFixed(2):'—'}</td>
                    <td className={`px-5 py-3.5 font-semibold ${cls}`}>{t.status==='open'?'Open':(t.pnl>=0?'+':'')+' $'+parseFloat(t.pnl).toFixed(2)}</td>
                    <td className={`px-5 py-3.5 text-xs font-semibold uppercase tracking-wide ${cls}`}>{t.status}</td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => deleteTrade(t.id)} className="text-slate-600 hover:text-red-400 text-base transition-colors">✕</button>
                    </td>
                  </tr>
                );
              })}
            </DarkTable>
            <button onClick={() => sendPrompt('Analyze my day trading journal. Tell me which setups are most profitable, where I leave money on the table, and give me 3 specific improvements.')}
              className="text-sm text-left transition-colors rounded-xl px-5 py-3"
              style={{border: '1px solid #1e2a4a', color: '#94A3B8', background: 'transparent'}}
              onMouseEnter={e => { e.currentTarget.style.borderColor='#2563EB'; e.currentTarget.style.color='#F5F5FA'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='#1e2a4a'; e.currentTarget.style.color='#94A3B8'; }}>
              Ask Claude to review my trading ↗
            </button>
          </>
        )}
      </>)}
    </div>
  );
}

function TradeForm({ form, setForm, loading, onAdd }) {
  const f = (k, v) => setForm(p => ({...p, [k]: v}));
  return (
    <div className="rounded-2xl p-5" style={{background: '#0f1729', border: '1px solid #1e2a4a'}}>
      <div className="text-xs font-semibold uppercase tracking-wider mb-4" style={{color: '#64748b'}}>Log a trade</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        {[['ticker','Ticker','text'],['entry','Entry $','number'],['exit','Exit $','number'],['qty','Qty','number']].map(([k,pl,t]) => (
          <div key={k}>
            <label className="text-xs font-medium block mb-1.5" style={{color: '#64748b'}}>{pl}</label>
            <input type={t} placeholder={pl} value={form[k]} onChange={e => f(k, e.target.value)}
              className={`w-full rounded-xl px-3.5 py-2.5 text-sm ${inp}`}
              style={inpStyle} onFocus={inpFocus} onBlur={inpBlur} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div>
          <label className="text-xs font-medium block mb-1.5" style={{color: '#64748b'}}>Direction</label>
          <select value={form.direction} onChange={e => f('direction', e.target.value)}
            className={`w-full rounded-xl px-3.5 py-2.5 text-sm ${inp}`} style={inpStyle}
            onFocus={inpFocus} onBlur={inpBlur}>
            <option>LONG</option><option>SHORT</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium block mb-1.5" style={{color: '#64748b'}}>Setup</label>
          <select value={form.setup} onChange={e => f('setup', e.target.value)}
            className={`w-full rounded-xl px-3.5 py-2.5 text-sm ${inp}`} style={inpStyle}
            onFocus={inpFocus} onBlur={inpBlur}>
            {['Breakout','Pullback','VWAP','Gap & Go','Reversal','Momentum','Other'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium block mb-1.5" style={{color: '#64748b'}}>Status</label>
          <select value={form.status} onChange={e => f('status', e.target.value)}
            className={`w-full rounded-xl px-3.5 py-2.5 text-sm ${inp}`} style={inpStyle}
            onFocus={inpFocus} onBlur={inpBlur}>
            <option value="open">Open</option><option value="win">Win</option><option value="loss">Loss</option><option value="be">Breakeven</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium block mb-1.5" style={{color: '#64748b'}}>Notes</label>
          <input placeholder="Quick note" value={form.notes} onChange={e => f('notes', e.target.value)}
            className={`w-full rounded-xl px-3.5 py-2.5 text-sm ${inp}`} style={inpStyle}
            onFocus={inpFocus} onBlur={inpBlur} />
        </div>
      </div>
      <button onClick={onAdd} disabled={loading}
        className="rounded-xl px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
        style={{background: '#2563EB', color: '#fff'}}
        onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background='#1d4ed8'; }}
        onMouseLeave={e => e.currentTarget.style.background='#2563EB'}>
        {loading ? 'Adding…' : '+ Add trade'}
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────
   SPORTS BETTING TAB
───────────────────────────────────────── */
function SportsBettingTab({ tier, activeSubTab }) {
  const subTab = activeSubTab || 'journal';
  const [bets, setBets]       = useState([]);
  const [form, setForm]       = useState({ sport:'NBA', type:'Moneyline', match:'', odds:'', stake:'', result:'pending', notes:'' });
  const [loading, setLoading] = useState(false);
  const [view, setView]       = useState('calendar');

  const [monthGoal,  setMonthGoal]  = useState(() => parseFloat(localStorage.getItem('bet_month_goal')  || '500'));
  const [dailyLimit, setDailyLimit] = useState(() => parseFloat(localStorage.getItem('bet_daily_limit') || '100'));
  const [wrTarget,   setWrTarget]   = useState(() => parseFloat(localStorage.getItem('bet_wr_target')   || '55'));

  useEffect(() => { api.get('/api/bets').then(r => setBets(r.data)).catch(() => {}); }, []);

  useEffect(() => {
    function handleBetPrefill(e) {
      const { sport, match } = e.detail || {};
      setForm(prev => ({ ...prev, sport: sport || prev.sport, match: match || prev.match }));
      setView('table');
    }
    window.addEventListener('bet-prefill', handleBetPrefill);
    return () => window.removeEventListener('bet-prefill', handleBetPrefill);
  }, []);

  function sendPrompt(text) {
    window.dispatchEvent(new CustomEvent('ai-prefill', { detail: { topic: text, type: 'sports' } }));
  }

  const now = new Date();
  const thisMonth = useMemo(() => bets.filter(b => { const d = new Date(b.created_at); return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth(); }), [bets]);
  const todayBets = useMemo(() => bets.filter(b => new Date(b.created_at).toDateString() === now.toDateString()), [bets]);

  const monthPnl  = useMemo(() => thisMonth.filter(b => b.result!=='pending').reduce((s,b) => s+(b.pnl||0), 0), [thisMonth]);
  const todayPnl  = useMemo(() => todayBets.filter(b => b.result!=='pending').reduce((s,b) => s+(b.pnl||0), 0), [todayBets]);
  const monthWins = useMemo(() => thisMonth.filter(b => b.result==='win').length, [thisMonth]);
  const monthSett = useMemo(() => thisMonth.filter(b => b.result!=='pending').length, [thisMonth]);
  const monthWR   = monthSett ? Math.round(monthWins/monthSett*100) : 0;
  const maxDD     = useMemo(() => calcMaxDrawdown(thisMonth), [thisMonth]);

  const settled    = bets.filter(b => b.result !== 'pending');
  const wins       = settled.filter(b => b.result === 'win');
  const totalPnl   = settled.reduce((s,b) => s+(b.pnl||0), 0);
  const wr         = settled.length ? Math.round(wins.length/settled.length*100) : 0;
  const totalStake = settled.reduce((s,b) => s+b.stake, 0);
  const roi        = totalStake ? (totalPnl/totalStake*100).toFixed(1) : 0;

  const SPORT_COLORS = { NFL:'bg-orange-500/20 text-orange-400', NBA:'bg-blue-500/20 text-blue-400', MLB:'bg-green-500/20 text-green-400', Soccer:'bg-purple-500/20 text-purple-400', UFC:'bg-red-500/20 text-red-400' };

  async function addBet() {
    if (!form.match || !form.odds || !form.stake) return alert('Fill in matchup, odds, and stake.');
    setLoading(true);
    try {
      const { data } = await api.post('/api/bets', {...form, stake: parseFloat(form.stake)});
      setBets([data, ...bets]);
      setForm({ sport:'NBA', type:'Moneyline', match:'', odds:'', stake:'', result:'pending', notes:'' });
    } catch(e) { alert(e.response?.data?.error || 'Failed'); }
    setLoading(false);
  }

  async function deleteBet(id) {
    await api.delete(`/api/bets/${id}`).catch(() => {});
    setBets(bets.filter(b => b.id !== id));
  }

  return (
    <div className="flex flex-col gap-5">

      {subTab === 'arbitrage' && <ArbitragePanel />}
      {subTab === 'parlay'    && <ParlayPanel />}
      {subTab === 'analytics' && <BettingAnalyticsPanel bets={bets} />}

      {subTab === 'journal' && (<>
      <MonthlyTracker
        monthPnl={monthPnl} monthGoal={monthGoal} todayPnl={todayPnl} dailyLimit={dailyLimit}
        monthWR={monthWR} wrTarget={wrTarget} maxDD={maxDD}
        onGoalChange={v  => { setMonthGoal(v);  localStorage.setItem('bet_month_goal',  v); }}
        onLimitChange={v => { setDailyLimit(v); localStorage.setItem('bet_daily_limit', v); }}
        onTargetChange={v => { setWrTarget(v);  localStorage.setItem('bet_wr_target',   v); }}
      />

      {/* All-time stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[['Total bets', bets.length, null],['Win rate', wr+'%', null],['Total P&L', (totalPnl>=0?'+':'')+'$'+totalPnl.toFixed(2), totalPnl],['ROI', (roi>=0?'+':'')+roi+'%', parseFloat(roi)]].map(([l,v,pnl],i) => (
          <div key={l} className="rounded-2xl p-5" style={{background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', transition: 'all 0.2s ease'}}>
            <div className="text-xs font-medium uppercase tracking-wide mb-1.5" style={{color: '#64748b'}}>{l}</div>
            <div className={`text-2xl font-bold ${i>=2 ? (pnl>=0 ? 'text-green-500' : 'text-red-500') : ''}`} style={i<2 ? {color: '#F5F5FA'} : {}}>{v}</div>
          </div>
        ))}
      </div>

      <ViewToggle view={view} setView={setView} options={['calendar', 'table', 'odds']} />

      {view === 'calendar' && <BettingCalendar bets={bets} />}
      {view === 'odds'     && <SportsOdds />}
      {view === 'table'    && (
        <>
          {/* Bet form */}
          <div className="rounded-2xl p-5" style={{background: '#0f1729', border: '1px solid #1e2a4a'}}>
            <div className="text-xs font-semibold uppercase tracking-wider mb-4" style={{color: '#64748b'}}>Log a bet</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{color: '#64748b'}}>Sport</label>
                <select value={form.sport} onChange={e => setForm({...form,sport:e.target.value})}
                  className={`w-full rounded-xl px-3.5 py-2.5 text-sm ${inp}`} style={inpStyle}
                  onFocus={inpFocus} onBlur={inpBlur}>
                  {['NFL','NBA','MLB','Soccer','UFC'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{color: '#64748b'}}>Bet type</label>
                <select value={form.type} onChange={e => setForm({...form,type:e.target.value})}
                  className={`w-full rounded-xl px-3.5 py-2.5 text-sm ${inp}`} style={inpStyle}
                  onFocus={inpFocus} onBlur={inpBlur}>
                  {['Moneyline','Spread','Over/Under','Prop','Parlay'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{color: '#64748b'}}>Result</label>
                <select value={form.result} onChange={e => setForm({...form,result:e.target.value})}
                  className={`w-full rounded-xl px-3.5 py-2.5 text-sm ${inp}`} style={inpStyle}
                  onFocus={inpFocus} onBlur={inpBlur}>
                  <option value="pending">Pending</option><option value="win">Win</option><option value="loss">Loss</option><option value="push">Push</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{color: '#64748b'}}>Matchup / bet</label>
                <input placeholder="e.g. Lakers ML" value={form.match} onChange={e => setForm({...form,match:e.target.value})}
                  className={`w-full rounded-xl px-3.5 py-2.5 text-sm ${inp}`} style={inpStyle}
                  onFocus={inpFocus} onBlur={inpBlur} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{color: '#64748b'}}>Odds (American)</label>
                <input placeholder="-110" value={form.odds} onChange={e => setForm({...form,odds:e.target.value})}
                  className={`w-full rounded-xl px-3.5 py-2.5 text-sm ${inp}`} style={inpStyle}
                  onFocus={inpFocus} onBlur={inpBlur} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{color: '#64748b'}}>Stake ($)</label>
                <input type="number" placeholder="50" value={form.stake} onChange={e => setForm({...form,stake:e.target.value})}
                  className={`w-full rounded-xl px-3.5 py-2.5 text-sm ${inp}`} style={inpStyle}
                  onFocus={inpFocus} onBlur={inpBlur} />
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs font-medium block mb-1.5" style={{color: '#64748b'}}>Notes</label>
              <input placeholder="Reasoning, matchup notes…" value={form.notes} onChange={e => setForm({...form,notes:e.target.value})}
                className={`w-full rounded-xl px-3.5 py-2.5 text-sm ${inp}`} style={inpStyle}
                onFocus={inpFocus} onBlur={inpBlur} />
            </div>
            <button onClick={addBet} disabled={loading}
              className="rounded-xl px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
              style={{background: '#2563EB', color: '#fff'}}
              onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background='#1d4ed8'; }}
              onMouseLeave={e => e.currentTarget.style.background='#2563EB'}>
              {loading ? 'Adding…' : '+ Log bet'}
            </button>
          </div>

          <DarkTable
            headers={['Sport','Type','Bet','Odds','Stake','To win','Result','P&L','']}
            empty="No bets logged yet.">
            {bets.map(b => {
              const cls = b.result==='win'?'text-green-500':b.result==='loss'?'text-red-500':'text-slate-500';
              return (
                <tr key={b.id} className="transition-colors" style={{borderBottom: '1px solid #1e2a4a'}}
                  onMouseEnter={e => e.currentTarget.style.background='rgba(30,42,74,0.4)'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SPORT_COLORS[b.sport]||'bg-slate-500/20 text-slate-400'}`}>{b.sport}</span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 text-xs">{b.type}</td>
                  <td className="px-5 py-3.5 max-w-[160px] truncate text-slate-200" title={b.match}>{b.match}</td>
                  <td className="px-5 py-3.5 text-slate-300">{b.odds}</td>
                  <td className="px-5 py-3.5 text-slate-300">${parseFloat(b.stake).toFixed(0)}</td>
                  <td className="px-5 py-3.5 text-slate-300">${parseFloat(b.to_win||0).toFixed(2)}</td>
                  <td className={`px-5 py-3.5 text-xs font-semibold uppercase tracking-wide ${cls}`}>{b.result}</td>
                  <td className={`px-5 py-3.5 font-semibold ${cls}`}>{b.pnl!=null?(b.pnl>=0?'+':'')+' $'+Math.abs(b.pnl).toFixed(2):'—'}</td>
                  <td className="px-5 py-3.5">
                    <button onClick={() => deleteBet(b.id)} className="text-slate-600 hover:text-red-400 text-base transition-colors">✕</button>
                  </td>
                </tr>
              );
            })}
          </DarkTable>
          <button onClick={() => sendPrompt('Analyze my sports betting history. Which sports and bet types are profitable? Where should I stop betting? Give me specific data-driven feedback.')}
            className="text-sm text-left transition-colors rounded-xl px-5 py-3"
            style={{border: '1px solid #1e2a4a', color: '#94A3B8', background: 'transparent'}}
            onMouseEnter={e => { e.currentTarget.style.borderColor='#2563EB'; e.currentTarget.style.color='#F5F5FA'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='#1e2a4a'; e.currentTarget.style.color='#94A3B8'; }}>
            Ask Claude to analyze my bets ↗
          </button>
        </>
      )}
      </>)}
    </div>
  );
}

/* ─────────────────────────────────────────
   EV CALC TAB
───────────────────────────────────────── */
function EVCalcTab() {
  const [mp, setMp] = useState(55);
  const [tp, setTp] = useState(65);
  const [br, setBr] = useState(1000);
  const [ba, setBa] = useState(100);

  const payout = ba * (100 / mp - 1);
  const ev     = (tp/100) * payout - (1-tp/100) * ba;
  const kelly  = Math.max(0, (tp/100 - (1-mp/100)) / (1/(mp/100) - 1));
  const roi    = (ev / ba * 100).toFixed(1);
  const edge   = (tp - mp).toFixed(1);

  const gc = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', transition: 'all 0.2s ease' };

  const SLIDERS = [
    ['Market / book price', mp, setMp, 1, 99, 1, '%'],
    ['Your true probability', tp, setTp, 1, 99, 1, '%'],
    ['Bankroll', br, setBr, 100, 50000, 100, '$'],
    ['Bet size', ba, setBa, 10, 5000, 10, '$'],
  ];

  const RESULTS = [
    ['Expected Value', (ev >= 0 ? '+' : '') + '$' + ev.toFixed(2), ev >= 0 ? '#22c55e' : '#ef4444'],
    ['ROI', (parseFloat(roi) >= 0 ? '+' : '') + roi + '%', parseFloat(roi) >= 0 ? '#22c55e' : '#ef4444'],
    ['Kelly Stake', kelly > 0 ? '$' + (kelly * br).toFixed(0) : 'Skip', kelly > 0 ? '#7aaff8' : '#4a5a7a'],
    ['Max Payout', '$' + (ba + payout).toFixed(0), '#F5F5FA'],
    ['Edge %', (parseFloat(edge) > 0 ? '+' : '') + edge + '%', parseFloat(edge) > 0 ? '#22c55e' : parseFloat(edge) < 0 ? '#ef4444' : '#4a5a7a'],
  ];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Inputs */}
      <div style={{ ...gc, padding: 32 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a5a7a', marginBottom: 20 }}>Calculator</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {SLIDERS.map(([label, val, set, min, max, step, unit]) => (
            <div key={label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#6a7a9a' }}>{label}</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: '#F5F5FA' }}>{unit === '$' ? '$' + val.toLocaleString() : val + '%'}</span>
              </div>
              <input type="range" min={min} max={max} step={step} value={val}
                onChange={e => set(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#4f8ef7', cursor: 'pointer' }} />
            </div>
          ))}
        </div>
      </div>

      {/* Hero EV */}
      <div style={{ ...gc, padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a5a7a', marginBottom: 12 }}>Expected Value</div>
        <div style={{ fontSize: 48, fontWeight: 900, color: ev >= 0 ? '#22c55e' : '#ef4444', letterSpacing: '-0.02em', lineHeight: 1 }}>
          {(ev >= 0 ? '+' : '') + '$' + ev.toFixed(2)}
        </div>
      </div>
      {/* Edge hero */}
      <div style={{ ...gc, padding: 24, textAlign: 'center', borderLeft: `3px solid ${parseFloat(edge) > 5 ? '#22c55e' : parseFloat(edge) > 0 ? '#f59e0b' : '#ef4444'}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a5a7a', marginBottom: 8 }}>Edge</div>
        <div style={{ fontSize: 36, fontWeight: 800, color: parseFloat(edge) > 5 ? '#22c55e' : parseFloat(edge) > 0 ? '#f59e0b' : '#ef4444', lineHeight: 1 }}>
          {(parseFloat(edge) > 0 ? '+' : '') + edge + '%'}
        </div>
        <div style={{ fontSize: 12, color: '#4a5a7a', marginTop: 8 }}>Breakeven: {mp}% · Your estimate: {tp}%</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {[
          ['ROI', (parseFloat(roi) >= 0 ? '+' : '') + roi + '%', parseFloat(roi) >= 0 ? '#22c55e' : '#ef4444'],
          ['Kelly Stake', kelly > 0 ? '$' + (kelly * br).toFixed(0) : 'Skip', kelly > 0 ? '#7aaff8' : '#4a5a7a'],
          ['Max Payout', '$' + (ba + payout).toFixed(0), '#F5F5FA'],
          ['Breakeven Odds', mp + '%', '#94A3B8'],
        ].map(([label, value, color]) => (
          <div key={label} style={{ ...gc, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16, minHeight: 110, transition: 'all 0.2s ease' }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 32px rgba(0,0,0,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none'; }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4a5a7a' }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   AI RESEARCH TAB
───────────────────────────────────────── */
function AIResearchTab({ prefill, onPrefillConsumed }) {
  const [query, setQuery]             = useState('');
  const [researchType, setResearchType] = useState('polymarket');
  const [result, setResult]           = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [history, setHistory]         = useState([]);

  useEffect(() => {
    if (prefill) { setQuery(prefill.topic || ''); setResearchType(prefill.type || 'polymarket'); onPrefillConsumed?.(); }
  }, [prefill]);

  const RESEARCH_TYPES = [
    { value: 'polymarket', label: 'Prediction Market', emoji: '\u{1F3AF}', desc: 'Analyze market probabilities' },
    { value: 'trading', label: 'Day Trading', emoji: '\u{1F4C8}', desc: 'Technical & fundamental analysis' },
    { value: 'sports', label: 'Sports Betting', emoji: '\u{1F3C6}', desc: 'Sharp money & line analysis' },
    { value: 'news', label: 'General Research', emoji: '\u{1F50D}', desc: 'Any market or topic' },
  ];

  const SUGGESTIONS = [
    'Will the Fed cut rates before July 2026?',
    'Lakers vs Celtics — who has the edge?',
    'BTC price analysis for next 30 days',
    'NQ futures key levels for this week',
    'Sharp money on NFL playoffs?',
    'Best EV markets on Polymarket right now',
  ];

  async function handleSubmit() {
    if (!query.trim() || loading) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const { data } = await api.post('/api/ai/query', { query, type: researchType, use_web_search: true });
      const newEntry = { query, researchType, result: data.result, timestamp: new Date() };
      setResult(data.result);
      setHistory(prev => [newEntry, ...prev.slice(0, 4)]);
    } catch(e) {
      setError(e.response?.data?.error || e.response?.data?.message || 'Research failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: 'calc(100vh - 160px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: result || loading ? 'flex-start' : 'center',
      padding: '40px 24px', maxWidth: '780px', margin: '0 auto', width: '100%'
    }}>

      {/* Header - only show when no result */}
      {!result && !loading && (
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: 64, height: 64,
            background: 'rgba(79,142,247,0.12)', border: '1px solid rgba(79,142,247,0.25)',
            borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', fontSize: '28px'
          }}>{'\u{1F52C}'}</div>
          <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#f0f4ff', letterSpacing: '-0.5px', marginBottom: '8px' }}>
            Sharpr Research
          </h1>
          <p style={{ fontSize: '14px', color: '#2a3a5a', lineHeight: 1.6 }}>
            AI-powered analysis for prediction markets, trading, and sports betting
          </p>
        </div>
      )}

      {/* Research type selector */}
      {!result && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', width: '100%', marginBottom: '20px' }}>
          {RESEARCH_TYPES.map(t => (
            <div key={t.value} onClick={() => setResearchType(t.value)}
              style={{
                background: researchType === t.value ? 'rgba(79,142,247,0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${researchType === t.value ? 'rgba(79,142,247,0.4)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: '12px', padding: '12px', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center'
              }}>
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>{t.emoji}</div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: researchType === t.value ? '#7aaff8' : '#4a5a7a' }}>{t.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Input box */}
      <div style={{
        width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px', padding: '4px 4px 4px 16px',
        display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', transition: 'border-color 0.2s'
      }}>
        <input value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="Ask anything — markets, trades, bets..."
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#f0f4ff', fontSize: '15px', padding: '12px 0' }} />
        <button onClick={handleSubmit} disabled={loading || !query.trim()}
          style={{
            background: query.trim() ? '#4f8ef7' : 'rgba(79,142,247,0.2)',
            border: 'none', borderRadius: '12px', width: '40px', height: '40px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: query.trim() ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s', flexShrink: 0, fontSize: '16px', color: '#fff'
          }}>
          {loading ? '\u23F3' : '\u2191'}
        </button>
      </div>

      {/* Suggestions - only when no result */}
      {!result && !loading && (
        <div style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '32px' }}>
          {SUGGESTIONS.map(s => (
            <div key={s} onClick={() => setQuery(s)}
              style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '100px', padding: '6px 14px', fontSize: '12px', color: '#4a5a7a',
                cursor: 'pointer', transition: 'all 0.2s'
              }}>
              {s}
            </div>
          ))}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{
          width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '16px', padding: '32px', textAlign: 'center', marginTop: '16px'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>{'\u{1F50D}'}</div>
          <div style={{ fontSize: '14px', color: '#4a5a7a' }}>Searching the web and analyzing...</div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div style={{
          width: '100%', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: '12px', padding: '16px', color: '#ef4444', fontSize: '13px', marginTop: '16px'
        }}>
          {error}
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div style={{ width: '100%', marginTop: '16px' }}>
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px', padding: '24px', marginBottom: '16px'
          }}>
            <div style={{ fontSize: '12px', color: '#2a3a5a', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
              <span>{'\u{1F52C}'} {RESEARCH_TYPES.find(t => t.value === researchType)?.label}</span>
              <span style={{ cursor: 'pointer', color: '#4f8ef7' }} onClick={() => { setResult(null); setQuery(''); }}>{'\u21BA'} New research</span>
            </div>
            <div style={{ fontSize: '13px', color: '#8899bb', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {result.split('\n').map((line, i) => {
                const isVerdict = line.startsWith('VERDICT:');
                const isConf    = line.startsWith('Confidence:');
                return (
                  <div key={i} style={{
                    color: isVerdict ? '#22c55e' : isConf ? '#60a5fa' : '#8899bb',
                    fontWeight: (isVerdict || isConf) ? 700 : 400,
                    background: isVerdict ? 'rgba(34,197,94,0.08)' : 'transparent',
                    padding: isVerdict ? '6px 10px' : '0',
                    borderRadius: isVerdict ? '8px' : '0',
                  }}>{line || '\u00A0'}</div>
                );
              })}
            </div>
          </div>

          {/* History */}
          {history.length > 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '10px', color: '#1a2535', letterSpacing: '2px', textTransform: 'uppercase' }}>Recent</div>
              {history.slice(1).map((h, i) => (
                <div key={i} onClick={() => { setQuery(h.query); setResult(h.result); setResearchType(h.researchType); }}
                  style={{
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '10px', padding: '10px 14px', cursor: 'pointer', fontSize: '12px', color: '#4a5a7a'
                  }}>
                  {h.query}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   NEWS TAB — Powered by ESPN & Reuters RSS
   Zero AI quota usage
───────────────────────────────────────── */
function NewsTab() {
  const [section, setSection]         = useState('sports');
  const [sport, setSport]             = useState('NBA');
  const [sportsItems, setSportsItems] = useState([]);
  const [sportsErr, setSportsErr]     = useState('');
  const [sportsTs, setSportsTs]       = useState(null);
  const [sportsLoad, setSportsLoad]   = useState(false);
  const firstSportMount               = useRef(true);

  const [econ, setEcon]         = useState([]);
  const [econLoad, setEconLoad] = useState(true);
  const [econErr, setEconErr]   = useState('');
  const [econView, setEconView] = useState('today');

  const [mktItems, setMktItems] = useState([]);
  const [mktErr, setMktErr]     = useState('');
  const [mktTs, setMktTs]       = useState(null);
  const [mktLoad, setMktLoad]   = useState(false);
  const mktLoaded               = useRef(false);

  const SPORT_EMOJIS = { NFL:'🏈', NBA:'🏀', MLB:'⚾', NHL:'🏒', Soccer:'⚽', UFC:'🥊', Golf:'⛳', Tennis:'🎾' };
  const SPORT_PILLS  = ['NFL','NBA','MLB','NHL','Soccer','UFC','Golf','Tennis'];

  const SPORT_GRAD = {
    NFL: 'linear-gradient(135deg,#1e3a5f,#0a1628)',
    NBA: 'linear-gradient(135deg,#1a1040,#2d1080)',
    MLB: 'linear-gradient(135deg,#1a0a0a,#3d0a0a)',
    NHL: 'linear-gradient(135deg,#0a1a2a,#0a3050)',
    Soccer: 'linear-gradient(135deg,#0a2a0a,#1a4a1a)',
    UFC: 'linear-gradient(135deg,#2a0a0a,#4a1a0a)',
    Golf: 'linear-gradient(135deg,#0a2010,#1a4020)',
    Tennis: 'linear-gradient(135deg,#2a1a00,#4a3000)',
    default: 'linear-gradient(135deg,#1e2a4a,#0a0f1e)',
  };

  // Auto-load NBA on mount
  useEffect(() => { fetchSports(); }, []);

  // Re-fetch when sport changes
  useEffect(() => {
    if (firstSportMount.current) { firstSportMount.current = false; return; }
    fetchSports();
  }, [sport]);

  // Auto-load market news when switching to trading
  useEffect(() => {
    if (section === 'trading' && !mktLoaded.current) fetchMarket();
  }, [section]);

  // Economic calendar
  useEffect(() => {
    api.get('/api/news/economic')
      .then(r => { setEcon(r.data.events || []); setEconLoad(false); })
      .catch(() => { setEconErr('Could not load calendar.'); setEconLoad(false); });
  }, []);

  async function fetchSports() {
    setSportsLoad(true); setSportsItems([]); setSportsErr('');
    try {
      const { data } = await api.get(`/api/news/sports?sport=${sport}`);
      if (data.unavailable) { setSportsErr('unavailable'); }
      else { setSportsItems(data.items || []); setSportsTs(data.timestamp || new Date().toISOString()); }
    } catch(e) {
      setSportsErr('unavailable');
    }
    setSportsLoad(false);
  }

  async function fetchMarket() {
    setMktLoad(true); setMktItems([]); setMktErr('');
    try {
      const { data } = await api.get('/api/news/trading');
      if (data.unavailable) { setMktErr('unavailable'); }
      else { setMktItems(data.items || []); setMktTs(data.timestamp || new Date().toISOString()); mktLoaded.current = true; }
    } catch(e) {
      setMktErr('unavailable');
    }
    setMktLoad(false);
  }

  function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  function borderColor(sentiment) {
    return sentiment === 'positive' ? '#22c55e' : sentiment === 'negative' ? '#ef4444' : '#2563EB';
  }

  // Calendar filters
  const todayStr     = new Date().toISOString().split('T')[0];
  const econFiltered = econView === 'today' ? econ.filter(e => e.date?.startsWith(todayStr)) : econ;

  const IMPACT_ROW = {
    High:   { background: 'rgba(42,10,10,0.8)',   borderLeft: '3px solid #ef4444' },
    Medium: { background: 'rgba(42,20,0,0.8)',    borderLeft: '3px solid #f59e0b' },
    Low:    { background: 'transparent',          borderLeft: '3px solid #1e2a4a' },
  };
  const IMPACT_BADGE = {
    High:   { color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
    Medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    Low:    { color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  };

  const HIGH_IMPACT_EVENTS = /NFP|FOMC|CPI|GDP|Non-Farm|Fed|Nonfarm|Employment/i;

  return (
    <div className="flex flex-col gap-5">
      {/* Section tabs */}
      <div className="flex gap-2">
        {['sports','trading'].map(s => (
          <button key={s} onClick={() => setSection(s)}
            className="text-sm px-4 py-2 rounded-xl font-medium transition-all"
            style={section===s ? {background: '#2563EB', color: '#fff', border: '1px solid #2563EB'} : {border: '1px solid #1e2a4a', color: '#94A3B8'}}
            onMouseEnter={e => { if (section!==s) { e.currentTarget.style.borderColor='#2563EB'; e.currentTarget.style.color='#F5F5FA'; } }}
            onMouseLeave={e => { if (section!==s) { e.currentTarget.style.borderColor='#1e2a4a'; e.currentTarget.style.color='#94A3B8'; } }}>
            {s === 'sports' ? '🏈 Sports News' : '📈 Trading News'}
          </button>
        ))}
      </div>

      {/* ── SPORTS SECTION ── */}
      {section === 'sports' && (
        <div className="flex flex-col gap-4">
          {/* Sport pills + refresh */}
          <div className="flex gap-2 flex-wrap items-center">
            {SPORT_PILLS.map(s => (
              <button key={s} onClick={() => setSport(s)}
                className="text-xs px-3 py-1.5 rounded-full font-medium transition-all"
                style={sport===s ? {background: '#2563EB', color: '#fff', border: '1px solid #2563EB'} : {border: '1px solid #1e2a4a', color: '#94A3B8'}}>
                {SPORT_EMOJIS[s]} {s}
              </button>
            ))}
            <button onClick={fetchSports} disabled={sportsLoad}
              className="ml-auto text-xs px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
              style={{border: '1px solid #1e2a4a', color: '#64748b', background: 'transparent'}}
              onMouseEnter={e => { if (!e.currentTarget.disabled) { e.currentTarget.style.borderColor='#2563EB'; e.currentTarget.style.color='#93c5fd'; } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='#1e2a4a'; e.currentTarget.style.color='#64748b'; }}>
              {sportsLoad ? '…' : '↻ Refresh'}
            </button>
            {sportsTs && <span className="text-xs" style={{color: '#475569'}}>{timeAgo(sportsTs)}</span>}
          </div>

          {/* Loading skeletons */}
          {sportsLoad && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="rounded-2xl overflow-hidden" style={{background: '#0f1729', border: '1px solid #1e2a4a'}}>
                  <div className="skeleton" style={{height: 140}} />
                  <div className="p-4 flex flex-col gap-2">
                    <div className="skeleton" style={{height: 14, width: '80%'}} />
                    <div className="skeleton" style={{height: 12, width: '60%'}} />
                    <div className="skeleton" style={{height: 10, width: '40%', marginTop: 4}} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Unavailable */}
          {!sportsLoad && sportsErr && (
            <div className="rounded-2xl p-8 flex flex-col items-center gap-2" style={{background: '#0f1729', border: '1px solid #1e2a4a'}}>
              <span style={{fontSize: 28}}>📡</span>
              <p className="text-sm font-medium" style={{color: '#94A3B8'}}>News temporarily unavailable — check back soon</p>
              <button onClick={fetchSports} className="text-xs px-3 py-1.5 rounded-lg mt-1" style={{border: '1px solid #1e2a4a', color: '#64748b'}}>Try again</button>
            </div>
          )}

          {/* News cards grid */}
          {!sportsLoad && sportsItems.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {sportsItems.map((item, i) => (
                <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
                  className="rounded-2xl overflow-hidden flex flex-col transition-all cursor-pointer"
                  style={{background: '#0f1729', border: `1px solid #1e2a4a`, borderLeft: `4px solid ${borderColor(item.sentiment)}`, textDecoration: 'none'}}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow='0 0 20px rgba(37,99,235,0.1)'; e.currentTarget.style.borderColor='rgba(37,99,235,0.3)'; e.currentTarget.style.borderLeftColor=borderColor(item.sentiment); }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow='none'; e.currentTarget.style.borderColor='#1e2a4a'; e.currentTarget.style.borderLeftColor=borderColor(item.sentiment); }}>
                  {/* Image */}
                  <div style={{height: 140, overflow: 'hidden', position: 'relative', flexShrink: 0}}>
                    {item.image ? (
                      <img src={item.image} alt="" style={{width: '100%', height: '100%', objectFit: 'cover'}}
                        onError={e => { e.target.style.display='none'; e.target.parentNode.style.background=SPORT_GRAD[item.sport]||SPORT_GRAD.default; }} />
                    ) : (
                      <div style={{width: '100%', height: '100%', background: SPORT_GRAD[item.sport]||SPORT_GRAD.default, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40}}>
                        {SPORT_EMOJIS[item.sport] || '📰'}
                      </div>
                    )}
                    {/* Overlays */}
                    <div style={{position: 'absolute', top: 8, left: 8}}>
                      <span style={{fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', color: '#fff'}}>
                        {SPORT_EMOJIS[item.sport]} {item.sport}
                      </span>
                    </div>
                    <div style={{position: 'absolute', top: 8, right: 8}}>
                      <span style={{fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: item.impact === 'HIGH' ? 'rgba(239,68,68,0.85)' : item.impact === 'MED' ? 'rgba(245,158,11,0.85)' : 'rgba(30,42,74,0.85)', backdropFilter: 'blur(4px)', color: '#fff'}}>
                        {item.impact}
                      </span>
                    </div>
                  </div>
                  {/* Content */}
                  <div style={{padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6}}>
                    <p style={{fontSize: 13, fontWeight: 600, color: '#F5F5FA', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', margin: 0}}>{item.title}</p>
                    {item.description && (
                      <p style={{fontSize: 11, color: '#94A3B8', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', margin: 0}}>{item.description}</p>
                    )}
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 6}}>
                      <span style={{fontSize: 10, color: '#475569', fontWeight: 500}}>{item.source} · {timeAgo(item.pubDate)}</span>
                      <button onClick={e => { e.preventDefault(); e.stopPropagation(); window.dispatchEvent(new CustomEvent('bet-prefill', { detail: { topic: item.title.substring(0,60) } })); }}
                        className="glass-btn text-xs px-2.5 py-1" style={{borderRadius: 8, fontSize: 11}}>
                        Log bet
                      </button>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          <p style={{fontSize: 11, color: '#334155', textAlign: 'center'}}>
            Powered by ESPN — no AI queries used
          </p>
        </div>
      )}

      {/* ── TRADING SECTION ── */}
      {section === 'trading' && (
        <div className="flex flex-col gap-5">
          {/* Economic calendar */}
          <div className="rounded-2xl overflow-hidden" style={{background: '#0f1729', border: '1px solid #1e2a4a'}}>
            <div className="px-5 py-4 flex items-center justify-between" style={{borderBottom: '1px solid #1e2a4a'}}>
              <div className="text-xs font-semibold uppercase tracking-wider" style={{color: '#64748b'}}>Economic Calendar</div>
              <div className="flex gap-1">
                {[['today','Today'],['week','This Week']].map(([v, label]) => (
                  <button key={v} onClick={() => setEconView(v)}
                    className="text-xs px-3 py-1 rounded-lg font-medium transition-all"
                    style={econView===v ? {background: '#2563EB', color: '#fff'} : {background: 'transparent', color: '#64748b', border: '1px solid #1e2a4a'}}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {econLoad && <div className="px-5 py-6"><div className="skeleton" style={{height: 100}} /></div>}
            {econErr  && <div className="px-5 py-6 text-center text-sm" style={{color: '#94A3B8'}}>Calendar temporarily unavailable — check back soon</div>}
            {!econLoad && !econErr && econFiltered.length === 0 && (
              <div className="px-5 py-8 text-center text-sm" style={{color: '#94A3B8'}}>
                {econView === 'today' ? 'No events today.' : 'No events this week.'}
              </div>
            )}
            {!econLoad && econFiltered.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-medium uppercase tracking-wide" style={{borderBottom: '1px solid #1e2a4a', background: '#0a0f1e', color: '#64748b'}}>
                      {['Time','Currency','Event','Impact','Forecast','Prev','Actual'].map(h => (
                        <th key={h} className="text-left px-4 py-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {econFiltered.map((e, i) => {
                      const rowStyle   = IMPACT_ROW[e.impact]   || IMPACT_ROW.Low;
                      const badgeStyle = IMPACT_BADGE[e.impact] || IMPACT_BADGE.Low;
                      const isPast     = e.actual && e.actual !== '—';
                      const isFire     = HIGH_IMPACT_EVENTS.test(e.title);
                      return (
                        <tr key={i} style={{...rowStyle, borderBottom: '1px solid rgba(30,42,74,0.5)', opacity: isPast ? 0.55 : 1}}>
                          <td className="px-4 py-3 whitespace-nowrap text-xs" style={{color: '#64748b'}}>{e.time||'—'}</td>
                          <td className="px-4 py-3 font-bold text-xs" style={{color: '#F5F5FA'}}>{e.currency}</td>
                          <td className="px-4 py-3 max-w-[220px] text-xs" style={{color: '#cbd5e1'}}>
                            {isFire && <span style={{marginRight: 4}}>🔥</span>}{e.title}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{color: badgeStyle.color, background: badgeStyle.bg}}>{e.impact}</span>
                          </td>
                          <td className="px-4 py-3 text-xs" style={{color: '#64748b'}}>{e.forecast||'—'}</td>
                          <td className="px-4 py-3 text-xs" style={{color: '#64748b'}}>{e.previous||'—'}</td>
                          <td className="px-4 py-3 font-bold text-xs" style={{color: isPast ? '#F5F5FA' : '#334155'}}>{e.actual||'—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Market news from RSS */}
          <div className="rounded-2xl overflow-hidden" style={{background: '#0f1729', border: '1px solid #1e2a4a'}}>
            <div className="px-5 py-4 flex items-center justify-between" style={{borderBottom: '1px solid #1e2a4a'}}>
              <div className="text-xs font-semibold uppercase tracking-wider" style={{color: '#64748b'}}>Market News</div>
              <div className="flex items-center gap-3">
                {mktTs && <span className="text-xs" style={{color: '#475569'}}>{timeAgo(mktTs)}</span>}
                <button onClick={fetchMarket} disabled={mktLoad}
                  className="text-xs px-2.5 py-1 rounded-lg transition-all disabled:opacity-40"
                  style={{border: '1px solid #1e2a4a', color: '#64748b', background: 'transparent'}}
                  onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.color='#93c5fd'; }}
                  onMouseLeave={e => e.currentTarget.style.color='#64748b'}>
                  ↻
                </button>
              </div>
            </div>
            {mktLoad && <div className="px-5 py-6"><div className="skeleton" style={{height: 120}} /></div>}
            {!mktLoad && mktErr && (
              <div className="px-5 py-8 flex flex-col items-center gap-2">
                <span style={{fontSize: 24}}>📡</span>
                <p className="text-sm" style={{color: '#94A3B8'}}>News temporarily unavailable — check back soon</p>
              </div>
            )}
            {!mktLoad && mktItems.length > 0 && (
              <div className="flex flex-col">
                {mktItems.slice(0, 20).map((item, i) => {
                  const dir      = /gain|surge|rise|rally|up\b|higher|bull|positive/i.test(item.title) ? '↑' : /fall|drop|decline|down\b|lower|bear|negative/i.test(item.title) ? '↓' : '→';
                  const dirColor = dir === '↑' ? '#22c55e' : dir === '↓' ? '#ef4444' : '#94A3B8';
                  return (
                    <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
                      className="px-5 py-3.5 flex items-start gap-3 transition-all"
                      style={{borderBottom: i < mktItems.length - 1 ? '1px solid rgba(30,42,74,0.5)' : 'none', textDecoration: 'none'}}
                      onMouseEnter={e => e.currentTarget.style.background='rgba(30,42,74,0.4)'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      <span style={{fontSize: 15, fontWeight: 700, color: dirColor, flexShrink: 0, marginTop: 1, width: 18, textAlign: 'center'}}>{dir}</span>
                      <div style={{flex: 1, minWidth: 0}}>
                        <p style={{fontSize: 13, color: '#cbd5e1', margin: 0, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{item.title}</p>
                        <span style={{fontSize: 11, color: '#475569'}}>{item.source} · {timeAgo(item.pubDate)}</span>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          <p style={{fontSize: 11, color: '#334155', textAlign: 'center'}}>
            Market news from CNBC, MarketWatch & Bloomberg RSS — no AI queries used
          </p>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   CHARTS PANEL (Day Trading sub-tab) — FULL SCREEN
───────────────────────────────────────── */
/* ─────────────────────────────────────────
   PRE-MARKET PANEL (Day Trading sub-tab)
───────────────────────────────────────── */
function PreMarketPanel() {
  const [econ, setEcon]       = useState([]);
  const [econLoad, setEconLoad] = useState(true);
  const [bias, setBias]       = useState('NEUTRAL');
  const [nqLevels, setNqLevels] = useState({ pdh: '', pdl: '', pdc: '', vwap: '', orh: '', orl: '' });
  const [thesis, setThesis]   = useState('');
  const [saved, setSaved]     = useState(false);

  const SESSIONS = [
    { name: 'CME Futures', tz: 'America/New_York', open: '18:00', close: '17:00+1', status: '🟢' },
    { name: 'NYSE',        tz: 'America/New_York', open: '09:30', close: '16:00',   status: '🟢' },
    { name: 'London',      tz: 'Europe/London',    open: '08:00', close: '16:30',   status: '🟢' },
    { name: 'Tokyo',       tz: 'Asia/Tokyo',       open: '09:00', close: '15:30',   status: '🟡' },
  ];

  useEffect(() => {
    api.get('/api/news/economic')
      .then(r => {
        const todayStr = new Date().toISOString().split('T')[0];
        const today = (r.data.events || []).filter(e => e.date?.startsWith(todayStr) && e.impact === 'High');
        setEcon(today);
        setEconLoad(false);
      })
      .catch(() => setEconLoad(false));

    // Restore saved levels
    const saved = JSON.parse(localStorage.getItem('premarket_levels') || '{}');
    if (saved.nqLevels) setNqLevels(saved.nqLevels);
    if (saved.bias)     setBias(saved.bias);
    if (saved.thesis)   setThesis(saved.thesis);
  }, []);

  function save() {
    localStorage.setItem('premarket_levels', JSON.stringify({ nqLevels, bias, thesis, date: new Date().toDateString() }));
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  const NQ_FIELDS = [
    ['pdh', 'Prev Day High'], ['pdl', 'Prev Day Low'], ['pdc', 'Prev Day Close'],
    ['vwap', 'VWAP'],        ['orh', 'OR High (9:35)'], ['orl', 'OR Low (9:35)'],
  ];

  const card = { background: '#0f1729', border: '1px solid #1e2a4a', borderRadius: 16, padding: 20 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* High-impact events today */}
      <div style={card}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 12 }}>
          🗓️ High-Impact Events Today
        </div>
        {econLoad ? <div className="skeleton" style={{ height: 40 }} /> :
         econ.length === 0 ? <div style={{ fontSize: 13, color: '#475569' }}>No high-impact events scheduled today</div> :
         econ.map((e, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: i < econ.length - 1 ? '1px solid #1e2a4a' : 'none' }}>
            <div style={{ width: 2, height: 32, background: '#ef4444', borderRadius: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#F5F5FA' }}>{e.title}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{e.currency} · {e.time || 'TBD'} ET {e.forecast !== '—' && `· Forecast: ${e.forecast}`}</div>
            </div>
          </div>
        ))}
      </div>

      {/* MNQ/NQ Levels */}
      <div style={card}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 12 }}>
          📊 NQ / MNQ Key Levels
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {NQ_FIELDS.map(([k, label]) => (
            <div key={k}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{label}</div>
              <input value={nqLevels[k]} onChange={e => setNqLevels(p => ({ ...p, [k]: e.target.value }))}
                placeholder="—" type="number" step="0.25"
                className={inp} style={{ ...inpStyle, padding: '8px 10px', fontSize: 13, width: '100%', borderRadius: 10 }}
                onFocus={inpFocus} onBlur={inpBlur} />
            </div>
          ))}
        </div>
      </div>

      {/* Bias + thesis */}
      <div style={card}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 12 }}>
          🧠 Today's Bias
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {['LONG', 'SHORT', 'NEUTRAL'].map(b => (
            <button key={b} onClick={() => setBias(b)}
              style={{
                padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid',
                background: bias === b ? (b === 'LONG' ? '#22c55e20' : b === 'SHORT' ? '#ef444420' : '#2563EB20') : 'transparent',
                borderColor: bias === b ? (b === 'LONG' ? '#22c55e' : b === 'SHORT' ? '#ef4444' : '#2563EB') : '#1e2a4a',
                color: bias === b ? (b === 'LONG' ? '#22c55e' : b === 'SHORT' ? '#ef4444' : '#60a5fa') : '#64748b',
              }}>
              {b === 'LONG' ? '📈' : b === 'SHORT' ? '📉' : '➡️'} {b}
            </button>
          ))}
        </div>
        <textarea value={thesis} onChange={e => setThesis(e.target.value)}
          placeholder="Pre-market thesis — key levels to watch, catalysts, plan…"
          className={inp} style={{ ...inpStyle, width: '100%', height: 80, resize: 'vertical', borderRadius: 10, padding: '10px 12px', fontSize: 13 }}
          onFocus={inpFocus} onBlur={inpBlur} />
      </div>

      {/* Market session status */}
      <div style={card}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 12 }}>
          🌍 Market Sessions
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {SESSIONS.map(s => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: '#0a0f1e' }}>
              <span style={{ fontSize: 16 }}>{s.status}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#F5F5FA' }}>{s.name}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{s.open} – {s.close}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'center' }}>
        {saved && <span style={{ fontSize: 12, color: '#22c55e' }}>Saved!</span>}
        <button onClick={save} className="glass-btn-blue" style={{ padding: '9px 22px', fontSize: 13, borderRadius: 10 }}>
          Save prep notes
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   RISK CALCULATOR (Day Trading sub-tab)
───────────────────────────────────────── */
function RiskCalcPanel() {
  const [acct,   setAcct]   = useState(25000);
  const [risk,   setRisk]   = useState(1);
  const [entry,  setEntry]  = useState('');
  const [stop,   setStop]   = useState('');
  const [target, setTarget] = useState('');
  const [dir,    setDir]    = useState('LONG');

  const riskDollars = acct * risk / 100;
  const entryN  = parseFloat(entry)  || 0;
  const stopN   = parseFloat(stop)   || 0;
  const targetN = parseFloat(target) || 0;
  const stopDist = entryN && stopN ? Math.abs(entryN - stopN) : 0;
  const shares   = stopDist > 0 ? Math.floor(riskDollars / stopDist) : 0;
  const mnqContr = stopDist > 0 ? Math.floor(riskDollars / (stopDist * 2)) : 0; // MNQ tick value ~$2
  const rr       = targetN && stopDist ? ((Math.abs(targetN - entryN) / stopDist)).toFixed(2) : null;

  const card = { background: '#0f1729', border: '1px solid #1e2a4a', borderRadius: 16, padding: 20 };
  const out  = { background: '#0a0f1e', border: '1px solid #1e2a4a', borderRadius: 12, padding: '14px 16px' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 600 }}>
      <div style={card}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 14 }}>
          ⚙️ Inputs
        </div>

        {/* Quick risk presets */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>Risk %</span>
          {[0.5, 1, 1.5, 2].map(r => (
            <button key={r} onClick={() => setRisk(r)}
              style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid', transition: 'all 0.15s',
                background: risk === r ? 'rgba(37,99,235,0.25)' : 'transparent',
                borderColor: risk === r ? '#2563EB' : '#1e2a4a',
                color: risk === r ? '#93c5fd' : '#64748b' }}>
              {r}%
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {[['Account size ($)', acct, setAcct, 'number'], ['Risk per trade (%)', risk, setRisk, 'number'], ['Entry price', entry, setEntry, 'number'], ['Stop loss', stop, setStop, 'number'], ['Target (optional)', target, setTarget, 'number']].map(([l, v, set, t]) => (
            <div key={l}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 5 }}>{l}</div>
              <input type={t} value={v} onChange={e => set(t === 'number' && !['entry','stop','target'].includes(l.split(' ')[0].toLowerCase()) ? parseFloat(e.target.value)||0 : e.target.value)}
                step={l.includes('price') || l.includes('loss') || l.includes('Target') ? '0.25' : l.includes('%') ? '0.1' : '1000'}
                className={inp} style={{ ...inpStyle, padding: '9px 12px', fontSize: 13, width: '100%', borderRadius: 10 }}
                onFocus={inpFocus} onBlur={inpBlur} />
            </div>
          ))}
          <div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 5 }}>Direction</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['LONG','SHORT'].map(d => (
                <button key={d} onClick={() => setDir(d)}
                  style={{ flex: 1, padding: '9px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid',
                    background: dir === d ? (d === 'LONG' ? '#22c55e20' : '#ef444420') : 'transparent',
                    borderColor: dir === d ? (d === 'LONG' ? '#22c55e' : '#ef4444') : '#1e2a4a',
                    color: dir === d ? (d === 'LONG' ? '#22c55e' : '#ef4444') : '#64748b' }}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Outputs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {[
          ['Dollar risk',      `$${riskDollars.toFixed(0)}`, '#f59e0b'],
          ['Stop distance',    stopDist > 0 ? `$${stopDist.toFixed(2)}` : '—', '#94A3B8'],
          ['Max shares',       shares > 0 ? shares.toLocaleString() : '—', '#F5F5FA'],
          ['MNQ contracts',    mnqContr > 0 ? mnqContr : '—', '#60a5fa'],
          ...(rr ? [['Risk : Reward', `1 : ${rr}`, parseFloat(rr) >= 2 ? '#22c55e' : '#f59e0b']] : []),
        ].map(([l, v, c]) => (
          <div key={l} style={out}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 6 }}>{l}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: c }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   PERFORMANCE REPORTS (Day Trading sub-tab)
───────────────────────────────────────── */
function ReportsPanel({ trades }) {
  // Group by week for last 8 weeks
  function weekLabel(date) {
    const d = new Date(date);
    const m = d.toLocaleString('en-US', { month: 'short' });
    return `${m} ${d.getDate()}`;
  }

  const closed = trades.filter(t => t.status !== 'open');

  // Weekly P&L — last 8 ISO weeks
  const weeklyMap = {};
  closed.forEach(t => {
    const d   = new Date(t.created_at);
    const key = weekLabel(d);
    weeklyMap[key] = (weeklyMap[key] || 0) + (t.pnl || 0);
  });
  const weekLabels = Object.keys(weeklyMap).slice(-8);
  const weekPnl    = weekLabels.map(k => weeklyMap[k]);

  // By setup
  const setupMap = {};
  closed.forEach(t => { setupMap[t.setup] = (setupMap[t.setup] || 0) + (t.pnl || 0); });
  const setupLabels = Object.keys(setupMap);
  const setupPnl    = setupLabels.map(k => setupMap[k]);

  // Win rate by direction
  const longs  = closed.filter(t => t.direction === 'LONG');
  const shorts = closed.filter(t => t.direction === 'SHORT');
  const longWR  = longs.length  ? Math.round(longs.filter(t => t.status === 'win').length / longs.length * 100)  : 0;
  const shortWR = shorts.length ? Math.round(shorts.filter(t => t.status === 'win').length / shorts.length * 100) : 0;

  const chartOpts = (yLabel) => ({
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `$${ctx.raw.toFixed(0)}` } } },
    scales: {
      x: { grid: { color: 'rgba(30,42,74,0.5)' }, ticks: { color: '#64748b', font: { size: 10 } } },
      y: { grid: { color: 'rgba(30,42,74,0.5)' }, ticks: { color: '#64748b', font: { size: 10 }, callback: v => '$'+v } },
    },
  });

  const weekData = {
    labels: weekLabels.length ? weekLabels : ['No data'],
    datasets: [{
      data: weekPnl.length ? weekPnl : [0],
      backgroundColor: weekPnl.map(v => v >= 0 ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)'),
      borderColor:     weekPnl.map(v => v >= 0 ? '#22c55e' : '#ef4444'),
      borderWidth: 1, borderRadius: 4,
    }],
  };

  const setupData = {
    labels: setupLabels.length ? setupLabels : ['No data'],
    datasets: [{
      data: setupPnl.length ? setupPnl : [0],
      backgroundColor: setupPnl.map(v => v >= 0 ? 'rgba(37,99,235,0.5)' : 'rgba(239,68,68,0.4)'),
      borderColor:     setupPnl.map(v => v >= 0 ? '#2563EB' : '#ef4444'),
      borderWidth: 1, borderRadius: 4,
    }],
  };

  const card = { background: '#0f1729', border: '1px solid #1e2a4a', borderRadius: 16, padding: 20 };

  if (closed.length === 0) {
    return (
      <div className="glass-card" style={{ padding: 40, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <svg width="64" height="44" viewBox="0 0 64 44" fill="none">
          <rect x="0"  y="30" width="13" height="14" rx="2" fill="rgba(79,142,247,0.3)"/>
          <rect x="17" y="20" width="13" height="24" rx="2" fill="rgba(79,142,247,0.3)"/>
          <rect x="34" y="11" width="13" height="33" rx="2" fill="rgba(79,142,247,0.3)"/>
          <rect x="51" y="4"  width="13" height="40" rx="2" fill="rgba(79,142,247,0.3)"/>
        </svg>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#4a5a7a', margin: 0 }}>Your performance reports will appear here</h3>
        <p style={{ fontSize: 13, color: '#2a3a5a', margin: 0 }}>Log and close trades to unlock weekly charts, win rate analysis, and profit factor</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          ['Total closed', closed.length, '#F5F5FA'],
          ['LONG win rate', longWR+'%', longWR >= 50 ? '#22c55e' : '#ef4444'],
          ['SHORT win rate', shortWR+'%', shortWR >= 50 ? '#22c55e' : '#ef4444'],
          ['Total P&L', '$'+closed.reduce((s,t) => s+(t.pnl||0), 0).toFixed(0), closed.reduce((s,t) => s+(t.pnl||0), 0) >= 0 ? '#22c55e' : '#ef4444'],
        ].map(([l,v,c]) => (
          <div key={l} style={card}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 8 }}>{l}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Weekly P&L chart */}
      <div style={card}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', marginBottom: 14 }}>Weekly P&L</div>
        <div style={{ height: 160 }}>
          <Bar data={weekData} options={chartOpts('$')} />
        </div>
      </div>

      {/* P&L by setup */}
      <div style={card}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', marginBottom: 14 }}>P&L by Setup</div>
        <div style={{ height: 160 }}>
          <Bar data={setupData} options={chartOpts('$')} />
        </div>
      </div>

      {/* Best/worst trades */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {[
          { label: '🏆 Best trades', items: [...closed].sort((a,b) => (b.pnl||0)-(a.pnl||0)).slice(0,3), color: '#22c55e' },
          { label: '💔 Worst trades', items: [...closed].sort((a,b) => (a.pnl||0)-(b.pnl||0)).slice(0,3), color: '#ef4444' },
        ].map(({ label, items, color }) => (
          <div key={label} style={card}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', marginBottom: 12 }}>{label}</div>
            {items.map((t, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < items.length - 1 ? '1px solid #1e2a4a' : 'none' }}>
                <span style={{ fontSize: 13, color: '#F5F5FA' }}>{t.ticker} {t.direction}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color }}>{(t.pnl >= 0 ? '+' : '')}${(t.pnl||0).toFixed(0)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <button onClick={() => window.print()} className="glass-btn self-end" style={{ padding: '9px 22px', fontSize: 13, borderRadius: 10 }}>
        Export / Print report
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────
   ARBITRAGE FINDER (Sports Betting sub-tab)
───────────────────────────────────────── */
function ArbitragePanel() {
  const [odds1, setOdds1] = useState('');
  const [odds2, setOdds2] = useState('');
  const [stake, setStake] = useState(1000);

  function toDecimal(odds) {
    const n = parseFloat(odds);
    if (!n) return null;
    if (n > 0) return n / 100 + 1;
    if (n < 0) return 100 / Math.abs(n) + 1;
    return null;
  }

  const d1 = toDecimal(odds1);
  const d2 = toDecimal(odds2);
  const impliedSum = d1 && d2 ? (1/d1 + 1/d2) : null;
  const hasArb     = impliedSum && impliedSum < 1;
  const profit     = hasArb ? (stake / impliedSum - stake) : null;
  const profitPct  = hasArb ? ((1 / impliedSum - 1) * 100).toFixed(2) : null;
  const stake1     = hasArb ? (stake / (d1 * impliedSum)).toFixed(2) : null;
  const stake2     = hasArb ? (stake / (d2 * impliedSum)).toFixed(2) : null;

  const card = { background: '#0f1729', border: '1px solid #1e2a4a', borderRadius: 16, padding: 20 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 520 }}>
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#F5F5FA', marginBottom: 4 }}>⚖️ Arbitrage Finder</div>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Enter two odds for the same event from different books to check for an arb opportunity.</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 5 }}>Book 1 odds (American)</div>
            <input value={odds1} onChange={e => setOdds1(e.target.value)} placeholder="-110"
              className={inp} style={{ ...inpStyle, padding: '9px 12px', borderRadius: 10, width: '100%' }} onFocus={inpFocus} onBlur={inpBlur} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 5 }}>Book 2 odds (American)</div>
            <input value={odds2} onChange={e => setOdds2(e.target.value)} placeholder="+130"
              className={inp} style={{ ...inpStyle, padding: '9px 12px', borderRadius: 10, width: '100%' }} onFocus={inpFocus} onBlur={inpBlur} />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 5 }}>Total stake ($)</div>
          <input type="number" value={stake} onChange={e => setStake(parseFloat(e.target.value)||0)}
            className={inp} style={{ ...inpStyle, padding: '9px 12px', borderRadius: 10, width: '100%' }} onFocus={inpFocus} onBlur={inpBlur} />
        </div>
      </div>

      {impliedSum && (
        <div style={{ ...card, border: `1px solid ${hasArb ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.3)'}`, background: hasArb ? 'rgba(34,197,94,0.05)' : '#0f1729' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: hasArb ? '#22c55e' : '#ef4444', marginBottom: 12 }}>
            {hasArb ? '✅ Arbitrage opportunity found!' : '❌ No arbitrage — books have edge'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {[
              ['Implied sum', (impliedSum * 100).toFixed(2)+'%', impliedSum < 1 ? '#22c55e' : '#ef4444'],
              ['Book edge', ((impliedSum - 1) * 100).toFixed(2)+'%', '#94A3B8'],
              ...(hasArb ? [
                ['Stake on Book 1', '$'+stake1, '#F5F5FA'],
                ['Stake on Book 2', '$'+stake2, '#F5F5FA'],
                ['Guaranteed profit', '$'+profit.toFixed(2), '#22c55e'],
                ['Profit %', profitPct+'%', '#22c55e'],
              ] : []),
            ].map(([l, v, c]) => (
              <div key={l} style={{ background: '#0a0f1e', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: c }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   PARLAY OPTIMIZER (Sports Betting sub-tab)
───────────────────────────────────────── */
function ParlayPanel() {
  const [legs, setLegs]   = useState([{ label: '', odds: '' }, { label: '', odds: '' }]);
  const [stake, setStake] = useState(20);
  const [bankroll, setBankroll] = useState(1000);

  function toDecimal(odds) {
    const n = parseFloat(odds);
    if (!n) return null;
    if (n > 0) return n / 100 + 1;
    if (n < 0) return 100 / Math.abs(n) + 1;
    return null;
  }

  const validLegs = legs.filter(l => l.odds && toDecimal(l.odds));
  const combinedDecimal = validLegs.reduce((p, l) => p * (toDecimal(l.odds) || 1), 1);
  const combinedAmerican = combinedDecimal >= 2 ? Math.round((combinedDecimal - 1) * 100) : Math.round(-100 / (combinedDecimal - 1));
  const payout = stake * combinedDecimal;
  const profit = payout - stake;
  // Implied probability & EV
  const impliedProb = validLegs.length ? validLegs.reduce((p, l) => {
    const d = toDecimal(l.odds); return p * (d ? 1/d : 1);
  }, 1) * 100 : 0;

  function addLeg()    { setLegs(p => [...p, { label: '', odds: '' }]); }
  function removeLeg(i){ setLegs(p => p.filter((_, j) => j !== i)); }
  function updateLeg(i, k, v) { setLegs(p => p.map((l, j) => j === i ? { ...l, [k]: v } : l)); }

  const card = { background: '#0f1729', border: '1px solid #1e2a4a', borderRadius: 16, padding: 20 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 560 }}>
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#F5F5FA', marginBottom: 14 }}>🎰 Parlay Builder</div>
        {legs.map((leg, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: '#64748b', minWidth: 20 }}>#{i+1}</div>
            <input value={leg.label} onChange={e => updateLeg(i, 'label', e.target.value)}
              placeholder="Pick description…" className={inp}
              style={{ ...inpStyle, flex: 1, padding: '8px 10px', borderRadius: 8, fontSize: 12 }} onFocus={inpFocus} onBlur={inpBlur} />
            <input value={leg.odds} onChange={e => updateLeg(i, 'odds', e.target.value)}
              placeholder="Odds" className={inp}
              style={{ ...inpStyle, width: 80, padding: '8px 10px', borderRadius: 8, fontSize: 12 }} onFocus={inpFocus} onBlur={inpBlur} />
            {legs.length > 2 && (
              <button onClick={() => removeLeg(i)} style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}
                onMouseEnter={e => e.currentTarget.style.color='#ef4444'}
                onMouseLeave={e => e.currentTarget.style.color='#64748b'}>✕</button>
            )}
          </div>
        ))}
        <button onClick={addLeg} className="glass-btn" style={{ marginTop: 6, padding: '7px 16px', fontSize: 12, borderRadius: 8 }}>+ Add leg</button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Stake ($)</div>
            <input type="number" value={stake} onChange={e => setStake(parseFloat(e.target.value)||0)}
              className={inp} style={{ ...inpStyle, padding: '8px 10px', borderRadius: 8, width: '100%' }} onFocus={inpFocus} onBlur={inpBlur} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Bankroll ($)</div>
            <input type="number" value={bankroll} onChange={e => setBankroll(parseFloat(e.target.value)||0)}
              className={inp} style={{ ...inpStyle, padding: '8px 10px', borderRadius: 8, width: '100%' }} onFocus={inpFocus} onBlur={inpBlur} />
          </div>
        </div>
      </div>

      {validLegs.length >= 2 && (
        <div style={card}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', marginBottom: 12 }}>Parlay Card — {validLegs.length} legs</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 12 }}>
            {[
              ['Combined odds (American)', combinedAmerican > 0 ? '+'+combinedAmerican : combinedAmerican, '#F5F5FA'],
              ['Decimal odds', combinedDecimal.toFixed(2)+'x', '#F5F5FA'],
              ['Stake', '$'+stake.toFixed(2), '#94A3B8'],
              ['Potential payout', '$'+payout.toFixed(2), '#22c55e'],
              ['Potential profit', '$'+profit.toFixed(2), profit > 0 ? '#22c55e' : '#ef4444'],
              ['Implied prob', impliedProb.toFixed(1)+'%', '#60a5fa'],
            ].map(([l, v, c]) => (
              <div key={l} style={{ background: '#0a0f1e', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: c }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', padding: '10px 12px', background: '#0a0f1e', borderRadius: 8 }}>
            💡 Kelly stake: <strong style={{color: '#fbbf24'}}>${(bankroll * Math.max(0, impliedProb/100 - (1 - impliedProb/100) / (combinedDecimal - 1))).toFixed(2)}</strong>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   BETTING ANALYTICS (Sports Betting sub-tab)
───────────────────────────────────────── */
function BettingAnalyticsPanel({ bets }) {
  const settled = bets.filter(b => b.result !== 'pending');

  // By sport
  const sports = [...new Set(bets.map(b => b.sport))];
  const sportData = sports.map(s => {
    const sb = settled.filter(b => b.sport === s);
    const wins = sb.filter(b => b.result === 'win');
    return { sport: s, wr: sb.length ? Math.round(wins.length/sb.length*100) : 0, pnl: sb.reduce((sum,b) => sum+(b.pnl||0), 0), n: sb.length };
  });

  // By bet type
  const types = [...new Set(bets.map(b => b.type))];
  const typeData = types.map(t => {
    const tb = settled.filter(b => b.type === t);
    const wins = tb.filter(b => b.result === 'win');
    return { type: t, wr: tb.length ? Math.round(wins.length/tb.length*100) : 0, pnl: tb.reduce((sum,b) => sum+(b.pnl||0), 0), n: tb.length };
  });

  const card = { background: '#0f1729', border: '1px solid #1e2a4a', borderRadius: 16, padding: 20 };

  if (settled.length === 0) {
    return (
      <div className="glass-card" style={{ padding: 40, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <svg width="64" height="44" viewBox="0 0 64 44" fill="none">
          <rect x="0"  y="30" width="13" height="14" rx="2" fill="rgba(79,142,247,0.3)"/>
          <rect x="17" y="20" width="13" height="24" rx="2" fill="rgba(79,142,247,0.3)"/>
          <rect x="34" y="11" width="13" height="33" rx="2" fill="rgba(79,142,247,0.3)"/>
          <rect x="51" y="4"  width="13" height="40" rx="2" fill="rgba(79,142,247,0.3)"/>
        </svg>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#4a5a7a', margin: 0 }}>Betting analytics will appear here</h3>
        <p style={{ fontSize: 13, color: '#2a3a5a', margin: 0 }}>Log and settle bets to unlock sport breakdown, win rate analysis, and P&L charts</p>
      </div>
    );
  }

  const barOpts = {
    responsive: true, maintainAspectRatio: false, indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: 'rgba(30,42,74,0.5)' }, ticks: { color: '#64748b', font: { size: 10 } } },
      y: { grid: { display: false }, ticks: { color: '#94A3B8', font: { size: 11 } } },
    },
  };

  const wrBySport = {
    labels: sportData.map(d => d.sport),
    datasets: [{ data: sportData.map(d => d.wr), backgroundColor: sportData.map(d => d.wr >= 50 ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.4)'), borderRadius: 4 }],
  };
  const pnlBySport = {
    labels: sportData.map(d => d.sport),
    datasets: [{ data: sportData.map(d => d.pnl), backgroundColor: sportData.map(d => d.pnl >= 0 ? 'rgba(37,99,235,0.5)' : 'rgba(239,68,68,0.4)'), borderRadius: 4 }],
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={card}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', marginBottom: 12 }}>Win Rate by Sport</div>
          <div style={{ height: 140 }}><Bar data={wrBySport} options={barOpts} /></div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', marginBottom: 12 }}>P&L by Sport ($)</div>
          <div style={{ height: 140 }}><Bar data={pnlBySport} options={{...barOpts, plugins: {...barOpts.plugins, tooltip:{callbacks:{label:ctx=>'$'+ctx.raw.toFixed(0)}}}}} /></div>
        </div>
      </div>

      {/* Bet type breakdown */}
      <div style={card}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', marginBottom: 12 }}>Breakdown by Bet Type</div>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: '#64748b', fontSize: 11 }}>
              {['Type','Bets','Win Rate','P&L'].map(h => <th key={h} style={{ textAlign: 'left', paddingBottom: 8, fontWeight: 600 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {typeData.map(d => (
              <tr key={d.type} style={{ borderTop: '1px solid #1e2a4a' }}>
                <td style={{ padding: '8px 0', color: '#F5F5FA', fontWeight: 500 }}>{d.type}</td>
                <td style={{ padding: '8px 0', color: '#94A3B8' }}>{d.n}</td>
                <td style={{ padding: '8px 0', color: d.wr >= 50 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{d.wr}%</td>
                <td style={{ padding: '8px 0', color: d.pnl >= 0 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{d.pnl >= 0 ? '+' : ''}${d.pnl.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Best/worst bets */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {[
          { label: '🏆 Best bets', items: [...settled].sort((a,b) => (b.pnl||0)-(a.pnl||0)).slice(0,3), color: '#22c55e' },
          { label: '💔 Worst bets', items: [...settled].sort((a,b) => (a.pnl||0)-(b.pnl||0)).slice(0,3), color: '#ef4444' },
        ].map(({ label, items, color }) => (
          <div key={label} style={card}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', marginBottom: 12 }}>{label}</div>
            {items.map((b, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < items.length - 1 ? '1px solid #1e2a4a' : 'none' }}>
                <span style={{ fontSize: 12, color: '#F5F5FA', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.match}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color }}>{(b.pnl >= 0 ? '+' : '')}${(b.pnl||0).toFixed(0)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   MONTHLY TRACKER
───────────────────────────────────────── */
function MonthlyTracker({ monthPnl, monthGoal, todayPnl, dailyLimit, monthWR, wrTarget, maxDD, onGoalChange, onLimitChange, onTargetChange }) {
  const goalPct   = monthGoal > 0 ? Math.min(100, Math.max(0, monthPnl/monthGoal*100)) : 0;
  const limitUsed = Math.max(0, -todayPnl);
  const limitPct  = dailyLimit > 0 ? Math.min(100, limitUsed/dailyLimit*100) : 0;
  const limitLeft = Math.max(0, dailyLimit + todayPnl);
  const wrPct     = wrTarget > 0 ? Math.min(100, monthWR/wrTarget*100) : 0;

  const barColor = (pct, inv=false) => inv
    ? (pct < 50 ? '#22c55e' : pct < 80 ? '#f59e0b' : '#ef4444')
    : (pct >= 100 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#475569');

  const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' };
  const track = { background: 'rgba(255,255,255,0.08)' };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="rounded-2xl p-5" style={card}>
        <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{color: '#64748b'}}>Monthly P&L Goal</div>
        <div className={`text-2xl font-bold mb-2 ${monthPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {monthPnl >= 0 ? '+' : ''}${monthPnl.toFixed(0)}
        </div>
        <div className="h-1.5 rounded-full overflow-hidden mb-2.5" style={track}>
          <div className="h-full rounded-full transition-all duration-500" style={{width: goalPct+'%', background: barColor(goalPct)}} />
        </div>
        <div className="flex items-center gap-1.5 text-xs" style={{color: '#64748b'}}>
          <span>Goal $</span>
          <input type="number" value={monthGoal} onChange={e => onGoalChange(parseFloat(e.target.value)||0)}
            className="w-20 text-center outline-none bg-transparent font-medium" style={{borderBottom: '1px solid #1e2a4a', color: '#94A3B8'}} />
          <span className="ml-auto" style={{color: '#94A3B8'}}>{Math.round(goalPct)}%</span>
        </div>
      </div>

      <div className="rounded-2xl p-5" style={card}>
        <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{color: '#64748b'}}>Daily Limit Left</div>
        <div className={`text-2xl font-bold mb-2 ${limitLeft > dailyLimit*0.2 ? '' : 'text-red-500'}`} style={limitLeft > dailyLimit*0.2 ? {color: '#F5F5FA'} : {}}>
          ${limitLeft.toFixed(0)}
        </div>
        <div className="h-1.5 rounded-full overflow-hidden mb-2.5" style={track}>
          <div className="h-full rounded-full transition-all duration-500" style={{width: limitPct+'%', background: barColor(limitPct, true)}} />
        </div>
        <div className="flex items-center gap-1.5 text-xs" style={{color: '#64748b'}}>
          <span>Limit $</span>
          <input type="number" value={dailyLimit} onChange={e => onLimitChange(parseFloat(e.target.value)||0)}
            className="w-20 text-center outline-none bg-transparent font-medium" style={{borderBottom: '1px solid #1e2a4a', color: '#94A3B8'}} />
          <span className="ml-auto" style={{color: '#94A3B8'}}>{Math.round(limitPct)}% used</span>
        </div>
      </div>

      <div className="rounded-2xl p-5" style={card}>
        <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{color: '#64748b'}}>Win Rate (Month)</div>
        <div className={`text-2xl font-bold mb-2 ${monthWR >= wrTarget ? 'text-green-500' : 'text-yellow-500'}`}>
          {monthWR}%
        </div>
        <div className="h-1.5 rounded-full overflow-hidden mb-2.5" style={track}>
          <div className="h-full rounded-full transition-all duration-500" style={{width: wrPct+'%', background: monthWR>=wrTarget?'#22c55e':'#f59e0b'}} />
        </div>
        <div className="flex items-center gap-1.5 text-xs" style={{color: '#64748b'}}>
          <span>Target</span>
          <input type="number" value={wrTarget} onChange={e => onTargetChange(parseFloat(e.target.value)||0)}
            className="w-14 text-center outline-none bg-transparent font-medium" style={{borderBottom: '1px solid #1e2a4a', color: '#94A3B8'}} />
          <span>%</span>
          <span className="ml-auto" style={{color: '#94A3B8'}}>{monthWR >= wrTarget ? '✓ on track' : `${wrTarget - monthWR}% gap`}</span>
        </div>
      </div>

      <div className="rounded-2xl p-5" style={card}>
        <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{color: '#64748b'}}>Max Drawdown (Month)</div>
        <div className={`text-2xl font-bold mb-2 ${maxDD === 0 ? '' : 'text-red-500'}`} style={maxDD === 0 ? {color: '#334155'} : {}}>
          {maxDD > 0 ? '-$'+maxDD.toFixed(2) : '—'}
        </div>
        <div className="h-1.5 rounded-full overflow-hidden mb-2.5" style={track}>
          <div className="h-full rounded-full" style={{width: maxDD > 0 ? '100%' : '0%', background: '#ef4444'}} />
        </div>
        <div className="text-xs" style={{color: '#64748b'}}>Peak-to-trough this month</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   SHARED COMPONENTS & HELPERS
───────────────────────────────────────── */
function ViewToggle({ view, setView, options = ['calendar', 'table'] }) {
  return (
    <div className="flex gap-1 p-1 rounded-xl w-fit" style={{background: '#0a0f1e'}}>
      {options.map(v => (
        <button key={v} onClick={() => setView(v)}
          className="px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
          style={view===v ? {background: '#2563EB', color: '#fff'} : {color: '#94A3B8'}}>
          {v}
        </button>
      ))}
    </div>
  );
}

function DarkTable({ headers, children, empty }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{background: '#0f1729', border: '1px solid #1e2a4a'}}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs font-medium uppercase tracking-wide" style={{background: '#0a0f1e', borderBottom: '1px solid #1e2a4a', color: '#64748b'}}>
            {headers.map(h => <th key={h} className="text-left px-5 py-3">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {!children || (Array.isArray(children) && children.length === 0) ? (
            <tr><td colSpan={headers.length} className="px-5 py-10 text-center text-sm" style={{color: '#64748b'}}>{empty}</td></tr>
          ) : children}
        </tbody>
      </table>
    </div>
  );
}

function AIAnalyzeButton({ topic, type }) {
  return (
    <button onClick={() => window.dispatchEvent(new CustomEvent('ai-prefill', { detail: { topic, type } }))}
      className="text-xs font-medium transition-colors text-left"
      style={{color: '#475569'}}
      onMouseEnter={e => e.currentTarget.style.color='#2563EB'}
      onMouseLeave={e => e.currentTarget.style.color='#475569'}>
      Analyze with AI ↗
    </button>
  );
}

function LoadingDots({ label }) {
  return (
    <div className="flex gap-2.5 items-center text-sm py-2" style={{color: '#94A3B8'}}>
      <div className="flex gap-1">
        {[0,1,2].map(i => (
          <div key={i} className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background: '#2563EB', animationDelay: i*150+'ms'}} />
        ))}
      </div>
      {label}
    </div>
  );
}

function calcDTStats(trades) {
  const closed = trades.filter(t => t.status !== 'open');
  const wins   = closed.filter(t => t.status === 'win');
  const pnl    = closed.reduce((s,t) => s+(t.pnl||0), 0);
  return { total: trades.length, wr: closed.length ? Math.round(wins.length/closed.length*100) : 0, pnl, avgW: wins.length ? wins.reduce((s,t) => s+t.pnl,0)/wins.length : 0 };
}

function calcMaxDrawdown(items) {
  if (!items.length) return 0;
  const sorted = [...items].filter(i => i.pnl!=null && i.status!=='open' && i.result!=='pending').sort((a,b) => new Date(a.created_at)-new Date(b.created_at));
  let peak=0, maxDD=0, running=0;
  sorted.forEach(i => { running+=i.pnl; if(running>peak) peak=running; const dd=peak-running; if(dd>maxDD) maxDD=dd; });
  return maxDD;
}

const PM_CATS = {
  'election|president|trump|biden|democrat|republican|congress|senate|vote|govern|parliament|minister|party|policy|law|bill|supreme court': 'Politics',
  'BTC|Bitcoin|crypto|ETH|SOL|Solana|Ethereum|altcoin|blockchain|defi|NFT|web3|coinbase|binance': 'Crypto',
  'Fed|rate|inflation|recession|S&P|nasdaq|stock|market|dollar|euro|forex|interest|treasury|bond|yield|IPO|earnings': 'Finance',
  'championship|NBA|NFL|MLB|NHL|soccer|sport|World Cup|Super Bowl|Olympics|tennis|golf|F1|Formula|UFC|boxing|league': 'Sports',
  'tariff|trade|China|economy|unemployment|GDP|CPI|jobs|payroll|PMI|manufacturing|export|import|supply chain': 'Economics',
  'oscar|grammy|Emmy|netflix|disney|movie|film|music|album|celebrity|singer|actor|award|box office|streaming|TV show': 'Entertainment',
  'climate|NASA|AI|space|tech|cancer|gene|virus|vaccine|robot|quantum|nuclear|energy|planet|asteroid|discovery': 'Science',
};
function pmCat(t) { for (const [p,c] of Object.entries(PM_CATS)) if (new RegExp(p,'i').test(t)) return c; return 'Other'; }

const SAMPLE_PM = [
  {id:'s1', title:'Will the Fed cut rates before July 2026?', yes:58, no:42, volume:2100000, cat:'Finance'},
  {id:'s2', title:'Will BTC hit $120k in 2026?', yes:41, no:59, volume:5400000, cat:'Crypto'},
  {id:'s3', title:'Will Trump sign a crypto bill by Q3 2026?', yes:72, no:28, volume:3200000, cat:'Politics'},
  {id:'s4', title:'Will S&P 500 hit 6500 by June 2026?', yes:55, no:45, volume:2900000, cat:'Finance'},
  {id:'s5', title:'Will US enter recession in 2026?', yes:29, no:71, volume:4100000, cat:'Economics'},
  {id:'s6', title:'Will Solana flip Ethereum by market cap?', yes:19, no:81, volume:900000, cat:'Crypto'},
];
