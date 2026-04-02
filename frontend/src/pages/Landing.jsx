import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

/* ──────────────────────────────────────────────
   NATIVE SCROLL & ANIMATION HOOKS
─────────────────────────────────────────────── */
function useIntersectionObserver(options = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsIntersecting(true);
        if (options.triggerOnce) observer.disconnect();
      } else if (!options.triggerOnce) {
        setIsIntersecting(false);
      }
    }, options);

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [options.triggerOnce, options.threshold, options.rootMargin]);

  return [ref, isIntersecting];
}

function useCounter(end, duration = 2000, trigger = true) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!trigger) return;
    let startTime = null;
    let animationFrame;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress); // easeOutExpo
      setCount(Math.floor(ease * end));
      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(step);
      }
    };
    animationFrame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [end, duration, trigger]);

  return count;
}

/* ──────────────────────────────────────────────
   ANIMATED PRESENTATION COMPONENTS
─────────────────────────────────────────────── */
function FadeUp({ children, delay = 0, className = '' }) {
  const [ref, isVisible] = useIntersectionObserver({ triggerOnce: true, threshold: 0.1 });
  return (
    <div ref={ref} className={className} style={{
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
      transition: `all 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`
    }}>
      {children}
    </div>
  );
}

function AnimatedCounter({ end, duration = 2000, prefix = '', suffix = '' }) {
  const [ref, isVisible] = useIntersectionObserver({ triggerOnce: true });
  const count = useCounter(end, duration, isVisible);
  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

function RevealText({ text, delayOffset = 0 }) {
  const words = text.split(' ');
  return (
    <span style={{ display: 'inline-block' }}>
      {words.map((w, i) => (
        <span key={i} className="word-reveal" style={{ animationDelay: `${delayOffset + (i * 0.1)}s`, display: 'inline-block', marginRight: '0.25em' }}>
          {w}
        </span>
      ))}
    </span>
  );
}

/* ── FAQ accordion ── */
function FAQItem({ q, a, delay }) {
  const [open, setOpen] = useState(false);
  return (
    <FadeUp delay={delay}>
      <div className="rounded-xl overflow-hidden premium-card">
        <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-6 py-5 text-left gap-4"
          style={{ background: open ? 'rgba(108,99,255,0.05)' : 'transparent', border: 'none' }}>
          <span className="text-sm font-extrabold" style={{ color: '#F0F0FF', letterSpacing: '-0.01em' }}>{q}</span>
          <span className="shrink-0 text-xl leading-none transition-transform"
            style={{ color: '#6C63FF', display: 'inline-block', transform: open ? 'rotate(45deg)' : 'none' }}>+</span>
        </button>
        {open && (
          <div className="px-6 pb-5 pt-4 text-sm leading-relaxed" style={{ color: '#6B6B8A', borderTop: '1px solid rgba(108,99,255,0.1)' }}>{a}</div>
        )}
      </div>
    </FadeUp>
  );
}

/* ── Data ── */
const ENTRY_CARDS = [
  { icon: '📈', title: 'Day Trader', features: ['Trade journal & P&L tracking', 'Pre-market prep & levels', 'Position size & risk calculator', 'Performance pattern recognition'] },
  { icon: '🎯', title: 'Sports Bettor', features: ['Live odds across 7+ major books', 'Arbitrage finder & parlay optimizer', 'Bet journal with win rate tracking', 'AI game analysis & Edge Score'] },
  { icon: '🔮', title: 'Prediction Markets', features: ['Full Polymarket block browser', 'Polymarket vs sportsbook mispricings', 'Expected Value (EV) calculators', 'Claude-powered market breakdown'] },
];

const FEATURE_TILES = [
  { icon: '⚡', title: 'Sharp Signals', desc: 'Real-time mispricings between prediction markets and sportsbooks.' },
  { icon: '🤖', title: 'AI Analysis', desc: 'Claude-powered game and market breakdowns with live web search.' },
  { icon: '📊', title: 'Performance Tracking', desc: 'P&L, win rate, ROI over time with visual calendars and charts.' },
  { icon: '🔴', title: 'Live Odds', desc: '7+ sportsbooks side by side with Edge Scores and line movement.' },
  { icon: '📓', title: 'Journals', desc: 'Bets and trades in one place with notes, confidence, and duration.' },
  { icon: '🧮', title: 'Calculators', desc: 'EV, arbitrage, position sizing, and Kelly criterion tools.' },
];

const FREE_FEATURES = ['Live odds viewing', '5 bets and trades / month', '3 AI queries / day', 'Basic tracking', 'EV calculator'];
const PRO_FEATURES = ['Everything in Free', 'Unlimited logging', 'Sharp Signals (full detail)', 'Unlimited AI queries', 'Advanced AI game analysis', 'Performance insights', 'CSV/PDF export'];

const FAQS = [
  { q: 'Is Sharpr affiliated with Polymarket, ESPN, or any sportsbook?', a: "No. Sharpr is an independent research and journaling tool. We aggregate publicly available data. We do not facilitate actual betting or trading." },
  { q: 'Can I cancel my Pro subscription anytime?', a: "Yes. No contracts or lock-in. Cancel anytime from settings and keep Pro access until the end of your billing period." },
  { q: 'How is my data stored?', a: "Securely in a private PostgreSQL database with row-level security. Only you can access your data. We never sell or share personal data." },
  { q: 'What sports and markets are covered?', a: "NFL, NBA, MLB, NHL, Soccer, UFC, Tennis, Golf, NCAA, and more. Plus 1,500+ Polymarket prediction markets across politics, crypto, finance, and current events." },
];

const TICKER_DATA = [
  { match: "Lakers vs Celtics", edge: "+4.2%", type: "NBA" },
  { match: "Bitcoin ETF Approval", edge: "+8.1%", type: "CRYPTO" },
  { match: "Chiefs vs 49ers", edge: "+2.5%", type: "NFL" },
  { match: "US Election 2024", edge: "+6.7%", type: "POLITICS" },
  { match: "Fed Interest Rate Cut", edge: "+3.9%", type: "FINANCE" },
  { match: "Yankees vs Dodgers", edge: "+1.8%", type: "MLB" },
];

function SectionLabel({ text }) {
  return <FadeUp><div className="text-xs font-extrabold tracking-widest mb-4 uppercase" style={{ color: '#6C63FF', letterSpacing: '0.08em' }}>{text}</div></FadeUp>;
}

/* ══════════════════════════════════════════════════════════════
   LANDING PAGE COMPONENT
══════════════════════════════════════════════════════════════ */
export default function Landing() {
  
  // Inject global animations once
  useEffect(() => {
    if (document.getElementById('sharpr-animations')) return;
    const style = document.createElement('style');
    style.id = 'sharpr-animations';
    style.innerHTML = `
      html { scroll-behavior: smooth; }
      body { background: #0A0A0F; color: #F0F0FF; overflow-x: hidden; }

      @keyframes orbFloat {
        0% { transform: translate(0, 0) scale(1) rotate(0deg); }
        33% { transform: translate(5vw, -5vh) scale(1.1) rotate(5deg); }
        66% { transform: translate(-3vw, 4vh) scale(0.9) rotate(-5deg); }
        100% { transform: translate(0, 0) scale(1) rotate(0deg); }
      }
      
      @keyframes orbFloatReverse {
        0% { transform: translate(0, 0) scale(1) rotate(0deg); }
        33% { transform: translate(-4vw, 6vh) scale(0.9) rotate(-5deg); }
        66% { transform: translate(6vw, -3vh) scale(1.1) rotate(5deg); }
        100% { transform: translate(0, 0) scale(1) rotate(0deg); }
      }

      @keyframes pulseGlow {
        0% { box-shadow: 0 4px 14px rgba(108,99,255,0.4); }
        50% { box-shadow: 0 4px 30px rgba(108,99,255,0.8); }
        100% { box-shadow: 0 4px 14px rgba(108,99,255,0.4); }
      }

      @keyframes textGlow {
        0% { text-shadow: 0 0 20px rgba(108,99,255,0.2); }
        50% { text-shadow: 0 0 40px rgba(108,99,255,0.6); }
        100% { text-shadow: 0 0 20px rgba(108,99,255,0.2); }
      }

      @keyframes slideLeft {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }

      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .animated-orb {
        position: absolute;
        border-radius: 50%;
        filter: blur(140px);
        opacity: 0.4;
        pointer-events: none;
        z-index: 0;
      }

      .hero-content { position: relative; z-index: 10; }
      
      .premium-card {
        background: #111118;
        border: 1px solid rgba(108,99,255,0.15);
        transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .premium-card:hover {
        border-color: rgba(108,99,255,0.5);
        transform: translateY(-8px);
        box-shadow: 0 20px 40px rgba(10,10,15,0.9), 0 0 30px rgba(108,99,255,0.15) !important;
      }
      
      .premium-card-teal:hover {
        border-color: rgba(0,229,180,0.5);
        box-shadow: 0 20px 40px rgba(10,10,15,0.9), 0 0 30px rgba(0,229,180,0.15) !important;
      }

      .ticker-track {
        display: flex;
        width: max-content;
        animation: slideLeft 40s linear infinite;
      }
      .ticker-track:hover { animation-play-state: paused; }

      .word-reveal {
        opacity: 0;
        animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: '#0A0A0F', color: '#F0F0FF', position: 'relative' }}>

      {/* ── BACKGROUND PARALLAX ORBS ── */}
      <div className="animated-orb" style={{ width: '60vw', height: '60vw', background: 'rgba(108,99,255,0.4)', top: '-20%', left: '-10%', animation: 'orbFloat 20s infinite ease-in-out' }} />
      <div className="animated-orb" style={{ width: '50vw', height: '50vw', background: 'rgba(0,229,180,0.2)', top: '20%', right: '-15%', animation: 'orbFloatReverse 25s infinite ease-in-out' }} />
      
      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 border-b"
        style={{ background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderColor: '#1E1E2E' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-6">
          <Logo />
          <div className="hidden md:flex items-center gap-6 ml-4">
            {['Features', 'Pricing', 'FAQ'].map(item => (
              <a key={item} href={'#' + item.toLowerCase()}
                className="text-sm font-bold transition-colors" style={{ color: '#6B6B8A' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#F0F0FF'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#6B6B8A'; }}>
                {item}
              </a>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Link to="/login" className="text-sm font-bold px-4 py-2 rounded-lg transition-colors"
              style={{ color: '#6B6B8A' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#F0F0FF'; e.currentTarget.style.background = 'rgba(108,99,255,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#6B6B8A'; e.currentTarget.style.background = 'transparent'; }}>
              Sign in
            </Link>
            <Link to="/register" className="text-sm font-bold px-5 py-2.5 rounded-lg transition-all"
              style={{ background: '#6C63FF', color: '#F0F0FF', boxShadow: '0 4px 14px rgba(108,99,255,0.4)' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#5850e6'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(108,99,255,0.6)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#6C63FF'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(108,99,255,0.4)'; }}>
              Get started
            </Link>
          </div>
        </div>
      </nav>

      <div className="hero-content">
        {/* ── HERO ── */}
        <section className="pt-28 pb-20 px-4 sm:px-6 text-center max-w-5xl mx-auto">
          <FadeUp delay={100}>
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-lg text-xs font-extrabold tracking-widest mb-8 uppercase"
              style={{ background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.3)', color: '#6C63FF' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00E5B4', boxShadow: '0 0 10px #00E5B4' }} />
              Trade · Bet · Predict
            </div>
          </FadeUp>

          <h1 className="text-5xl sm:text-6xl lg:text-8xl font-extrabold leading-tight mb-8" style={{ letterSpacing: '-0.04em' }}>
            <RevealText text="The platform for " />
            <span style={{ color: '#6C63FF', animation: 'textGlow 4s infinite ease-in-out' }}>
              <RevealText text="sharp players" delayOffset={0.3} />
            </span>
          </h1>

          <FadeUp delay={600}>
            <p className="text-xl sm:text-2xl mb-12 max-w-2xl mx-auto font-medium" style={{ color: '#6B6B8A', lineHeight: 1.6 }}>
              The all-in-one terminal for algorithmic traders, arbitrage bettors, and prediction market sharks.
            </p>
          </FadeUp>

          <FadeUp delay={800}>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link to="/register"
                className="px-10 py-5 rounded-lg text-base font-bold transition-all"
                style={{ background: '#6C63FF', color: '#F0F0FF', animation: 'pulseGlow 2.5s infinite ease-in-out' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
                Find Your Edge — Free
              </Link>
            </div>
          </FadeUp>
        </section>

        {/* ── SOCIAL PROOF COUNTERS ── */}
        <section className="py-12 border-y border-[#1E1E2E] bg-[#111118]/40 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center divide-y sm:divide-y-0 sm:divide-x divide-[#1E1E2E]">
            <div className="pt-4 sm:pt-0">
              <div className="text-4xl font-extrabold text-[#F0F0FF] mb-2"><AnimatedCounter end={1500} suffix="+" /></div>
              <div className="text-sm font-bold text-[#6B6B8A] tracking-wider uppercase">Live Markets</div>
            </div>
            <div className="pt-8 sm:pt-0">
              <div className="text-4xl font-extrabold text-[#00E5B4] mb-2" style={{ textShadow: '0 0 20px rgba(0,229,180,0.3)' }}><AnimatedCounter end={14} prefix="+" duration={1500} /></div>
              <div className="text-sm font-bold text-[#6B6B8A] tracking-wider uppercase">Mispricings Today</div>
            </div>
            <div className="pt-8 sm:pt-0">
              <div className="text-4xl font-extrabold text-[#6C63FF] mb-2"><AnimatedCounter end={7} duration={1000} /></div>
              <div className="text-sm font-bold text-[#6B6B8A] tracking-wider uppercase">Sportsbooks Synced</div>
            </div>
          </div>
        </section>

        {/* ── THREE ENTRY POINT CARDS ── */}
        <section id="who" className="py-32 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20">
              <SectionLabel text="WHO IS SHARPR FOR?" />
              <FadeUp delay={100}>
                <h2 className="text-4xl sm:text-5xl font-extrabold" style={{ letterSpacing: '-0.03em' }}>Built for the 1%</h2>
              </FadeUp>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {ENTRY_CARDS.map((card, idx) => (
                <FadeUp key={card.title} delay={idx * 150}>
                  <div className="premium-card p-8 rounded-xl h-full flex flex-col">
                    <div className="text-4xl mb-6">{card.icon}</div>
                    <h3 className="text-xl font-extrabold mb-6" style={{ color: '#F0F0FF', letterSpacing: '-0.01em' }}>{card.title}</h3>
                    <ul className="flex flex-col gap-4 flex-1 mb-8">
                      {card.features.map(f => (
                        <li key={f} className="flex items-start gap-3 text-sm font-medium" style={{ color: '#6B6B8A' }}>
                          <span style={{ color: '#6C63FF', marginTop: 2, flexShrink: 0, fontWeight: 800 }}>✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* ── SHARP SIGNALS TICKER CALLOUT ── */}
        <section className="py-24 relative overflow-hidden"
          style={{ background: 'linear-gradient(180deg, rgba(108,99,255,0.05) 0%, rgba(10,10,15,1) 100%)', borderTop: '1px solid #1E1E2E', borderBottom: '1px solid #1E1E2E' }}>
          
          <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center mb-16 relative z-10">
            <SectionLabel text="LIVE SHARP SIGNALS" />
            <FadeUp delay={100}>
              <h2 className="text-3xl sm:text-5xl font-extrabold mb-6" style={{ letterSpacing: '-0.03em' }}>
                <AnimatedCounter end={147} prefix="🔥 " /> edges surfaced in real-time
              </h2>
            </FadeUp>
            <FadeUp delay={200}>
              <p className="text-lg mb-8 font-medium max-w-2xl mx-auto" style={{ color: '#6B6B8A', lineHeight: 1.7 }}>
                Our engine constantly cross-references Polymarket probabilities against global sportsbooks to surface guaranteed EV+.
              </p>
            </FadeUp>
          </div>

          {/* Infinite Marquee Ticker */}
          <div className="w-full overflow-hidden relative" style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}>
            <div className="ticker-track">
              {/* Double sequence for infinite scroll seamless loop */}
              {[...TICKER_DATA, ...TICKER_DATA].map((signal, idx) => (
                <div key={idx} className="premium-card premium-card-teal mx-3 p-5 rounded-xl flex items-center gap-6" style={{ width: 340, flexShrink: 0, background: 'rgba(10,10,15,0.9)' }}>
                  <div>
                    <div className="text-xs font-extrabold mb-1" style={{ color: '#6B6B8A' }}>{signal.type}</div>
                    <div className="text-sm font-bold text-[#F0F0FF] truncate" style={{ width: 180 }}>{signal.match}</div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-xs font-bold text-[#00E5B4] mb-1">EDGE</div>
                    <div className="text-2xl font-extrabold" style={{ color: '#00E5B4', textShadow: '0 0 12px rgba(0,229,180,0.4)' }}>{signal.edge}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES GRID ── */}
        <section id="features" className="py-32 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20">
              <SectionLabel text="THE TERMINAL" />
              <FadeUp delay={100}>
                <h2 className="text-4xl sm:text-5xl font-extrabold mb-6" style={{ letterSpacing: '-0.03em' }}>
                  Everything you need. <br />Nothing you don't.
                </h2>
              </FadeUp>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURE_TILES.map((f, idx) => (
                <FadeUp key={f.title} delay={(idx % 3) * 150}>
                  <div className="premium-card p-8 rounded-xl h-full flex flex-col gap-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#6C63FF] opacity-5 rounded-bl-full transition-transform group-hover:scale-110" />
                    <div className="text-3xl mb-2">{f.icon}</div>
                    <h3 className="text-lg font-extrabold" style={{ color: '#F0F0FF', letterSpacing: '-0.01em' }}>{f.title}</h3>
                    <p className="text-sm leading-relaxed font-medium" style={{ color: '#6B6B8A' }}>{f.desc}</p>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section id="pricing" className="py-32 px-4 sm:px-6" style={{ borderTop: '1px solid #1E1E2E' }}>
          <div className="max-w-5xl mx-auto text-center">
            <SectionLabel text="PRICING" />
            <FadeUp delay={100}>
              <h2 className="text-4xl sm:text-6xl font-extrabold mb-16" style={{ letterSpacing: '-0.03em' }}>Institutional tools. <br/>Retail prices.</h2>
            </FadeUp>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <FadeUp delay={200}>
                <div className="rounded-xl p-10 flex flex-col text-left transition-transform h-full" style={{ background: '#111118', border: '1px solid #1E1E2E' }}>
                  <div className="mb-8">
                    <div className="text-sm font-extrabold tracking-widest uppercase mb-3" style={{ color: '#6B6B8A' }}>Free</div>
                    <div style={{ fontSize: 56, fontWeight: 900, color: '#F0F0FF', lineHeight: 1, letterSpacing: '-0.03em' }}>
                      $0<span className="text-lg font-semibold" style={{ color: '#6B6B8A' }}>/mo</span>
                    </div>
                  </div>
                  <ul className="flex flex-col gap-5 flex-1 mb-10">
                    {FREE_FEATURES.map(f => (
                      <li key={f} className="flex items-center gap-3 text-sm font-medium" style={{ color: '#6B6B8A' }}>
                        <span style={{ color: '#6C63FF', fontSize: 14, fontWeight: 800 }}>✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  <Link to="/register" className="block text-center rounded-lg py-4 text-base font-bold transition-all"
                    style={{ border: '2px solid #1E1E2E', background: '#1A1A24', color: '#F0F0FF' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(108,99,255,0.4)'; e.currentTarget.style.background = 'rgba(108,99,255,0.08)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E1E2E'; e.currentTarget.style.background = '#1A1A24'; }}>
                    Get started free
                  </Link>
                </div>
              </FadeUp>

              <FadeUp delay={400}>
                <div className="premium-card rounded-xl p-10 flex flex-col text-left relative h-full" style={{ border: '2px solid rgba(108,99,255,0.6)', boxShadow: '0 0 40px rgba(108,99,255,0.1)' }}>
                  <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', fontSize: 11, fontWeight: 800, padding: '6px 20px', borderRadius: '8px', background: '#6C63FF', color: '#F0F0FF', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(108,99,255,0.4)' }}>
                    Most popular
                  </div>
                  <div className="mb-8">
                    <div className="text-sm font-extrabold tracking-widest uppercase mb-3" style={{ color: '#6C63FF' }}>Pro</div>
                    <div style={{ fontSize: 56, fontWeight: 900, color: '#F0F0FF', lineHeight: 1, letterSpacing: '-0.03em', textShadow: '0 0 24px rgba(108,99,255,0.3)' }}>
                      $19<span className="text-lg font-semibold" style={{ color: '#6B6B8A' }}>/mo</span>
                    </div>
                  </div>
                  <ul className="flex flex-col gap-5 flex-1 mb-10">
                    {PRO_FEATURES.map(f => (
                      <li key={f} className="flex items-center gap-3 text-sm font-medium" style={{ color: '#F0F0FF' }}>
                        <span style={{ color: '#00E5B4', fontSize: 14, fontWeight: 800 }}>✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  <Link to="/register" className="block text-center rounded-lg py-4 text-base font-bold transition-all"
                    style={{ background: '#6C63FF', color: '#F0F0FF', boxShadow: '0 4px 14px rgba(108,99,255,0.3)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#5850e6'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(108,99,255,0.5)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#6C63FF'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(108,99,255,0.3)'; }}>
                    Upgrade to Pro
                  </Link>
                </div>
              </FadeUp>
            </div>
          </div>
        </section>

        {/* ── FAQ & FOOTER ── */}
        <section id="faq" className="py-32 px-4 sm:px-6" style={{ borderTop: '1px solid #1E1E2E' }}>
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-20">
              <SectionLabel text="FAQ" />
              <FadeUp delay={100}>
                <h2 className="text-4xl sm:text-5xl font-extrabold" style={{ letterSpacing: '-0.03em' }}>Common questions</h2>
              </FadeUp>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {FAQS.map((faq, idx) => <FAQItem key={faq.q} q={faq.q} a={faq.a} delay={idx * 150} />)}
            </div>
          </div>
        </section>

        <footer className="py-12 px-4 sm:px-6" style={{ borderTop: '1px solid #1E1E2E', background: '#0A0A0F' }}>
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-sm font-extrabold" style={{ color: '#6B6B8A', letterSpacing: '-0.01em' }}>Sharpr — Find Your Edge</div>
            <div className="flex items-center gap-6">
              {[ ['Terms', '#'], ['Privacy', '#'], ['Support', 'mailto:support@sharprapp.com'] ].map(([label, href]) => (
                <a key={label} href={href} className="text-xs transition-colors font-bold tracking-wide uppercase" style={{ color: '#6B6B8A' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#F0F0FF'} onMouseLeave={e => e.currentTarget.style.color = '#6B6B8A'}>
                  {label}
                </a>
              ))}
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}
