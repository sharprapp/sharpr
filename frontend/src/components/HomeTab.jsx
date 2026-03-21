import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../lib/api';
import TradingViewMarketOverview from './TradingViewMarketOverview';

const EDGE_CACHE_KEY = 'sharpr_edge_v1';
const EDGE_TTL = 24 * 60 * 60 * 1000; // 1 day

function getEdgeCache(key) {
  try {
    const raw = localStorage.getItem(EDGE_CACHE_KEY + '_' + key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > EDGE_TTL) { localStorage.removeItem(EDGE_CACHE_KEY + '_' + key); return null; }
    // Also expire at midnight
    const cached = new Date(ts), now = new Date();
    if (cached.toDateString() !== now.toDateString()) { localStorage.removeItem(EDGE_CACHE_KEY + '_' + key); return null; }
    return data;
  } catch { return null; }
}
function setEdgeCache(key, data) {
  try { localStorage.setItem(EDGE_CACHE_KEY + '_' + key, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

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

const card = { background: '#0f1729', border: '1px solid #1e2a4a', borderRadius: '16px', padding: '20px' };
const pnlColor = (n) => n == null ? '#94A3B8' : n >= 0 ? '#22c55e' : '#ef4444';
const SPORT_COLORS = { NBA: '#f59e0b', NFL: '#3b82f6', MLB: '#ef4444', NHL: '#06b6d4', Soccer: '#22c55e', UFC: '#a855f7' };
const SPORTS = ['NBA', 'NFL', 'MLB', 'NHL', 'Soccer', 'UFC'];
const ACTIONS = [
  { label: 'AI Research', icon: '🤖', color: '#2563EB', tab: 'AI Research' },
  { label: 'Log a trade', icon: '📈', color: '#22c55e', tab: 'Day Trading' },
  { label: 'Log a bet', icon: '🏈', color: '#f59e0b', tab: 'Sports Betting' },
  { label: 'View markets', icon: '🎯', color: '#a855f7', tab: 'Polymarket' },
];

export default function HomeTab({ onSwitchTab }) {
  const { user, tier } = useAuth();
  const [trades, setTrades] = useState([]);
  const [bets, setBets] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [games, setGames] = useState([]);
  const [sport, setSport] = useState('NBA');
  const [econEvents, setEconEvents] = useState([]);
  const [tradesLoading, setTradesLoading] = useState(true);
  const [betsLoading, setBetsLoading] = useState(true);
  const [marketsLoading, setMarketsLoading] = useState(true);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [sharpBet, setSharpBet] = useState(() => getEdgeCache('sharp_bet'));
  const [sharpBetLoading, setSharpBetLoading] = useState(!getEdgeCache('sharp_bet'));
  const [topMarket, setTopMarket] = useState(() => getEdgeCache('top_market'));
  const [topMarketLoading, setTopMarketLoading] = useState(!getEdgeCache('top_market'));

  // AI-powered Sharp Bet
  useEffect(() => {
    if (sharpBet) return;
    (async () => {
      try {
        const { data } = await api.post('/api/ai/query', {
          query: 'You are a sharp sports bettor. Given today\'s NBA, NFL, MLB, NHL, and soccer games, identify ONE bet you are most confident in where there is genuine value — NOT a massive favorite (avoid anything more than -200 moneyline). Look for underdogs with value, totals with clear edge, or spreads where the line is off. Return JSON only, no markdown: {"sport":"NBA","teams":"Team A vs Team B","betType":"Spread","line":"+4.5","odds":"-110","confidence":"High","reasoning":"One sentence max"}',
          type: 'sports', use_web_search: true,
        });
        try {
          const cleaned = data.result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const parsed = JSON.parse(cleaned);
          setSharpBet(parsed);
          setEdgeCache('sharp_bet', parsed);
        } catch { setSharpBet(null); }
      } catch { setSharpBet(null); }
      finally { setSharpBetLoading(false); }
    })();
  }, []);

  // AI-powered Top Market
  useEffect(() => {
    if (topMarket) return;
    (async () => {
      try {
        const { data } = await api.post('/api/ai/query', {
          query: 'Given current Polymarket prediction markets, identify ONE market you are most confident has mispriced odds — where the YES% seems too low or too high based on real-world probability. Avoid markets under $10k volume. Return JSON only, no markdown: {"title":"Market question here","currentYes":45,"yourEstimate":62,"edge":17,"reasoning":"One sentence max"}',
          type: 'polymarket', use_web_search: true,
        });
        try {
          const cleaned = data.result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const parsed = JSON.parse(cleaned);
          setTopMarket(parsed);
          setEdgeCache('top_market', parsed);
        } catch { setTopMarket(null); }
      } catch { setTopMarket(null); }
      finally { setTopMarketLoading(false); }
    })();
  }, []);

  useEffect(() => {
    api.get('/api/trades').then(r => setTrades(r.data || [])).catch(() => {}).finally(() => setTradesLoading(false));
    api.get('/api/bets').then(r => setBets(r.data || [])).catch(() => {}).finally(() => setBetsLoading(false));
    api.get('/api/markets/polymarket?offset=0').then(r => setMarkets((r.data.markets || []).slice(0, 6))).catch(() => {}).finally(() => setMarketsLoading(false));
    api.get('/api/news/economic').then(r => {
      const upcoming = (r.data.events || []).filter(e => {
        try { return new Date(e.date) >= new Date(new Date().setHours(0, 0, 0, 0)); } catch { return true; }
      }).slice(0, 3);
      setEconEvents(upcoming);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setGamesLoading(true);
    api.get(`/api/espn/${sport}`).then(r => setGames(r.data || [])).catch(() => setGames([])).finally(() => setGamesLoading(false));
  }, [sport]);

  const todayTrades = useMemo(() => trades.filter(t => isToday(t.created_at)), [trades]);
  const monthTrades = useMemo(() => trades.filter(t => isThisMonth(t.created_at)), [trades]);
  const todayBets = useMemo(() => bets.filter(b => isToday(b.created_at)), [bets]);
  const monthBets = useMemo(() => bets.filter(b => isThisMonth(b.created_at)), [bets]);
  const todayPnl = useMemo(() => todayTrades.filter(t => t.status !== 'open').reduce((s, t) => s + (t.pnl || 0), 0), [todayTrades]);
  const monthPnl = useMemo(() => monthTrades.filter(t => t.status !== 'open').reduce((s, t) => s + (t.pnl || 0), 0), [monthTrades]);
  const betMonthUnits = useMemo(() => monthBets.reduce((s, b) => s + (b.pnl || 0), 0), [monthBets]);
  const monthWins = useMemo(() => monthTrades.filter(t => t.status === 'win').length, [monthTrades]);
  const monthSettled = useMemo(() => monthTrades.filter(t => t.status !== 'open').length, [monthTrades]);
  const tradeWR = monthSettled ? Math.round(monthWins / monthSettled * 100) : 0;
  const betWins = useMemo(() => monthBets.filter(b => b.result === 'win').length, [monthBets]);
  const betSettled = useMemo(() => monthBets.filter(b => b.result !== 'pending').length, [monthBets]);
  const betWR = betSettled ? Math.round(betWins / betSettled * 100) : 0;
  const last3Trades = trades.slice(0, 3);
  const last3Bets = bets.slice(0, 3);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  function goTab(tab) { onSwitchTab(tab); }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Greeting */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: '#f0f4ff' }}>
            {greeting()}, <span style={{ color: '#2563EB' }}>{firstName(user?.email)}</span>
          </h1>
          <p style={{ fontSize: 14, color: '#4a5a7a', marginTop: 4 }}>Here's your trading overview for today.</p>
        </div>
        <div style={{ ...card, padding: '10px 18px', borderRadius: 12 }}>
          <div style={{ fontSize: 12, color: '#64748b' }}>Today</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', marginTop: 2 }}>{today}</div>
        </div>
      </div>

      {/* Quick Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {[
          { label: "Today's P&L", value: fmtPnl(todayPnl), color: pnlColor(todayPnl), loading: tradesLoading },
          { label: 'Bets today', value: tradesLoading ? '—' : todayBets.length, color: '#F5F5FA', loading: betsLoading },
          { label: 'AI queries', value: tier === 'pro' || tier === 'elite' ? 'Unlimited' : '0 / 5', color: tier === 'pro' || tier === 'elite' ? '#22c55e' : '#94A3B8', loading: false },
          { label: "Month P&L", value: fmtPnl(monthPnl), color: pnlColor(monthPnl), loading: tradesLoading },
        ].map(({ label, value, color, loading }) => (
          <div key={label} style={{ ...card, background: 'linear-gradient(180deg, rgba(79,142,247,0.05) 0%, transparent 100%)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 8 }}>{label}</div>
            {loading ? <div style={{ height: 28, borderRadius: 6, background: '#1e2a4a', animation: 'pulse 1.5s infinite' }} /> : <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>}
          </div>
        ))}
      </div>

      {/* Today's Edge */}
      <section>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#f0f4ff' }}>Today's Edge</h2>
          <p style={{ fontSize: 13, color: '#2a3a5a', marginTop: 4 }}>Your best opportunities right now</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {/* AI Top Market */}
          <div style={{ ...card, borderLeft: '3px solid #4f8ef7', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#4f8ef7' }}>Top Market</span>
              <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 10, background: 'rgba(79,142,247,0.1)', color: '#4f8ef7' }}>AI Pick</span>
            </div>
            {topMarketLoading ? (
              <><div style={{ height: 14, width: '90%', borderRadius: 6, background: '#1e2a4a', animation: 'pulse 1.5s infinite' }} /><div style={{ height: 28, width: '40%', borderRadius: 6, background: '#1e2a4a', animation: 'pulse 1.5s infinite' }} /><div style={{ height: 10, width: '70%', borderRadius: 4, background: '#1e2a4a', animation: 'pulse 1.5s infinite' }} /></>
            ) : topMarket ? (
              <>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#F5F5FA', margin: 0, lineHeight: 1.4 }}>{topMarket.title}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span style={{ fontSize: 22, fontWeight: 900, color: '#f59e0b' }}>{topMarket.currentYes}%</span>
                  <span style={{ fontSize: 11, color: '#4a5a7a' }}>YES now</span>
                  <span style={{ fontSize: 11, color: '#4a5a7a' }}>→</span>
                  <span style={{ fontSize: 22, fontWeight: 900, color: '#22c55e' }}>{topMarket.yourEstimate}%</span>
                  <span style={{ fontSize: 11, color: '#4a5a7a' }}>true prob</span>
                </div>
                {topMarket.edge != null && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: topMarket.edge > 0 ? '#22c55e' : '#ef4444' }}>
                    {topMarket.edge > 0 ? '+' : ''}{topMarket.edge}% edge
                  </div>
                )}
                <p style={{ fontSize: 11, color: '#6a7a9a', margin: 0, lineHeight: 1.5 }}>{topMarket.reasoning}</p>
              </>
            ) : (
              <>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#F5F5FA', margin: 0, lineHeight: 1.4 }}>{markets[0]?.title || 'Loading markets...'}</p>
                {markets[0] && <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ fontSize: 22, fontWeight: 900, color: markets[0].yes > 60 ? '#22c55e' : '#f59e0b' }}>{markets[0].yes}%</span><span style={{ fontSize: 11, color: '#4a5a7a' }}>YES</span></div>}
              </>
            )}
          </div>

          {/* Trading Setup — unchanged */}
          <div style={{ ...card, borderLeft: '3px solid #22c55e', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#22c55e' }}>Trading Setup</span>
            {(() => {
              const saved = JSON.parse(localStorage.getItem('premarket_levels') || '{}');
              if (saved.bias && saved.date === new Date().toDateString()) {
                const biasColor = saved.bias === 'LONG' ? '#22c55e' : saved.bias === 'SHORT' ? '#ef4444' : '#f59e0b';
                return (<><div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ fontSize: 24, fontWeight: 900, color: biasColor }}>{saved.bias}</span><span style={{ fontSize: 12, color: '#475569' }}>bias today</span></div>{saved.thesis && <p style={{ fontSize: 12, color: '#6a7a9a', margin: 0 }}>{saved.thesis}</p>}</>);
              }
              return (<><p style={{ fontSize: 14, color: '#475569', margin: 0 }}>No bias set for today</p><button onClick={() => goTab('Day Trading')} style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#4ade80', cursor: 'pointer', fontWeight: 600, textAlign: 'center' }}>Set your bias in Pre-Market →</button></>);
            })()}
          </div>

          {/* AI Sharp Bet */}
          <div style={{ ...card, borderLeft: '3px solid #f59e0b', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#f59e0b' }}>Sharp Bet</span>
              <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 10, background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>AI Pick</span>
            </div>
            {sharpBetLoading ? (
              <><div style={{ height: 14, width: '80%', borderRadius: 6, background: '#1e2a4a', animation: 'pulse 1.5s infinite' }} /><div style={{ height: 20, width: '60%', borderRadius: 6, background: '#1e2a4a', animation: 'pulse 1.5s infinite' }} /><div style={{ height: 10, width: '70%', borderRadius: 4, background: '#1e2a4a', animation: 'pulse 1.5s infinite' }} /></>
            ) : sharpBet ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>{sharpBet.sport}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#F5F5FA' }}>{sharpBet.teams}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#f0f4ff' }}>{sharpBet.betType} {sharpBet.line}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: String(sharpBet.odds).startsWith('+') || parseInt(sharpBet.odds) > 0 ? '#22c55e' : '#ef4444' }}>{sharpBet.odds}</span>
                </div>
                {sharpBet.confidence && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: sharpBet.confidence === 'High' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)', color: sharpBet.confidence === 'High' ? '#22c55e' : '#f59e0b' }}>{sharpBet.confidence} confidence</span>}
                <p style={{ fontSize: 11, color: '#6a7a9a', margin: 0, lineHeight: 1.5 }}>{sharpBet.reasoning}</p>
              </>
            ) : (
              <p style={{ fontSize: 13, color: '#475569' }}>No sharp picks available today</p>
            )}
          </div>
        </div>
      </section>

      {/* Live Markets */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Live prediction markets</h2>
          <button onClick={() => goTab('Polymarket')} style={{ fontSize: 13, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer' }}>View all markets →</button>
        </div>
        {marketsLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} style={{ ...card, height: 120, animation: 'pulse 1.5s infinite' }} />)}
          </div>
        ) : markets.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: '#475569', padding: 32 }}>Could not load markets</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {markets.map((m, i) => {
              const pct = m.yes ?? 50;
              const fill = pct > 60 ? '#22c55e' : pct > 40 ? '#f59e0b' : '#ef4444';
              return (
                <div key={`${m.id}-${i}`} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12, transition: 'all 0.2s ease', cursor: 'default' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: '#1e2a4a', color: '#94A3B8' }}>{m.cat || 'Market'}</span>
                    <span style={{ fontSize: 11, color: '#475569' }}>Vol {m.volume >= 1e6 ? '$' + (m.volume / 1e6).toFixed(1) + 'M' : m.volume >= 1e3 ? '$' + (m.volume / 1e3).toFixed(0) + 'k' : '$' + (m.volume || 0)}</span>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#F5F5FA', margin: 0, lineHeight: 1.4, flex: 1 }}>{m.title}</p>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: '#64748b' }}>YES</span>
                      <span style={{ fontSize: 22, fontWeight: 900, color: fill }}>{pct}%</span>
                      <span style={{ fontSize: 11, color: '#64748b' }}>NO {m.no ?? 100 - pct}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 4, background: '#1e2a4a', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 4, background: fill, width: pct + '%' }} />
                    </div>
                  </div>
                  <button onClick={() => goTab('AI Research')} style={{ background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.25)', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#60a5fa', cursor: 'pointer', fontWeight: 600, textAlign: 'center' }}>Analyze ↗</button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Market Overview */}
      <section>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, marginBottom: 14 }}>Market Overview</h2>
        <TradingViewMarketOverview />
      </section>

      {/* Sharpr Score */}
      <section>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, marginBottom: 14 }}>Your Sharpr Score</h2>
        {(() => {
          const allSettled = [...trades.filter(t => t.status !== 'open'), ...bets.filter(b => b.result !== 'pending')];
          if (allSettled.length === 0) return (<div style={{ ...card, textAlign: 'center', padding: 32 }}><div style={{ fontSize: 48, fontWeight: 900, color: '#1e2a4a', marginBottom: 8 }}>--</div><div style={{ fontSize: 13, color: '#475569' }}>Log trades and bets to calculate your score</div></div>);
          const totalWins = trades.filter(t => t.status === 'win').length + bets.filter(b => b.result === 'win').length;
          const wr = allSettled.length ? totalWins / allSettled.length : 0;
          const wrPts = Math.min(40, Math.round(wr / 0.55 * 40));
          const totalPnlAll = allSettled.reduce((s, x) => s + (x.pnl || 0), 0);
          const totalRisk = allSettled.reduce((s, x) => s + (x.stake || Math.abs(x.entry * x.qty) || 100), 0);
          const roiPts = Math.max(0, Math.min(30, Math.round(((totalRisk > 0 ? totalPnlAll / totalRisk : 0) + 0.1) / 0.3 * 30)));
          const discPts = Math.min(30, Math.round(Math.min(allSettled.length, 20) / 20 * 30));
          const score = Math.max(0, Math.min(100, wrPts + roiPts + discPts));
          const scoreColor = score >= 71 ? '#22c55e' : score >= 41 ? '#f59e0b' : '#ef4444';
          const scoreLabel = score >= 85 ? 'Elite' : score >= 71 ? 'Sharp money' : score >= 41 ? 'Finding your edge' : 'Keep grinding';
          return (<div style={{ ...card, display: 'flex', alignItems: 'center', gap: 24 }}><div style={{ textAlign: 'center', minWidth: 100 }}><div style={{ fontSize: 48, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{score}</div><div style={{ fontSize: 11, color: '#475569', marginTop: 6 }}>/ 100</div></div><div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 700, color: '#F5F5FA', marginBottom: 6 }}>{scoreLabel}</div><div style={{ height: 8, borderRadius: 4, background: '#1e2a4a', overflow: 'hidden', marginBottom: 10 }}><div style={{ height: '100%', borderRadius: 4, background: scoreColor, width: score + '%', transition: 'width 0.8s ease' }} /></div><div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#475569' }}><span>Win rate: {wrPts}/40</span><span>ROI: {roiPts}/30</span><span>Discipline: {discPts}/30</span></div></div></div>);
        })()}
      </section>

      {/* Quick Actions */}
      <section>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Quick actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
          {ACTIONS.map(({ label, icon, color, tab }) => (
            <button key={label} onClick={() => goTab(tab)}
              style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', border: '1px solid #1e2a4a', textAlign: 'left', transition: 'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = color}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#1e2a4a'}>
              <div style={{ width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, background: color + '20', flexShrink: 0 }}>{icon}</div>
              <div><div style={{ fontSize: 13, fontWeight: 600, color: '#F5F5FA' }}>{label}</div><div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Open tab</div></div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
