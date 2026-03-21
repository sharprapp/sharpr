import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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

const INJURIES = {
  'Los Angeles Lakers': [{ player: 'Anthony Davis', pos: 'C/PF', inj: 'Foot soreness', status: 'Questionable' }],
  'Boston Celtics': [{ player: 'Kristaps Porzingis', pos: 'C', inj: 'Illness', status: 'Out' }],
  'Golden State Warriors': [{ player: 'Stephen Curry', pos: 'PG', inj: 'Ankle', status: 'Probable' }],
  'Milwaukee Bucks': [{ player: 'Giannis Antetokounmpo', pos: 'PF', inj: 'Knee', status: 'Questionable' }],
  'Dallas Cowboys': [{ player: 'Dak Prescott', pos: 'QB', inj: 'Shoulder', status: 'Questionable' }],
  'Kansas City Chiefs': [{ player: 'Travis Kelce', pos: 'TE', inj: 'Knee', status: 'Probable' }],
  'San Francisco 49ers': [{ player: 'Christian McCaffrey', pos: 'RB', inj: 'Hamstring', status: 'Doubtful' }],
  'Philadelphia 76ers': [{ player: 'Joel Embiid', pos: 'C', inj: 'Knee management', status: 'Out' }],
  'Denver Nuggets': [{ player: 'Jamal Murray', pos: 'PG', inj: 'Hamstring', status: 'Questionable' }],
  'New York Yankees': [{ player: 'Gerrit Cole', pos: 'SP', inj: 'Elbow', status: 'Out' }],
};

const stColor = s => s === 'Out' ? { bg: 'rgba(239,68,68,0.15)', c: '#ef4444' } : s === 'Questionable' ? { bg: 'rgba(245,158,11,0.15)', c: '#f59e0b' } : s === 'Probable' ? { bg: 'rgba(34,197,94,0.15)', c: '#22c55e' } : s === 'Doubtful' ? { bg: 'rgba(251,146,60,0.15)', c: '#fb923c' } : { bg: 'rgba(148,163,184,0.15)', c: '#94a3b8' };

function TeamLogo({ name, size = 44 }) {
  const colors = { Lakers: '#552583', Celtics: '#007A33', Warriors: '#1D428A', Heat: '#98002E', Bulls: '#CE1141', Knicks: '#006BB6', Bucks: '#00471B', Chiefs: '#E31837', '49ers': '#AA0000', Cowboys: '#003594', Yankees: '#003087', Dodgers: '#005A9C' };
  const words = (name || '').split(' ');
  const last = words[words.length - 1];
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: colors[last] || '#1a2a4a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.25, fontWeight: 800, color: 'white', flexShrink: 0 }}>
      {(words.length > 1 ? words[0][0] + last[0] : (name || '').slice(0, 2)).toUpperCase()}
    </div>
  );
}

export default function GameDetailModal({ game: g, onClose, userPlan }) {
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [props, setProps] = useState({});
  const [propsLoading, setPropsLoading] = useState(false);
  const [selectedPick, setSelectedPick] = useState(null);
  const [stake, setStake] = useState('50');
  const [betLogged, setBetLogged] = useState(false);
  const isPro = userPlan === 'pro' || userPlan === 'elite';

  const awayStats = genStats(g.awayTeam);
  const homeStats = genStats(g.homeTeam);
  const injuries = [...(INJURIES[g.awayTeam] || []).map(i => ({ ...i, team: g.awayTeam })), ...(INJURIES[g.homeTeam] || []).map(i => ({ ...i, team: g.homeTeam }))];

  // Mock sharp money
  const awayBetPct = g.awayML > 0 ? 35 : 65;
  const awayMoneyPct = g.awayML > 0 ? 51 : 44;
  const sharpAlert = Math.abs(awayMoneyPct - awayBetPct) > 12;

  // AI analysis
  useEffect(() => {
    if (!isPro) return;
    setAiLoading(true);
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/ai/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({
            query: `Sharp betting analysis: ${g.awayTeam} vs ${g.homeTeam}. Sport: ${g.sport}. Spread: ${g.awayTeam} ${formatSpread(g.awaySpread)} / ${g.homeTeam} ${formatSpread(g.homeSpread)}. ML: ${formatOdds(g.awayML)} / ${formatOdds(g.homeML)}. Total: ${g.overTotal || 'N/A'}. Give key matchup factors, line value, and a CLEAR best bet with confidence. End with "Best Bet:" on its own line.`,
            type: 'sports', use_web_search: true,
          }),
        });
        const data = await res.json();
        setAiResult(data.result || 'Analysis unavailable.');
      } catch { setAiResult('Analysis unavailable.'); }
      finally { setAiLoading(false); }
    })();
  }, [g.id]);

  // Props
  useEffect(() => {
    if (!isPro || !g.id) return;
    setPropsLoading(true);
    fetch(`${import.meta.env.VITE_API_URL}/api/odds/props?sport=${g.sport}&gameId=${g.id}`)
      .then(r => r.json()).then(d => setProps(d.props || {})).catch(() => {}).finally(() => setPropsLoading(false));
  }, [g.id]);

  // Log bet
  async function logBet() {
    if (!selectedPick) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('bets').insert({
        user_id: user.id, sport: (g.sport || 'other').toUpperCase(),
        match: `${g.awayTeam} @ ${g.homeTeam}`, type: selectedPick.type || 'Spread',
        odds: String(selectedPick.odds || ''), stake: parseFloat(stake) || 50, result: 'pending',
        notes: `Logged from Events · ${selectedPick.label}`,
      });
      setBetLogged(true);
      setTimeout(() => { setBetLogged(false); setSelectedPick(null); }, 2500);
    } catch (e) { console.error('Bet log error:', e); }
  }

  const picks = [
    { label: `${g.awayTeam?.split(' ').pop()} ${formatSpread(g.awaySpread)}`, odds: g.awaySpreadOdds, type: 'Spread' },
    { label: `${g.homeTeam?.split(' ').pop()} ${formatSpread(g.homeSpread)}`, odds: g.homeSpreadOdds, type: 'Spread' },
    { label: `${g.awayTeam?.split(' ').pop()} ML ${formatOdds(g.awayML)}`, odds: g.awayML, type: 'Moneyline' },
    { label: `${g.homeTeam?.split(' ').pop()} ML ${formatOdds(g.homeML)}`, odds: g.homeML, type: 'Moneyline' },
    { label: `Over ${g.overTotal || '--'}`, odds: g.overOdds, type: 'Total' },
    { label: `Under ${g.overTotal || '--'}`, odds: g.underOdds, type: 'Total' },
  ];

  // Best odds map
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

  const gc = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 14 };
  const st = { fontSize: 10, fontWeight: 700, letterSpacing: '2px', color: '#1a2535', textTransform: 'uppercase', marginBottom: 10 };

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#070712', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, width: '100%', maxWidth: 1100, maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>

        {/* Close */}
        <div onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#4a5a7a', fontSize: 16, zIndex: 10 }}>✕</div>

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <TeamLogo name={g.awayTeam} />
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f4ff' }}>{g.awayTeam}</div>
            <div style={{ fontSize: 10, color: '#2a3a5a' }}>{awayStats.record}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 18, color: '#1a2535', fontWeight: 700 }}>@</div>
            <div style={{ fontSize: 11, color: '#2a3a5a' }}>{formatTime(g.commenceTime)}</div>
            <span style={{ background: 'rgba(79,142,247,0.15)', border: '1px solid rgba(79,142,247,0.3)', borderRadius: 100, padding: '3px 10px', fontSize: 10, fontWeight: 700, color: '#7aaff8' }}>{(g.sport || '').toUpperCase()}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <TeamLogo name={g.homeTeam} />
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f4ff' }}>{g.homeTeam}</div>
            <div style={{ fontSize: 10, color: '#2a3a5a' }}>{homeStats.record}</div>
          </div>
        </div>

        {/* Body: left + right */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px' }}>

          {/* LEFT */}
          <div style={{ padding: '20px 24px', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Odds comparison table */}
            <div>
              <div style={st}>Odds Comparison</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      {['Book', `${g.awayTeam?.split(' ').pop()} Sprd`, `${g.homeTeam?.split(' ').pop()} Sprd`, `${g.awayTeam?.split(' ').pop()} ML`, `${g.homeTeam?.split(' ').pop()} ML`, 'Total'].map(h => (
                        <th key={h} style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', color: '#1a2535', textTransform: 'uppercase', padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(g.allBookmakers || []).slice(0, 5).map((bk, bi) => {
                      const getO = (mkt, team) => bk.markets?.find(m => m.key === mkt)?.outcomes?.find(o => o.name === team);
                      const aS = getO('spreads', g.awayTeam), hS = getO('spreads', g.homeTeam);
                      const aM = getO('h2h', g.awayTeam), hM = getO('h2h', g.homeTeam);
                      const tot = bk.markets?.find(m => m.key === 'totals')?.outcomes?.find(o => o.name === 'Over');
                      const isBest = (mk, nm, pr) => bestOdds[mk + '_' + nm]?.price === pr;
                      const cell = (best, pr) => ({ padding: '7px 6px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)', background: best ? 'rgba(34,197,94,0.06)' : 'transparent', color: best ? '#4ade80' : pr > 0 ? '#22c55e' : '#6a7a9a', fontWeight: best ? 700 : 500, fontSize: 11 });
                      return (
                        <tr key={bk.key || bi}>
                          <td style={{ padding: '7px 8px', color: '#4a5a7a', fontSize: 10, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>{bk.title}</td>
                          <td style={cell(isBest('spreads', g.awayTeam, aS?.price), aS?.price)}>{aS ? `${formatSpread(aS.point)} (${formatOdds(aS.price)})` : '--'}</td>
                          <td style={cell(isBest('spreads', g.homeTeam, hS?.price), hS?.price)}>{hS ? `${formatSpread(hS.point)} (${formatOdds(hS.price)})` : '--'}</td>
                          <td style={cell(isBest('h2h', g.awayTeam, aM?.price), aM?.price)}>{aM ? formatOdds(aM.price) : '--'}</td>
                          <td style={cell(isBest('h2h', g.homeTeam, hM?.price), hM?.price)}>{hM ? formatOdds(hM.price) : '--'}</td>
                          <td style={cell(false, tot?.price)}>{tot ? `O ${tot.point} (${formatOdds(tot.price)})` : '--'}</td>
                        </tr>
                      );
                    })}
                    {(!g.allBookmakers || g.allBookmakers.length === 0) && (g.homeML != null || g.awayML != null) && (
                      <tr>
                        <td style={{ padding: '7px 8px', color: '#4a5a7a', fontSize: 10, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>Best line</td>
                        <td style={{ padding: '7px', textAlign: 'center', color: '#6a7a9a', fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>{formatSpread(g.awaySpread)} ({formatOdds(g.awaySpreadOdds)})</td>
                        <td style={{ padding: '7px', textAlign: 'center', color: '#6a7a9a', fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>{formatSpread(g.homeSpread)} ({formatOdds(g.homeSpreadOdds)})</td>
                        <td style={{ padding: '7px', textAlign: 'center', color: g.awayML > 0 ? '#22c55e' : '#6a7a9a', fontSize: 11, fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>{formatOdds(g.awayML)}</td>
                        <td style={{ padding: '7px', textAlign: 'center', color: g.homeML > 0 ? '#22c55e' : '#6a7a9a', fontSize: 11, fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>{formatOdds(g.homeML)}</td>
                        <td style={{ padding: '7px', textAlign: 'center', color: '#6a7a9a', fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>{g.overTotal ? `O ${g.overTotal} (${formatOdds(g.overOdds)})` : '--'}</td>
                      </tr>
                    )}
                    {(!g.allBookmakers || g.allBookmakers.length === 0) && g.homeML == null && g.awayML == null && (
                      <tr><td colSpan={6} style={{ padding: 16, textAlign: 'center', color: '#1a2535', fontSize: 12 }}>Odds not yet posted — check back closer to game time</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sharp money */}
            <div>
              <div style={st}>Sharp Money</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[{ label: 'Bet %', away: awayBetPct }, { label: 'Money %', away: awayMoneyPct }].map(({ label, away }) => (
                  <div key={label} style={gc}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', color: '#1a2535', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
                    <div style={{ height: 6, borderRadius: 3, overflow: 'hidden', display: 'flex', marginBottom: 6 }}>
                      <div style={{ width: away + '%', background: '#4f8ef7', borderRadius: '3px 0 0 3px' }} />
                      <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700 }}>
                      <span style={{ color: '#4f8ef7' }}>{g.awayTeam?.split(' ').pop()} {away}%</span>
                      <span style={{ color: '#4a5a7a' }}>{g.homeTeam?.split(' ').pop()} {100 - away}%</span>
                    </div>
                  </div>
                ))}
              </div>
              {sharpAlert && (
                <div style={{ marginTop: 8, background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 700, color: '#7aaff8', textAlign: 'center' }}>
                  Sharp action on {awayMoneyPct > awayBetPct ? g.awayTeam : g.homeTeam}
                </div>
              )}
            </div>

            {/* Team Stats */}
            <div>
              <div style={st}>Team Stats</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[{ team: g.awayTeam, s: awayStats }, { team: g.homeTeam, s: homeStats }].map(({ team, s: ts }) => (
                  <div key={team} style={gc}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#f0f4ff', marginBottom: 8 }}>{team}</div>
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 8 }}>
                      {ts.last10.map((r, i) => <span key={i} style={{ background: r === 'W' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)', color: r === 'W' ? '#4ade80' : '#f87171', borderRadius: 3, padding: '2px 5px', fontSize: 9, fontWeight: 700 }}>{r}</span>)}
                    </div>
                    {[['Record', ts.record], ['ATS', ts.ats], ['O/U', ts.ou], ['PPG', ts.ppg], ['Opp PPG', ts.opp]].map(([l, v]) => (
                      <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#4a5a7a', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <span>{l}</span><span style={{ color: '#8899bb', fontWeight: 600 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Injuries */}
            {injuries.length > 0 && (
              <div>
                <div style={st}>Key Injuries</div>
                <div style={gc}>
                  {injuries.map((inj, i) => {
                    const sc = stColor(inj.status);
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < injuries.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                        <div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#8899bb' }}>{inj.player}</span>
                          <span style={{ fontSize: 10, color: '#2a3a5a', marginLeft: 8 }}>{inj.pos} · {inj.team?.split(' ').pop()} · {inj.inj}</span>
                        </div>
                        <span style={{ background: sc.bg, color: sc.c, borderRadius: 5, padding: '2px 8px', fontSize: 9, fontWeight: 700 }}>{inj.status}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div style={{ padding: 20, background: 'rgba(79,142,247,0.02)', display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* AI Analysis */}
            <div>
              <div style={st}>AI Analysis</div>
              {!isPro ? (
                <div style={{ background: 'rgba(79,142,247,0.05)', border: '1px solid rgba(79,142,247,0.15)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>🔒</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f0f4ff', marginBottom: 6 }}>AI Game Analysis</div>
                  <div style={{ fontSize: 11, color: '#4a5a7a', marginBottom: 14 }}>Get sharp analysis on every game with Pro</div>
                  <button onClick={() => window.dispatchEvent(new CustomEvent('open-upgrade'))} style={{ background: 'rgba(79,142,247,0.2)', border: '1px solid rgba(79,142,247,0.4)', borderRadius: 10, padding: '9px 18px', fontSize: 12, fontWeight: 700, color: '#7aaff8', cursor: 'pointer', width: '100%' }}>Upgrade to Pro</button>
                </div>
              ) : aiLoading ? (
                <div style={{ background: 'rgba(79,142,247,0.05)', border: '1px solid rgba(79,142,247,0.15)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 10 }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#4f8ef7', animation: `pulse 1.2s infinite ${i * 0.2}s` }} />)}</div>
                  <div style={{ fontSize: 12, color: '#4a5a7a' }}>Analyzing matchup...</div>
                </div>
              ) : aiResult ? (
                <div style={{ background: 'rgba(79,142,247,0.05)', border: '1px solid rgba(79,142,247,0.12)', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 12, color: '#6a7a9a', lineHeight: 1.7, marginBottom: bestBetText ? 12 : 0 }}>{analysisText}</div>
                  {bestBetText && (
                    <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: 10 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', color: '#4ade80', textTransform: 'uppercase', marginBottom: 4 }}>Best Bet</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#f0f4ff' }}>{bestBetText}</div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Props */}
            <div>
              <div style={st}>Player Props {!isPro && '🔒'}</div>
              {!isPro ? (
                <div style={{ ...gc, textAlign: 'center', padding: 16 }}><div style={{ fontSize: 11, color: '#2a3a5a' }}>Props available with Pro</div></div>
              ) : propsLoading ? (
                <div style={{ fontSize: 11, color: '#2a3a5a', textAlign: 'center', padding: 16 }}>Loading props...</div>
              ) : propPlayers.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {propStats.slice(0, 2).map(stat => (
                    <div key={stat}>
                      <div style={{ fontSize: 9, color: '#1a2535', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 5 }}>{stat}</div>
                      {propPlayers.filter(p => props[p][stat]).slice(0, 3).map(player => (
                        <div key={player} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, marginBottom: 4 }}>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#f0f4ff' }}>{player}</div>
                            <div style={{ fontSize: 9, color: '#2a3a5a' }}>O/U {props[player][stat]?.line}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80', borderRadius: 5, padding: '3px 7px', fontSize: 9, fontWeight: 700 }}>O {formatOdds(props[player][stat]?.over)}</div>
                            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: 5, padding: '3px 7px', fontSize: 9, fontWeight: 700 }}>U {formatOdds(props[player][stat]?.under)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 11, color: '#2a3a5a', textAlign: 'center', padding: 16 }}>Props not available yet</div>
              )}
            </div>

            {/* Quick bet */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 14 }}>
              <div style={st}>Log a Bet</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                {picks.map((p, i) => (
                  <div key={i} onClick={() => setSelectedPick(p)}
                    style={{ padding: '8px 6px', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer', textAlign: 'center',
                      background: selectedPick?.label === p.label ? 'rgba(79,142,247,0.15)' : 'rgba(255,255,255,0.03)',
                      border: selectedPick?.label === p.label ? '1px solid rgba(79,142,247,0.4)' : '1px solid rgba(255,255,255,0.07)',
                      color: selectedPick?.label === p.label ? '#7aaff8' : '#4a5a7a' }}>
                    {p.label}
                  </div>
                ))}
              </div>
              <input type="number" value={stake} onChange={e => setStake(e.target.value)} placeholder="Stake ($)"
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 10px', color: '#f0f4ff', fontSize: 12, marginBottom: 10, boxSizing: 'border-box' }} />
              <button onClick={logBet}
                style={{ background: betLogged ? 'rgba(34,197,94,0.2)' : selectedPick ? '#4f8ef7' : 'rgba(79,142,247,0.1)', border: 'none', borderRadius: 8, padding: '10px', fontSize: 12, fontWeight: 700, color: betLogged ? '#4ade80' : 'white', cursor: selectedPick ? 'pointer' : 'not-allowed', width: '100%' }}>
                {betLogged ? 'Bet logged!' : selectedPick ? 'Log this bet' : 'Select a pick above'}
              </button>
            </div>
          </div>
        </div>

        <style>{`@keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}`}</style>
      </div>
    </div>
  );
}
