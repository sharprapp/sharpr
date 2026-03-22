import { useEffect, useRef } from 'react';

export function useKeyboardShortcuts(onAction) {
  const pending = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    function handler(e) {
      // Skip if typing in input/textarea/select
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return;

      // Cmd/Ctrl+K — command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onAction('command-palette');
        return;
      }

      // ? — help
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onAction('help');
        return;
      }

      // Escape — close
      if (e.key === 'Escape') {
        onAction('escape');
        return;
      }

      // Two-key combos: G+X for navigation, N+X for new
      const key = e.key.toLowerCase();

      if (pending.current) {
        clearTimeout(timer.current);
        const combo = pending.current + '+' + key;
        pending.current = null;

        const map = {
          'g+h': 'nav:Home', 'g+t': 'nav:dt-journal', 'g+b': 'nav:sb-journal',
          'g+s': 'nav:Signals', 'g+n': 'nav:news-sports', 'g+e': 'nav:Events',
          'g+p': 'nav:Polymarket', 'g+a': 'nav:AI Research',
          'n+b': 'new:bet', 'n+t': 'new:trade',
        };
        if (map[combo]) { e.preventDefault(); onAction(map[combo]); }
        return;
      }

      if (key === 'g' || key === 'n') {
        pending.current = key;
        timer.current = setTimeout(() => { pending.current = null; }, 500);
      }
    }

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onAction]);
}
