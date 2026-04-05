import { useState, useEffect, useRef } from 'react';

const COMMANDS = [
  { id: 'home', label: 'Go to Home', icon: '🏠', action: 'nav:Home' },
  { id: 'signals', label: 'Go to Sharp Signals', icon: '📡', action: 'nav:Signals' },
  { id: 'events', label: 'Go to Events', icon: '🏆', action: 'nav:Events' },
  { id: 'polymarket', label: 'Go to Polymarket', icon: '🎯', action: 'nav:Polymarket' },
  { id: 'ai', label: 'Go to AI Research', icon: '🔬', action: 'nav:AI Research' },
  { id: 'trade', label: 'Go to Trade Journal', icon: '📓', action: 'nav:dt-journal' },
  { id: 'bet', label: 'Go to Bet Journal', icon: '📓', action: 'nav:sb-journal' },
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
    <div onClick={onClose} className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] px-4 bg-[#0A0A0F]/60 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        onClick={e => e.stopPropagation()} 
        className="w-full max-w-lg bg-[#111120]/90 backdrop-blur-3xl border border-[rgba(108,99,255,0.3)] rounded-3xl overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.8)] animate-in slide-in-from-top-8 duration-500"
      >
        <div className="flex items-center gap-4 px-6 py-5 border-b border-white/5 bg-white/5">
          <div className="text-[#6C63FF] text-xl font-black">⌘</div>
          <input 
            ref={inputRef} 
            value={query} 
            onChange={e => setQuery(e.target.value)} 
            onKeyDown={handleKey}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent border-none outline-none text-[#F0F0FF] text-lg font-bold placeholder:text-[#4E4E63]" 
          />
          <div className="hidden sm:block text-[10px] font-black text-[#6B6B8A] px-2 py-1 rounded bg-black/40 border border-white/10 uppercase tracking-widest">ESC</div>
        </div>

        <div className="max-h-[380px] overflow-y-auto py-3 custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center gap-3">
              <span className="text-3xl opacity-20">🔍</span>
              <span className="text-[10px] font-black text-[#4E4E63] uppercase tracking-[0.4em]">No matching commands found</span>
            </div>
          ) : (
            filtered.map((cmd, i) => (
              <div 
                key={cmd.id} 
                onClick={() => { onAction(cmd.action); onClose(); }}
                onMouseEnter={() => setSelected(i)}
                className={`flex items-center gap-4 px-6 py-4 mx-2 rounded-2xl cursor-pointer transition-all duration-200 group ${i === selected ? 'bg-[#6C63FF]/15' : 'bg-transparent hover:bg-white/5'}`}
              >
                <div className={`w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center text-xl transition-all duration-300 ${i === selected ? 'scale-110 shadow-[0_0_15px_rgba(108,99,255,0.3)]' : 'group-hover:scale-110'}`}>
                  {cmd.icon}
                </div>
                <div className="flex-1">
                  <div className={`text-sm font-black tracking-tight transition-colors ${i === selected ? 'text-[#F0F0FF]' : 'text-[#6B6B8A]'}`}>
                    {cmd.label}
                  </div>
                  <div className="text-[10px] font-bold text-[#4E4E63] uppercase tracking-widest leading-tight">
                    {cmd.action.replace('nav:', '').replace('dt-', 'Trade ').replace('sb-', 'Bet ')}
                  </div>
                </div>
                <div className={`text-[10px] font-black tracking-widest transition-opacity ${i === selected ? 'opacity-100' : 'opacity-0'}`}>
                  <span className="text-[#6C63FF] shadow-[0_0_10px_rgba(108,99,255,0.5)]">ENTER ↵</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-3 border-t border-white/5 bg-black/40 flex items-center justify-between">
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-[#1E1E2E] border border-white/10 text-[9px] text-[#6B6B8A]">↑↓</span>
              <span className="text-[9px] font-black text-[#4E4E63] uppercase tracking-widest">Navigate</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-[#1E1E2E] border border-white/10 text-[9px] text-[#6B6B8A]">↵</span>
              <span className="text-[9px] font-black text-[#4E4E63] uppercase tracking-widest">Select</span>
            </div>
          </div>
          <div className="text-[9px] font-black text-[#6C63FF] uppercase tracking-widest">Sharpr Intelligence</div>
        </div>
      </div>
    </div>
  );
}
