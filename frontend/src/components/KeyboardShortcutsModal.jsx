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
  <span className="inline-flex items-center justify-center min-w-[28px] h-[28px] px-2 rounded-lg bg-black/40 border border-white/10 text-[10px] font-black text-[#6C63FF] shadow-[0_0_10px_rgba(108,99,255,0.2)] tracking-tighter uppercase font-mono">
    {k}
  </span>
);

export default function KeyboardShortcutsModal({ onClose }) {
  return (
    <div onClick={onClose} className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-[#0A0A0F]/80 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        onClick={e => e.stopPropagation()} 
        className="relative w-full max-w-lg bg-[#111120]/90 backdrop-blur-3xl border border-[rgba(108,99,255,0.2)] rounded-[32px] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.7)] animate-in zoom-in-95 duration-500"
      >
        <button onClick={onClose} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[#6B6B8A] hover:bg-white/10 transition-colors bg-clip-padding">
          ✕
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#6C63FF]/10 flex items-center justify-center text-2xl border border-[#6C63FF]/20 shadow-[0_0_20px_rgba(108,99,255,0.1)]">
            ⌨️
          </div>
          <div>
            <h2 className="text-xl font-black text-[#F0F0FF] tracking-tight uppercase">Terminal Shortcuts</h2>
            <p className="text-[10px] font-black text-[#4E4E63] uppercase tracking-[0.4em] leading-tight">Institutional Control Layer</p>
          </div>
        </div>

        <div className="space-y-8 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {SHORTCUTS.map(s => (
            <div key={s.section} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="text-[10px] font-black text-[#6B6B8A] uppercase tracking-[0.4em] border-b border-white/5 pb-2 mb-4 leading-tight">{s.section}</div>
              <div className="space-y-3">
                {s.items.map(item => (
                  <div key={item.desc} className="flex items-center justify-between group">
                    <span className="text-sm font-bold text-[#F0F0FF] transition-colors group-hover:text-[#6C63FF] leading-relaxed">{item.desc}</span>
                    <div className="flex items-center gap-1.5 translate-x-2 transition-transform duration-300 scale-95 group-hover:scale-100 group-hover:translate-x-0">
                      {item.keys.map((k, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          {i > 0 && <span className="text-[10px] font-black text-[#1a2535]">+</span>}
                          <Key k={k} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center text-[9px] font-black uppercase tracking-[0.3em] text-[#2a3a5a]">
          <span>Optimized for institutional speed</span>
          <span className="text-[#6C63FF]/40">Sharpr Platform v2.0</span>
        </div>
      </div>
    </div>
  );
}
