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
    if (step === 2 && isPro) setStep(4);
    else if (step >= STEPS - 1) finish();
    else setStep(step + 1);
  }

  const toggleFocus = (v) => setFocus(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-[#0A0A0F]/90 backdrop-blur-md animate-in fade-in duration-500">
      {/* Background Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-[#6C63FF]/10 blur-[100px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-[#00E5B4]/5 blur-[100px] animate-pulse" />
      </div>

      <div className="relative w-full max-w-xl bg-[#111120]/80 backdrop-blur-[40px] border border-[rgba(108,99,255,0.2)] rounded-[32px] p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-white/5">
          <div 
            className="h-full bg-gradient-to-r from-[#6C63FF] to-[#00E5B4] transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / (isPro ? 4 : STEPS)) * 100}%` }}
          />
        </div>

        <div className="min-h-[340px] flex flex-col items-center justify-center text-center">
          {step === 0 && (
            <div className="animate-in fade-in zoom-in duration-500">
              <div className="text-6xl mb-8 p-6 rounded-3xl bg-white/5 border border-white/10 w-fit mx-auto shadow-[0_0_40px_rgba(108,99,255,0.1)]">⚡</div>
              <h2 className="text-4xl font-black text-[#F0F0FF] mb-4 tracking-tight">The Edge Lives Here.</h2>
              <p className="text-lg text-[#6B6B8A] max-w-sm mx-auto leading-relaxed font-medium">Welcome to the most advanced analytics terminal for sharp players.</p>
              <div className="mt-8 flex gap-2 justify-center">
                <span className="px-3 py-1 rounded-full bg-[#6C63FF]/10 border border-[#6C63FF]/20 text-[10px] font-black text-[#6C63FF] uppercase tracking-widest">Prediction Markets</span>
                <span className="px-3 py-1 rounded-full bg-[#00E5B4]/10 border border-[#00E5B4]/20 text-[10px] font-black text-[#00E5B4] uppercase tracking-widest">AI Intelligence</span>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="w-full animate-in slide-in-from-right-8 duration-500">
              <h2 className="text-2xl font-black text-[#F0F0FF] mb-2 tracking-tight uppercase">Mission Protocol</h2>
              <p className="text-sm text-[#6B6B8A] mb-8 font-bold uppercase tracking-widest">Select your primary focus filters</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { key: 'betting', emoji: '🏆', label: 'Bettor', desc: 'Sharp signals & odds' },
                  { key: 'trading', emoji: '📈', label: 'Trader', desc: 'Journal & risk calc' },
                  { key: 'both', emoji: '⚡', label: 'Hybrid', desc: 'The full terminal' },
                ].map(opt => {
                  const active = focus.includes(opt.key);
                  return (
                    <button key={opt.key} onClick={() => toggleFocus(opt.key)}
                      className={`p-6 rounded-2xl border transition-all duration-300 text-center group ${active ? 'bg-[#6C63FF]/20 border-[#6C63FF] shadow-[0_0_25px_rgba(108,99,255,0.2)]' : 'bg-black/20 border-white/5 hover:border-white/20'}`}>
                      <div className={`text-3xl mb-3 transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>{opt.emoji}</div>
                      <div className={`text-sm font-black mb-1 tracking-tight ${active ? 'text-[#F0F0FF]' : 'text-[#6B6B8A]'}`}>{opt.label}</div>
                      <div className="text-[10px] text-[#4E4E63] font-bold uppercase leading-tight">{opt.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="w-full animate-in slide-in-from-right-8 duration-500">
              <h2 className="text-2xl font-black text-[#F0F0FF] mb-2 tracking-tight uppercase">System Capabilities</h2>
              <p className="text-sm text-[#6B6B8A] mb-10 font-bold uppercase tracking-widest">Three engines, one terminal</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  { emoji: '📡', title: 'Signals', desc: 'Cross-market edge detection' },
                  { emoji: '🔬', title: 'Intelligence', desc: 'Claude-powered market analysis' },
                  { emoji: '📊', title: 'Journal', desc: 'Institutional perf tracking' },
                ].map(f => (
                  <div key={f.title} className="p-6 rounded-2xl bg-black/20 border border-white/5 text-center">
                    <div className="text-3xl mb-3">{f.emoji}</div>
                    <div className="text-xs font-black text-[#F0F0FF] mb-2 tracking-widest uppercase">{f.title}</div>
                    <div className="text-[11px] text-[#6B6B8A] leading-relaxed font-bold uppercase tracking-tight">{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && !isPro && (
            <div className="w-full animate-in zoom-in-95 duration-500">
              <div className="text-5xl mb-6">🔓</div>
              <h2 className="text-2xl font-black text-[#F0F0FF] mb-2 tracking-tight uppercase">Unlock Elite Tier</h2>
              <p className="text-sm text-[#6B6B8A] mb-8 font-bold uppercase tracking-widest">Gain full institutional access</p>
              
              <div className="bg-black/30 border border-white/5 rounded-2xl p-6 mb-8 text-left space-y-3">
                {[
                  'Live Sharp Signals — Mispricing detection',
                  'AI Terminal Access — Deep research',
                  'Unlimited Journaling & PDF Analytics',
                  'Stripe-secure professional billing'
                ].map(f => (
                  <div key={f} className="flex items-center gap-3 text-xs font-bold text-[#F0F0FF]">
                    <span className="text-[#00E5B4]">✦</span> {f}
                  </div>
                ))}
              </div>

              <button onClick={() => { window.dispatchEvent(new CustomEvent('open-upgrade')); finish(); }}
                className="w-full py-4 rounded-xl bg-[#6C63FF] text-white font-black text-sm tracking-[0.2em] shadow-[0_0_30px_rgba(108,99,255,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all uppercase mb-4">
                Redeem Elite Access
              </button>
              <button onClick={next} className="text-[10px] font-black text-[#4E4E63] uppercase tracking-[0.3em] hover:text-[#6B6B8A] transition-colors">Skip for now</button>
            </div>
          )}

          {(step === 4 || (step === 3 && isPro)) && (
            <div className="animate-in zoom-in-95 duration-500">
              <div className="text-6xl mb-8">🎯</div>
              <h2 className="text-4xl font-black text-[#F0F0FF] mb-4 tracking-tight">Ready for Deployment.</h2>
              <p className="text-lg text-[#6B6B8A] max-w-sm mx-auto leading-relaxed font-medium">Your customized Sharpr terminal is calibrated and ready.</p>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="mt-12 flex flex-col items-center gap-8">
          {!(step === 3 && !isPro) && (
            <button 
              onClick={step === 4 || (step === 3 && isPro) ? finish : next}
              className={`w-full py-5 rounded-2xl font-black text-sm tracking-[0.3em] transition-all uppercase shadow-lg ${step === 0 ? 'bg-[#6C63FF] text-white shadow-[#6C63FF]/20' : 'bg-white text-black hover:bg-white/90'}`}
            >
              {step === 4 || (step === 3 && isPro) ? 'Enter Terminal' : 'Proceed'}
            </button>
          )}

          <div className="flex gap-2">
            {Array.from({ length: isPro ? 4 : STEPS }, (_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${step === i ? 'w-8 bg-[#6C63FF]' : 'w-2 bg-white/10'}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
