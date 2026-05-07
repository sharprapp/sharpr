import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import api from '../lib/api';

const FREE_LIMIT = 5;

// Global player cache — loaded once on first mount, shared across all PlayerSearch instances
let _allPlayers = [];
let _allPlayersLoaded = false;
let _allPlayersPromise = null;

async function loadAllPlayers() {
  if (_allPlayersLoaded) return _allPlayers;
  if (_allPlayersPromise) return _allPlayersPromise;
  _allPlayersPromise = api.get('/api/fantasy/browse')
    .then(r => {
      _allPlayers = r.data.players || [];
      _allPlayersLoaded = true;
      return _allPlayers;
    })
    .catch(() => { _allPlayersLoaded = true; return []; });
  return _allPlayersPromise;
}

// Current NFL season — offseason-aware
const NFL_SEASON = (() => {
  const now = new Date();
  return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
})();

// NFL week helper — returns null if offseason
function getCurrentNFLWeek() {
  const now = new Date();
  const seasonStart = new Date(`${NFL_SEASON}-09-05`);
  const ms = now - seasonStart;
  if (ms < 0 || ms > 18 * 7 * 86400000) return null;
  return Math.min(18, Math.ceil(ms / (7 * 86400000)));
}

const CURRENT_WEEK = getCurrentNFLWeek();

// ── Injury badge ─────────────────────────────────────────────────────────────
function InjuryBadge({ status }) {
  if (!status) return null;
  const cfg = {
    'Questionable': { bg: 'rgba(245,158,11,0.2)', color: '#f59e0b', label: 'Q' },
    'Doubtful':     { bg: 'rgba(255,100,0,0.2)',  color: '#f97316', label: 'D' },
    'Out':          { bg: 'rgba(255,69,96,0.2)',   color: '#FF4560', label: 'OUT' },
    'IR':           { bg: 'rgba(255,69,96,0.2)',   color: '#FF4560', label: 'IR' },
    'PUP':          { bg: 'rgba(139,92,246,0.2)',  color: '#a78bfa', label: 'PUP' },
  }[status];
  if (!cfg) return null;
  return (
    <span style={{ background: cfg.bg, color: cfg.color, fontSize: 9, fontWeight: 900, padding: '2px 6px', borderRadius: 6, letterSpacing: '0.04em', flexShrink: 0 }}>
      {cfg.label}
    </span>
  );
}

// ── Debounce ─────────────────────────────────────────────────────────────────
function useDebounce(val, ms) {
  const [d, setD] = useState(val);
  useEffect(() => { const t = setTimeout(() => setD(val), ms); return () => clearTimeout(t); }, [val, ms]);
  return d;
}

// ── Player Search ─────────────────────────────────────────────────────────────
function PlayerSearch({ label, placeholder = 'Search NFL player…', selected, onSelect, onClear }) {
  const [q, setQ] = useState('');
  const [allPlayers, setAllPlayers] = useState(_allPlayers);
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const dq = useDebounce(q, 150);
  const ref = useRef(null);
  const listRef = useRef(null);

  // Load full player list on mount (singleton fetch)
  useEffect(() => {
    if (_allPlayersLoaded) { setAllPlayers(_allPlayers); return; }
    loadAllPlayers().then(players => setAllPlayers(players));
  }, []);

  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setFocused(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Reset active index when query changes
  useEffect(() => { setActiveIndex(-1); }, [dq]);

  const lo = dq.toLowerCase();
  const filtered = dq.length >= 1
    ? allPlayers.filter(p => p.name.toLowerCase().includes(lo)).slice(0, 20)
    : allPlayers; // full A-Z list when no query

  const showDropdown = focused && allPlayers.length > 0;

  function handleKeyDown(e) {
    if (!showDropdown) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(activeIndex + 1, filtered.length - 1);
      setActiveIndex(next);
      // scroll active item into view
      if (listRef.current) {
        const item = listRef.current.children[next + 1]; // +1 for header
        if (item) item.scrollIntoView({ block: 'nearest' });
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(Math.max(activeIndex - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && filtered[activeIndex]) {
        onSelect(filtered[activeIndex]);
        setQ('');
        setFocused(false);
        setActiveIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setFocused(false);
      setActiveIndex(-1);
    }
  }

  if (selected) return <PlayerCard player={selected} onClear={onClear} />;

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      {label && <div style={{ fontSize: 11, color: '#6B6B8A', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>}
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        onFocus={e => { setFocused(true); e.target.style.borderColor = '#6C63FF'; }}
        onBlur={e => { e.target.style.borderColor = 'rgba(108,99,255,0.25)'; }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'rgba(17,17,32,0.8)', border: '1px solid rgba(108,99,255,0.25)',
          borderRadius: 10, padding: '10px 14px', color: '#F0F0FF', fontSize: 14, outline: 'none',
          transition: 'border-color 0.15s',
        }}
      />
      {showDropdown && (
        <div ref={listRef} style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: '#0D0D1A', border: '1px solid rgba(108,99,255,0.2)',
          borderRadius: 12, zIndex: 100,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          maxHeight: 340, overflowY: 'auto',
        }}>
          <div style={{ padding: '7px 14px 4px', fontSize: 10, fontWeight: 700, color: '#6B6B8A', letterSpacing: '0.06em', textTransform: 'uppercase', position: 'sticky', top: 0, background: '#0D0D1A', zIndex: 1 }}>
            {dq.length >= 1 ? `${filtered.length} results` : `All Players A–Z · ${allPlayers.length} total`}
          </div>
          {filtered.map((p, i) => (
            <button key={p.id}
              onClick={() => { onSelect(p); setQ(''); setFocused(false); setActiveIndex(-1); }}
              onMouseEnter={() => setActiveIndex(i)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '9px 14px', background: i === activeIndex ? 'rgba(108,99,255,0.15)' : 'transparent', border: 'none', cursor: 'pointer', transition: 'background 0.1s' }}
            >
              <PlayerAvatar player={p} size={36} />
              <div style={{ textAlign: 'left', flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#F0F0FF' }}>{p.name}</div>
                <div style={{ fontSize: 11, color: '#6B6B8A', marginTop: 1 }}>{p.position} · {p.team}</div>
              </div>
              <InjuryBadge status={p.injuryStatus} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Player Avatar ─────────────────────────────────────────────────────────────
function PlayerAvatar({ player, size = 72, borderColor = 'rgba(108,99,255,0.3)' }) {
  const [err, setErr] = useState(false);
  const initials = player.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  if (err) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, rgba(108,99,255,0.25), rgba(0,229,180,0.1))',
        border: `2px solid ${borderColor}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.3, fontWeight: 900, color: '#6C63FF',
      }}>
        {initials}
      </div>
    );
  }
  return (
    <img
      src={player.headshot}
      alt={player.name}
      width={size} height={size}
      style={{ borderRadius: '50%', objectFit: 'cover', background: 'rgba(108,99,255,0.1)', border: `2px solid ${borderColor}`, flexShrink: 0, display: 'block' }}
      onError={() => setErr(true)}
    />
  );
}

// ── Player Card ───────────────────────────────────────────────────────────────
function PlayerCard({ player, onClear, verdict, projPts, compact }) {
  const borderColor = verdict === 'start' ? '#00E5B4' : verdict === 'sit' ? '#FF4560' : 'rgba(108,99,255,0.3)';

  if (compact) {
    return (
      <div style={{
        background: 'rgba(17,17,32,0.85)', border: `1px solid ${borderColor}`,
        borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center',
        gap: 10, position: 'relative',
      }}>
        {onClear && (
          <button onClick={onClear} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 5, color: '#6B6B8A', cursor: 'pointer', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>×</button>
        )}
        <PlayerAvatar player={player} size={44} borderColor={borderColor} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: '#F0F0FF', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{player.name}</div>
          <div style={{ fontSize: 11, color: '#6B6B8A', marginTop: 1 }}>{player.team}</div>
          <div style={{ display: 'flex', gap: 4, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ background: 'rgba(108,99,255,0.15)', color: '#6C63FF', fontSize: 9, fontWeight: 700, padding: '1px 7px', borderRadius: 6 }}>{player.position}</span>
            <InjuryBadge status={player.injuryStatus} />
            {projPts != null && <span style={{ fontSize: 9, fontWeight: 700, color: '#00E5B4', background: 'rgba(0,229,180,0.1)', padding: '1px 7px', borderRadius: 6 }}>{projPts.toFixed(1)} pts</span>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(17,17,32,0.85)', backdropFilter: 'blur(20px)',
      border: `1px solid ${borderColor}`, borderRadius: 16, padding: 20,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 10, position: 'relative', transition: 'border-color 0.3s',
    }}>
      {onClear && (
        <button onClick={onClear} style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 6, color: '#6B6B8A', cursor: 'pointer', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>×</button>
      )}
      {verdict && (
        <div style={{
          position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
          background: verdict === 'start' ? '#00E5B4' : '#FF4560',
          color: '#0A0A0F', fontSize: 10, fontWeight: 900, letterSpacing: '0.08em',
          padding: '3px 14px', borderRadius: 20, textTransform: 'uppercase', whiteSpace: 'nowrap',
        }}>
          {verdict === 'start' ? '▲ START' : '▼ SIT'}
        </div>
      )}
      <PlayerAvatar player={player} size={80} borderColor={borderColor} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 900, fontSize: 16, color: '#F0F0FF', letterSpacing: '-0.03em' }}>{player.name}</div>
        <div style={{ fontSize: 12, color: '#6B6B8A', marginTop: 2 }}>{player.team}</div>
        <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginTop: 6, flexWrap: 'wrap' }}>
          <span style={{ background: 'rgba(108,99,255,0.15)', color: '#6C63FF', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 8 }}>{player.position}</span>
          <InjuryBadge status={player.injuryStatus} />
          {projPts != null && (
            <span style={{ background: 'rgba(0,229,180,0.12)', color: '#00E5B4', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 8 }}>
              {projPts.toFixed(1)} proj pts
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sharp AI Response ───────────────────────────────────────────────────────────
function SharpAIResponse({ text, loading }) {
  if (!text && !loading) return null;
  return (
    <div style={{
      background: 'rgba(17,17,32,0.85)', backdropFilter: 'blur(20px)',
      border: '1px solid rgba(108,99,255,0.2)', borderLeft: '3px solid #6C63FF',
      borderRadius: 14, padding: '18px 22px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 16 }}>🏈</span>
        <span style={{ fontWeight: 800, fontSize: 13, color: '#6C63FF' }}>Sharp AI's Analysis</span>
      </div>
      {loading ? (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '6px 0' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#6C63FF', animation: `faPulse 1.2s ${i * 0.2}s infinite ease-in-out` }} />
          ))}
        </div>
      ) : (
        <ReactMarkdown components={{
          p: ({ children }) => <p style={{ margin: '0 0 10px', color: '#D0D0E8', fontSize: 14, lineHeight: 1.65 }}>{children}</p>,
          strong: ({ children }) => <strong style={{ color: '#00E5B4', fontWeight: 800 }}>{children}</strong>,
          ul: ({ children }) => <ul style={{ margin: '8px 0', paddingLeft: 20 }}>{children}</ul>,
          li: ({ children }) => <li style={{ color: '#C0C0D8', fontSize: 14, marginBottom: 6, lineHeight: 1.5 }}>{children}</li>,
        }}>
          {text}
        </ReactMarkdown>
      )}
    </div>
  );
}

// ── Shared Sharp AI call ────────────────────────────────────────────────────────
async function askSharpAI(message, { setLoading, setReply, setLimitHit, setUsageRemaining }) {
  setLoading(true);
  setReply('');
  try {
    const { data } = await api.post('/api/fantasy/chat', { message });
    setReply(data.reply);
    if (data.usageRemaining !== undefined) setUsageRemaining(data.usageRemaining);
  } catch (err) {
    const d = err.response?.data;
    if (err.response?.status === 429 || d?.limitHit) { setLimitHit(true); setUsageRemaining(0); }
    else setReply('Sharp AI ran into a problem. Try again.');
  } finally {
    setLoading(false);
  }
}

function LimitBanner() {
  return (
    <div style={{ background: 'rgba(255,69,96,0.08)', border: '1px solid rgba(255,69,96,0.2)', borderRadius: 12, padding: '14px 18px', color: '#FF4560', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
      You've used all {FREE_LIMIT} free daily queries.{' '}
      <button onClick={() => window.dispatchEvent(new CustomEvent('open-upgrade'))}
        style={{ background: 'none', border: 'none', color: '#6C63FF', cursor: 'pointer', fontWeight: 800, fontSize: 13, textDecoration: 'underline' }}>
        Upgrade to Pro
      </button>{' '}for unlimited access.
    </div>
  );
}

function ActionBtn({ onClick, disabled, loading, children }) {
  return (
    <button onClick={onClick} disabled={disabled || loading}
      style={{
        background: disabled || loading ? 'rgba(108,99,255,0.25)' : '#6C63FF',
        border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 800,
        padding: '13px 28px', cursor: disabled || loading ? 'not-allowed' : 'pointer',
        letterSpacing: '-0.01em', transition: 'all 0.15s', alignSelf: 'flex-start',
      }}>
      {children}
    </button>
  );
}

function FormatPills({ value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 11, color: '#6B6B8A', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginRight: 4 }}>Scoring:</span>
      {['Standard', 'Half-PPR', 'PPR'].map(f => (
        <button key={f} onClick={() => onChange(f)}
          style={{
            background: value === f ? 'rgba(108,99,255,0.2)' : 'transparent',
            border: value === f ? '1px solid rgba(108,99,255,0.45)' : '1px solid rgba(255,255,255,0.08)',
            color: value === f ? '#867fff' : '#6B6B8A',
            borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>
          {f}
        </button>
      ))}
    </div>
  );
}

// ── Projections hook ──────────────────────────────────────────────────────────
function useProjections(format = 'PPR') {
  const [projections, setProjections] = useState({});
  useEffect(() => {
    if (!CURRENT_WEEK) return;
    api.get(`/api/fantasy/projections?season=${NFL_SEASON}&week=${CURRENT_WEEK}`)
      .then(r => setProjections(r.data.projections || {}))
      .catch(() => {});
  }, []);

  const getProjPts = useCallback((playerId) => {
    const p = projections[playerId];
    if (!p) return null;
    const key = format === 'PPR' ? 'pts_ppr' : format === 'Half-PPR' ? 'pts_half_ppr' : 'pts_std';
    return p[key] ?? null;
  }, [projections, format]);

  return getProjPts;
}

// ─── START / SIT ──────────────────────────────────────────────────────────────
function StartSitTab() {
  const [a, setA] = useState(null);
  const [b, setB] = useState(null);
  const [format, setFormat] = useState('PPR');
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [limitHit, setLimitHit] = useState(false);
  const [usageRemaining, setUsageRemaining] = useState(null);
  const [vA, setVA] = useState(null);
  const [vB, setVB] = useState(null);
  const getProjPts = useProjections(format);

  function detectVerdicts(text) {
    if (!a || !b) return;
    const lo = text.toLowerCase();
    const lastA = a.name.split(' ').pop().toLowerCase();
    const lastB = b.name.split(' ').pop().toLowerCase();
    const idxA = lo.search(new RegExp(`start.{0,30}${lastA}|${lastA}.{0,10}(is your|should) start`, 'i'));
    const idxB = lo.search(new RegExp(`start.{0,30}${lastB}|${lastB}.{0,10}(is your|should) start`, 'i'));
    if (idxA !== -1 && (idxB === -1 || idxA < idxB)) { setVA('start'); setVB('sit'); }
    else if (idxB !== -1) { setVB('start'); setVA('sit'); }
  }

  function reset() { setA(null); setB(null); setReply(''); setVA(null); setVB(null); }

  async function analyze() {
    const projA = getProjPts(a.id);
    const projB = getProjPts(b.id);
    const projStr = CURRENT_WEEK
      ? ` Projected points (${format}): ${a.name}=${projA != null ? projA.toFixed(1) : 'N/A'}, ${b.name}=${projB != null ? projB.toFixed(1) : 'N/A'}.`
      : '';
    const injStr = [a, b].filter(p => p.injuryStatus).map(p => `${p.name} is ${p.injuryStatus}`).join(', ');
    const msg = `Start/Sit: ${a.name} (${a.position}, ${a.team}) vs ${b.name} (${b.position}, ${b.team}) in a ${format} league.${projStr}${injStr ? ` Injury notes: ${injStr}.` : ''} Who should I start this week?`;
    await askSharpAI(msg, { setLoading, setReply: (t) => { setReply(t); detectVerdicts(t); }, setLimitHit, setUsageRemaining });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <FormatPills value={format} onChange={setFormat} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'start' }}>
        <PlayerSearch label="Player A" selected={a} onSelect={p => { setA(p); setReply(''); setVA(null); setVB(null); }} onClear={reset} />
        <div style={{ color: '#2a3a5a', fontWeight: 900, fontSize: 18, textAlign: 'center', paddingTop: 32, userSelect: 'none' }}>VS</div>
        <PlayerSearch label="Player B" selected={b} onSelect={p => { setB(p); setReply(''); setVA(null); setVB(null); }} onClear={() => { setB(null); setReply(''); setVA(null); setVB(null); }} />
      </div>
      {a && b && !reply && <ActionBtn onClick={analyze} loading={loading}>{loading ? 'Asking Sharp AI…' : "Get Sharp AI's Pick"}</ActionBtn>}
      <SharpAIResponse text={reply} loading={loading} />
      {reply && <button onClick={reset} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#6B6B8A', fontSize: 13, fontWeight: 700, padding: '10px 20px', cursor: 'pointer', alignSelf: 'flex-start' }}>New Comparison</button>}
      {limitHit && <LimitBanner />}
    </div>
  );
}

// ─── TRADE ANALYZER ───────────────────────────────────────────────────────────
function TradeTab() {
  const [give, setGive] = useState([null, null]);
  const [receive, setReceive] = useState([null, null]);
  const [need, setNeed] = useState('');
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [limitHit, setLimitHit] = useState(false);
  const [usageRemaining, setUsageRemaining] = useState(null);

  const giveList = give.filter(Boolean);
  const receiveList = receive.filter(Boolean);
  const canAnalyze = giveList.length > 0 && receiveList.length > 0;

  const gradeMatch = reply.match(/\bgrade[:\s]+([A-F][+-]?)|([A-F][+-]?)\s+grade|\btrade\s+([A-F][+-]?)\b/i);
  const grade = gradeMatch?.[1] || gradeMatch?.[2] || gradeMatch?.[3];
  const gradeColor = !grade ? '#6C63FF' : grade[0] === 'A' ? '#00E5B4' : grade[0] === 'B' ? '#6C63FF' : grade[0] === 'C' ? '#f59e0b' : '#FF4560';

  async function analyze() {
    const gStr = giveList.map(p => `${p.name} (${p.position}, ${p.team}${p.injuryStatus ? `, ${p.injuryStatus}` : ''})`).join(' + ');
    const rStr = receiveList.map(p => `${p.name} (${p.position}, ${p.team}${p.injuryStatus ? `, ${p.injuryStatus}` : ''})`).join(' + ');
    const msg = `Evaluate this trade: I give ${gStr} and receive ${rStr}.${need ? ` My team needs: ${need}.` : ''} Give me a trade grade (A through F) and your reasoning.`;
    await askSharpAI(msg, { setLoading, setReply, setLimitHit, setUsageRemaining });
  }

  function reset() { setGive([null, null]); setReceive([null, null]); setNeed(''); setReply(''); }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'rgba(255,69,96,0.04)', border: '1px solid rgba(255,69,96,0.15)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#FF4560', letterSpacing: '0.05em', textTransform: 'uppercase' }}>📤 You Give</div>
          {give.map((p, i) => (
            <PlayerSearch key={i} placeholder={`Player ${i + 1}`} selected={p}
              onSelect={v => setGive(prev => prev.map((x, idx) => idx === i ? v : x))}
              onClear={() => setGive(prev => prev.map((x, idx) => idx === i ? null : x))}
            />
          ))}
          {give.length < 3 && <button onClick={() => setGive(p => [...p, null])} style={{ background: 'transparent', border: '1px dashed rgba(255,69,96,0.3)', borderRadius: 8, color: '#FF4560', fontSize: 12, fontWeight: 700, padding: '7px', cursor: 'pointer' }}>+ Add Player</button>}
        </div>
        <div style={{ background: 'rgba(0,229,180,0.04)', border: '1px solid rgba(0,229,180,0.15)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#00E5B4', letterSpacing: '0.05em', textTransform: 'uppercase' }}>📥 You Receive</div>
          {receive.map((p, i) => (
            <PlayerSearch key={i} placeholder={`Player ${i + 1}`} selected={p}
              onSelect={v => setReceive(prev => prev.map((x, idx) => idx === i ? v : x))}
              onClear={() => setReceive(prev => prev.map((x, idx) => idx === i ? null : x))}
            />
          ))}
          {receive.length < 3 && <button onClick={() => setReceive(p => [...p, null])} style={{ background: 'transparent', border: '1px dashed rgba(0,229,180,0.3)', borderRadius: 8, color: '#00E5B4', fontSize: 12, fontWeight: 700, padding: '7px', cursor: 'pointer' }}>+ Add Player</button>}
        </div>
      </div>
      <input value={need} onChange={e => setNeed(e.target.value)} placeholder="Your team's biggest need — optional (e.g. 'WR depth')"
        style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(17,17,32,0.8)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 10, padding: '10px 14px', color: '#F0F0FF', fontSize: 14, outline: 'none' }} />
      {canAnalyze && !reply && <ActionBtn onClick={analyze} loading={loading}>{loading ? 'Analyzing…' : 'Analyze Trade'}</ActionBtn>}
      {grade && reply && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ background: `${gradeColor}12`, border: `2px solid ${gradeColor}`, borderRadius: 16, padding: '10px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: gradeColor, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Trade Grade</div>
            <div style={{ fontSize: 52, fontWeight: 900, color: gradeColor, letterSpacing: '-0.05em', lineHeight: 1 }}>{grade}</div>
          </div>
        </div>
      )}
      <SharpAIResponse text={reply} loading={loading} />
      {reply && <button onClick={reset} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#6B6B8A', fontSize: 13, fontWeight: 700, padding: '10px 20px', cursor: 'pointer', alignSelf: 'flex-start' }}>New Trade</button>}
      {limitHit && <LimitBanner />}
    </div>
  );
}

// ─── WAIVER WIRE ──────────────────────────────────────────────────────────────
function WaiverTab() {
  const [pos, setPos] = useState('RB');
  const [format, setFormat] = useState('PPR');
  const [injured, setInjured] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [limitHit, setLimitHit] = useState(false);
  const [usageRemaining, setUsageRemaining] = useState(null);
  const [trending, setTrending] = useState([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const getProjPts = useProjections(format);

  useEffect(() => {
    setTrendLoading(true);
    api.get('/api/fantasy/trending')
      .then(r => setTrending(r.data.trending || []))
      .catch(() => setTrending([]))
      .finally(() => setTrendLoading(false));
  }, []);

  const trendingByPos = trending.filter(p => pos === 'DST' ? p.position === 'DEF' : p.position === pos);
  const trendingAll = trendingByPos.length > 0 ? trendingByPos : trending.slice(0, 6);

  async function find() {
    const sub = injured ? `${injured.name} (${injured.team}) is injured/on bye` : `My ${pos} is injured or on bye`;
    const injStatus = injured?.injuryStatus ? ` Status: ${injured.injuryStatus}.` : '';
    const msg = `${sub}.${injStatus} Give me the top 3-4 best available waiver wire pickups at ${pos} for a ${format} league. Lead with the top pickup and give brief reasons for each.`;
    await askSharpAI(msg, { setLoading, setReply, setLimitHit, setUsageRemaining });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 11, color: '#6B6B8A', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Position</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['QB', 'RB', 'WR', 'TE', 'K', 'DST'].map(p => (
            <button key={p} onClick={() => { setPos(p); setReply(''); }}
              style={{ background: pos === p ? '#6C63FF' : 'rgba(108,99,255,0.08)', border: pos === p ? 'none' : '1px solid rgba(108,99,255,0.2)', color: pos === p ? '#fff' : '#6B6B8A', borderRadius: 10, padding: '8px 18px', fontSize: 13, fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s' }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <FormatPills value={format} onChange={v => { setFormat(v); setReply(''); }} />

      {/* Trending adds */}
      <div>
        <div style={{ fontSize: 11, color: '#6B6B8A', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
          🔥 Trending Adds · Last 24h {trendingAll.length > 0 && pos !== 'DST' ? `· ${pos}` : ''}
        </div>
        {trendLoading ? (
          <div style={{ color: '#6B6B8A', fontSize: 13 }}>Loading trending players…</div>
        ) : trendingAll.length === 0 ? (
          <div style={{ color: '#2a3a5a', fontSize: 13 }}>No trending data available</div>
        ) : (
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {trendingAll.map(p => {
              const proj = getProjPts(p.id);
              return (
                <div key={p.id}
                  onClick={() => setInjured(p)}
                  style={{
                    flexShrink: 0, width: 120,
                    background: 'rgba(17,17,32,0.7)', border: '1px solid rgba(108,99,255,0.15)',
                    borderRadius: 12, padding: '12px 10px', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(108,99,255,0.4)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(108,99,255,0.15)'; }}
                >
                  <PlayerAvatar player={p} size={48} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#F0F0FF', lineHeight: 1.2 }}>{p.name.split(' ').pop()}</div>
                    <div style={{ fontSize: 10, color: '#6B6B8A', marginTop: 1 }}>{p.position} · {p.team}</div>
                    {proj != null && <div style={{ fontSize: 10, color: '#00E5B4', fontWeight: 700, marginTop: 2 }}>{proj.toFixed(1)} pts</div>}
                    {p.injuryStatus && <div style={{ marginTop: 2 }}><InjuryBadge status={p.injuryStatus} /></div>}
                  </div>
                  <div style={{ fontSize: 9, color: '#6C63FF', fontWeight: 700 }}>+{(p.addCount / 1000).toFixed(1)}K adds</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <PlayerSearch label="Who's injured or on bye? (optional)" placeholder="Search player…" selected={injured} onSelect={p => { setInjured(p); setReply(''); }} onClear={() => { setInjured(null); setReply(''); }} />

      <ActionBtn onClick={find} loading={loading}>{loading ? 'Finding Pickups…' : `Find Best ${pos} Waiver Pickups`}</ActionBtn>
      <SharpAIResponse text={reply} loading={loading} />
      {limitHit && <LimitBanner />}
    </div>
  );
}

// ─── LINEUP OPTIMIZER ─────────────────────────────────────────────────────────
const SLOTS = [
  { key: 'qb',   label: 'QB',   n: 1 },
  { key: 'rb',   label: 'RB',   n: 2 },
  { key: 'wr',   label: 'WR',   n: 3 },
  { key: 'te',   label: 'TE',   n: 1 },
  { key: 'flex', label: 'FLEX', n: 1 },
  { key: 'k',    label: 'K',    n: 1 },
  { key: 'dst',  label: 'DST',  n: 1 },
];

function LineupTab() {
  const [roster, setRoster] = useState({});
  const [format, setFormat] = useState('PPR');
  const [week, setWeek] = useState(CURRENT_WEEK ? String(CURRENT_WEEK) : '');
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [limitHit, setLimitHit] = useState(false);
  const [usageRemaining, setUsageRemaining] = useState(null);
  const getProjPts = useProjections(format);

  const allPlayers = Object.values(roster).filter(Boolean);
  const canOptimize = allPlayers.length >= 4;

  async function optimize() {
    const rosterStr = SLOTS.map(s => {
      const players = Array.from({ length: s.n }, (_, i) => roster[`${s.key}_${i}`]).filter(Boolean);
      if (!players.length) return null;
      return `${s.label}: ${players.map(p => {
        const proj = getProjPts(p.id);
        return `${p.name} (${p.team}${p.injuryStatus ? `, ${p.injuryStatus}` : ''}${proj != null ? `, proj ${proj.toFixed(1)} pts` : ''})`;
      }).join(', ')}`;
    }).filter(Boolean).join('\n');

    const msg = `Optimize my fantasy lineup for ${week ? `Week ${week}` : 'this week'} in a ${format} league.\n\nMy available players:\n${rosterStr}\n\nTell me the optimal starting lineup, who to sit, and why.`;
    await askSharpAI(msg, { setLoading, setReply, setLimitHit, setUsageRemaining });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormatPills value={format} onChange={setFormat} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#6B6B8A', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Week:</span>
          <input value={week} onChange={e => setWeek(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="—"
            style={{ background: 'rgba(17,17,32,0.8)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 8, padding: '5px 10px', color: '#F0F0FF', fontSize: 14, outline: 'none', width: 52, textAlign: 'center' }} />
        </div>
        {!CURRENT_WEEK && <span style={{ fontSize: 11, color: '#2a3a5a' }}>Offseason — no live projections</span>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {SLOTS.map(slot => (
          <div key={slot.key} style={{ display: 'grid', gridTemplateColumns: `52px repeat(${slot.n}, 1fr)`, gap: 10, alignItems: 'start' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#6C63FF', textAlign: 'right', paddingTop: 10 }}>{slot.label}</div>
            {Array.from({ length: slot.n }, (_, i) => {
              const k = `${slot.key}_${i}`;
              const p = roster[k];
              const proj = p ? getProjPts(p.id) : null;
              return p
                ? <PlayerCard key={i} player={p} compact projPts={proj} onClear={() => { setRoster(prev => { const n = { ...prev }; delete n[k]; return n; }); setReply(''); }} />
                : <PlayerSearch key={i} placeholder={slot.n > 1 ? `${slot.label} ${i + 1}` : slot.label} selected={null} onSelect={v => { setRoster(prev => ({ ...prev, [k]: v })); setReply(''); }} onClear={() => {}} />;
            })}
          </div>
        ))}
      </div>

      {canOptimize && !reply && <ActionBtn onClick={optimize} loading={loading}>{loading ? 'Optimizing…' : 'Optimize My Lineup'}</ActionBtn>}
      <SharpAIResponse text={reply} loading={loading} />
      {reply && <button onClick={() => setReply('')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#6B6B8A', fontSize: 13, fontWeight: 700, padding: '10px 20px', cursor: 'pointer', alignSelf: 'flex-start' }}>Re-Optimize</button>}
      {limitHit && <LimitBanner />}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'startsit', label: 'Start / Sit',       emoji: '⚡' },
  { key: 'trade',    label: 'Trade Analyzer',     emoji: '🔄' },
  { key: 'waiver',   label: 'Waiver Wire',        emoji: '📋' },
  { key: 'lineup',   label: 'Lineup Optimizer',   emoji: '🎯' },
];

export default function FantasyAssistant({ activeTab = 'startsit', tier }) {
  const isPro = tier === 'pro' || tier === 'elite';
  const current = TABS.find(t => t.key === activeTab) || TABS[0];

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, rgba(108,99,255,0.3), rgba(0,229,180,0.15))', border: '1px solid rgba(108,99,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>🏈</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', color: '#F0F0FF' }}>Fantasy Assistant</h1>
            <div style={{ fontSize: 11, color: '#6C63FF', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 1 }}>
              Sharp AI · AI Fantasy Analyst{CURRENT_WEEK ? ` · Week ${CURRENT_WEEK}` : ' · Offseason'}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#6B6B8A' }}>
          {isPro ? <span style={{ color: '#00E5B4', fontWeight: 700 }}>∞ Pro — Unlimited</span> : `${FREE_LIMIT} queries/day free`}
        </div>
      </div>

      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>{current.emoji}</span>
        <span style={{ fontSize: 16, fontWeight: 800, color: '#F0F0FF', letterSpacing: '-0.03em' }}>{current.label}</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(108,99,255,0.12)', marginLeft: 8 }} />
      </div>

      <div style={{ background: 'rgba(11,11,20,0.7)', backdropFilter: 'blur(24px)', border: '1px solid rgba(108,99,255,0.15)', borderRadius: 18, padding: 24 }}>
        {activeTab === 'startsit' && <StartSitTab />}
        {activeTab === 'trade'    && <TradeTab />}
        {activeTab === 'waiver'   && <WaiverTab />}
        {activeTab === 'lineup'   && <LineupTab />}
      </div>

      <style>{`
        @keyframes faPulse {
          0%, 80%, 100% { transform: scale(0.55); opacity: 0.35; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
