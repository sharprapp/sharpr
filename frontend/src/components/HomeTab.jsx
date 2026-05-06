import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../lib/api';

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

function fmtPnl(n, prefix = '$') {
  if (n == null || isNaN(n)) return `${prefix}0.00`;
  return (n >= 0 ? '+' : '-') + prefix + Math.abs(n).toFixed(2);
}

function isToday(dateStr) {
  const d = new Date(dateStr), n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

function isThisMonth(dateStr) {
  const d = new Date(dateStr), n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
}

export default function HomeTab({ onSwitchTab }) {
  const { user, tier, username, displayName: authDisplayName } = useAuth();
  const [trades, setTrades] = useState([]);
  const [bets, setBets] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [signalCount, setSignalCount] = useState(null); // null = loading, 0 = loaded with none
  const [displaySignal, setDisplaySignal] = useState(0);
  const [typedName, setTypedName] = useState('');

  // Use display_name from profile first, then username, then 'Trader'
  const displayName = authDisplayName
    ? authDisplayName.split(' ')[0]
    : username || 'Trader';

  useEffect(() => {
    // Sharp Signals count-up
    let start = 0;
    const end = signalCount || 0;
    if (end === 0) { setDisplaySignal(0); return; }
    const duration = 1500;
    const frameRate = 1000 / 60;
    const totalFrames = duration / frameRate;
    const increment = end / totalFrames;
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplaySignal(end);
        clearInterval(timer);
      } else {
        setDisplaySignal(Math.floor(start));
      }
    }, frameRate);
    return () => clearInterval(timer);
  }, [signalCount]);

  useEffect(() => {
    // Typewriter effect
    const fullText = displayName.toUpperCase();
    let i = 0;
    setTypedName('');
    const timer = setInterval(() => {
      i++;
      setTypedName(fullText.slice(0, i));
      if (i >= fullText.length) clearInterval(timer);
    }, 50);
    return () => clearInterval(timer);
  }, [displayName]);

  useEffect(() => {
    api.get('/api/sharpsignal/signals').then(r => {
      const signals = r.data?.signals || r.data || [];
      setSignalCount(Array.isArray(signals) ? signals.length : 0);
    }).catch(() => setSignalCount(0));

    Promise.all([
      api.get('/api/trades').then(r => setTrades(r.data || [])),
      api.get('/api/bets').then(r => setBets(r.data || [])),
      api.get('/api/markets/polymarket?offset=0').then(r => setMarkets((r.data.markets || []).slice(0, 12))),
      api.get('/api/odds/games?sport=nba').then(r => setGames(r.data?.games || [])),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const todayTrades = useMemo(() => trades.filter(t => isToday(t.created_at)), [trades]);
  const monthTrades = useMemo(() => trades.filter(t => isThisMonth(t.created_at)), [trades]);
  const todayBets = useMemo(() => bets.filter(b => isToday(b.created_at)), [bets]);
  const todayPnl = useMemo(() => todayTrades.filter(t => t.status !== 'open').reduce((s, t) => s + (t.pnl || 0), 0), [todayTrades]);
  const monthPnl = useMemo(() => monthTrades.filter(t => t.status !== 'open').reduce((s, t) => s + (t.pnl || 0), 0), [monthTrades]);

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

  const qualityMarkets = useMemo(() => 
    markets.filter(m => (m.volume || 0) >= 10000).sort((a,b) => (b.volume||0) - (a.volume||0)), 
  [markets]);

  const topMarket = useMemo(() => {
    return qualityMarkets.find(m => (m.yes ?? 50) > 20 && (m.yes ?? 50) < 80) || qualityMarkets[0];
  }, [qualityMarkets]);

  const valuePick = useMemo(() => {
    const g = games.find(g => Math.max(g.awayML || 0, g.homeML || 0) > 150);
    if (!g) return null;
    const isAway = (g.awayML || 0) > (g.homeML || 0);
    return { ...g, pickTeam: isAway ? g.awayTeam : g.homeTeam, pickML: isAway ? g.awayML : g.homeML };
  }, [games]);

  // displayName moved to top

  return (
    <div className="flex flex-col gap-10">
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes drift1 { 0% { transform: translate(0, 0); } 50% { transform: translate(40px, 30px); } 100% { transform: translate(0, 0); } }
        @keyframes drift2 { 0% { transform: translate(0, 0); } 50% { transform: translate(-30px, -40px); } 100% { transform: translate(0, 0); } }
        .fade-in-up { animation: fadeInUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; opacity: 0; }
        .orb-1 { width: 240px; height: 240px; border-radius: 50%; background: radial-gradient(circle, rgba(108,99,255,0.18) 0%, transparent 70%); filter: blur(40px); position: absolute; top: -100px; left: -60px; animation: drift1 20s infinite ease-in-out; z-index: 0; }
        .orb-2 { width: 180px; height: 180px; border-radius: 50%; background: radial-gradient(circle, rgba(0,229,180,0.12) 0%, transparent 70%); filter: blur(30px); position: absolute; bottom: -60px; right: 15%; animation: drift2 25s infinite ease-in-out; z-index: 0; }
        .hero-banner { background: #050508; border: 1px solid rgba(255,255,255,0.06); position: relative; overflow: hidden; }
        .glass-card { background: rgba(17, 17, 32, 0.6); backdrop-filter: blur(20px); border: 1px solid rgba(108, 99, 255, 0.2); transition: all 0.3s ease; }
        .glass-card:hover { transform: translateY(-5px); border-color: rgba(108, 99, 255, 0.5); box-shadow: 0 0 30px rgba(108, 99, 255, 0.15); }
      `}</style>

      {/* HERO BANNER */}
      <div className="hero-banner rounded-[32px] p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-10 fade-in-up" 
        style={{ animationDelay: '0.1s' }}>
        
        <div className="orb-1" />
        <div className="orb-2" />

        <div className="flex-1 relative z-10">
          <h1 className="text-4xl md:text-5xl font-black text-[#F0F0FF] tracking-tighter mb-4 leading-none">
            {greeting().toUpperCase()},<br/> 
            <span className="text-[#F0F0FF]">{typedName}</span>
          </h1>
          <p className="text-[rgba(240,240,255,0.5)] font-bold uppercase tracking-[0.2em] text-xs mb-4">Your signals are live.</p>
          <button onClick={() => onSwitchTab('Signals')}
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#6C63FF] border border-[#6C63FF]/40 px-4 py-2 rounded-full hover:bg-[#6C63FF]/10 transition-all w-fit">
            View Sharp Signals ↗
          </button>
        </div>
        <div className="flex flex-col items-center md:items-end gap-2 relative z-10 cursor-pointer" onClick={() => onSwitchTab('Signals')}>
          {signalCount === null ? (
            <div className="text-3xl font-black text-[#6B6B8A] tabular-nums">—</div>
          ) : signalCount === 0 ? (
            <div className="text-center">
              <div className="text-xs font-black text-[#6B6B8A] uppercase tracking-widest mb-1">Scanning markets...</div>
              <div className="text-[10px] text-[#4E4E63]">Check back in a moment</div>
            </div>
          ) : (
            <div className="text-7xl font-black text-[#00E5B4] tabular-nums drop-shadow-[0_0_20px_rgba(0,229,180,0.2)]">
              {displaySignal}
            </div>
          )}
          {signalCount !== null && signalCount > 0 && (
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#6B6B8A] bg-white/5 px-4 py-1 rounded-full border border-white/5">
              Sharp Signals Live
            </div>
          )}
        </div>
      </div>

      {/* 2-COLUMN GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Col: Core Stats */}
        <div className="flex flex-col gap-6">
          <div className="glass-card rounded-3xl p-8 fade-in-up" style={{ animationDelay: '0.2s' }}>
            <h3 className="text-[10px] font-black text-[#6C63FF] uppercase tracking-[0.3em] mb-8">Performance Snapshot</h3>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="text-[9px] font-bold text-[#6B6B8A] uppercase mb-1">Today's P&L</div>
                <div className="text-2xl font-black tracking-tight" style={{ color: todayPnl >= 0 ? '#00E5B4' : '#FF4560' }}>{fmtPnl(todayPnl)}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold text-[#6B6B8A] uppercase mb-1">Win Rate</div>
                <div className="text-2xl font-black text-[#F0F0FF]">{sharprScore ? Math.round(sharprScore * 0.75 + 15) : '--'}%</div>
              </div>
              <div>
                <div className="text-[9px] font-bold text-[#6B6B8A] uppercase mb-1">Bets Logged</div>
                <div className="text-2xl font-black text-[#6C63FF]">{todayBets.length}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold text-[#6B6B8A] uppercase mb-1">Month P&L</div>
                <div className="text-2xl font-black" style={{ color: monthPnl >= 0 ? '#00E5B4' : '#FF4560' }}>{fmtPnl(monthPnl)}</div>
              </div>
            </div>
          </div>

          {/* Sharpr Score Card */}
          <div className="glass-card rounded-3xl p-8 bg-[#6C63FF]/5 border-[#6C63FF]/30 fade-in-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[10px] font-black text-[#6C63FF] uppercase tracking-[0.3em]">Sharpr Score</h3>
              <span className="text-[8px] font-bold bg-[#6C63FF]/20 text-[#6C63FF] px-2 py-1 rounded uppercase">Live Analytics</span>
            </div>
            {sharprScore === null ? (
              <div>
                <p className="text-xs text-[#6B6B8A] mb-3">Log your first trade or bet to see your score.</p>
                <div className="flex gap-3">
                  <button onClick={() => onSwitchTab('dt-journal')} className="text-[10px] font-black uppercase text-[#6C63FF] border border-[#6C63FF]/30 px-3 py-1.5 rounded-lg hover:bg-[#6C63FF]/10 transition-all">+ Trade</button>
                  <button onClick={() => onSwitchTab('sb-journal')} className="text-[10px] font-black uppercase text-[#6C63FF] border border-[#6C63FF]/30 px-3 py-1.5 rounded-lg hover:bg-[#6C63FF]/10 transition-all">+ Bet</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-8">
                <div className="text-6xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-[#6C63FF] to-[#F0F0FF]">{sharprScore}</div>
                <div className="flex-1">
                  <div className="w-full h-1 bg-white/5 rounded-full mb-3 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#6C63FF] to-[#00E5B4] transition-all duration-1000" style={{ width: `${sharprScore}%` }} />
                  </div>
                  <p className="text-[10px] font-bold text-[#6B6B8A] uppercase leading-relaxed">
                    {sharprScore >= 75 ? 'Institutional grade performance detected.' : sharprScore >= 50 ? 'Consistency is building. Keep tight stops.' : 'Discipline is the only edge. Re-evaluate entries.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Live Edge */}
        <div className="flex flex-col gap-6">
          {/* Top Market */}
          <div className="glass-card rounded-3xl p-8 border-[#00E5B4]/30 fade-in-up" style={{ animationDelay: '0.4s' }}>
            <h3 className="text-[10px] font-black text-[#00E5B4] uppercase tracking-[0.3em] mb-6">Predict Edge</h3>
            {loading ? (
              <div className="text-xs text-[#4E4E63]">Loading...</div>
            ) : topMarket ? (
              <div className="group cursor-pointer" onClick={() => onSwitchTab('Polymarket')}>
                <div className="text-sm font-bold text-[#F0F0FF] mb-4 line-clamp-2 leading-relaxed">{topMarket.title}</div>
                <div className="flex items-end gap-3">
                  <div className="text-4xl font-black text-[#00E5B4]">{topMarket.yes}%</div>
                  <div className="text-[10px] font-black text-[#6B6B8A] uppercase mb-1">Probability</div>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs text-[#6B6B8A] mb-3">No high-volume markets found right now.</p>
                <button onClick={() => onSwitchTab('Polymarket')} className="text-[10px] font-black uppercase text-[#00E5B4] border border-[#00E5B4]/30 px-3 py-1.5 rounded-lg hover:bg-[#00E5B4]/10 transition-all">Browse Polymarket →</button>
              </div>
            )}
          </div>

          {/* Underdog Pick */}
          <div className="glass-card rounded-3xl p-8 fade-in-up" style={{ animationDelay: '0.5s' }}>
            <h3 className="text-[10px] font-black text-[#FF4560] uppercase tracking-[0.3em] mb-6">High Value Underdog</h3>
            {loading ? (
              <div className="text-xs text-[#4E4E63]">Loading...</div>
            ) : valuePick ? (
              <div className="flex justify-between items-center group cursor-pointer" onClick={() => onSwitchTab('Events')}>
                <div>
                  <div className="text-[10px] font-black text-[#6B6B8A] uppercase mb-1">{valuePick.awayTeam} @ {valuePick.homeTeam}</div>
                  <div className="text-lg font-black text-[#F0F0FF]">{valuePick.pickTeam}</div>
                </div>
                <div className="text-2xl font-black text-[#00E5B4] bg-[#00E5B4]/10 px-4 py-2 rounded-2xl">+{valuePick.pickML}</div>
              </div>
            ) : (
              <div>
                <p className="text-xs text-[#6B6B8A] mb-3">No live underdog value found right now.</p>
                <button onClick={() => onSwitchTab('Events')} className="text-[10px] font-black uppercase text-[#FF4560] border border-[#FF4560]/30 px-3 py-1.5 rounded-lg hover:bg-[#FF4560]/10 transition-all">Browse Live Odds →</button>
              </div>
            )}
          </div>

          {/* Sharp Signals CTA */}
          <div className="glass-card rounded-3xl p-8 bg-black/40 fade-in-up cursor-pointer hover:border-[#6C63FF]/50 transition-all" style={{ animationDelay: '0.6s' }} onClick={() => onSwitchTab('Signals')}>
            <h3 className="text-[10px] font-black text-[#6C63FF] uppercase tracking-[0.3em] mb-4">Sharp Signals</h3>
            <p className="text-xs text-[#6B6B8A] leading-relaxed mb-6">
              Live mispricings between Polymarket and sportsbook odds. Edge detected when markets diverge.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#6C63FF]">
                {signalCount === null ? 'Scanning...' : signalCount === 0 ? 'No signals right now' : `${signalCount} signals live`}
              </span>
              <span className="text-[#6C63FF] text-lg">↗</span>
            </div>
          </div>
        </div>

      </div>

      {/* CTA SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 fade-in-up" style={{ animationDelay: '0.7s' }}>
        {[
          { l: 'Open Terminal', k: 'dt-journal', ic: '📓' },
          { l: 'Bet Journal', k: 'sb-journal', ic: '📊' },
          { l: 'Market Odds', k: 'Events', ic: '📈' }
        ].map(cta => (
          <button key={cta.k} onClick={() => onSwitchTab(cta.k)}
            className="flex items-center justify-between p-6 rounded-2xl bg-black/20 border border-white/5 hover:border-[#6C63FF] hover:bg-[#6C63FF]/5 transition-all text-left">
            <span className="text-xs font-black text-[#F0F0FF] uppercase tracking-widest">{cta.l}</span>
            <span className="text-xl">{cta.ic}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
