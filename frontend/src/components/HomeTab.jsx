import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../lib/api';
import TradingViewMarketOverview from './TradingViewMarketOverview';
import { Line } from 'react-chartjs-2';
import PerformanceInsights from './PerformanceInsights';

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
  const d = new Date(dateStr), n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

function isThisMonth(dateStr) {
  const d = new Date(dateStr), n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
}

function fmtPnl(n, prefix = '$') {
  if (n == null || isNaN(n)) return `${prefix}0.00`;
  return (n >= 0 ? '+' : '-') + prefix + Math.abs(n).toFixed(2);
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const card = { background: '#0f1729', border: '1px solid #1e2a4a', borderRadius: '16px', padding: '20px' };
const pnlColor = (n) => n == null ? '#94A3B8' : n >= 0 ? '#22c55e' : '#ef4444';

export default function HomeTab({ onSwitchTab }) {
  const { user, tier, username } = useAuth();
  const [trades, setTrades] = useState([]);
  const [bets, setBets] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [games, setGames] = useState([]);
  const [tradesLoading, setTradesLoading] = useState(true);
  const [betsLoading, setBetsLoading] = useState(true);
  const [marketsLoading, setMarketsLoading] = useState(true);
  const [gamesLoading, setGamesLoading] = useState(true);

  useEffect(() => {
    api.get('/api/trades').then(r => setTrades(r.data || [])).catch(() => {}).finally(() => setTradesLoading(false));
    api.get('/api/bets').then(r => setBets(r.data || [])).catch(() => {}).finally(() => setBetsLoading(false));
    api.get('/api/markets/polymarket?offset=0').then(r => setMarkets((r.data.markets || []).slice(0, 8))).catch(() => {}).finally(() => setMarketsLoading(false));
    api.get('/api/odds/games?sport=nba').then(r => setGames(r.data?.games || [])).catch(() => setGames([])).finally(() => setGamesLoading(false));
  }, []);

  const todayTrades = useMemo(() => trades.filter(t => isToday(t.created_at)), [trades]);
  const monthTrades = useMemo(() => trades.filter(t => isThisMonth(t.created_at)), [trades]);
  const todayBets = useMemo(() => bets.filter(b => isToday(b.created_at)), [bets]);
  const todayPnl = useMemo(() => todayTrades.filter(t => t.status !== 'open').reduce((s, t) => s + (t.pnl || 0), 0), [todayTrades]);
  const monthPnl = useMemo(() => monthTrades.filter(t => t.status !== 'open').reduce((s, t) => s + (t.pnl || 0), 0), [monthTrades]);

  // Sharpr Score — calculated from existing trades/bets data
  const sharprScore = useMemo(() => {
    const settled = [...trades.filter(t => t.status !== 'open'), ...bets.filter(b => b.result !== 'pending')];
    if (settled.length === 0) return null;
    const wins = settled.filter(r => r.status === 'win' || r.result === 'win' || (r.pnl > 0)).length;
    const winRate = wins / settled.length;
    const totalPnl = settled.reduce((s, r) => s + (r.pnl || 0), 0);
    const totalStake = settled.reduce((s, r) => s + (r.stake || Math.abs((r.entry || 0) * (r.qty || 1)) || 100), 0);
    const roi = totalStake > 0 ? totalPnl / totalStake : 0;
    const roiScore = Math.min(1, Math.max(0, (roi + 0.5) / 1));
    const activityScore = Math.min(1, settled.length / 50);
    return Math.min(100, Math.max(0, Math.round(winRate * 50 + roiScore * 30 + activityScore * 20)));
  }, [trades, bets]);

  const scoreColor = sharprScore == null ? '#2a3a5a' : sharprScore >= 75 ? '#22c55e' : sharprScore >= 50 ? '#f59e0b' : '#ef4444';
  const scoreLabel = sharprScore == null ? '' : sharprScore >= 75 ? 'Sharp edge' : sharprScore >= 50 ? 'Building consistency' : 'Focus on discipline';

  // Exclude junk markets (weather, obscure, low volume)
  const JUNK_RE = /weather|temperature|rain|snow|hurricane|tornado|celsius|fahrenheit/i;
  const qualityMarkets = useMemo(() =>
    markets.filter(m => (m.volume || 0) >= 10000 && !JUNK_RE.test(m.title || ''))
      .sort((a, b) => (b.volume || 0) - (a.volume || 0)),
  [markets]);

  // Pick top market: min $50K volume, Sports or Finance preferred
  const topMarket = useMemo(() => {
    const premium = qualityMarkets.filter(m => (m.volume || 0) >= 50000);
    if (!premium.length) return null;
    // Prefer Sports/Finance, then sort by volume
    const preferred = premium.filter(m => /sports|finance|economics|crypto/i.test(m.cat || ''));
    return (preferred.length ? preferred : premium)[0];
  }, [qualityMarkets]);

  // Pick best value underdog (+150 to +600, fallback to any underdog)
  const valuePick = useMemo(() => {
    let underdogs = games.filter(g => {
      const ml = Math.max(g.awayML || 0, g.homeML || 0);
      return ml >= 150 && ml <= 600;
    }).sort((a, b) => {
      const aML = Math.max(a.awayML || 0, a.homeML || 0);
      const bML = Math.max(b.awayML || 0, b.homeML || 0);
      return bML - aML;
    });
    // Fallback: any game with a positive ML
    if (!underdogs.length) {
      underdogs = games.filter(g => Math.max(g.awayML || 0, g.homeML || 0) > 100).sort((a, b) => Math.max(b.awayML || 0, b.homeML || 0) - Math.max(a.awayML || 0, a.homeML || 0));
    }
    if (!underdogs.length) return null;
    const g = underdogs[0];
    const isAway = (g.awayML || 0) > (g.homeML || 0);
    return { ...g, pickTeam: isAway ? g.awayTeam : g.homeTeam, pickML: isAway ? g.awayML : g.homeML };
  }, [games]);

  // Performance chart data
  const [perfView, setPerfView] = useState('combined');
  const perfData = useMemo(() => {
    const settledBets = bets.filter(b => b.result === 'win' || b.result === 'loss').map(b => ({ date: b.created_at, pnl: b.pnl || 0, type: 'bet' }));
    const settledTrades = trades.filter(t => t.status === 'win' || t.status === 'loss').map(t => ({ date: t.created_at, pnl: t.pnl || 0, type: 'trade' }));
    const all = [...settledBets, ...settledTrades].sort((a, b) => new Date(a.date) - new Date(b.date));
    const filtered = perfView === 'betting' ? settledBets.sort((a, b) => new Date(a.date) - new Date(b.date)) : perfView === 'trading' ? settledTrades.sort((a, b) => new Date(a.date) - new Date(b.date)) : all;
    if (filtered.length === 0) return null;

    let cum = 0;
    const points = filtered.map(r => { cum += r.pnl; return { date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), total: Math.round(cum * 100) / 100 }; });
    // Dedupe by date (sum same-day entries)
    const byDate = {};
    points.forEach(p => { byDate[p.date] = p.total; });
    const labels = Object.keys(byDate);
    const data = Object.values(byDate);
    const totalPnl = data[data.length - 1] || 0;
    const color = totalPnl >= 0 ? '#22c55e' : '#ef4444';

    // Stats
    const wins = filtered.filter(r => r.pnl > 0).length;
    const winRate = filtered.length ? Math.round(wins / filtered.length * 100) : 0;
    const dailyPnl = {};
    filtered.forEach(r => {
      const d = new Date(r.date).toDateString();
      dailyPnl[d] = (dailyPnl[d] || 0) + r.pnl;
    });
    const days = Object.values(dailyPnl);
    const bestDay = days.length ? Math.max(...days) : 0;
    const worstDay = days.length ? Math.min(...days) : 0;
    let streak = 0, streakType = '';
    for (let i = filtered.length - 1; i >= 0; i--) {
      const w = filtered[i].pnl > 0;
      if (i === filtered.length - 1) { streakType = w ? 'W' : 'L'; streak = 1; }
      else if ((w && streakType === 'W') || (!w && streakType === 'L')) streak++;
      else break;
    }

    return { labels, data, color, totalPnl, winRate, total: filtered.length, bestDay, worstDay, streak, streakType };
  }, [bets, trades, perfView]);

  const displayName = username ? `@${username}` : firstName(user?.email);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  function goTab(tab) { onSwitchTab(tab); }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* SECTION 1 — Header */}
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: '#f0f4ff' }}>
          {greeting()}, <span style={{ color: '#4f8ef7' }}>{displayName}</span>
        </h1>
        <p style={{ fontSize: 14, color: '#4a5a7a', marginTop: 4 }}>{today}</p>
      </div>

      {/* SECTION 2 — Stat cards */}
      <div className="grid-responsive-4">
        {[
          { label: "Today's P&L", value: fmtPnl(todayPnl), color: pnlColor(todayPnl), loading: tradesLoading },
          { label: 'Bets today', value: todayBets.length, color: '#F5F5FA', loading: betsLoading },
          { label: 'AI queries', value: tier === 'pro' || tier === 'elite' ? 'Unlimited' : '0 / 5', color: tier === 'pro' || tier === 'elite' ? '#4f8ef7' : '#94A3B8', loading: false },
          { label: "Month P&L", value: fmtPnl(monthPnl), color: pnlColor(monthPnl), loading: tradesLoading },
        ].map(({ label, value, color, loading }) => (
          <div key={label} style={{ ...card, background: 'linear-gradient(180deg, rgba(79,142,247,0.05) 0%, transparent 100%)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#2a3a5a', marginBottom: 8 }}>{label}</div>
            {loading ? <div style={{ height: 28, borderRadius: 6, background: '#1e2a4a', animation: 'pulse 1.5s infinite' }} /> : <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>}
          </div>
        ))}
      </div>

      {/* Sharpr Score */}
      {(tier === 'pro' || tier === 'elite') ? (
        <div style={{ ...card, background: 'rgba(79,142,247,0.05)', border: '1px solid rgba(79,142,247,0.15)', display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ textAlign: 'center', minWidth: 80 }}>
            <div style={{ fontSize: 48, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{sharprScore ?? '--'}</div>
            <div style={{ fontSize: 10, color: '#4a5a7a', marginTop: 4 }}>/ 100</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2px', color: '#4f8ef7', textTransform: 'uppercase', marginBottom: 6 }}>Sharpr Score</div>
            <div style={{ height: 6, borderRadius: 3, background: '#1e2a4a', overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ height: '100%', borderRadius: 3, background: scoreColor, width: (sharprScore ?? 0) + '%', transition: 'width 0.8s ease' }} />
            </div>
            <div style={{ fontSize: 12, color: '#6a7a9a' }}>{sharprScore != null ? scoreLabel : 'Log trades and bets to calculate'}</div>
          </div>
        </div>
      ) : (
        <div style={{ ...card, background: 'rgba(79,142,247,0.04)', border: '1px solid rgba(79,142,247,0.12)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, filter: 'blur(3px)', pointerEvents: 'none' }}>
            <div style={{ fontSize: 48, fontWeight: 900, color: 'rgba(79,142,247,0.15)', lineHeight: 1 }}>72</div>
            <div><div style={{ fontSize: 11, fontWeight: 700, color: '#4f8ef7', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 4 }}>Sharpr Score</div><div style={{ height: 6, borderRadius: 3, background: '#1e2a4a', width: 200 }}><div style={{ height: '100%', borderRadius: 3, background: '#4f8ef7', width: '72%' }} /></div></div>
          </div>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(3,3,10,0.6)', backdropFilter: 'blur(4px)', borderRadius: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, marginBottom: 4 }}>🔒</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#f0f4ff', marginBottom: 2 }}>Sharpr Score</div>
              <div style={{ fontSize: 10, color: '#4a5a7a' }}>Upgrade to Pro</div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3 — Today's Edge */}
      <section>
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#f0f4ff' }}>Today's Edge</h2>
          <p style={{ fontSize: 12, color: '#2a3a5a', marginTop: 2 }}>Your best opportunities right now</p>
        </div>
        <div className="grid-responsive-3">

          {/* Top Market */}
          <div style={{ ...card, borderLeft: '3px solid #4f8ef7', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4f8ef7' }}>Top Market</span>
            {marketsLoading ? (
              <><div style={{ height: 14, width: '80%', borderRadius: 6, background: '#1e2a4a', animation: 'pulse 1.5s infinite' }} /><div style={{ height: 24, width: '40%', borderRadius: 6, background: '#1e2a4a', animation: 'pulse 1.5s infinite' }} /></>
            ) : topMarket ? (
              <>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#F5F5FA', margin: 0, lineHeight: 1.4 }}>{topMarket.title}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 24, fontWeight: 900, color: topMarket.yes > 60 ? '#22c55e' : topMarket.yes > 40 ? '#f59e0b' : '#ef4444' }}>{topMarket.yes}%</span>
                  <span style={{ fontSize: 11, color: '#4a5a7a' }}>YES</span>
                </div>
                <button onClick={() => goTab('Polymarket')} style={{ background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: 8, padding: '5px 12px', fontSize: 11, color: '#7aaff8', cursor: 'pointer', fontWeight: 600 }}>View market →</button>
              </>
            ) : <p style={{ fontSize: 12, color: '#2a3a5a' }}>No high-value markets right now — check back soon</p>}
          </div>

          {/* Trading Setup */}
          <div style={{ ...card, borderLeft: '3px solid #22c55e', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#22c55e' }}>Trading Setup</span>
            {(() => {
              const saved = JSON.parse(localStorage.getItem('premarket_levels') || '{}');
              if (saved.bias && saved.date === new Date().toDateString()) {
                const bc = saved.bias === 'LONG' ? '#22c55e' : saved.bias === 'SHORT' ? '#ef4444' : '#f59e0b';
                return (<>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ fontSize: 24, fontWeight: 900, color: bc }}>{saved.bias}</span><span style={{ fontSize: 11, color: '#4a5a7a' }}>bias today</span></div>
                  {saved.thesis && <p style={{ fontSize: 11, color: '#6a7a9a', margin: 0 }}>{saved.thesis}</p>}
                </>);
              }
              return (<>
                <p style={{ fontSize: 12, color: '#4a5a7a', margin: 0 }}>No bias set for today</p>
                <button onClick={() => goTab('dt-premarket')} style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '5px 12px', fontSize: 11, color: '#4ade80', cursor: 'pointer', fontWeight: 600 }}>Set bias in Pre-Market →</button>
              </>);
            })()}
          </div>

          {/* Value Pick */}
          <div style={{ ...card, borderLeft: '3px solid #f59e0b', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#f59e0b' }}>Value Pick</span>
            {gamesLoading ? (
              <><div style={{ height: 14, width: '70%', borderRadius: 6, background: '#1e2a4a', animation: 'pulse 1.5s infinite' }} /><div style={{ height: 20, width: '50%', borderRadius: 6, background: '#1e2a4a', animation: 'pulse 1.5s infinite' }} /></>
            ) : valuePick ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 12, background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>NBA</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#F5F5FA' }}>{valuePick.awayTeam} @ {valuePick.homeTeam}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#f0f4ff' }}>{valuePick.pickTeam} ML</span>
                  <span style={{ fontSize: 20, fontWeight: 900, color: '#22c55e' }}>+{valuePick.pickML}</span>
                </div>
                <span style={{ fontSize: 11, color: '#4a5a7a' }}>{fmtDate(valuePick.commenceTime)}</span>
              </>
            ) : <p style={{ fontSize: 12, color: '#2a3a5a' }}>No value picks found today</p>}
          </div>
        </div>
      </section>

      {/* SECTION 4 — Live prediction markets */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#f0f4ff' }}>Live prediction markets</h2>
          <button onClick={() => goTab('Polymarket')} style={{ fontSize: 12, color: '#4f8ef7', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View all markets →</button>
        </div>
        {marketsLoading ? (
          <div className="grid-responsive-4">
            {[1, 2, 3, 4].map(i => <div key={i} style={{ ...card, height: 140, animation: 'pulse 1.5s infinite' }} />)}
          </div>
        ) : (
          <div className="grid-responsive-4">
            {qualityMarkets.filter(m => (m.volume || 0) >= 50000).slice(0, 4).map((m, i) => {
              const pct = m.yes ?? 50;
              const fill = pct > 60 ? '#22c55e' : pct > 40 ? '#f59e0b' : '#ef4444';
              return (
                <div key={`${m.id}-${i}`} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10, transition: 'all 0.2s ease', cursor: 'pointer' }}
                  onClick={() => goTab('Polymarket')}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: '#94A3B8', margin: 0, lineHeight: 1.4, flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{m.title}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 20, fontWeight: 900, color: fill }}>{pct}%</span>
                    <span style={{ fontSize: 10, color: '#2a3a5a' }}>YES</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: '#1e2a4a', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 2, background: fill, width: pct + '%' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 5 — Today's games */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#f0f4ff' }}>Today's games</h2>
          <button onClick={() => goTab('Events')} style={{ fontSize: 12, color: '#4f8ef7', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View odds →</button>
        </div>
        {gamesLoading ? (
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto' }}>
            {[1, 2, 3, 4].map(i => <div key={i} style={{ ...card, minWidth: 220, height: 100, flexShrink: 0, animation: 'pulse 1.5s infinite' }} />)}
          </div>
        ) : games.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: '#2a3a5a', padding: 28 }}>No games scheduled right now</div>
        ) : (
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {games.slice(0, 8).map((g, i) => (
              <div key={g.id || i} onClick={() => goTab('Events')}
                style={{ ...card, minWidth: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, cursor: 'pointer', transition: 'all 0.2s ease' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 12, background: 'rgba(79,142,247,0.1)', color: '#7aaff8' }}>NBA</span>
                  <span style={{ fontSize: 10, color: '#2a3a5a' }}>{fmtDate(g.commenceTime)}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#F5F5FA' }}>{g.awayTeam} @ {g.homeTeam}</div>
                <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                  <span style={{ color: (g.awayML || 0) > 0 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>{g.awayML > 0 ? '+' : ''}{g.awayML || '--'}</span>
                  <span style={{ color: '#1e2a4a' }}>|</span>
                  <span style={{ color: (g.homeML || 0) > 0 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>{g.homeML > 0 ? '+' : ''}{g.homeML || '--'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 6 — Performance */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#f0f4ff' }}>Performance</h2>
          <div style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 10, background: '#0a0f1e' }}>
            {[{ k: 'combined', l: 'All' }, { k: 'betting', l: 'Betting' }, { k: 'trading', l: 'Trading' }].map(v => (
              <button key={v.k} onClick={() => setPerfView(v.k)}
                style={{ padding: '4px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', background: perfView === v.k ? '#2563EB' : 'transparent', color: perfView === v.k ? '#fff' : '#4a5a7a' }}>
                {v.l}
              </button>
            ))}
          </div>
        </div>

        {!perfData ? (
          <div style={{ ...card, padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#4a5a7a' }}>Start logging bets and trades to see your performance</div>
          </div>
        ) : (
          <>
            {/* Stats bar */}
            <div className="grid-responsive-4" style={{ marginBottom: 14 }}>
              {[
                { l: 'Total P&L', v: (perfData.totalPnl >= 0 ? '+$' : '-$') + Math.abs(perfData.totalPnl).toFixed(2), c: perfData.totalPnl >= 0 ? '#22c55e' : '#ef4444' },
                { l: 'Win Rate', v: perfData.winRate + '%', c: '#F5F5FA' },
                { l: 'Best / Worst Day', v: '+$' + perfData.bestDay.toFixed(0) + ' / -$' + Math.abs(perfData.worstDay).toFixed(0), c: '#F5F5FA' },
                { l: 'Streak', v: perfData.streakType + perfData.streak, c: perfData.streakType === 'W' ? '#22c55e' : '#ef4444' },
              ].map(s => (
                <div key={s.l} style={{ ...card, padding: '12px 16px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#2a3a5a', marginBottom: 4 }}>{s.l}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: s.c }}>{s.v}</div>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div style={{ ...card, padding: 16 }}>
              <div style={{ height: 200 }}>
                <Line
                  data={{
                    labels: perfData.labels,
                    datasets: [{
                      data: perfData.data,
                      borderColor: perfData.color,
                      backgroundColor: perfData.color + '14',
                      fill: true, tension: 0.3, pointRadius: 3, pointBackgroundColor: perfData.color, borderWidth: 2,
                    }],
                  }}
                  options={{
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => '$' + ctx.parsed.y.toFixed(2) } } },
                    scales: {
                      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#2a3a5a', font: { size: 10 }, maxTicksLimit: 8 } },
                      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#2a3a5a', font: { size: 10 }, callback: v => '$' + v } },
                    },
                  }}
                />
              </div>
              <div style={{ textAlign: 'center', fontSize: 11, color: '#1a2535', marginTop: 8 }}>
                Cumulative P&L · {perfData.total} {perfView === 'betting' ? 'bets' : perfView === 'trading' ? 'trades' : 'entries'}
              </div>
            </div>
          </>
        )}
      </section>

      {/* SECTION 7 — Performance Insights */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#f0f4ff' }}>Your Edge Insights</h2>
        </div>
        <PerformanceInsights />
      </section>
    </div>
  );
}
