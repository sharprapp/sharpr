import { useState } from 'react';
import { supabase } from '../lib/supabase';

const STEPS = 5;

export default function OnboardingModal({ onComplete, userPlan }) {
  const [step, setStep] = useState(0);
  const [focus, setFocus] = useState([]);
  const isPro = userPlan === 'pro' || userPlan === 'elite';

  async function finish() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase.from('profiles').update({
          onboarding_completed: true,
          onboarding_focus: focus.join(','),
        }).eq('id', user.id);
        if (error) console.error('[Onboarding] Save failed:', error.message);
      }
    } catch (e) {
      console.error('[Onboarding] Error:', e.message);
    }
    onComplete();
  }

  function next() {
    // Skip Pro upsell for Pro users
    if (step === 2 && isPro) setStep(4);
    else if (step >= STEPS - 1) finish();
    else setStep(step + 1);
  }

  const toggleFocus = (v) => setFocus(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  const gc = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 20, cursor: 'pointer', transition: 'all 0.15s' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#070712', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, width: '100%', maxWidth: 520, padding: '40px 36px 32px', position: 'relative' }}>

        {/* Step content */}
        <div style={{ minHeight: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>

          {step === 0 && (
            <>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
              <h2 style={{ fontSize: 28, fontWeight: 900, color: '#f0f4ff', margin: '0 0 8px', letterSpacing: '-0.5px' }}>Welcome to Sharpr</h2>
              <p style={{ fontSize: 15, color: '#6a7a9a', lineHeight: 1.6, maxWidth: 380, margin: '0 0 8px' }}>Your edge in trading and sports betting.</p>
              <p style={{ fontSize: 13, color: '#2a3a5a', lineHeight: 1.6, maxWidth: 360 }}>AI-powered analysis, real-time odds, prediction markets, and a professional journal — all in one place.</p>
            </>
          )}

          {step === 1 && (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f0f4ff', margin: '0 0 6px' }}>What are you here for?</h2>
              <p style={{ fontSize: 13, color: '#4a5a7a', marginBottom: 24 }}>Select all that apply — we'll customize your experience</p>
              <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                {[
                  { key: 'betting', emoji: '🏆', label: 'Sports Betting', desc: 'Odds, props, sharp signals' },
                  { key: 'trading', emoji: '📈', label: 'Day Trading', desc: 'Journal, pre-market, risk calc' },
                  { key: 'both', emoji: '⚡', label: 'Both', desc: 'The full Sharpr experience' },
                ].map(opt => {
                  const active = focus.includes(opt.key);
                  return (
                    <div key={opt.key} onClick={() => toggleFocus(opt.key)}
                      style={{ ...gc, flex: 1, textAlign: 'center',
                        background: active ? 'rgba(79,142,247,0.12)' : gc.background,
                        border: active ? '1px solid rgba(79,142,247,0.4)' : gc.border,
                      }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>{opt.emoji}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: active ? '#7aaff8' : '#f0f4ff', marginBottom: 4 }}>{opt.label}</div>
                      <div style={{ fontSize: 11, color: '#4a5a7a' }}>{opt.desc}</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f0f4ff', margin: '0 0 6px' }}>What you can do</h2>
              <p style={{ fontSize: 13, color: '#4a5a7a', marginBottom: 24 }}>Three features that give you the edge</p>
              <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                {[
                  { emoji: '📡', title: 'Sharp Signals', desc: 'Polymarket vs sportsbook mispricing detection' },
                  { emoji: '🔬', title: 'AI Analysis', desc: 'Claude-powered analysis on any game or market' },
                  { emoji: '📊', title: 'Performance', desc: 'Track P&L, win rate, and Sharpr Score' },
                ].map(f => (
                  <div key={f.title} style={{ ...gc, flex: 1, textAlign: 'center', cursor: 'default' }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{f.emoji}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#f0f4ff', marginBottom: 4 }}>{f.title}</div>
                    <div style={{ fontSize: 11, color: '#4a5a7a', lineHeight: 1.5 }}>{f.desc}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 3 && !isPro && (
            <>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🔓</div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f0f4ff', margin: '0 0 6px' }}>Unlock everything with Pro</h2>
              <p style={{ fontSize: 13, color: '#4a5a7a', marginBottom: 20, maxWidth: 340 }}>Get Sharp Signals, AI game analysis, screenshot upload, unlimited journal, and more.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', textAlign: 'left', marginBottom: 20 }}>
                {['Sharp Signals — cross-market mispricings', 'AI analysis on every game & market', 'Screenshot upload auto-fill', 'Unlimited journal + PDF export', '50 AI queries/day'].map(f => (
                  <div key={f} style={{ fontSize: 13, color: '#6a7a9a', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#4f8ef7' }}>✓</span> {f}
                  </div>
                ))}
              </div>
              <button onClick={() => { window.dispatchEvent(new CustomEvent('open-upgrade')); finish(); }}
                style={{ width: '100%', background: '#4f8ef7', border: 'none', borderRadius: 12, padding: '14px 24px', fontSize: 15, fontWeight: 700, color: 'white', cursor: 'pointer', marginBottom: 8 }}>
                Upgrade to Pro — $19/mo
              </button>
              <button onClick={next} style={{ background: 'none', border: 'none', color: '#2a3a5a', fontSize: 13, cursor: 'pointer', padding: 8 }}>Maybe later</button>
            </>
          )}

          {(step === 4 || (step === 3 && isPro)) && (
            <>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
              <h2 style={{ fontSize: 28, fontWeight: 900, color: '#f0f4ff', margin: '0 0 8px', letterSpacing: '-0.5px' }}>You're ready to go</h2>
              <p style={{ fontSize: 15, color: '#6a7a9a', lineHeight: 1.6, maxWidth: 340 }}>Start logging your bets and trades, explore prediction markets, and find your edge.</p>
            </>
          )}
        </div>

        {/* Bottom: dots + button */}
        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          {/* Next/Finish button (not shown on upsell step — it has its own buttons) */}
          {!(step === 3 && !isPro) && (
            <button onClick={step === 4 || (step === 3 && isPro) ? finish : next}
              style={{ width: '100%', background: '#4f8ef7', border: 'none', borderRadius: 12, padding: '14px 24px', fontSize: 15, fontWeight: 700, color: 'white', cursor: 'pointer' }}>
              {step === 4 || (step === 3 && isPro) ? 'Go to Dashboard' : 'Next'}
            </button>
          )}

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: 6 }}>
            {Array.from({ length: isPro ? 4 : STEPS }, (_, i) => (
              <div key={i} style={{ width: step === i ? 20 : 6, height: 6, borderRadius: 3, background: step === i ? '#4f8ef7' : 'rgba(255,255,255,0.1)', transition: 'all 0.3s' }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
