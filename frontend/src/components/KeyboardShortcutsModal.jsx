const SHORTCUTS = [
  { section: 'Navigation', items: [
    { keys: ['G', 'H'], desc: 'Go to Home' },
    { keys: ['G', 'T'], desc: 'Go to Trade' },
    { keys: ['G', 'B'], desc: 'Go to Bet' },
    { keys: ['G', 'S'], desc: 'Go to Signals' },
    { keys: ['G', 'E'], desc: 'Go to Events' },
    { keys: ['G', 'P'], desc: 'Go to Polymarket' },
    { keys: ['G', 'A'], desc: 'Go to AI Research' },
    { keys: ['G', 'N'], desc: 'Go to News' },
  ]},
  { section: 'Actions', items: [
    { keys: ['N', 'B'], desc: 'New bet' },
    { keys: ['N', 'T'], desc: 'New trade' },
    { keys: ['⌘', 'K'], desc: 'Command palette' },
  ]},
  { section: 'General', items: [
    { keys: ['?'], desc: 'Show shortcuts' },
    { keys: ['Esc'], desc: 'Close modal / panel' },
  ]},
];

const Key = ({ k }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 24, height: 24, padding: '0 6px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 11, fontWeight: 700, color: '#94A3B8', fontFamily: 'monospace' }}>{k}</span>
);

export default function KeyboardShortcutsModal({ onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#070712', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '28px 32px', width: '100%', maxWidth: 480, position: 'relative' }}>
        <div onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, cursor: 'pointer', color: '#4a5a7a', fontSize: 16 }}>✕</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#f0f4ff', margin: '0 0 20px' }}>Keyboard Shortcuts</h2>
        {SHORTCUTS.map(s => (
          <div key={s.section} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#2a3a5a', textTransform: 'uppercase', marginBottom: 8 }}>{s.section}</div>
            {s.items.map(item => (
              <div key={item.desc} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                <span style={{ fontSize: 13, color: '#6a7a9a' }}>{item.desc}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {item.keys.map((k, i) => <span key={i}>{i > 0 && <span style={{ color: '#1a2535', margin: '0 2px' }}>+</span>}<Key k={k} /></span>)}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
