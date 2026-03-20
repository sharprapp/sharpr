import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../lib/api';
import Logo from '../components/Logo';
import TradingViewMarketOverview from '../components/TradingViewMarketOverview';

/* ── helpers ── */
function greeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 18) return 'Good afternoon';
  return 'Good evening';
}

function firstName(email = '') {
  const raw = (email.split('@')[0].split('.')[0]).replace(/\d+$/, '');
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function isToday(dateStr) {
  const d = new Date(dateStr);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

function isThisMonth(dateStr) {
  const d = new Date(dateStr);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
}

function fmtPnl(n, prefix = '$') {
  if (n == null || isNaN(n)) return `${prefix}0.00`;
  const abs = Math.abs(n).toFixed(2);
  return (n >= 0 ? '+' : '-') + prefix + abs;
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ── colour helpers ── */
const card = { background: '#0f1729', border: '1px solid #1e2a4a', borderRadius: '16px', padding: '20px' };
const pnlColor = (n) => n == null ? '#94A3B8' : n >= 0 ? '#22c55e' : '#ef4444';

/* ── sport pill colours ── */
const SPORT_COLORS = { NBA: '#f59e0b', NFL: '#3b82f6', MLB: '#ef4444', NHL: '#06b6d4', Soccer: '#22c55e', UFC: '#a855f7' };
const SPORTS = ['NBA', 'NFL', 'MLB', 'NHL', 'Soccer', 'UFC'];

/* ── quick action cards ── */
const ACTIONS = [
  { label: 'AI Research',   icon: '🤖', color: '#2563EB', tab: 'AI Research' },
  { label: 'Log a trade',   icon: '📈', color: '#22c55e', tab: 'Day Trading' },
  { label: 'Log a bet',     icon: '🏈', color: '#f59e0b', tab: 'Sports Betting' },
  { label: 'View markets',  icon: '🎯', color: '#a855f7', tab: 'Polymarket' },
];

/* ════════════════════════════════════════
   HOME PAGE
════════════════════════════════════════ */
export default function Home() {
  const { user, tier, signOut } = useAuth();
  const navigate = useNavigate();

  /* data */
  const [trades, setTrades]     = useState([]);
  const [bets, setBets]         = useState([]);
  const [markets, setMarkets]   = useState([]);
  const [games, setGames]       = useState([]);
  const [sport, setSport]       = useState('NBA');
  const [econEvents, setEconEvents] = useState([]);

  /* loading states */
  const [tradesLoading, setTradesLoading] = useState(true);
  const [betsLoading, setBetsLoading]     = useState(true);
  const [marketsLoading, setMarketsLoading] = useState(true);
  const [gamesLoading, setGamesLoading]   = useState(false);

  /* fetch on mount */
  useEffect(() => {
    api.get('/api/trades').then(r => setTrades(r.data || [])).catch(() => {}).finally(() => setTradesLoading(false));
    api.get('/api/bets').then(r => setBets(r.data || [])).catch(() => {}).finally(() => setBetsLoading(false));
    api.get('/api/markets/polymarket?offset=0').then(r => setMarkets((r.data.markets || []).slice(0, 6))).catch(() => {}).finally(() => setMarketsLoading(false));
    api.get('/api/news/economic').then(r => {
      const upcoming = (r.data.events || []).filter(e => {
        try { return new Date(e.date) >= new Date(new Date().setHours(0,0,0,0)); } catch { return true; }
      }).slice(0, 3);
      setEconEvents(upcoming);
    }).catch(() => {});
  }, []);

  /* fetch games when sport changes */
  useEffect(() => {
    setGamesLoading(true);
    api.get(`/api/espn/${sport}`).then(r => setGames(r.data || [])).catch(() => setGames([])).finally(() => setGamesLoading(false));
  }, [sport]);

  /* derived stats */
  const todayTrades   = useMemo(() => trades.filter(t => isToday(t.created_at)), [trades]);
  const monthTrades   = useMemo(() => trades.filter(t => isThisMonth(t.created_at)), [trades]);
  const todayBets     = useMemo(() => bets.filter(b => isToday(b.created_at)), [bets]);
  const monthBets     = useMemo(() => bets.filter(b => isThisMonth(b.created_at)), [bets]);

  const todayPnl      = useMemo(() => todayTrades.filter(t => t.status !== 'open').reduce((s, t) => s + (t.pnl || 0), 0), [todayTrades]);
  const monthPnl      = useMemo(() => monthTrades.filter(t => t.status !== 'open').reduce((s, t) => s + (t.pnl || 0), 0), [monthTrades]);

  const monthWins     = useMemo(() => monthTrades.filter(t => t.status === 'win').length, [monthTrades]);
  const monthSettled  = useMemo(() => monthTrades.filter(t => t.status !== 'open').length, [monthTrades]);
  const tradeWR       = monthSettled ? Math.round(monthWins / monthSettled * 100) : 0;

  const betWins       = useMemo(() => monthBets.filter(b => b.result === 'win').length, [monthBets]);
  const betSettled    = useMemo(() => monthBets.filter(b => b.result !== 'pending').length, [monthBets]);
  const betWR         = betSettled ? Math.round(betWins / betSettled * 100) : 0;
  const betMonthUnits = useMemo(() => monthBets.reduce((s, b) => s + (b.pnl || 0), 0), [monthBets]);

  const last3Trades   = trades.slice(0, 3);
  const last3Bets     = bets.slice(0, 3);

  function goTab(tab) {
    sessionStorage.setItem('openTab', tab);
    navigate('/dashboard');
  }

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div style={{ minHeight: '100vh', background: '#080810', color: '#F5F5FA' }}>

      {/* ── NAVBAR ── */}
      <nav className="glass-nav" style={{ position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 24 }}>
          <Logo />
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginLeft: 16 }}>
            {['Markets', 'Journal', 'Settings'].map(label => (
              <a key={label}
                href={label === 'Settings' ? '/settings' : undefined}
                onClick={e => { if (label !== 'Settings') { e.preventDefault(); goTab(label === 'Markets' ? 'Polymarket' : 'Day Trading'); } }}
                style={{ fontSize: 14, color: '#94A3B8', cursor: 'pointer', textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.color = '#F5F5FA'}
                onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}>
                {label}
              </a>
            ))}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: '#475569' }}>{user?.email}</span>
            <button onClick={handleSignOut} style={{ fontSize: 13, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.color = '#94A3B8'}
              onMouseLeave={e => e.currentTarget.style.color = '#64748b'}>Sign out</button>
            <button onClick={() => goTab('Polymarket')}
              style={{ background: '#2563EB', color: '#fff', border: 'none', borderRadius: 10, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = '#1d4ed8'}
              onMouseLeave={e => e.currentTarget.style.background = '#2563EB'}>
              Go to dashboard
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* ── GREETING ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
              {greeting()}, <span style={{ color: '#2563EB' }}>{firstName(user?.email)}</span>
            </h1>
            <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>Here's your trading overview for today.</p>
          </div>
          <div style={{ ...card, padding: '10px 18px', borderRadius: 12 }}>
            <div style={{ fontSize: 12, color: '#64748b' }}>Today</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', marginTop: 2 }}>{today}</div>
          </div>
        </div>

        {/* ── QUICK STATS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {[
            { label: "Today's P&L", value: fmtPnl(todayPnl), color: pnlColor(todayPnl), loading: tradesLoading },
            { label: 'Bets today',  value: tradesLoading ? '—' : todayBets.length, color: '#F5F5FA', loading: betsLoading },
            { label: 'AI queries',  value: tier === 'pro' ? 'Unlimited' : '0 / 5', color: tier === 'pro' ? '#22c55e' : '#94A3B8', loading: false },
            { label: "Month P&L",   value: fmtPnl(monthPnl), color: pnlColor(monthPnl), loading: tradesLoading },
          ].map(({ label, value, color, loading }) => (
            <div key={label} style={card}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 8 }}>{label}</div>
              {loading
                ? <div style={{ height: 28, borderRadius: 6, background: '#1e2a4a', animation: 'pulse 1.5s infinite' }} />
                : <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
              }
            </div>
          ))}
        </div>

        {/* ── LIVE MARKETS ── */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Live prediction markets</h2>
            <button onClick={() => goTab('Polymarket')} style={{ fontSize: 13, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer' }}>
              View all 1,500+ markets →
            </button>
          </div>
          {marketsLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {[1,2,3,4,5,6].map(i => <div key={i} style={{ ...card, height: 120, animation: 'pulse 1.5s infinite' }} />)}
            </div>
          ) : markets.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', color: '#475569', padding: 32 }}>Could not load markets</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {markets.map((m, i) => {
                const pct = m.yes ?? 50;
                const fill = pct > 60 ? '#22c55e' : pct > 40 ? '#f59e0b' : '#ef4444';
                return (
                  <div key={`${m.id}-${i}`} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: '#1e2a4a', color: '#94A3B8' }}>{m.cat || 'Market'}</span>
                      <span style={{ fontSize: 11, color: '#475569' }}>Vol {m.volume >= 1e6 ? '$'+(m.volume/1e6).toFixed(1)+'M' : m.volume >= 1e3 ? '$'+(m.volume/1e3).toFixed(0)+'k' : '$'+(m.volume||0).toFixed(0)}</span>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#F5F5FA', margin: 0, lineHeight: 1.4, flex: 1 }}>{m.title}</p>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: '#64748b' }}>YES</span>
                        <span style={{ fontSize: 16, fontWeight: 700, color: fill }}>{pct}%</span>
                        <span style={{ fontSize: 11, color: '#64748b' }}>NO {m.no ?? 100 - pct}%</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 4, background: '#1e2a4a', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 4, background: fill, width: pct + '%' }} />
                      </div>
                    </div>
                    <button onClick={() => { sessionStorage.setItem('ai-prefill-topic', m.title); sessionStorage.setItem('ai-prefill-type', 'polymarket'); goTab('AI Research'); }}
                      style={{ background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.25)', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#60a5fa', cursor: 'pointer', fontWeight: 600, textAlign: 'center' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,99,235,0.2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(37,99,235,0.12)'}>
                      Analyze ↗
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── MARKET OVERVIEW ── */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Market Overview</h2>
          </div>
          <TradingViewMarketOverview />
        </section>

        {/* ── TODAY'S GAMES ── */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Today's games</h2>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SPORTS.map(s => (
                <button key={s} onClick={() => setSport(s)}
                  style={{
                    fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 20, cursor: 'pointer', transition: 'all 0.15s',
                    background: sport === s ? (SPORT_COLORS[s] || '#2563EB') : 'transparent',
                    color: sport === s ? '#fff' : '#94A3B8',
                    border: sport === s ? `1px solid ${SPORT_COLORS[s] || '#2563EB'}` : '1px solid #1e2a4a',
                  }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {gamesLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {[1,2,3,4].map(i => <div key={i} style={{ ...card, height: 90, animation: 'pulse 1.5s infinite' }} />)}
            </div>
          ) : games.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', color: '#475569', padding: 28 }}>
              No {sport} games scheduled today
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {games.slice(0, 8).map((g, i) => (
                <div key={g.id || i} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: SPORT_COLORS[sport] || '#94A3B8', letterSpacing: '0.05em' }}>{sport}</span>
                    {g.status?.state === 'in' && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', animation: 'pulse 1.5s infinite' }}>LIVE</span>
                    )}
                    {g.status?.completed && (
                      <span style={{ fontSize: 10, color: '#64748b' }}>Final</span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#F5F5FA', lineHeight: 1.4 }}>
                    {g.away?.name || '—'} <span style={{ color: '#64748b' }}>@</span> {g.home?.name || '—'}
                  </div>
                  {(g.away?.score != null || g.home?.score != null) ? (
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#F5F5FA' }}>
                      {g.away?.score ?? 0} – {g.home?.score ?? 0}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#64748b' }}>{g.status?.detail || fmtDate(g.date)}</div>
                  )}
                  {!g.status?.completed && (
                    <button onClick={() => { sessionStorage.setItem('bet-prefill-sport', sport); sessionStorage.setItem('bet-prefill-match', `${g.away?.name} @ ${g.home?.name}`); goTab('Sports Betting'); }}
                      style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, padding: '5px 10px', fontSize: 11, color: '#f59e0b', cursor: 'pointer', fontWeight: 600, textAlign: 'center' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,158,11,0.2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(245,158,11,0.12)'}>
                      Log bet ↗
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── TWO-COLUMN SUMMARY ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Trades summary */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Day Trading</h3>
              <button onClick={() => goTab('Day Trading')} style={{ fontSize: 12, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer' }}>Log a trade →</button>
            </div>
            <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Month P&L</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: pnlColor(monthPnl) }}>{fmtPnl(monthPnl)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Win rate</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#F5F5FA' }}>{tradeWR}%</div>
              </div>
            </div>
            {tradesLoading ? (
              <div style={{ height: 60, borderRadius: 8, background: '#1e2a4a', animation: 'pulse 1.5s infinite' }} />
            ) : last3Trades.length === 0 ? (
              <div style={{ fontSize: 13, color: '#475569', textAlign: 'center', padding: '16px 0' }}>No trades yet — log your first</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {last3Trades.map((t, i) => (
                  <div key={t.id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: '#0a0f1e' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#F5F5FA', minWidth: 60 }}>{t.ticker}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 12, background: t.direction === 'LONG' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: t.direction === 'LONG' ? '#22c55e' : '#ef4444' }}>
                      {t.direction}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, marginLeft: 'auto', color: pnlColor(t.pnl) }}>
                      {t.status === 'open' ? <span style={{ color: '#64748b' }}>Open</span> : fmtPnl(t.pnl)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bets summary */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Sports Betting</h3>
              <button onClick={() => goTab('Sports Betting')} style={{ fontSize: 12, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer' }}>Log a bet →</button>
            </div>
            <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Month units</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: pnlColor(betMonthUnits) }}>{betMonthUnits >= 0 ? '+' : ''}{betMonthUnits.toFixed(2)}u</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Win rate</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#F5F5FA' }}>{betWR}%</div>
              </div>
            </div>
            {betsLoading ? (
              <div style={{ height: 60, borderRadius: 8, background: '#1e2a4a', animation: 'pulse 1.5s infinite' }} />
            ) : last3Bets.length === 0 ? (
              <div style={{ fontSize: 13, color: '#475569', textAlign: 'center', padding: '16px 0' }}>No bets yet — log your first</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {last3Bets.map((b, i) => {
                  const resultColor = b.result === 'win' ? '#22c55e' : b.result === 'loss' ? '#ef4444' : '#f59e0b';
                  const resultBg    = b.result === 'win' ? 'rgba(34,197,94,0.12)' : b.result === 'loss' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)';
                  return (
                    <div key={b.id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: '#0a0f1e' }}>
                      <span style={{ fontSize: 12, color: '#F5F5FA', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.match}</span>
                      <span style={{ fontSize: 11, color: '#64748b', flexShrink: 0 }}>{b.odds > 0 ? '+' : ''}{b.odds}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 12, background: resultBg, color: resultColor, flexShrink: 0 }}>
                        {b.result}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── NEWS PREVIEW ── */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Economic calendar</h2>
            <button onClick={() => goTab('News')} style={{ fontSize: 13, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer' }}>Full news feed →</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {econEvents.length === 0 ? (
              [
                { cat: 'Markets',  headline: 'Economic calendar loading…',       time: 'now' },
                { cat: 'Sports',   headline: 'Sports injury reports available',   time: 'now' },
                { cat: 'Trading',  headline: 'Pre-market movers and earnings',    time: 'now' },
              ].map((item, i) => (
                <div key={i} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 20, background: '#1e2a4a', color: '#94A3B8' }}>{item.cat}</span>
                    <span style={{ fontSize: 11, color: '#475569' }}>{item.time}</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#cbd5e1', margin: 0, lineHeight: 1.5 }}>{item.headline}</p>
                </div>
              ))
            ) : (
              econEvents.map((e, i) => {
                const impactColor = e.impact === 'High' ? '#ef4444' : e.impact === 'Medium' ? '#f59e0b' : '#64748b';
                return (
                  <div key={i} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 20, background: '#1e2a4a', color: '#94A3B8' }}>
                        {e.currency} · {e.impact}
                      </span>
                      <span style={{ fontSize: 11, color: '#475569' }}>{e.time || e.date}</span>
                    </div>
                    <p style={{ fontSize: 13, color: '#cbd5e1', margin: 0, lineHeight: 1.5 }}>{e.title}</p>
                    <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#64748b' }}>
                      {e.forecast !== '—' && <span>Forecast <strong style={{ color: '#94A3B8' }}>{e.forecast}</strong></span>}
                      {e.previous !== '—' && <span>Prev <strong style={{ color: '#94A3B8' }}>{e.previous}</strong></span>}
                      {e.actual && e.actual !== '—' && <span>Actual <strong style={{ color: impactColor }}>{e.actual}</strong></span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ── QUICK ACTIONS ── */}
        <section>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Quick actions</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            {ACTIONS.map(({ label, icon, color, tab }) => (
              <button key={label} onClick={() => goTab(tab)}
                style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', border: '1px solid #1e2a4a', textAlign: 'left', transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = color}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#1e2a4a'}>
                <div style={{ width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, background: color + '20', flexShrink: 0 }}>
                  {icon}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#F5F5FA' }}>{label}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Open in dashboard</div>
                </div>
              </button>
            ))}
          </div>
        </section>

      </div>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid #1e2a4a', padding: '20px 24px', marginTop: 20 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <Logo size="sm" />
          <span style={{ fontSize: 12, color: '#334155' }}>© {new Date().getFullYear()} Sharpr. Not affiliated with Polymarket, ESPN, or any sportsbook.</span>
        </div>
      </footer>
    </div>
  );
}
