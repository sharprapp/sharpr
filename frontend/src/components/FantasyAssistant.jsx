import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import api from '../lib/api';

const FREE_LIMIT = 5;
const hs = (id) => `https://a.espncdn.com/i/headshots/nfl/players/full/${id}.png`;

function useDebounce(val, ms) {
  const [d, setD] = useState(val);
  useEffect(() => { const t = setTimeout(() => setD(val), ms); return () => clearTimeout(t); }, [val, ms]);
  return d;
}

// ── Player Search ────────────────────────────────────────────────────────────
function PlayerSearch({ label, placeholder = 'Search NFL player...', selected, onSelect, onClear }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const dq = useDebounce(q, 350);
  const ref = useRef(null);

  useEffect(() => {
    if (dq.length < 2) { setResults([]); return; }
    setBusy(true);
    api.get(`/api/fantasy/player?q=${encodeURIComponent(dq)}`)
      .then(r => setResults(r.data.players || []))
      .catch(() => setResults([]))
      .finally(() => setBusy(false));
  }, [dq]);

  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setResults([]); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  if (selected) {
    return <PlayerCard player={selected} onClear={onClear} />;
  }

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      {label && (
        <div style={{ fontSize: 11, color: '#6B6B8A', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
          {label}
        </div>
      )}
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'rgba(17,17,32,0.8)', border: '1px solid rgba(108,99,255,0.25)',
          borderRadius: 10, padding: '10px 14px', color: '#F0F0FF', fontSize: 14, outline: 'none',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => { e.target.style.borderColor = '#6C63FF'; }}
        onBlur={e => { e.target.style.borderColor = 'rgba(108,99,255,0.25)'; }}
      />
      {(busy || results.length > 0) && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: '#0D0D1A', border: '1px solid rgba(108,99,255,0.2)',
          borderRadius: 12, zIndex: 100, overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}>
          {busy && <div style={{ padding: '12px 14px', color: '#6B6B8A', fontSize: 13 }}>Searching...</div>}
          {results.map(p => (
            <button
              key={p.id}
              onClick={() => { onSelect(p); setQ(''); setResults([]); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'background 0.1s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(108,99,255,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <img
                src={hs(p.id)} alt="" width={38} height={38}
                style={{ borderRadius: '50%', objectFit: 'cover', background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)', flexShrink: 0 }}
                onError={e => { e.target.style.opacity = 0; }}
              />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#F0F0FF' }}>{p.name}</div>
                <div style={{ fontSize: 11, color: '#6B6B8A', marginTop: 1 }}>{p.position} · {p.team}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Player Card ──────────────────────────────────────────────────────────────
function PlayerCard({ player, onClear, verdict, compact }) {
  const border = verdict === 'start' ? '#00E5B4' : verdict === 'sit' ? '#FF4560' : 'rgba(108,99,255,0.3)';
  const imgSize = compact ? 54 : 76;

  return (
    <div style={{
      background: 'rgba(17,17,32,0.85)', backdropFilter: 'blur(20px)',
      border: `1px solid ${border}`, borderRadius: 14, padding: compact ? '12px 14px' : '18px',
      display: 'flex', flexDirection: compact ? 'row' : 'column', alignItems: 'center',
      gap: compact ? 10 : 10, position: 'relative', transition: 'border-color 0.3s',
    }}>
      {onClear && (
        <button
          onClick={onClear}
          style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 6, color: '#6B6B8A', cursor: 'pointer', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}
        >×</button>
      )}
      {verdict && !compact && (
        <div style={{
          position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
          background: verdict === 'start' ? '#00E5B4' : '#FF4560',
          color: '#000', fontSize: 10, fontWeight: 900, letterSpacing: '0.08em',
          padding: '3px 12px', borderRadius: 20, textTransform: 'uppercase', whiteSpace: 'nowrap',
        }}>
          {verdict === 'start' ? '▲ START' : '▼ SIT'}
        </div>
      )}
      <img
        src={hs(player.id)} alt={player.name}
        style={{ width: imgSize, height: imgSize, borderRadius: '50%', objectFit: 'cover', background: 'rgba(108,99,255,0.12)', border: `2px solid ${border}`, flexShrink: 0 }}
        onError={e => {
          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=1E1E2E&color=6C63FF&size=${imgSize}`;
        }}
      />
      <div style={{ textAlign: compact ? 'left' : 'center', flex: compact ? 1 : 'unset' }}>
        <div style={{ fontWeight: 900, fontSize: compact ? 13 : 15, color: '#F0F0FF', letterSpacing: '-0.02em' }}>{player.name}</div>
        <div style={{ fontSize: 11, color: '#6B6B8A', marginTop: 1 }}>{player.team}</div>
        <span style={{
          background: 'rgba(108,99,255,0.15)', color: '#6C63FF', fontSize: 10, fontWeight: 700,
          padding: '2px 8px', borderRadius: 8, display: 'inline-block', marginTop: 4,
        }}>{player.position || '—'}</span>
      </div>
    </div>
  );
}

// ── Walter Response ──────────────────────────────────────────────────────────
function WalterResponse({ text, loading }) {
  if (!text && !loading) return null;
  return (
    <div style={{
      background: 'rgba(17,17,32,0.85)', backdropFilter: 'blur(20px)',
      border: '1px solid rgba(108,99,255,0.2)', borderLeft: '3px solid #6C63FF',
      borderRadius: 14, padding: '18px 22px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 16 }}>🏈</span>
        <span style={{ fontWeight: 800, fontSize: 13, color: '#6C63FF', letterSpacing: '-0.01em' }}>Walter's Analysis</span>
      </div>
      {loading ? (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '6px 0' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#6C63FF', animation: `faPulse 1.2s ${i * 0.2}s infinite ease-in-out` }} />
          ))}
        </div>
      ) : (
        <ReactMarkdown
          components={{
            p: ({ children }) => <p style={{ margin: '0 0 10px', color: '#D0D0E8', fontSize: 14, lineHeight: 1.65 }}>{children}</p>,
            strong: ({ children }) => <strong style={{ color: '#00E5B4', fontWeight: 800 }}>{children}</strong>,
            ul: ({ children }) => <ul style={{ margin: '8px 0', paddingLeft: 20 }}>{children}</ul>,
            li: ({ children }) => <li style={{ color: '#C0C0D8', fontSize: 14, marginBottom: 6, lineHeight: 1.5 }}>{children}</li>,
          }}
        >
          {text}
        </ReactMarkdown>
      )}
    </div>
  );
}

// ── Shared Walter call ───────────────────────────────────────────────────────
async function askWalter(message, { setLoading, setReply, setLimitHit, setUsageRemaining }) {
  setLoading(true);
  setReply('');
  try {
    const { data } = await api.post('/api/fantasy/chat', { message });
    setReply(data.reply);
    if (data.usageRemaining !== undefined) setUsageRemaining(data.usageRemaining);
  } catch (err) {
    const d = err.response?.data;
    if (err.response?.status === 429 || d?.limitHit) {
      setLimitHit(true);
      setUsageRemaining(0);
    } else {
      setReply('Walter ran into a problem. Try again.');
    }
  } finally {
    setLoading(false);
  }
}

// ── Limit Banner ─────────────────────────────────────────────────────────────
function LimitBanner() {
  return (
    <div style={{ background: 'rgba(255,69,96,0.08)', border: '1px solid rgba(255,69,96,0.2)', borderRadius: 12, padding: '14px 18px', color: '#FF4560', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
      You've used all {FREE_LIMIT} free daily queries.{' '}
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('open-upgrade'))}
        style={{ background: 'none', border: 'none', color: '#6C63FF', cursor: 'pointer', fontWeight: 800, fontSize: 13, textDecoration: 'underline' }}
      >
        Upgrade to Pro
      </button>{' '}for unlimited access.
    </div>
  );
}

// ── Action Button ────────────────────────────────────────────────────────────
function ActionBtn({ onClick, disabled, loading, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        background: disabled || loading ? 'rgba(108,99,255,0.25)' : '#6C63FF',
        border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 800,
        padding: '13px 28px', cursor: disabled || loading ? 'not-allowed' : 'pointer',
        letterSpacing: '-0.01em', transition: 'all 0.15s', alignSelf: 'flex-start',
      }}
    >
      {children}
    </button>
  );
}

// ── Format Pills ─────────────────────────────────────────────────────────────
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
          }}
        >{f}</button>
      ))}
    </div>
  );
}

// ─── START / SIT ─────────────────────────────────────────────────────────────
function StartSitTab({ onUsage }) {
  const [a, setA] = useState(null);
  const [b, setB] = useState(null);
  const [format, setFormat] = useState('PPR');
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [limitHit, setLimitHit] = useState(false);
  const [usageRemaining, setUsageRemaining] = useState(null);
  const [vA, setVA] = useState(null);
  const [vB, setVB] = useState(null);

  function detectVerdicts(text) {
    if (!a || !b) return;
    const lo = text.toLowerCase();
    const lastA = a.name.split(' ').pop().toLowerCase();
    const lastB = b.name.split(' ').pop().toLowerCase();
    const idxStartA = lo.search(new RegExp(`start.{0,30}${lastA}|${lastA}.{0,10}start`, 'i'));
    const idxStartB = lo.search(new RegExp(`start.{0,30}${lastB}|${lastB}.{0,10}start`, 'i'));
    if (idxStartA !== -1 && (idxStartB === -1 || idxStartA < idxStartB)) {
      setVA('start'); setVB('sit');
    } else if (idxStartB !== -1) {
      setVB('start'); setVA('sit');
    }
  }

  function reset() { setA(null); setB(null); setReply(''); setVA(null); setVB(null); }

  async function analyze() {
    const msg = `Start/Sit: ${a.name} (${a.position}, ${a.team}) vs ${b.name} (${b.position}, ${b.team}) in a ${format} league. Who should I start this week?`;
    await askWalter(msg, { setLoading, setReply: (t) => { setReply(t); detectVerdicts(t); }, setLimitHit, setUsageRemaining });
    onUsage?.();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <FormatPills value={format} onChange={setFormat} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center' }}>
        <PlayerSearch
          label="Player A"
          selected={a}
          onSelect={p => { setA(p); setReply(''); setVA(null); setVB(null); }}
          onClear={reset}
        />
        <div style={{ color: '#2a3a5a', fontWeight: 900, fontSize: 18, textAlign: 'center', userSelect: 'none' }}>VS</div>
        <PlayerSearch
          label="Player B"
          selected={b}
          onSelect={p => { setB(p); setReply(''); setVA(null); setVB(null); }}
          onClear={() => { setB(null); setReply(''); setVA(null); setVB(null); }}
        />
      </div>

      {a && b && !reply && <ActionBtn onClick={analyze} loading={loading}>{loading ? 'Asking Walter…' : "Get Walter's Pick"}</ActionBtn>}
      <WalterResponse text={reply} loading={loading} />
      {reply && (
        <button onClick={reset} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#6B6B8A', fontSize: 13, fontWeight: 700, padding: '10px 20px', cursor: 'pointer', alignSelf: 'flex-start' }}>
          New Comparison
        </button>
      )}
      {limitHit && <LimitBanner />}
    </div>
  );
}

// ─── TRADE ANALYZER ──────────────────────────────────────────────────────────
function TradeTab({ onUsage }) {
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
    const gStr = giveList.map(p => `${p.name} (${p.position}, ${p.team})`).join(' + ');
    const rStr = receiveList.map(p => `${p.name} (${p.position}, ${p.team})`).join(' + ');
    const msg = `Evaluate this trade: I give ${gStr} and receive ${rStr}.${need ? ` My team needs: ${need}.` : ''} Give me a trade grade (A through F) and your reasoning.`;
    await askWalter(msg, { setLoading, setReply, setLimitHit, setUsageRemaining });
    onUsage?.();
  }

  function reset() { setGive([null, null]); setReceive([null, null]); setNeed(''); setReply(''); }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Give */}
        <div style={{ background: 'rgba(255,69,96,0.04)', border: '1px solid rgba(255,69,96,0.15)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#FF4560', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 2 }}>📤 You Give</div>
          {give.map((p, i) => (
            <PlayerSearch key={i} placeholder={`Player ${i + 1}`} selected={p}
              onSelect={v => setGive(prev => prev.map((x, idx) => idx === i ? v : x))}
              onClear={() => setGive(prev => prev.map((x, idx) => idx === i ? null : x))}
            />
          ))}
          {give.length < 3 && (
            <button onClick={() => setGive(prev => [...prev, null])}
              style={{ background: 'transparent', border: '1px dashed rgba(255,69,96,0.3)', borderRadius: 8, color: '#FF4560', fontSize: 12, fontWeight: 700, padding: '7px', cursor: 'pointer' }}>
              + Add Player
            </button>
          )}
        </div>

        {/* Receive */}
        <div style={{ background: 'rgba(0,229,180,0.04)', border: '1px solid rgba(0,229,180,0.15)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#00E5B4', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 2 }}>📥 You Receive</div>
          {receive.map((p, i) => (
            <PlayerSearch key={i} placeholder={`Player ${i + 1}`} selected={p}
              onSelect={v => setReceive(prev => prev.map((x, idx) => idx === i ? v : x))}
              onClear={() => setReceive(prev => prev.map((x, idx) => idx === i ? null : x))}
            />
          ))}
          {receive.length < 3 && (
            <button onClick={() => setReceive(prev => [...prev, null])}
              style={{ background: 'transparent', border: '1px dashed rgba(0,229,180,0.3)', borderRadius: 8, color: '#00E5B4', fontSize: 12, fontWeight: 700, padding: '7px', cursor: 'pointer' }}>
              + Add Player
            </button>
          )}
        </div>
      </div>

      <input
        value={need}
        onChange={e => setNeed(e.target.value)}
        placeholder="Your team's biggest need — optional (e.g. 'WR depth', 'RB1')"
        style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(17,17,32,0.8)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 10, padding: '10px 14px', color: '#F0F0FF', fontSize: 14, outline: 'none' }}
      />

      {canAnalyze && !reply && <ActionBtn onClick={analyze} loading={loading}>{loading ? 'Analyzing…' : 'Analyze Trade'}</ActionBtn>}

      {grade && reply && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ background: `${gradeColor}12`, border: `2px solid ${gradeColor}`, borderRadius: 16, padding: '10px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: gradeColor, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Trade Grade</div>
            <div style={{ fontSize: 52, fontWeight: 900, color: gradeColor, letterSpacing: '-0.05em', lineHeight: 1 }}>{grade}</div>
          </div>
        </div>
      )}

      <WalterResponse text={reply} loading={loading} />
      {reply && <button onClick={reset} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#6B6B8A', fontSize: 13, fontWeight: 700, padding: '10px 20px', cursor: 'pointer', alignSelf: 'flex-start' }}>New Trade</button>}
      {limitHit && <LimitBanner />}
    </div>
  );
}

// ─── WAIVER WIRE ─────────────────────────────────────────────────────────────
function WaiverTab({ onUsage }) {
  const [pos, setPos] = useState('RB');
  const [format, setFormat] = useState('PPR');
  const [injured, setInjured] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [limitHit, setLimitHit] = useState(false);
  const [usageRemaining, setUsageRemaining] = useState(null);

  async function find() {
    const sub = injured ? `${injured.name} (${injured.team}) is injured/on bye` : `My ${pos} is injured or on bye`;
    const msg = `${sub}. Give me the top 3-4 best available waiver wire pickups at ${pos} this week for a ${format} league. Lead with the top pickup and give brief reasons for each.`;
    await askWalter(msg, { setLoading, setReply, setLimitHit, setUsageRemaining });
    onUsage?.();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 11, color: '#6B6B8A', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Position</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['QB', 'RB', 'WR', 'TE', 'K', 'DST'].map(p => (
            <button key={p} onClick={() => { setPos(p); setReply(''); }}
              style={{
                background: pos === p ? '#6C63FF' : 'rgba(108,99,255,0.08)',
                border: pos === p ? 'none' : '1px solid rgba(108,99,255,0.2)',
                color: pos === p ? '#fff' : '#6B6B8A',
                borderRadius: 10, padding: '8px 18px', fontSize: 13, fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s',
              }}>{p}</button>
          ))}
        </div>
      </div>

      <FormatPills value={format} onChange={v => { setFormat(v); setReply(''); }} />

      <PlayerSearch
        label="Who's injured or on bye? (optional)"
        placeholder="Search player..."
        selected={injured}
        onSelect={p => { setInjured(p); setReply(''); }}
        onClear={() => { setInjured(null); setReply(''); }}
      />

      <ActionBtn onClick={find} loading={loading}>
        {loading ? 'Finding Pickups…' : `Find Best ${pos} Waiver Pickups`}
      </ActionBtn>

      <WalterResponse text={reply} loading={loading} />
      {limitHit && <LimitBanner />}
    </div>
  );
}

// ─── LINEUP OPTIMIZER ────────────────────────────────────────────────────────
const SLOTS = [
  { key: 'qb', label: 'QB', n: 1 },
  { key: 'rb', label: 'RB', n: 2 },
  { key: 'wr', label: 'WR', n: 3 },
  { key: 'te', label: 'TE', n: 1 },
  { key: 'flex', label: 'FLEX', n: 1 },
  { key: 'k', label: 'K', n: 1 },
  { key: 'dst', label: 'DST', n: 1 },
];

function LineupTab({ onUsage }) {
  const [roster, setRoster] = useState({});
  const [format, setFormat] = useState('PPR');
  const [week, setWeek] = useState('');
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [limitHit, setLimitHit] = useState(false);
  const [usageRemaining, setUsageRemaining] = useState(null);

  const allPlayers = Object.values(roster).filter(Boolean);
  const canOptimize = allPlayers.length >= 4;

  async function optimize() {
    const lines = SLOTS.map(s =>
      Array.from({ length: s.n }, (_, i) => roster[`${s.key}_${i}`])
        .filter(Boolean)
        .map(p => `${p.name} (${p.team})`)
        .join(', ')
    ).filter(Boolean).map((line, i) => `${SLOTS[i]?.label}: ${line}`);

    const rosterStr = SLOTS.map((s, si) => {
      const players = Array.from({ length: s.n }, (_, i) => roster[`${s.key}_${i}`]).filter(Boolean);
      if (!players.length) return null;
      return `${s.label}: ${players.map(p => `${p.name} (${p.team})`).join(', ')}`;
    }).filter(Boolean).join('\n');

    const msg = `Optimize my fantasy lineup for ${week ? `Week ${week}` : 'this week'} in a ${format} league.\n\nMy available players:\n${rosterStr}\n\nTell me the optimal starting lineup, who to sit, and why.`;
    await askWalter(msg, { setLoading, setReply, setLimitHit, setUsageRemaining });
    onUsage?.();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormatPills value={format} onChange={setFormat} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#6B6B8A', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Week:</span>
          <input
            value={week}
            onChange={e => setWeek(e.target.value.replace(/\D/g, '').slice(0, 2))}
            placeholder="—"
            style={{ background: 'rgba(17,17,32,0.8)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 8, padding: '5px 10px', color: '#F0F0FF', fontSize: 14, outline: 'none', width: 52, textAlign: 'center' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {SLOTS.map(slot => (
          <div key={slot.key} style={{ display: 'grid', gridTemplateColumns: `56px repeat(${slot.n}, 1fr)`, gap: 10, alignItems: 'start' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#6C63FF', letterSpacing: '-0.01em', paddingTop: 10, textAlign: 'right' }}>{slot.label}</div>
            {Array.from({ length: slot.n }, (_, i) => {
              const k = `${slot.key}_${i}`;
              const p = roster[k];
              return (
                <PlayerSearch
                  key={i}
                  placeholder={slot.n > 1 ? `${slot.label} ${i + 1}` : slot.label}
                  selected={p}
                  onSelect={v => { setRoster(prev => ({ ...prev, [k]: v })); setReply(''); }}
                  onClear={() => { setRoster(prev => { const n = { ...prev }; delete n[k]; return n; }); }}
                />
              );
            })}
          </div>
        ))}
      </div>

      {canOptimize && !reply && <ActionBtn onClick={optimize} loading={loading}>{loading ? 'Optimizing…' : 'Optimize My Lineup'}</ActionBtn>}
      <WalterResponse text={reply} loading={loading} />
      {reply && <button onClick={() => setReply('')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#6B6B8A', fontSize: 13, fontWeight: 700, padding: '10px 20px', cursor: 'pointer', alignSelf: 'flex-start' }}>Re-Optimize</button>}
      {limitHit && <LimitBanner />}
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'startsit', label: 'Start / Sit', emoji: '⚡' },
  { key: 'trade',    label: 'Trade Analyzer', emoji: '🔄' },
  { key: 'waiver',  label: 'Waiver Wire', emoji: '📋' },
  { key: 'lineup',  label: 'Lineup Optimizer', emoji: '🎯' },
];

export default function FantasyAssistant({ activeTab = 'startsit', tier }) {
  const [usageRemaining, setUsageRemaining] = useState(null);
  const isPro = tier === 'pro' || tier === 'elite';
  const current = TABS.find(t => t.key === activeTab) || TABS[0];

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(108,99,255,0.3), rgba(0,229,180,0.15))',
            border: '1px solid rgba(108,99,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0,
          }}>🏈</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', color: '#F0F0FF' }}>Fantasy Assistant</h1>
            <div style={{ fontSize: 11, color: '#6C63FF', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 1 }}>
              Walter · AI Fantasy Analyst
            </div>
          </div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: usageRemaining === 0 ? '#FF4560' : '#6B6B8A' }}>
          {isPro
            ? <span style={{ color: '#00E5B4', fontWeight: 700 }}>∞ Pro — Unlimited</span>
            : usageRemaining !== null
              ? `${usageRemaining}/${FREE_LIMIT} queries today`
              : `${FREE_LIMIT} queries/day free`}
        </div>
      </div>

      {/* Current tab label */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>{current.emoji}</span>
        <span style={{ fontSize: 16, fontWeight: 800, color: '#F0F0FF', letterSpacing: '-0.03em' }}>{current.label}</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(108,99,255,0.12)', marginLeft: 8 }} />
      </div>

      {/* Card */}
      <div style={{
        background: 'rgba(11,11,20,0.7)', backdropFilter: 'blur(24px)',
        border: '1px solid rgba(108,99,255,0.15)', borderRadius: 18, padding: 24,
      }}>
        {activeTab === 'startsit' && <StartSitTab onUsage={() => setUsageRemaining(r => r !== null ? Math.max(0, r - 1) : null)} />}
        {activeTab === 'trade'    && <TradeTab    onUsage={() => setUsageRemaining(r => r !== null ? Math.max(0, r - 1) : null)} />}
        {activeTab === 'waiver'   && <WaiverTab   onUsage={() => setUsageRemaining(r => r !== null ? Math.max(0, r - 1) : null)} />}
        {activeTab === 'lineup'   && <LineupTab   onUsage={() => setUsageRemaining(r => r !== null ? Math.max(0, r - 1) : null)} />}
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
