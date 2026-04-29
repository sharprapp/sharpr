import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import api from '../lib/api';

const QUICK_ACTIONS = [
  {
    label: 'Start/Sit Help',
    template: 'I need to decide between [Player A] and [Player B] at [position] this week. My league is [scoring format]. Who should I start?',
  },
  {
    label: 'Trade Analyzer',
    template: 'Evaluate this trade: I give [player(s)] and receive [player(s)]. My team needs [need]. Should I accept?',
  },
  {
    label: 'Waiver Wire',
    template: 'My [position] [player] is injured/bye. Best available waiver pickups this week for a [league type] league?',
  },
  {
    label: 'Lineup Optimizer',
    template: 'Here is my full roster: [list players]. Optimize my starting lineup for Week [X] in [scoring format].',
  },
];

const DAILY_LIMIT_FREE = 5;

export default function FantasyAssistant({ tier }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [usageRemaining, setUsageRemaining] = useState(null);
  const [limitHit, setLimitHit] = useState(false);
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function send(text) {
    const trimmed = (text || input).trim();
    if (!trimmed || loading) return;
    setInput('');
    setLimitHit(false);

    const userMsg = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const { data } = await api.post('/api/fantasy/chat', { message: trimmed });
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      if (data.usageRemaining !== undefined) setUsageRemaining(data.usageRemaining);
    } catch (err) {
      const errData = err.response?.data;
      if (err.response?.status === 429 || errData?.limitHit) {
        setLimitHit(true);
        setUsageRemaining(0);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Try again.' }]);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const isPro = tier === 'pro' || tier === 'elite';

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)', minHeight: 500 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>🏈</span>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', color: '#F0F0FF' }}>
              Fantasy Assistant
            </h1>
            <span style={{
              background: 'rgba(108,99,255,0.15)',
              border: '1px solid rgba(108,99,255,0.3)',
              color: '#6C63FF',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.05em',
              padding: '3px 10px',
              borderRadius: 20,
              textTransform: 'uppercase',
              display: 'inline-block',
              marginTop: 4,
            }}>
              Powered by AI
            </span>
          </div>
        </div>
        {/* Usage counter */}
        <div style={{ fontSize: 12, color: usageRemaining === 0 ? '#FF4560' : '#6B6B8A', fontWeight: 600 }}>
          {isPro ? (
            <span style={{ color: '#00E5B4' }}>∞ Unlimited queries</span>
          ) : usageRemaining !== null ? (
            `${usageRemaining} / ${DAILY_LIMIT_FREE} queries remaining today`
          ) : (
            `${DAILY_LIMIT_FREE} queries/day on free plan`
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20, flexShrink: 0 }}>
        {QUICK_ACTIONS.map(qa => (
          <button
            key={qa.label}
            onClick={() => setInput(qa.template)}
            style={{
              background: 'rgba(108,99,255,0.1)',
              border: '1px solid rgba(108,99,255,0.25)',
              color: '#867fff',
              borderRadius: 20,
              padding: '7px 16px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '-0.01em',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(108,99,255,0.2)'; e.currentTarget.style.borderColor = 'rgba(108,99,255,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(108,99,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(108,99,255,0.25)'; }}
          >
            {qa.label}
          </button>
        ))}
      </div>

      {/* Chat history */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        paddingRight: 4,
        marginBottom: 16,
      }}>
        {messages.length === 0 && (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2a3a5a',
            fontSize: 14,
            gap: 8,
            paddingTop: 60,
          }}>
            <span style={{ fontSize: 48 }}>🏈</span>
            <div style={{ fontWeight: 700, color: '#3a4a6a' }}>Ask Walter anything about your fantasy team</div>
            <div style={{ fontSize: 12, color: '#2a3a5a' }}>Start/sit decisions, trade analysis, waiver pickups</div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '78%',
              padding: '12px 16px',
              borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: msg.role === 'user' ? '#6C63FF' : '#111118',
              borderLeft: msg.role === 'assistant' ? '3px solid #6C63FF' : 'none',
              color: '#F0F0FF',
              fontSize: 14,
              lineHeight: 1.6,
              backdropFilter: 'blur(12px)',
            }}>
              {msg.role === 'assistant' ? (
                <div style={{ '--text-color': '#F0F0FF' }}>
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p style={{ margin: '0 0 8px', color: '#F0F0FF' }}>{children}</p>,
                      strong: ({ children }) => <strong style={{ color: '#00E5B4' }}>{children}</strong>,
                      ul: ({ children }) => <ul style={{ margin: '6px 0', paddingLeft: 18 }}>{children}</ul>,
                      li: ({ children }) => <li style={{ color: '#C0C0D0', marginBottom: 4 }}>{children}</li>,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '14px 20px',
              background: '#111118',
              borderLeft: '3px solid #6C63FF',
              borderRadius: '18px 18px 18px 4px',
              display: 'flex',
              gap: 6,
              alignItems: 'center',
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#6C63FF',
                  animation: `fantasyPulse 1.2s ${i * 0.2}s infinite ease-in-out`,
                }} />
              ))}
            </div>
          </div>
        )}
        {limitHit && (
          <div style={{
            background: 'rgba(255,69,96,0.08)',
            border: '1px solid rgba(255,69,96,0.25)',
            borderRadius: 12,
            padding: '14px 18px',
            color: '#FF4560',
            fontSize: 13,
            fontWeight: 600,
            textAlign: 'center',
          }}>
            You've used all {DAILY_LIMIT_FREE} free queries today.{' '}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-upgrade'))}
              style={{ background: 'none', border: 'none', color: '#6C63FF', cursor: 'pointer', fontWeight: 800, fontSize: 13, textDecoration: 'underline' }}
            >
              Upgrade to Pro
            </button>
            {' '}for unlimited access.
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div style={{
        flexShrink: 0,
        background: 'rgba(17,17,32,0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(108,99,255,0.25)',
        borderRadius: 16,
        padding: '12px 16px',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-end',
      }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => {
            if (e.target.value.length <= 500) setInput(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          disabled={loading || limitHit}
          placeholder="Ask Walter about your fantasy team..."
          rows={1}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#F0F0FF',
            fontSize: 14,
            resize: 'none',
            fontFamily: 'inherit',
            lineHeight: 1.5,
            maxHeight: 120,
            overflowY: 'auto',
            opacity: loading || limitHit ? 0.5 : 1,
          }}
          onInput={e => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: input.length > 440 ? '#FF4560' : '#2a3a5a' }}>
            {input.length}/500
          </span>
          <button
            onClick={() => send()}
            disabled={loading || !input.trim() || limitHit}
            style={{
              background: loading || !input.trim() || limitHit ? 'rgba(108,99,255,0.3)' : '#6C63FF',
              border: 'none',
              borderRadius: 10,
              color: '#fff',
              fontSize: 13,
              fontWeight: 800,
              padding: '8px 18px',
              cursor: loading || !input.trim() || limitHit ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
              letterSpacing: '-0.01em',
            }}
          >
            Send
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fantasyPulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
