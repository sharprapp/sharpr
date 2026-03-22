import { useState, useEffect, useRef } from 'react';

const COMMANDS = [
  { id: 'home', label: 'Go to Home', icon: '🏠', action: 'nav:Home' },
  { id: 'signals', label: 'Go to Sharp Signals', icon: '⚡', action: 'nav:Signals' },
  { id: 'events', label: 'Go to Events', icon: '🏟️', action: 'nav:Events' },
  { id: 'polymarket', label: 'Go to Polymarket', icon: '🎯', action: 'nav:Polymarket' },
  { id: 'ai', label: 'Go to AI Research', icon: '🔬', action: 'nav:AI Research' },
  { id: 'trade', label: 'Go to Trade Journal', icon: '📈', action: 'nav:dt-journal' },
  { id: 'bet', label: 'Go to Bet Journal', icon: '🏆', action: 'nav:sb-journal' },
  { id: 'news', label: 'Go to News', icon: '📰', action: 'nav:news-sports' },
  { id: 'new-bet', label: 'Log a new bet', icon: '➕', action: 'new:bet' },
  { id: 'new-trade', label: 'Log a new trade', icon: '➕', action: 'new:trade' },
  { id: 'settings', label: 'Settings', icon: '⚙️', action: 'nav:settings' },
  { id: 'help', label: 'Keyboard shortcuts', icon: '⌨️', action: 'help' },
];

export default function CommandPalette({ onAction, onClose }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtered = query
    ? COMMANDS.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
    : COMMANDS;

  useEffect(() => { setSelected(0); }, [query]);

  function handleKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter' && filtered[selected]) { onAction(filtered[selected].action); onClose(); }
    else if (e.key === 'Escape') onClose();
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '20vh' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#070712', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 480, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#2a3a5a', fontSize: 16 }}>⌘</span>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKey}
            placeholder="Type a command..."
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#f0f4ff', fontSize: 15, fontWeight: 500 }} />
          <span style={{ fontSize: 10, color: '#2a3a5a', padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>ESC</span>
        </div>
        <div style={{ maxHeight: 320, overflowY: 'auto', padding: '4px 0' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 13, color: '#2a3a5a' }}>No results</div>
          )}
          {filtered.map((cmd, i) => (
            <div key={cmd.id} onClick={() => { onAction(cmd.action); onClose(); }}
              onMouseEnter={() => setSelected(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', cursor: 'pointer',
                background: i === selected ? 'rgba(79,142,247,0.1)' : 'transparent',
              }}>
              <span style={{ fontSize: 16, width: 24, textAlign: 'center' }}>{cmd.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: i === selected ? '#7aaff8' : '#6a7a9a' }}>{cmd.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
