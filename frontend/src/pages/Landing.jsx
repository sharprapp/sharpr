import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

/* =========================================================
   HOOKS
   ========================================================= */
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

function useCounter(targetPos, duration = 2000, trigger = true, decimals = 0) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let start = null;
    let frame;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(ease * targetPos);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [targetPos, duration, trigger]);
  return Number(count.toFixed(decimals));
}

/* =========================================================
   COMPONENTS
   ========================================================= */
function FadeUp({ children, delay = 0, className = "" }) {
  const [ref, isVisible] = useIntersectionObserver({ triggerOnce: true, threshold: 0 });
  return (
    <div ref={ref} className={className} style={{
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? "translateY(0)" : "translateY(40px)",
      transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1) " + delay + "ms"
    }}>
      {children}
    </div>
  );
}

function SlideInRight({ children, delay = 0, className = "" }) {
  const [ref, isVisible] = useIntersectionObserver({ triggerOnce: true, threshold: 0 });
  return (
    <div ref={ref} className={className} style={{
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? "translateX(0)" : "translateX(60px)",
      transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1) " + delay + "ms"
    }}>
      {children}
    </div>
  );
}

function AnimatedNumber({ end, decimals = 0, duration = 2000, prefix = "", suffix = "" }) {
  const [ref, isVisible] = useIntersectionObserver({ triggerOnce: true });
  const count = useCounter(end, duration, isVisible, decimals);
  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString(undefined, { minimumFractionDigits: decimals })}{suffix}
    </span>
  );
}

function HeroWordReveal({ text }) {
  const words = text.split(" ");
  return (
    <span style={{ display: "inline-block" }}>
      {words.map((w, i) => (
        <span key={i} className="hero-word" style={{ animationDelay: (i * 0.1) + "s", marginRight: "0.25em", display: "inline-block" }}>
          {w}
        </span>
      ))}
    </span>
  );
}

/* =========================================================
   MOCK DATA COMPONENTS
   ========================================================= */
const INITIAL_TERMINAL_DATA = [
  { id: 1, market: "Trump approval > 50% by Q3", prob: 38.4, change: "-1.8", vol: "22.1M" },
  { id: 2, market: "Federal Reserve rate cut (June)", prob: 61.2, change: "+3.7", vol: "18.5M" },
  { id: 3, market: "Bitcoin > $120k (2025)", prob: 55.8, change: "+4.2", vol: "31.4M" },
  { id: 4, market: "NBA Finals: OKC Thunder", prob: 29.1, change: "+2.1", vol: "9.8M" },
  { id: 5, market: "US enters recession (2025)", prob: 42.7, change: "-0.6", vol: "14.3M" },
];

function MockTerminal() {
  const [data, setData] = useState(INITIAL_TERMINAL_DATA);

  useEffect(() => {
    const int = setInterval(() => {
      setData(prev => prev.map(row => {
        const shift = (Math.random() * 2 - 1);
        let newProb = Math.max(1, Math.min(99, row.prob + shift));
        let newChange = (parseFloat(row.change) + shift).toFixed(1);
        if (!newChange.startsWith("-")) newChange = "+" + newChange;
        return { ...row, prob: newProb, change: newChange };
      }));
    }, 2000);
    return () => clearInterval(int);
  }, []);

  return (
    <div className="terminal-window mt-12 overflow-hidden mx-auto max-w-4xl rounded-2xl border" 
         style={{ background: "rgba(17,17,32,0.6)", backdropFilter: "blur(20px)", borderColor: "rgba(108,99,255,0.3)", boxShadow: "0 0 40px rgba(108,99,255,0.15)" }}>
      <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "rgba(108,99,255,0.15)", background: "rgba(10,10,15,0.8)" }}>
        <div className="w-3 h-3 rounded-full bg-[#FF4560]" style={{boxShadow: "0 0 10px rgba(255,69,96,0.6)"}}></div>
        <div className="w-3 h-3 rounded-full bg-[#F59E0B]" style={{boxShadow: "0 0 10px rgba(245,158,11,0.6)"}}></div>
        <div className="w-3 h-3 rounded-full bg-[#00E5B4]" style={{boxShadow: "0 0 10px rgba(0,229,180,0.6)"}}></div>
        <div className="ml-4 text-xs font-mono font-bold tracking-widest text-[#6B6B8A]">LIVE·TERMINAL</div>
      </div>
      <div className="p-4 sm:p-6 overflow-x-auto">
        <table className="w-full text-left font-mono text-sm min-w-[600px]">
          <thead>
            <tr className="text-[#6B6B8A]">
              <th className="pb-4 font-normal">MARKET</th>
              <th className="pb-4 font-normal text-right">PROBABILITY</th>
              <th className="pb-4 font-normal text-right">24H CHANGE</th>
              <th className="pb-4 font-normal text-right">VOLUME</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const isPos = !row.change.startsWith("-");
              return (
                <tr key={row.id} className="border-b transition-colors hover:bg-[rgba(108,99,255,0.1)]" style={{ borderColor: "rgba(108,99,255,0.1)" }}>
                  <td className="py-4 text-[#F0F0FF]">{row.market}</td>
                  <td className="py-4 text-right font-bold text-[#F0F0FF] transition-all duration-300">{(row.prob).toFixed(1)}%</td>
                  <td className="py-4 text-right font-bold transition-all duration-300" style={{ color: isPos ? "#00E5B4" : "#FF4560", textShadow: isPos ? "0 0 10px rgba(0,229,180,0.4)" : "0 0 10px rgba(255,69,96,0.4)" }}>{row.change}%</td>
                  <td className="py-4 text-right text-[#6B6B8A]">{row.vol}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const INITIAL_STRIP_DATA = [
  { match: "BTC > $120k", prob: 55.8 },
  { match: "OKC NBA Finals", prob: 29.1 },
  { match: "Fed Rate Cut June", prob: 61.2 },
  { match: "Trump Approval >50%", prob: 38.4 },
  { match: "US Recession 2025", prob: 42.7 },
  { match: "Solana > $300", prob: 48.3 },
  { match: "AI stock bubble pop", prob: 31.5 },
  { match: "SpaceX IPO 2025", prob: 22.9 }
];

function LiveTickerStrip() {
  const [data, setData] = useState(INITIAL_STRIP_DATA);

  useEffect(() => {
    const int = setInterval(() => {
      setData(prev => prev.map(item => ({
        ...item,
        prob: Math.max(1, Math.min(99, item.prob + (Math.random() * 3 - 1.5)))
      })));
    }, 3000);
    return () => clearInterval(int);
  }, []);

  return (
    <div className="w-full overflow-hidden border-y py-4 items-center flex" style={{ borderColor: "rgba(108,99,255,0.2)", background: "rgba(13,13,21,0.8)", backdropFilter: "blur(10px)" }}>
      <div className="ticker-track">
        {[...data, ...data].map((d, i) => (
          <div key={i} className="flex flex-shrink-0 items-center gap-3 px-6 border-r" style={{ borderColor: "rgba(108,99,255,0.2)" }}>
            <span className="text-sm font-bold text-[#F0F0FF]">{d.match}</span>
            <span className="text-sm font-mono font-bold transition-all duration-500" style={{ color: "#00E5B4", textShadow: "0 0 10px rgba(0,229,180,0.5)" }}>{(d.prob).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const SIGNALS_DATA = [
  { market: "OKC Thunder to win NBA Finals", pm: "29.1%", sb: "+240 (29.4%)", edge: "+9.7%" },
  { market: "Federal Reserve June Rate Cut", pm: "61.2%", sb: "-110 (52.4%)", edge: "+8.8%" },
  { market: "US Recession 2025", pm: "42.7%", sb: "-130 (56.5%)", edge: "+13.8%" },
];

/* =========================================================
   MAIN LANDING PAGE
   ========================================================= */
export default function Landing() {
  const [liveSignalCount, setLiveSignalCount] = useState(null);

  useEffect(() => {
    fetch('/api/sharpsignals')
      .then(r => r.json())
      .then(data => {
        const signals = data.signals || data;
        if (Array.isArray(signals)) setLiveSignalCount(signals.length);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Inject global CSS securely.
    if (document.getElementById("sharpr-landing-css")) return;
    const style = document.createElement("style");
    style.id = "sharpr-landing-css";
    style.innerHTML = "html { scroll-behavior: smooth; } body { background-color: #0A0A0F; color: #F0F0FF; margin: 0; overflow-x: hidden; font-family: 'Inter', system-ui, sans-serif; }\n" +
      "@keyframes flowOrbs { 0% { transform: translateY(0) scale(1) rotate(0deg); } 33% { transform: translateY(-5vh) translateX(4vw) scale(1.1) rotate(5deg); } 66% { transform: translateY(4vh) translateX(-3vw) scale(0.9) rotate(-5deg); } 100% { transform: translateY(0) scale(1) rotate(0deg); } }\n" +
      "@keyframes wordFade { from { opacity: 0; transform: translateY(20px); filter: blur(10px); } to { opacity: 1; transform: translateY(0); filter: blur(0px); } }\n" +
      "@keyframes neonPulse { 0% { box-shadow: 0 0 15px rgba(0,229,180,0.1); border-color: rgba(0,229,180,0.4); } 50% { box-shadow: 0 0 40px rgba(0,229,180,0.5); border-color: rgba(0,229,180,1); } 100% { box-shadow: 0 0 15px rgba(0,229,180,0.1); border-color: rgba(0,229,180,0.4); } }\n" +
      "@keyframes scrollMarquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }\n" +
      ".hero-word { opacity: 0; animation: wordFade 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }\n" +
      ".orb-1 { position: absolute; width: 80vw; height: 80vw; background: rgba(108,99,255,0.25); filter: blur(160px); top: -30%; left: -20%; animation: flowOrbs 18s infinite ease-in-out; border-radius: 50%; z-index: 0; pointer-events: none; }\n" +
      ".orb-2 { position: absolute; width: 70vw; height: 70vw; background: rgba(0,229,180,0.15); filter: blur(140px); top: 30%; right: -25%; animation: flowOrbs 22s infinite ease-in-out reverse; border-radius: 50%; z-index: 0; pointer-events: none; }\n" +
      ".glass-btn-primary { background: rgba(108,99,255,0.9); backdrop-filter: blur(10px); color: #F0F0FF; border: 1px solid rgba(108,99,255,0.6); box-shadow: 0 0 20px rgba(108,99,255,0.4); transition: all 0.3s; }\n" +
      ".glass-btn-primary:hover { background: rgba(108,99,255,1); box-shadow: 0 0 40px rgba(108,99,255,0.7); transform: translateY(-3px) scale(1.02); }\n" +
      ".glass-btn-secondary { background: rgba(17,17,32,0.8); backdrop-filter: blur(10px); border: 1px solid rgba(108,99,255,0.4); color: #F0F0FF; transition: all 0.3s; box-shadow: 0 0 15px rgba(108,99,255,0.1); }\n" +
      ".glass-btn-secondary:hover { background: rgba(108,99,255,0.15); border-color: rgba(108,99,255,0.8); transform: translateY(-3px) scale(1.02); box-shadow: 0 0 25px rgba(108,99,255,0.3); }\n" +
      ".ticker-track { display: flex; width: max-content; animation: scrollMarquee 40s linear infinite; }\n" +
      ".feature-card { background: rgba(17,17,32,0.8); backdrop-filter: blur(20px); border: 1px solid rgba(108,99,255,0.3); border-radius: 16px; padding: 32px; transition: all 0.4s; box-shadow: 0 0 30px rgba(108,99,255,0.05); }\n" +
      ".feature-card:hover { border-color: rgba(108,99,255,0.8); transform: translateY(-8px); box-shadow: 0 20px 40px rgba(0,0,0,0.6), 0 0 40px rgba(108,99,255,0.2) !important; }\n" +
      ".signal-card { background: rgba(17,17,32,0.8); backdrop-filter: blur(20px); border: 1px solid rgba(0,229,180,0.4); border-radius: 12px; transition: all 0.4s; }\n" +
      ".signal-card:hover { animation: neonPulse 2s infinite ease-in-out; transform: translateY(-4px) scale(1.01); }\n";
    document.head.appendChild(style);
  }, []);

  return (
    <div className="relative min-h-screen">
      {/* BACKGROUND ORBS */}
      <div className="orb-1"></div>
      <div className="orb-2"></div>

      {/* NAVBAR */}
      <nav className="fixed w-full z-50 top-0 border-b transition-all" style={{ background: "rgba(13,13,21,0.7)", backdropFilter: "blur(20px)", borderColor: "rgba(108,99,255,0.2)", boxShadow: "0 10px 30px rgba(0,0,0,0.4)" }}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Logo />
          <div className="hidden md:flex gap-8">
            {[["Platform", "#platform"], ["Signals", "#signals"], ["Pricing", "#pricing"]].map(([l, href]) => (
              <a key={l} href={href} className="text-sm font-bold text-[#6B6B8A] hover:text-[#F0F0FF] transition-all hover:drop-shadow-[0_0_10px_rgba(108,99,255,0.8)]">{l}</a>
            ))}
          </div>
          <div className="flex gap-4">
            <Link to="/login" className="px-5 py-2.5 text-sm font-black text-[#F0F0FF] hover:bg-[rgba(108,99,255,0.1)] rounded-lg transition-all border border-transparent hover:border-[rgba(108,99,255,0.3)]">Sign In</Link>
            <Link to="/register" className="glass-btn-primary px-5 py-2.5 text-sm font-black rounded-lg tracking-wide uppercase">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative z-10 pt-48 pb-16 px-6 text-center">
        <div className="max-w-5xl mx-auto">
          <FadeUp delay={100}>
            <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full text-xs font-black tracking-widest uppercase mb-8" style={{ background: "rgba(0,229,180,0.1)", border: "1px solid rgba(0,229,180,0.3)", color: "#00E5B4", boxShadow: "0 0 20px rgba(0,229,180,0.15)" }}>
              <span className="w-2 h-2 rounded-full bg-[#00E5B4]" style={{ boxShadow: "0 0 10px #00E5B4", animation: "neonPulse 2s infinite" }}></span>
              {liveSignalCount !== null ? `${liveSignalCount} live signals active` : 'Live signals scanning now'}
            </div>
          </FadeUp>

          <h1 className="text-5xl sm:text-6xl lg:text-8xl font-black mb-6 leading-[1.05] tracking-[-0.04em] drop-shadow-[0_0_30px_rgba(108,99,255,0.3)]">
            Stop leaving{' '}
            <span style={{ color: '#6C63FF', textShadow: '0 0 40px rgba(108,99,255,0.5)' }}>edge</span>
            <br />on the table.
          </h1>

          <FadeUp delay={500}>
            <p className="text-lg sm:text-xl font-bold text-[#6B6B8A] max-w-2xl mx-auto mb-10">
              The terminal for sharp traders, bettors, and prediction market players. One platform. Every edge.
            </p>
          </FadeUp>

          <FadeUp delay={700}>
            <div className="flex items-center justify-center gap-4 flex-wrap mb-10">
              <Link to="/register" className="glass-btn-primary px-10 py-5 rounded-xl text-base font-black uppercase tracking-wide">Start Free — No Card Needed</Link>
              <a href="#signals" className="glass-btn-secondary px-8 py-5 rounded-xl text-base font-black uppercase tracking-wide">See the Signals</a>
            </div>
          </FadeUp>

          {/* Feature pills */}
          <FadeUp delay={900}>
            <div className="flex items-center justify-center gap-3 flex-wrap mb-6">
              {[
                { icon: '⚡', label: 'Sharp Signals' },
                { icon: '📊', label: 'Trade Journal' },
                { icon: '🏈', label: 'Live Odds' },
                { icon: '🤖', label: 'AI Market Intel' },
                { icon: '🏆', label: 'Fantasy Tools' },
                { icon: '🎯', label: 'Arb Scanner' },
              ].map(({ icon, label }) => (
                <span key={label} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 11, fontWeight: 800, padding: '5px 14px', borderRadius: 100,
                  background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)',
                  color: '#6B6B8A', letterSpacing: '0.04em',
                }}>
                  {icon} {label}
                </span>
              ))}
            </div>
          </FadeUp>

          {/* MOCK TERMINAL */}
          <FadeUp delay={1100}>
            <MockTerminal />
          </FadeUp>
        </div>
      </section>

      {/* LIVE MARKETS STRIP */}
      <div className="relative z-10 my-16">
        <LiveTickerStrip />
      </div>

      {/* SHARP SIGNALS SECTION */}
      <section id="signals" className="relative z-10 py-32 px-6" style={{ background: "linear-gradient(180deg, rgba(13,13,21,0) 0%, rgba(13,13,21,0.8) 100%)", borderTop: "1px solid rgba(108,99,255,0.2)", borderBottom: "1px solid rgba(108,99,255,0.2)" }}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <FadeUp>
              <div className="text-sm font-black tracking-widest uppercase mb-4 text-[#00E5B4] drop-shadow-[0_0_10px_rgba(0,229,180,0.5)]">Guaranteed EV+</div>
              <h2 className="text-5xl lg:text-7xl font-black mb-6 tracking-[-0.03em] drop-shadow-[0_0_20px_rgba(108,99,255,0.2)]">Live Sharp Signals.</h2>
              <p className="text-xl text-[#6B6B8A] font-bold mb-12 leading-relaxed">
                Our engine aggregates 1,500+ global markets against 7 major sportsbooks in real-time, instantly surfacing massive mathematical mispricings. If there is an edge, we find it.
              </p>
              <div className="text-6xl font-black text-[#00E5B4] mb-2 drop-shadow-[0_0_20px_rgba(0,229,180,0.6)]">
                {liveSignalCount !== null
                  ? <AnimatedNumber end={liveSignalCount} />
                  : <AnimatedNumber end={247} />
                }
              </div>
              <div className="text-sm font-black text-[#6B6B8A] uppercase tracking-widest">
                {liveSignalCount !== null ? 'Live Signals Right Now' : 'Edges Found This Week'}
              </div>
            </FadeUp>
          </div>
          
          <div className="flex flex-col gap-6">
            {SIGNALS_DATA.map((sig, i) => (
              <SlideInRight key={i} delay={i * 200}>
                <div className="signal-card p-6 flex flex-col sm:flex-row gap-6 justify-between items-center group cursor-pointer shadow-[0_0_30px_rgba(108,99,255,0.1)]">
                  <div className="flex-1 text-left">
                    <div className="text-xs font-black text-[#6B6B8A] tracking-wider mb-1">MARKET</div>
                    <div className="text-xl font-black text-[#F0F0FF] truncate group-hover:text-[#00E5B4] transition-colors group-hover:drop-shadow-[0_0_5px_rgba(0,229,180,0.5)]">{sig.market}</div>
                  </div>
                  <div className="flex gap-8 text-left border-l border-[rgba(108,99,255,0.2)] pl-8">
                    <div>
                      <div className="text-xs font-black text-[#6B6B8A] tracking-wider mb-1">POLYMARKET</div>
                      <div className="text-lg font-black text-[#F0F0FF]">{sig.pm}</div>
                    </div>
                    <div>
                      <div className="text-xs font-black text-[#6B6B8A] tracking-wider mb-1">SPORTSBOOK</div>
                      <div className="text-lg font-black text-[#F0F0FF]">{sig.sb}</div>
                    </div>
                    <div>
                      <div className="text-xs font-black text-[#00E5B4] tracking-wider mb-1">EDGE</div>
                      <div className="text-2xl font-black text-[#00E5B4] drop-shadow-[0_0_15px_rgba(0,229,180,0.8)]">{sig.edge}</div>
                    </div>
                  </div>
                </div>
              </SlideInRight>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="platform" className="relative z-10 py-32 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <FadeUp>
            <div className="text-sm font-black tracking-widest uppercase mb-4 text-[#6C63FF] drop-shadow-[0_0_10px_rgba(108,99,255,0.5)]">Terminal Architecture</div>
            <h2 className="text-5xl lg:text-7xl font-black mb-20 tracking-[-0.03em] drop-shadow-[0_0_30px_rgba(108,99,255,0.2)]">Everything you need to print.</h2>
          </FadeUp>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <FadeUp delay={100}>
              <div className="feature-card h-full">
                <div className="text-5xl mb-6 drop-shadow-[0_0_20px_rgba(108,99,255,0.5)]">🧮</div>
                <h3 className="text-2xl font-black mb-4 tracking-tight">Calculators & Tooling</h3>
                <p className="text-[#6B6B8A] font-bold leading-relaxed">
                  Suite of professional-grade Expected Value (EV), arbitrage, Kelly criterion, and position sizing calculators out of the box.
                </p>
              </div>
            </FadeUp>
            <FadeUp delay={300}>
              <div className="feature-card h-full">
                <div className="text-5xl mb-6 drop-shadow-[0_0_20px_rgba(108,99,255,0.5)]">🤖</div>
                <h3 className="text-2xl font-black mb-4 tracking-tight">AI Market Intel</h3>
                <p className="text-[#6B6B8A] font-bold leading-relaxed">
                  Claude-powered intelligence layers web-search data onto active markets, giving you real-time summaries of news driving line movement.
                </p>
              </div>
            </FadeUp>
            <FadeUp delay={500}>
              <div className="feature-card h-full">
                <div className="text-5xl mb-6 drop-shadow-[0_0_20px_rgba(108,99,255,0.5)]">📓</div>
                <h3 className="text-2xl font-black mb-4 tracking-tight">Advanced Journals</h3>
                <p className="text-[#6B6B8A] font-bold leading-relaxed">
                  Log your bets and trades flawlessly. Identify your most profitable strategies visually across fully interactive heatmaps.
                </p>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="pricing" className="relative z-10 py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <FadeUp><div className="text-xs font-black tracking-[0.2em] uppercase text-[#6C63FF] mb-4">PRICING</div></FadeUp>
          <FadeUp delay={100}><h2 className="text-4xl sm:text-5xl font-black tracking-[-0.03em] mb-4">Find Your Edge</h2></FadeUp>
          <FadeUp delay={200}><p className="text-base font-bold text-[#6B6B8A] mb-12">Choose the plan that fits your game</p></FadeUp>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <FadeUp delay={300}>
              <div className="rounded-xl p-8 flex flex-col text-left" style={{ background: '#111118', border: '1px solid #1E1E2E' }}>
                <div className="text-sm font-black tracking-widest uppercase mb-2" style={{ color: '#6B6B8A' }}>Free</div>
                <div className="text-5xl font-black mb-6" style={{ color: '#F0F0FF', letterSpacing: '-0.03em' }}>$0<span className="text-base font-semibold text-[#6B6B8A]">/mo</span></div>
                <ul className="flex flex-col gap-4 flex-1 mb-8">
                  {['Live odds viewing', '5 bets and trades', '3 AI queries/day', 'Basic tracking', 'EV calculator'].map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm font-medium text-[#6B6B8A]"><span className="text-[#6C63FF] font-black">✓</span> {f}</li>
                  ))}
                </ul>
                <Link to="/register" className="block text-center rounded-lg py-3.5 text-sm font-bold transition-all" style={{ border: '1px solid #1E1E2E', background: '#1A1A24', color: '#F0F0FF' }}>Get started free</Link>
              </div>
            </FadeUp>
            <FadeUp delay={400}>
              <div className="rounded-xl p-8 flex flex-col text-left relative" style={{ background: '#111118', border: '2px solid rgba(108,99,255,0.6)', boxShadow: '0 0 40px rgba(108,99,255,0.1)' }}>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black px-4 py-1 rounded-lg bg-[#6C63FF] text-white uppercase tracking-wider" style={{ boxShadow: '0 4px 12px rgba(108,99,255,0.4)' }}>Most popular</div>
                <div className="text-sm font-black tracking-widest uppercase mb-2" style={{ color: '#6C63FF' }}>Pro</div>
                <div className="text-5xl font-black mb-6" style={{ color: '#F0F0FF', letterSpacing: '-0.03em', textShadow: '0 0 24px rgba(108,99,255,0.3)' }}>$19<span className="text-base font-semibold text-[#6B6B8A]">/mo</span></div>
                <ul className="flex flex-col gap-4 flex-1 mb-8">
                  {['Everything in Free', 'Unlimited logging', 'Sharp Signals', 'Unlimited AI queries', 'AI game analysis', 'Performance insights', 'Push notifications', 'CSV/PDF export'].map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm font-medium text-[#F0F0FF]"><span className="text-[#00E5B4] font-black">✓</span> {f}</li>
                  ))}
                </ul>
                <Link to="/register" className="block text-center rounded-lg py-3.5 text-sm font-bold transition-all bg-[#6C63FF] text-white" style={{ boxShadow: '0 4px 14px rgba(108,99,255,0.3)' }}>Upgrade to Pro</Link>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF SECTION */}
      <section className="relative z-10 py-24 bg-[rgba(13,13,21,0.8)] backdrop-blur-[20px] border-y border-[rgba(108,99,255,0.2)]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <FadeUp delay={100}>
            <div className="text-6xl font-black text-[#F0F0FF] mb-4 tracking-tight drop-shadow-[0_0_20px_rgba(240,240,255,0.2)]">
              <AnimatedNumber end={12400} suffix="+" />
            </div>
            <div className="text-sm font-black text-[#6B6B8A] tracking-wider uppercase">Active Markets Tracked</div>
          </FadeUp>
          <FadeUp delay={300}>
            <div className="text-6xl font-black text-[#00E5B4] mb-4 tracking-tight drop-shadow-[0_0_25px_rgba(0,229,180,0.4)]">
              <AnimatedNumber end={89} suffix="%" />
            </div>
            <div className="text-sm font-black text-[#6B6B8A] tracking-wider uppercase">Signal Accuracy</div>
          </FadeUp>
          <FadeUp delay={500}>
            <div className="text-6xl font-black text-[#6C63FF] mb-4 tracking-tight drop-shadow-[0_0_25px_rgba(108,99,255,0.4)]">
              <AnimatedNumber end={2.3} decimals={1} prefix="$" suffix="M" />
            </div>
            <div className="text-sm font-black text-[#6B6B8A] tracking-wider uppercase">EV+ Identified (Monthly)</div>
          </FadeUp>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 py-16 px-6 border-t border-[rgba(108,99,255,0.2)] bg-[#0A0A0F]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-8">
          <div className="flex flex-col gap-2">
            <Logo />
            <span className="text-xs font-bold text-[#6B6B8A] tracking-wider uppercase mt-4">© 2026 Sharpr. The Edge Lives Here.</span>
          </div>
          <div className="flex gap-8">
            <a href="#" className="font-bold text-sm text-[#6B6B8A] hover:text-[#00E5B4] transition-colors hover:drop-shadow-[0_0_10px_rgba(0,229,180,0.5)]">Privacy</a>
            <a href="#" className="font-bold text-sm text-[#6B6B8A] hover:text-[#00E5B4] transition-colors hover:drop-shadow-[0_0_10px_rgba(0,229,180,0.5)]">Terms</a>
            <a href="#" className="font-bold text-sm text-[#6B6B8A] hover:text-[#00E5B4] transition-colors hover:drop-shadow-[0_0_10px_rgba(0,229,180,0.5)]">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
