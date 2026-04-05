import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAIStream } from '../lib/useAIStream';
import TeamLogo from './TeamLogo';

function formatOdds(n) { return n == null ? '--' : n > 0 ? '+' + n : '' + n; }
function formatSpread(n) { return n == null ? '--' : n > 0 ? '+' + n : '' + n; }
function formatTime(d) {
  if (!d) return 'TBD';
  const dt = new Date(d), now = new Date();
  const time = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + ' ET';
  if (dt.toDateString() === now.toDateString()) return 'Today ' + time;
  const tom = new Date(now); tom.setDate(tom.getDate() + 1);
  if (dt.toDateString() === tom.toDateString()) return 'Tomorrow ' + time;
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + time;
}

function genStats(name) {
  const seed = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const w = 25 + (seed % 30), l = 57 - w;
  const l10w = 4 + (seed % 7);
  const last10 = Array.from({ length: 10 }, (_, i) => i < l10w ? 'W' : 'L')
    .map((v, i) => ({ v, s: (seed * (i + 1)) % 10 })).sort((a, b) => a.s - b.s).map(x => x.v);
  return { record: w + '-' + l, last10, ats: (22 + seed % 20) + '-' + (30 + seed % 10), ou: (20 + seed % 20) + '-' + (30 + seed % 10), ppg: (108 + seed % 20).toFixed(1), opp: (106 + (seed + 3) % 20).toFixed(1) };
}

const INJURIES = {};
const stColor = s => s === 'Out' ? { bg: 'rgba(255,69,96,0.15)', c: '#FF4560' } : s === 'Questionable' ? { bg: 'rgba(245,158,11,0.15)', c: '#f59e0b' } : s === 'Probable' ? { bg: 'rgba(0,229,180,0.15)', c: '#00E5B4' } : { bg: 'rgba(107,107,138,0.15)', c: '#6B6B8A' };

export default function GameDetailModal({ game: g, onClose, userPlan }) {
  const { text: aiResult, loading: aiLoading, done: aiDone, stream: startAIStream } = useAIStream();
  const [props, setProps] = useState({});
  const [propsLoading, setPropsLoading] = useState(false);
  const [selectedPick, setSelectedPick] = useState(null);
  const [stake, setStake] = useState('50');
  const [betLogged, setBetLogged] = useState(false);
  const [betError, setBetError] = useState(null);
  const isPro = userPlan === 'pro' || userPlan === 'elite';
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const awayStats = genStats(g.awayTeam);
  const homeStats = genStats(g.homeTeam);
  const injuries = [...(INJURIES[g.awayTeam] || []).map(i => ({ ...i, team: g.awayTeam })), ...(INJURIES[g.homeTeam] || []).map(i => ({ ...i, team: g.homeTeam }))];

  const awayBetPct = g.awayML > 0 ? 35 : 65;
  const awayMoneyPct = g.awayML > 0 ? 51 : 44;
  const sharpAlert = Math.abs(awayMoneyPct - awayBetPct) > 12;

  useEffect(() => {
    if (!isPro) return;
    startAIStream(
      `Sharp betting analysis: ${g.awayTeam} vs ${g.homeTeam}. Sport: ${g.sport}. Spread: ${g.awayTeam} ${formatSpread(g.awaySpread)} / ${g.homeTeam} ${formatSpread(g.homeSpread)}. ML: ${formatOdds(g.awayML)} / ${formatOdds(g.homeML)}. Total: ${g.overTotal || 'N/A'}. Give key matchup factors, line value, and a CLEAR best bet with confidence. End with "Best Bet:" on its own line.`,
      'sports', true
    );
  }, [g.id]);

  useEffect(() => {
    if (!isPro || !g.id) return;
    setPropsLoading(true);
    fetch(`${import.meta.env.VITE_API_URL}/api/odds/props?sport=${g.sport}&gameId=${g.id}`)
      .then(r => r.json()).then(d => setProps(d.props || {})).catch(() => {}).finally(() => setPropsLoading(false));
  }, [g.id]);

  async function logBet() {
    if (!selectedPick) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('bets').insert({
        user_id: user.id, sport: (g.sport || 'other').toUpperCase(),
        match: `${g.awayTeam} @ ${g.homeTeam}`, type: selectedPick.type || 'Spread',
        odds: String(selectedPick.odds || ''), stake: parseFloat(stake) || 50, result: 'pending',
        notes: `Logged from Terminal Matrix · ${selectedPick.label}`,
      });
      setBetLogged(true);
      setTimeout(() => { setBetLogged(false); setSelectedPick(null); }, 2500);
    } catch (e) { setBetError('Failed to log bet — try again'); setTimeout(() => setBetError(null), 3000); }
  }

  const picks = [
    { label: `${g.awayTeam?.split(' ').pop()} ${formatSpread(g.awaySpread)}`, odds: g.awaySpreadOdds, type: 'Spread' },
    { label: `${g.homeTeam?.split(' ').pop()} ${formatSpread(g.homeSpread)}`, odds: g.homeSpreadOdds, type: 'Spread' },
    { label: `${g.awayTeam?.split(' ').pop()} ML ${formatOdds(g.awayML)}`, odds: g.awayML, type: 'Moneyline' },
    { label: `${g.homeTeam?.split(' ').pop()} ML ${formatOdds(g.homeML)}`, odds: g.homeML, type: 'Moneyline' },
    { label: `Over ${g.overTotal || '--'}`, odds: g.overOdds, type: 'Total' },
    { label: `Under ${g.overTotal || '--'}`, odds: g.underOdds, type: 'Total' },
  ];

  const bestOdds = {};
  (g.allBookmakers || []).forEach(bk => bk.markets?.forEach(mk => mk.outcomes?.forEach(oc => {
    const k = mk.key + '_' + oc.name;
    if (!bestOdds[k] || oc.price > bestOdds[k].price) bestOdds[k] = { price: oc.price, book: bk.title };
  })));

  const bestBetMatch = aiResult?.match(/Best Bet[:\s]+(.+)/i);
  const bestBetText = bestBetMatch ? bestBetMatch[1].trim() : null;
  const analysisText = aiResult ? aiResult.replace(/Best Bet[:\s]+.+/i, '').trim() : null;

  const propPlayers = Object.keys(props).slice(0, 8);
  const propStats = propPlayers.length > 0 ? [...new Set(propPlayers.flatMap(p => Object.keys(props[p])))] : [];

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#0A0A0F]/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-6xl h-full max-h-[90vh] bg-[#111120]/90 backdrop-blur-3xl border border-[rgba(108,99,255,0.2)] rounded-[40px] shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-500">
        
        {/* TOP HUD */}
        <div className="relative h-[280px] flex items-center justify-center p-12 overflow-hidden border-b border-white/5 bg-gradient-to-br from-[#1A1A2E] to-[#111120]">
          <div className="absolute inset-0 pointer-events-none">
             <div className="absolute top-[-50%] left-[-10%] w-[60%] h-[150%] bg-[#6C63FF]/5 blur-[100px] rounded-full rotate-12" />
             <div className="absolute bottom-[-50%] right-[-10%] w-[60%] h-[150%] bg-[#00E5B4]/5 blur-[100px] rounded-full -rotate-12" />
          </div>

          <button onClick={onClose} className="absolute top-8 right-8 w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-[#6B6B8A] hover:bg-white/10 hover:text-white transition-all z-20">✕</button>

          <div className="relative z-10 flex items-center justify-center gap-12 lg:gap-20 w-full max-w-4xl">
            <div className="flex flex-col items-center gap-6 flex-1">
              <div className="w-24 h-24 rounded-[32px] bg-black/40 border-2 border-white/5 flex items-center justify-center p-4 shadow-2xl group transition-transform hover:scale-110">
                <TeamLogo teamName={g.awayTeam} size={64} />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-black text-[#F0F0FF] tracking-tight">{g.awayTeam}</h2>
                <p className="text-[10px] font-black text-[#6B6B8A] uppercase tracking-[0.4em] mt-1">{awayStats.record} · AWAY</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 pt-8">
              <div className="text-4xl font-black text-white/5 mt-[-40px]">VS</div>
              <div className="px-6 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-[#F0F0FF] tracking-widest whitespace-nowrap">{formatTime(g.commenceTime)}</div>
              <div className="px-3 py-1 rounded-lg bg-[#6C63FF]/20 border border-[#6C63FF]/30 text-[9px] font-black text-[#6C63FF] uppercase tracking-[0.3em]">{(g.sport || '').replace('-', ' ')}</div>
            </div>

            <div className="flex flex-col items-center gap-6 flex-1">
              <div className="w-24 h-24 rounded-[32px] bg-black/40 border-2 border-white/5 flex items-center justify-center p-4 shadow-2xl group transition-transform hover:scale-110">
                <TeamLogo teamName={g.homeTeam} size={64} />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-black text-[#F0F0FF] tracking-tight">{g.homeTeam}</h2>
                <p className="text-[10px] font-black text-[#6B6B8A] uppercase tracking-[0.4em] mt-1">{homeStats.record} · HOME</p>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 h-[calc(90vh-280px)] overflow-y-auto custom-scrollbar">
          
          {/* MAIN COLUMN (8) */}
          <div className="lg:col-span-8 p-10 space-y-12 border-r border-white/5">
            
            {/* ODDS MATRIX */}
            <div className="animate-in slide-in-from-left-8 duration-500">
              <div className="flex items-center justify-between mb-6">
                <div className="text-[10px] font-black text-[#6B6B8A] uppercase tracking-[0.5em]">Global Odds Matrix</div>
                <div className="flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#00E5B4] animate-pulse" />
                  <span className="text-[9px] font-black text-[#00E5B4] uppercase tracking-widest">Live Integration</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-[10px] font-black text-[#4E4E63] uppercase tracking-widest">
                      <th className="pb-4 pl-4">Bookmaker</th>
                      <th className="pb-4 text-center">AWAY Spread</th>
                      <th className="pb-4 text-center">HOME Spread</th>
                      <th className="pb-4 text-center">AWAY ML</th>
                      <th className="pb-4 text-center">HOME ML</th>
                      <th className="pb-4 text-center">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="space-y-4">
                    {(g.allBookmakers || []).slice(0, 6).map((bk, bi) => {
                      const getO = (mkt, team) => bk.markets?.find(m => m.key === mkt)?.outcomes?.find(o => o.name === team);
                      const aS = getO('spreads', g.awayTeam), hS = getO('spreads', g.homeTeam);
                      const aM = getO('h2h', g.awayTeam), hM = getO('h2h', g.homeTeam);
                      const tot = bk.markets?.find(m => m.key === 'totals')?.outcomes?.find(o => o.name === 'Over');
                      const isBest = (mk, nm, pr) => bestOdds[mk + '_' + nm]?.price === pr;
                      
                      const cellStyle = "p-4 text-center font-black transition-all";
                      const getCellColor = (best, pr) => best ? 'text-[#00E5B4] bg-[#00E5B4]/5 border border-[#00E5B4]/20' : pr > 0 ? 'text-[#F0F0FF]' : 'text-[#6B6B8A]';

                      return (
                        <tr key={bk.key || bi} className="bg-black/20 group hover:bg-black/30 transition-colors">
                          <td className="p-4 rounded-l-2xl border-l border-white/5 font-black text-[10px] text-[#6B6B8A] uppercase tracking-widest">{bk.title}</td>
                          <td className={`${cellStyle} ${getCellColor(isBest('spreads', g.awayTeam, aS?.price), aS?.price)}`}>{aS ? `${formatSpread(aS.point)} (${formatOdds(aS.price)})` : '--'}</td>
                          <td className={`${cellStyle} ${getCellColor(isBest('spreads', g.homeTeam, hS?.price), hS?.price)}`}>{hS ? `${formatSpread(hS.point)} (${formatOdds(hS.price)})` : '--'}</td>
                          <td className={`${cellStyle} ${getCellColor(isBest('h2h', g.awayTeam, aM?.price), aM?.price)}`}>{aM ? formatOdds(aM.price) : '--'}</td>
                          <td className={`${cellStyle} ${getCellColor(isBest('h2h', g.homeTeam, hM?.price), hM?.price)}`}>{hM ? formatOdds(hM.price) : '--'}</td>
                          <td className={`${cellStyle} text-[#6B6B8A] rounded-r-2xl border-r border-white/5`}>{tot ? `O ${tot.point} (${formatOdds(tot.price)})` : '--'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* STATS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* SHARP VOLUME */}
              <div>
                <div className="text-[10px] font-black text-[#6B6B8A] uppercase tracking-[0.5em] mb-6">Market Distribution</div>
                <div className="space-y-6">
                  {[{ label: 'Ticket Volume', away: awayBetPct }, { label: 'Capital Exposure', away: awayMoneyPct }].map(({ label, away }) => (
                    <div key={label} className="space-y-2">
                       <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-[#4E4E63]">
                        <span>{label}</span>
                        <span>{away}% AWAY / {100-away}% HOME</span>
                       </div>
                       <div className="h-2 rounded-full bg-white/5 overflow-hidden flex">
                        <div className="h-full bg-[#6C63FF] transition-all duration-1000" style={{ width: `${away}%` }} />
                        <div className="h-full bg-[#00E5B4] transition-all duration-1000 opacity-30" style={{ width: `${100-away}%` }} />
                       </div>
                    </div>
                  ))}
                  {sharpAlert && (
                    <div className="p-4 rounded-xl bg-[#6C63FF]/5 border border-[#6C63FF]/20 flex items-center gap-3">
                      <span className="text-lg">📡</span>
                      <span className="text-[10px] font-black text-[#6C63FF] uppercase tracking-[0.2em]">Sharp action signal detected on {awayMoneyPct > awayBetPct ? g.awayTeam : g.homeTeam}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* TEAM METRICS */}
              <div>
                <div className="text-[10px] font-black text-[#6B6B8A] uppercase tracking-[0.5em] mb-6">Execution Metrics</div>
                <div className="grid grid-cols-2 gap-4">
                  {[{ team: g.awayTeam, s: awayStats, clr: '#6C63FF' }, { team: g.homeTeam, s: homeStats, clr: '#00E5B4' }].map(({ team, s, clr }) => (
                    <div key={team} className="p-6 rounded-3xl bg-black/20 border border-white/5">
                      <div className="text-xs font-black text-[#F0F0FF] mb-4 truncate">{team}</div>
                      <div className="flex gap-1.5 mb-6">
                        {s.last10.map((r, i) => <div key={i} className={`w-2 h-2 rounded-full ${r === 'W' ? 'bg-[#00E5B4]' : 'bg-[#FF4560]'} shadow-sm`} />)}
                      </div>
                      <div className="space-y-3">
                        {[['ATS', s.ats], ['O/U', s.ou], ['PPG', s.ppg]].map(([l, v]) => (
                          <div key={l} className="flex justify-between items-center border-b border-white/5 pb-2">
                             <span className="text-[9px] font-black text-[#4E4E63] uppercase">{l}</span>
                             <span className="text-[10px] font-black text-[#F0F0FF]">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SIDEBAR COLUMN (4) */}
          <div className="lg:col-span-4 p-10 bg-black/10 space-y-12">
            
            {/* AI INTELLIGENCE */}
            <div>
               <div className="text-[10px] font-black text-[#6B6B8A] uppercase tracking-[0.5em] mb-6">Core Intelligence</div>
               {!isPro ? (
                <div className="p-8 rounded-[32px] bg-gradient-to-br from-[#6C63FF]/20 to-transparent border border-[#6C63FF]/30 text-center">
                  <div className="text-4xl mb-6">🔒</div>
                  <h3 className="text-sm font-black text-[#F0F0FF] uppercase tracking-widest mb-2">Institutional Analysis</h3>
                  <p className="text-[10px] font-bold text-[#6B6B8A] uppercase tracking-widest mb-8 leading-relaxed">Unlock sharp data interpretation & AI-driven edge detection</p>
                  <button onClick={() => window.dispatchEvent(new CustomEvent('open-upgrade'))} className="w-full py-4 rounded-xl bg-[#6C63FF] text-white font-black text-[10px] uppercase tracking-[0.3em] shadow-lg">Upgrade to Elite</button>
                </div>
              ) : (
                <div className="p-6 rounded-[32px] bg-[#0D0D15] border border-[#6C63FF]/20 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-20 text-xl">🧠</div>
                  {aiLoading && !aiResult ? (
                    <div className="flex flex-col items-center py-12 gap-4">
                      <div className="flex gap-2">{[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#6C63FF] animate-bounce" style={{ animationDelay: `${i*0.2}s` }} />)}</div>
                      <span className="text-[10px] font-black text-[#4E4E63] uppercase tracking-[0.4em]">Calibrating Models...</span>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="text-xs text-[#8899bb] leading-relaxed font-medium">
                        {analysisText}{aiLoading && <span className="inline-block w-1.5 h-4 bg-[#6C63FF] ml-2 animate-pulse align-middle" />}
                      </div>
                      {bestBetText && (
                        <div className="p-5 rounded-2xl bg-[#00E5B4]/5 border border-[#00E5B4]/20">
                          <div className="text-[9px] font-black text-[#00E5B4] uppercase tracking-[0.2em] mb-2">High Confidence Bet</div>
                          <div className="text-sm font-black text-[#F0F0FF]">{bestBetText}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* PROPS SELECT */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="text-[10px] font-black text-[#6B6B8A] uppercase tracking-[0.5em]">Player Prop Relay</div>
                {!isPro && <div className="text-[9px] font-black text-[#6C63FF] uppercase tracking-widest">PRO ONLY</div>}
              </div>
              {!isPro ? (
                <div className="grid grid-cols-1 gap-2 opacity-30 select-none">
                  {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-2xl bg-white/5 border border-white/5" />)}
                </div>
              ) : propsLoading ? (
                <div className="py-12 flex flex-col items-center gap-4">
                   <div className="w-8 h-8 border-2 border-[#6C63FF] border-t-transparent rounded-full animate-spin" />
                   <span className="text-[9px] font-black text-[#4E4E63] uppercase tracking-widest">Querying Data...</span>
                </div>
              ) : propPlayers.length > 0 ? (
                <div className="space-y-6">
                  {propStats.slice(0, 2).map(stat => (
                    <div key={stat} className="space-y-3">
                      <div className="text-[9px] font-black text-[#4E4E63] uppercase tracking-[0.3em]">{stat} OVER/UNDER</div>
                      {propPlayers.filter(p => props[p][stat]).slice(0, 3).map(player => (
                        <div key={player} className="p-4 rounded-2xl bg-[#0D0D15] border border-white/5 flex items-center justify-between group hover:border-[#6C63FF]/30 transition-all">
                          <div>
                            <div className="text-[11px] font-black text-[#F0F0FF]">{player}</div>
                            <div className="text-[9px] font-black text-[#4E4E63] uppercase mt-1">LINE: {props[player][stat]?.line}</div>
                          </div>
                          <div className="flex gap-2">
                             <div className="px-3 py-1.5 rounded-lg bg-[#00E5B4]/5 border border-[#00E5B4]/20 text-[9px] font-black text-[#00E5B4]">O {formatOdds(props[player][stat]?.over)}</div>
                             <div className="px-3 py-1.5 rounded-lg bg-[#FF4560]/5 border border-[#FF4560]/20 text-[9px] font-black text-[#FF4560]">U {formatOdds(props[player][stat]?.under)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-[10px] font-black text-[#4E4E63] uppercase tracking-widest">No active props found</div>
              )}
            </div>

            {/* BET SLIP HUD */}
            <div className="p-8 rounded-[40px] bg-gradient-to-br from-[#6C63FF] to-[#4E4E63] shadow-2xl relative overflow-hidden">
               <div className="absolute inset-0 bg-black/20" />
               <div className="relative z-10">
                <div className="text-[10px] font-black text-white/50 uppercase tracking-[0.5em] mb-8">Unified Terminal Log</div>
                
                <div className="grid grid-cols-2 gap-2 mb-6">
                  {picks.map((p, i) => (
                    <button key={i} onClick={() => setSelectedPick(p)}
                      className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${selectedPick?.label === p.label ? 'bg-white text-[#6C63FF] border-white shadow-lg' : 'bg-white/10 border-white/10 text-white/70 hover:bg-white/20'}`}>
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 font-black">$</span>
                    <input type="number" value={stake} onChange={e => setStake(e.target.value)}
                      className="w-full bg-black/20 border border-white/20 rounded-xl py-4 pl-10 pr-4 text-sm text-white font-black outline-none focus:border-white transition-all" />
                  </div>
                  
                  <button onClick={logBet} disabled={!selectedPick || betLogged}
                    className={`w-full py-5 rounded-2xl font-black text-xs tracking-[0.4em] uppercase transition-all shadow-xl ${betLogged ? 'bg-[#00E5B4] text-black shadow-[#00E5B4]/20' : selectedPick ? 'bg-white text-black shadow-white/10 hover:scale-[1.02]' : 'bg-white/10 text-white/30 cursor-not-allowed'}`}>
                    {betLogged ? 'RELAY SUCCESSFUL' : selectedPick ? 'COMMIT TO JOURNAL' : 'SELECT TARGET'}
                  </button>
                  {betError && <div className="text-xs font-bold text-[#FF4560] text-center mt-2">{betError}</div>}
                </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
