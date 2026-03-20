import { useEffect, useState, useRef } from 'react';

const SPORT_COLORS = {
  NBA:   { bg: 'rgba(243,147,29,0.15)',  color: '#f3931d', border: 'rgba(243,147,29,0.3)' },
  NFL:   { bg: 'rgba(1,91,43,0.2)',      color: '#00a550', border: 'rgba(0,165,80,0.3)' },
  MLB:   { bg: 'rgba(215,41,41,0.15)',   color: '#e63535', border: 'rgba(230,53,53,0.3)' },
  NHL:   { bg: 'rgba(0,102,204,0.15)',   color: '#0099ff', border: 'rgba(0,153,255,0.3)' },
  EPL:   { bg: 'rgba(108,0,163,0.15)',   color: '#9b30e8', border: 'rgba(155,48,232,0.3)' },
  MLS:   { bg: 'rgba(18,135,69,0.15)',   color: '#12a855', border: 'rgba(18,168,85,0.3)' },
  UFC:   { bg: 'rgba(220,38,38,0.15)',   color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
  NCAAB: { bg: 'rgba(243,147,29,0.15)',  color: '#f3931d', border: 'rgba(243,147,29,0.3)' },
  NCAAF: { bg: 'rgba(1,91,43,0.2)',      color: '#00a550', border: 'rgba(0,165,80,0.3)' },
};
const DEFAULT_SPORT_COLOR = { bg: 'rgba(79,142,247,0.1)', color: '#4f8ef7', border: 'rgba(79,142,247,0.3)' };

export default function SportsTicker() {
  const [scores, setScores] = useState([]);
  const [show, setShow] = useState(false);
  const [sportFilter, setSportFilter] = useState('All');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const scrollRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 2000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!show) return;
    const fetchScores = async () => {
      try {
        const r = await fetch(`${import.meta.env.VITE_API_URL}/api/odds/live-scores-ticker`);
        const data = await r.json();
        if (Array.isArray(data)) setScores(data);
      } catch {}
    };
    fetchScores();
    const interval = setInterval(fetchScores, 60000);
    return () => clearInterval(interval);
  }, [show]);

  useEffect(() => {
    if (!scrollRef.current || scores.length === 0) return;
    let pos = 0;
    const id = setInterval(() => {
      pos += 0.5;
      if (scrollRef.current) {
        if (pos >= scrollRef.current.scrollWidth / 2) pos = 0;
        scrollRef.current.scrollLeft = pos;
      }
    }, 20);
    return () => clearInterval(id);
  }, [scores, sportFilter]);

  useEffect(() => {
    function handler(e) { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!show) return null;

  const filtered = sportFilter === 'All' ? scores : scores.filter(g => g.sport === sportFilter);
  if (filtered.length === 0 && scores.length === 0) return null;
  const display = filtered.length > 0 ? filtered : scores;
  const doubled = [...display, ...display];

  return (
    <div style={{ background: 'rgba(3,3,10,0.95)', borderBottom: '1px solid rgba(255,255,255,0.04)', height: 36, display: 'flex', alignItems: 'center' }}>
      {/* Sport filter dropdown */}
      <div ref={dropdownRef} style={{ position: 'relative', flexShrink: 0, paddingLeft: 12 }}>
        <button onClick={() => setDropdownOpen(o => !o)}
          style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 100, padding: '3px 10px', fontSize: 10, fontWeight: 700,
            color: '#f0f4ff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
          }}>
          {sportFilter} <span style={{ fontSize: 8, opacity: 0.5 }}>{dropdownOpen ? '\u25B2' : '\u25BC'}</span>
        </button>
        {dropdownOpen && (
          <div style={{
            position: 'absolute', top: '100%', left: 12, marginTop: 4,
            background: '#070712', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
            padding: 6, zIndex: 100, minWidth: 100,
          }}>
            {['All', 'NBA', 'NFL', 'MLB', 'NHL', 'Soccer', 'UFC'].map(s => (
              <div key={s} onClick={() => { setSportFilter(s); setDropdownOpen(false); }}
                style={{
                  padding: '6px 10px', fontSize: 11, color: sportFilter === s ? '#7aaff8' : '#6a7a9a',
                  cursor: 'pointer', borderRadius: 6, background: sportFilter === s ? 'rgba(79,142,247,0.1)' : 'transparent',
                }}
                onMouseEnter={e => { if (sportFilter !== s) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { if (sportFilter !== s) e.currentTarget.style.background = 'transparent'; }}>
                {s}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scrolling scores */}
      <div ref={scrollRef} style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap', flex: 1 }}>
        {doubled.map((game, i) => (
          <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 20px', borderRight: '1px solid rgba(255,255,255,0.04)', height: 36, flexShrink: 0 }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', padding: '1px 5px', borderRadius: 3, color: (SPORT_COLORS[game.sport] || DEFAULT_SPORT_COLOR).color, background: (SPORT_COLORS[game.sport] || DEFAULT_SPORT_COLOR).bg, border: `1px solid ${(SPORT_COLORS[game.sport] || DEFAULT_SPORT_COLOR).border}` }}>{game.sport}</span>
            <span style={{ fontSize: 11, color: '#8899bb', fontWeight: 600 }}>{game.awayTeam}</span>
            {(game.isLive || game.isFinal) && <span style={{ fontSize: 12, fontWeight: 800, color: '#f0f4ff' }}>{game.awayScore}</span>}
            <span style={{ fontSize: 10, color: '#2a3a5a' }}>@</span>
            <span style={{ fontSize: 11, color: '#8899bb', fontWeight: 600 }}>{game.homeTeam}</span>
            {(game.isLive || game.isFinal) && <span style={{ fontSize: 12, fontWeight: 800, color: '#f0f4ff' }}>{game.homeScore}</span>}
            {game.isLive && <span style={{ fontSize: 9, fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.1)', padding: '1px 5px', borderRadius: 3 }}>{game.period ? `Q${game.period}` : 'LIVE'} {game.clock}</span>}
            {game.isFinal && <span style={{ fontSize: 9, color: '#2a3a5a' }}>FINAL</span>}
            {!game.isLive && !game.isFinal && <span style={{ fontSize: 9, color: '#2a3a5a' }}>{new Date(game.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
