import { useState, useEffect } from 'react';
import api from '../lib/api';
import GameDetailModal from './GameDetailModal';
import TeamLogo from './TeamLogo';

const SPORTS = ['NBA', 'NFL', 'MLB', 'NHL', 'NCAAB', 'NCAAF', 'WNBA', 'soccer_epl', 'soccer_mls', 'soccer_champions', 'UFC', 'boxing', 'tennis_atp', 'golf_pga', 'F1'];
const SPORT_LABELS = { soccer_epl: 'EPL', soccer_mls: 'MLS', soccer_champions: 'UCL', tennis_atp: 'ATP', golf_pga: 'PGA' };

const ODDS_API_KEY_MAP = {
  NBA: 'nba', NFL: 'nfl', MLB: 'mlb', NHL: 'nhl', NCAAB: 'ncaab', NCAAF: 'ncaaf',
  WNBA: 'wnba', soccer_epl: 'soccer_epl', soccer_mls: 'soccer_mls', soccer_champions: 'soccer_champions',
  UFC: 'ufc', boxing: 'boxing', tennis_atp: 'tennis_atp', golf_pga: 'golf_pga', F1: 'f1',
};

function formatOdds(odds) {
  if (odds === null || odds === undefined) return '--';
  return odds > 0 ? '+' + odds : '' + odds;
}

function formatSpread(spread) {
  if (spread === null || spread === undefined) return '--';
  return spread > 0 ? '+' + spread : '' + spread;
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return 'Today ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function timeAgo(date) {
  if (!date) return '';
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 10) return 'just now';
  if (secs < 60) return secs + 's ago';
  if (secs < 3600) return Math.floor(secs / 60) + 'm ago';
  return Math.floor(secs / 3600) + 'h ago';
}

function isToday(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr).toDateString() === new Date().toDateString();
}

// Sharp money proxy: edge score > 65 = line likely moved on sharp action
function isSharpMoney(game) {
  return game.edgeScore && game.edgeScore.score > 65;
}

const oddsCache = {};

function CollapsibleSection({ title, count, sharpCount, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 4px', background: 'transparent', border: 'none', cursor: 'pointer',
          borderBottom: '1px solid rgba(108,99,255,0.1)', marginBottom: open ? 12 : 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 900, color: '#6B6B8A', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{title}</span>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#4E4E63', background: 'rgba(108,99,255,0.1)', padding: '2px 8px', borderRadius: 100 }}>{count}</span>
          {sharpCount > 0 && (
            <span style={{ fontSize: 10, fontWeight: 900, color: '#00E5B4', background: 'rgba(0,229,180,0.1)', padding: '2px 8px', borderRadius: 100, border: '1px solid rgba(0,229,180,0.2)' }}>
              ⚡ {sharpCount} sharp
            </span>
          )}
        </div>
        <span style={{ fontSize: 14, color: '#4E4E63', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
      </button>
      {open && <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>}
    </div>
  );
}

function GameCard({ game, sport, onSelect, onBet, onAnalyze }) {
  const edge = game.edgeScore;
  const sharp = isSharpMoney(game);

  return (
    <div
      className="group relative overflow-hidden transition-all hover:scale-[1.01]"
      style={{
        background: 'rgba(17,17,32,0.8)',
        backdropFilter: 'blur(20px)',
        border: sharp ? '1px solid rgba(0,229,180,0.3)' : '1px solid rgba(108,99,255,0.2)',
        borderRadius: 24,
        cursor: 'pointer',
        position: 'relative',
      }}
      onClick={() => onSelect(game)}
    >
      {/* Sharp money banner */}
      {sharp && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          background: 'linear-gradient(90deg, rgba(0,229,180,0.12), transparent)',
          padding: '5px 16px',
          display: 'flex', alignItems: 'center', gap: 6,
          borderBottom: '1px solid rgba(0,229,180,0.1)',
          borderRadius: '24px 24px 0 0',
        }}>
          <span style={{ fontSize: 9, fontWeight: 900, color: '#00E5B4', letterSpacing: '0.12em', textTransform: 'uppercase' }}>⚡ Sharp Money — {edge.score}% edge detected</span>
        </div>
      )}

      {edge && edge.score > 60 && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{ background: `radial-gradient(circle at center, ${edge.color}10 0%, transparent 70%)` }} />
      )}

      <div className="p-8" style={{ paddingTop: sharp ? 36 : undefined }}>
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black px-3 py-1 rounded-full bg-[#6C63FF]/10 text-[#867fff] uppercase tracking-widest border border-[#6C63FF]/20">
              {SPORT_LABELS[sport] || sport}
            </span>
            {game.isLive && (
              <span className="flex items-center gap-1.5 text-[10px] font-black px-3 py-1 rounded-full bg-[#FF4560]/10 text-[#FF4560] uppercase tracking-widest border border-[#FF4560]/20 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF4560]" /> LIVE
              </span>
            )}
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black text-[#6B6B8A] uppercase tracking-widest">{fmtDate(game.commenceTime)}</div>
          </div>
        </div>

        {/* VS Layout */}
        <div className="flex items-center justify-between gap-4 mb-10">
          <div className="flex-1 flex flex-col items-center gap-4 text-center">
            <div className="w-20 h-20 rounded-2xl bg-black/40 flex items-center justify-center p-4 border border-white/5 shadow-inner group-hover:border-[#6C63FF]/30 transition-all">
              <TeamLogo teamName={game.awayTeam} size={64} />
            </div>
            <div>
              <div className="text-xl font-black text-[#F0F0FF] tracking-tight">{game.awayTeam}</div>
              <div className="text-[10px] font-black text-[#6B6B8A] uppercase tracking-widest mt-1">AWAY</div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 px-8">
            <div className="text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-[#6C63FF] to-[#00E5B4] opacity-20 group-hover:opacity-50 transition-opacity">VS</div>
            {edge && (
              <div className="flex flex-col items-center gap-1">
                <div className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap shadow-lg transition-all group-hover:scale-110"
                  style={{ background: `${edge.color}20`, color: edge.color, border: `1px solid ${edge.color}40` }}>
                  {edge.score}% EDGE
                </div>
                {edge.score > 70 && (
                  <span className="text-[8px] font-black text-[#00E5B4] uppercase tracking-[0.2em] animate-pulse">Sharp Signal</span>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col items-center gap-4 text-center">
            <div className="w-20 h-20 rounded-2xl bg-black/40 flex items-center justify-center p-4 border border-white/5 shadow-inner group-hover:border-[#6C63FF]/30 transition-all">
              <TeamLogo teamName={game.homeTeam} size={64} />
            </div>
            <div>
              <div className="text-xl font-black text-[#F0F0FF] tracking-tight">{game.homeTeam}</div>
              <div className="text-[10px] font-black text-[#6B6B8A] uppercase tracking-widest mt-1">HOME</div>
            </div>
          </div>
        </div>

        {/* Odds Grid */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: 'MONEYLINE', away: game.awayML, home: game.homeML, type: 'ML' },
            { label: 'SPREAD', away: game.awaySpread, home: game.homeSpread, subAway: game.awaySpreadOdds, subHome: game.homeSpreadOdds, type: 'Spread' },
            { label: 'TOTAL', away: 'O ' + (game.overTotal || '--'), home: 'U ' + (game.overTotal || '--'), subAway: game.overOdds, subHome: game.underOdds, type: 'Total' }
          ].map((col) => (
            <div key={col.label} className="flex flex-col gap-2">
              <div className="text-[9px] font-black text-[#4E4E63] uppercase tracking-[0.2em] text-center mb-1">{col.label}</div>
              <div className="flex flex-col gap-1">
                <button onClick={(e) => { e.stopPropagation(); onBet(game, col.type, game.awayTeam); }}
                  className="py-3 px-2 rounded-xl bg-black/40 border border-white/5 hover:border-[#6C63FF]/40 hover:bg-[#6C63FF]/5 transition-all text-sm font-black text-[#F0F0FF]">
                  {col.type === 'ML' ? formatOdds(col.away) : col.away}
                  {col.subAway && <span className="text-[10px] text-[#6B6B8A] ml-2 font-bold">({formatOdds(col.subAway)})</span>}
                </button>
                <button onClick={(e) => { e.stopPropagation(); onBet(game, col.type, game.homeTeam); }}
                  className="py-3 px-2 rounded-xl bg-black/40 border border-white/5 hover:border-[#6C63FF]/40 hover:bg-[#6C63FF]/5 transition-all text-sm font-black text-[#F0F0FF]">
                  {col.type === 'ML' ? formatOdds(col.home) : col.home}
                  {col.subHome && <span className="text-[10px] text-[#6B6B8A] ml-2 font-bold">({formatOdds(col.subHome)})</span>}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-white/5">
          <div className="flex gap-3">
            <button onClick={(e) => { e.stopPropagation(); onAnalyze(game); }}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#6C63FF]/10 border border-[#6C63FF]/30 text-[10px] font-black uppercase tracking-widest text-[#F0F0FF] hover:bg-[#6C63FF] transition-all">
              <span>🔬</span> ANALYZE
            </button>
            <button onClick={(e) => { e.stopPropagation(); onBet(game, 'ML', null); }}
              className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-[#6B6B8A] hover:text-[#F0F0FF] transition-all">
              LOG CUSTOM
            </button>
          </div>
          {game.bookmakers?.length > 0 && (
            <div className="text-[10px] font-black text-[#2a3a5a] uppercase tracking-widest">VIA {game.bookmakers[0]}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SportsOdds({ initialSport, tier }) {
  const normalizeSport = (s) => {
    if (!s) return 'NBA';
    if (SPORTS.includes(s)) return s;
    const upper = s.toUpperCase();
    if (SPORTS.includes(upper)) return upper;
    return s;
  };

  const [sport, setSport] = useState(normalizeSport(initialSport));
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedGame, setSelectedGame] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [requestsRemaining, setRequestsRemaining] = useState(null);
  const [sortByEdge, setSortByEdge] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    if (initialSport) {
      const n = normalizeSport(initialSport);
      if (n !== sport) setSport(n);
    }
  }, [initialSport]);

  useEffect(() => { if (!quotaExceeded) fetchGames(); }, [sport]);

  useEffect(() => {
    const interval = setInterval(() => fetchGames(), 60000);
    return () => clearInterval(interval);
  }, [sport]);

  async function fetchGames() {
    const oddsKey = ODDS_API_KEY_MAP[sport] || sport.toLowerCase();
    const cacheKey = 'odds_' + oddsKey + '_' + new Date().toISOString().slice(0, 10);
    if (oddsCache[cacheKey] && Date.now() - oddsCache[cacheKey].ts < 300000) {
      setGames(oddsCache[cacheKey].games);
      if (oddsCache[cacheKey].remaining != null) setRequestsRemaining(oddsCache[cacheKey].remaining);
      setLastUpdated(new Date(oddsCache[cacheKey].ts));
      setLoading(false);
      return;
    }
    setLoading(true); setError('');
    try {
      const { data } = await api.get(`/api/odds/games?sport=${oddsKey}`);
      if (data.quotaExceeded) {
        setError('Live odds temporarily unavailable — quota refreshes daily');
        setQuotaExceeded(true);
        setGames([]);
      } else {
        setGames(data.games || []);
        if (data.requestsRemaining != null) setRequestsRemaining(data.requestsRemaining);
        oddsCache[cacheKey] = { games: data.games || [], remaining: data.requestsRemaining, ts: Date.now(), offSeason: data.offSeason };
        if (data.offSeason) setError('off-season');
        else setError('');
      }
    } catch (e) {
      setError('Could not load games — try refreshing');
      setGames([]);
    }
    setLastUpdated(new Date());
    setLoading(false);
  }

  function betGame(game, betType, side) {
    const match = side
      ? `${side} ${betType === 'ML' ? 'ML' : betType === 'Spread' ? formatSpread(side === game.homeTeam ? game.homeSpread : game.awaySpread) : betType === 'Over' ? 'Over ' + game.overTotal : betType === 'Under' ? 'Under ' + game.overTotal : ''}`
      : `${game.awayTeam} @ ${game.homeTeam}`;
    const odds = side === game.homeTeam ? (betType === 'ML' ? game.homeML : game.homeSpreadOdds)
      : side === game.awayTeam ? (betType === 'ML' ? game.awayML : game.awaySpreadOdds)
      : betType === 'Over' ? game.overOdds : betType === 'Under' ? game.underOdds : '';
    const sportMap = { nba: 'NBA', nfl: 'NFL', mlb: 'MLB', nhl: 'NHL' };
    window.dispatchEvent(new CustomEvent('bet-prefill', {
      detail: { sport: sportMap[sport.toLowerCase()] || sport, match, odds: odds ? String(odds) : '', type: betType === 'Over' || betType === 'Under' ? 'Over/Under' : betType === 'Spread' ? 'Spread' : 'Moneyline', sportsbook: game.bookmakers?.[0] || 'DraftKings' }
    }));
  }

  function analyzeGame(game) {
    const topic = `${game.awayTeam} vs ${game.homeTeam} ${SPORT_LABELS[sport] || sport} — spread ${formatSpread(game.awaySpread)}, ML ${formatOdds(game.awayML)}/${formatOdds(game.homeML)}, total ${game.overTotal || 'N/A'}`;
    window.dispatchEvent(new CustomEvent('ai-prefill', { detail: { topic, type: 'sports' } }));
  }

  const gc = { background: '#1A1A24', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 16 };

  const sortedGames = [...games].sort((a, b) => sortByEdge ? (b.edgeScore?.score || 0) - (a.edgeScore?.score || 0) : 0);
  const todayGames = sortedGames.filter(g => isToday(g.commenceTime));
  const upcomingGames = sortedGames.filter(g => !isToday(g.commenceTime));
  const sharpToday = todayGames.filter(isSharpMoney).length;
  const sharpUpcoming = upcomingGames.filter(isSharpMoney).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Sport selector */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12, background: '#111118', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {SPORTS.map(s => (
            <button key={s} onClick={() => setSport(s)}
              style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 800, letterSpacing: '-0.02em', cursor: 'pointer',
                border: 'none', whiteSpace: 'nowrap', transition: 'all 0.15s',
                background: sport === s ? '#6C63FF' : 'transparent',
                color: sport === s ? '#fff' : '#6B6B8A',
              }}
              onMouseEnter={e => { if (sport !== s) e.currentTarget.style.color = '#F0F0FF'; }}
              onMouseLeave={e => { if (sport !== s) e.currentTarget.style.color = '#6B6B8A'; }}>
              {SPORT_LABELS[s] || s}
            </button>
          ))}
        </div>
      </div>

      {/* Status bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: '#2a3a5a' }}>{!loading && games.length > 0 && `${games.length} games`}</span>
          {!loading && games.length > 0 && (
            <button onClick={() => setSortByEdge(s => !s)}
              style={{ fontSize: 10, fontWeight: 800, letterSpacing: '-0.03em', padding: '3px 10px', borderRadius: 100, cursor: 'pointer', border: '1px solid', background: sortByEdge ? 'rgba(34,197,94,0.15)' : '#111118', borderColor: sortByEdge ? 'rgba(34,197,94,0.3)' : 'rgba(108,99,255,0.2)', color: sortByEdge ? '#00E5B4' : '#4E4E63' }}>
              {sortByEdge ? '⚡ Edge sorted' : '⚡ Sort by Edge'}
            </button>
          )}
          {(sharpToday + sharpUpcoming) > 0 && (
            <span style={{ fontSize: 10, fontWeight: 900, color: '#00E5B4', letterSpacing: '0.04em' }}>
              {sharpToday + sharpUpcoming} sharp signal{sharpToday + sharpUpcoming !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {lastUpdated && <span style={{ fontSize: 10, color: '#1a2535' }}>Updated {timeAgo(lastUpdated)}</span>}
          <button onClick={fetchGames} disabled={loading}
            style={{ background: '#1A1A24', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 8, padding: '4px 10px', fontSize: 10, color: '#4E4E63', cursor: 'pointer' }}>
            {loading ? '...' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {error && error !== 'off-season' && <div style={{ ...gc, padding: 16, borderColor: 'rgba(239,68,68,0.2)', color: '#FF4560', fontSize: 13 }}>{error}</div>}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => <div key={i} style={{ ...gc, padding: 20, height: 160, animation: 'pulse 1.5s infinite' }} />)}
        </div>
      )}

      {!loading && games.length === 0 && (
        <div style={{ ...gc, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🏟️</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#6B6B8A' }}>
            {error === 'off-season' ? `${SPORT_LABELS[sport] || sport} is off-season` : `No ${SPORT_LABELS[sport] || sport} games right now`}
          </div>
          <div style={{ fontSize: 12, color: '#4E4E63', marginTop: 4 }}>
            {error === 'off-season' ? 'Season not yet started — check back closer to opening week' : 'Check back on game days'}
          </div>
        </div>
      )}

      {!loading && games.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {todayGames.length > 0 && (
            <CollapsibleSection title="Today" count={todayGames.length} sharpCount={sharpToday} defaultOpen={true}>
              {todayGames.map(game => (
                <GameCard key={game.id} game={game} sport={sport} onSelect={setSelectedGame} onBet={betGame} onAnalyze={analyzeGame} />
              ))}
            </CollapsibleSection>
          )}
          {upcomingGames.length > 0 && (
            <CollapsibleSection title="Upcoming" count={upcomingGames.length} sharpCount={sharpUpcoming} defaultOpen={todayGames.length === 0}>
              {upcomingGames.map(game => (
                <GameCard key={game.id} game={game} sport={sport} onSelect={setSelectedGame} onBet={betGame} onAnalyze={analyzeGame} />
              ))}
            </CollapsibleSection>
          )}
        </div>
      )}

      {selectedGame && <GameDetailModal game={selectedGame} onClose={() => setSelectedGame(null)} userPlan={tier} />}
    </div>
  );
}
