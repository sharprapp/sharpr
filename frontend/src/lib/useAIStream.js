import { useState, useCallback } from 'react';
import { supabase } from './supabase';

export function useAIStream() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const stream = useCallback(async (query, type = 'polymarket', useWebSearch = true) => {
    setText('');
    setLoading(true);
    setError(null);
    setDone(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Not authenticated'); setLoading(false); return; }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/ai/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ query, type, use_web_search: useWebSearch }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        setError(err.error || err.message || 'AI request failed');
        setLoading(false);
        return;
      }

      clearTimeout(timeout);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done: readerDone, value } = await reader.read();
        if (readerDone) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') {
            setDone(true);
            setLoading(false);
            return;
          }
          try {
            const parsed = JSON.parse(payload);
            if (parsed.error) {
              setError(parsed.error);
              setLoading(false);
              return;
            }
            if (parsed.text) {
              accumulated += parsed.text;
              setText(accumulated);
            }
          } catch {}
        }
      }

      setDone(true);
      setLoading(false);
    } catch (e) {
      setError(e.name === 'AbortError' ? 'Request timed out — try again' : (e.message || 'Stream failed'));
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setText('');
    setLoading(false);
    setError(null);
    setDone(false);
  }, []);

  return { text, loading, error, done, stream, reset };
}
