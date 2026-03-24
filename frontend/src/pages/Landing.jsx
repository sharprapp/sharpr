import { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

/* ── FAQ accordion ── */
function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#0f1729', border: '1px solid #1e2a4a' }}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-6 py-5 text-left gap-4">
        <span className="text-sm font-semibold" style={{ color: '#F5F5FA' }}>{q}</span>
        <span className="shrink-0 text-xl leading-none transition-transform"
          style={{ color: '#2563EB', display: 'inline-block', transform: open ? 'rotate(45deg)' : 'none' }}>+</span>
      </button>
      {open && (
        <div className="px-6 pb-5 pt-4 text-sm leading-relaxed" style={{ color: '#94A3B8', borderTop: '1px solid #1e2a4a' }}>{a}</div>
      )}
    </div>
  );
}

/* ── Data ── */
const ENTRY_CARDS = [
  {
    icon: '📈', title: 'Day Trader',
    features: [
      'Trade journal with P&L tracking',
      'Pre-market prep and bias setting',
      'Position size and risk calculator',
      'Performance insights and patterns',
    ],
  },
  {
    icon: '🎯', title: 'Sports Bettor',
    features: [
      'Live odds across all major books',
      'Arbitrage finder and parlay optimizer',
      'Bet journal with win rate tracking',
      'AI game analysis and Edge Score',
    ],
  },
  {
    icon: '🔮', title: 'Prediction Markets Player',
    features: [
      'Full Polymarket market browser',
      'Sharp Signals — Polymarket vs sportsbook mispricings',
      'EV calculator',
      'AI market analysis',
    ],
  },
];

const FEATURE_TILES = [
  { icon: '⚡', title: 'Sharp Signals', desc: 'Real-time mispricings between prediction markets and sportsbooks' },
  { icon: '🤖', title: 'AI Analysis', desc: 'Claude-powered game and market breakdowns with live web search' },
  { icon: '📊', title: 'Performance Tracking', desc: 'P&L, win rate, ROI over time with visual calendars and charts' },
  { icon: '🔴', title: 'Live Odds', desc: '7+ sportsbooks side by side with Edge Scores and line movement' },
  { icon: '📓', title: 'Journals', desc: 'Bets and trades in one place with notes, confidence, and duration' },
  { icon: '🧮', title: 'Calculators', desc: 'EV, arbitrage, position sizing, and Kelly criterion tools' },
];

const FREE_FEATURES = [
  'Live odds viewing',
  '5 bets and trades',
  '3 AI queries/day',
  'Basic tracking',
  'EV calculator',
];

const PRO_FEATURES = [
  'Everything in Free',
  'Unlimited logging',
  'Sharp Signals (full detail)',
  'Unlimited AI queries',
  'AI game analysis',
  'Performance insights',
  'Push notifications',
  'CSV/PDF export',
];

const FAQS = [
  {
    q: 'Is Sharpr affiliated with Polymarket, ESPN, or any sportsbook?',
    a: "No. Sharpr is an independent research and journaling tool. We aggregate publicly available data. We do not facilitate actual betting or trading.",
  },
  {
    q: 'Can I cancel my Pro subscription anytime?',
    a: "Yes. No contracts or lock-in. Cancel anytime from settings and keep Pro access until the end of your billing period.",
  },
  {
    q: 'How is my data stored?',
    a: 'Securely in a private PostgreSQL database with row-level security. Only you can access your data. We never sell or share personal data.',
  },
  {
    q: 'What sports and markets are covered?',
    a: "NFL, NBA, MLB, NHL, Soccer, UFC, Tennis, Golf, NCAA, and more. Plus 1,500+ Polymarket prediction markets across politics, crypto, finance, and current events.",
  },
];

/* ── Section label helper ── */
function SectionLabel({ text }) {
  return <div className="text-xs font-semibold tracking-widest mb-4" style={{ color: '#4f8ef7' }}>{text}</div>;
}

/* ══════════════════════════════════════════════════════════════
   LANDING PAGE
══════════════════════════════════════════════════════════════ */
export default function Landing() {
  return (
    <div className="min-h-screen" style={{ background: '#03030a', color: '#F5F5FA' }}>

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 border-b"
        style={{ background: 'rgba(3,3,10,0.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-6">
          <Logo />
          <div className="hidden md:flex items-center gap-6 ml-4">
            {['Features', 'Pricing', 'FAQ'].map(item => (
              <a key={item} href={'#' + item.toLowerCase()}
                className="text-sm font-medium transition-colors" style={{ color: '#64748b' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#F5F5FA'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; }}>
                {item}
              </a>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium px-4 py-2 rounded-xl transition-colors"
              style={{ color: '#94A3B8' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#F5F5FA'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'transparent'; }}>
              Sign in
            </Link>
            <Link to="/register" className="text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
              style={{ background: '#4f8ef7', color: '#fff' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#3b7ae0'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#4f8ef7'; }}>
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        {/* Subtle radial glow */}
        <div style={{ position: 'absolute', top: '-40%', left: '50%', transform: 'translateX(-50%)', width: '120%', height: '100%', background: 'radial-gradient(ellipse at center, rgba(79,142,247,0.08) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div className="relative pt-24 pb-20 px-4 sm:px-6 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider mb-8"
            style={{ background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.25)', color: '#7aaff8' }}>
            TRADE · BET · PREDICT
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6" style={{ letterSpacing: '-0.03em' }}>
            The platform for{' '}<span style={{ color: '#4f8ef7' }}>sharp players</span>
          </h1>

          <p className="text-lg sm:text-xl mb-10 max-w-2xl mx-auto" style={{ color: '#94A3B8', lineHeight: 1.7 }}>
            The all-in-one platform for serious traders, bettors, and predictors — your edge lives here
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link to="/register"
              className="px-7 py-3.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: '#4f8ef7', color: '#fff', boxShadow: '0 0 24px rgba(79,142,247,0.25)' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#3b7ae0'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#4f8ef7'; e.currentTarget.style.transform = 'translateY(0)'; }}>
              Find Your Edge — Free
            </Link>
            <a href="#who"
              className="px-7 py-3.5 rounded-xl text-sm font-semibold transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(79,142,247,0.4)'; e.currentTarget.style.color = '#F5F5FA'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#94A3B8'; }}>
              See how it works ↓
            </a>
          </div>
        </div>
      </section>

      {/* ── THREE ENTRY POINT CARDS ── */}
      <section id="who" className="py-20 px-4 sm:px-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <SectionLabel text="WHO IS SHARPR FOR?" />
            <h2 className="text-3xl sm:text-4xl font-bold" style={{ letterSpacing: '-0.02em' }}>
              Built for every kind of edge-seeker
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {ENTRY_CARDS.map(card => (
              <div key={card.title}
                className="rounded-2xl p-6 flex flex-col transition-all"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(79,142,247,0.35)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div className="text-3xl mb-4">{card.icon}</div>
                <h3 className="text-lg font-bold mb-4" style={{ color: '#F5F5FA' }}>{card.title}</h3>
                <ul className="flex flex-col gap-3 flex-1 mb-6">
                  {card.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: '#94A3B8' }}>
                      <span style={{ color: '#4f8ef7', marginTop: 2, flexShrink: 0 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/register"
                  className="text-sm font-semibold transition-colors"
                  style={{ color: '#7aaff8' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#a5c8ff'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#7aaff8'; }}>
                  Get started →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SHARP SIGNALS CALLOUT ── */}
      <section className="py-20 px-4 sm:px-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(180deg, rgba(79,142,247,0.04) 0%, rgba(3,3,10,1) 100%)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <SectionLabel text="SHARP SIGNALS" />
              <h2 className="text-3xl sm:text-4xl font-bold mb-5" style={{ letterSpacing: '-0.02em' }}>
                Find mispricings before anyone else
              </h2>
              <p className="text-base mb-8" style={{ color: '#94A3B8', lineHeight: 1.7 }}>
                Sharp Signals cross-references Polymarket probabilities against sportsbook implied odds
                in real time — surfacing edges that most players never see.
              </p>
              <Link to="/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{ background: 'rgba(79,142,247,0.15)', border: '1px solid rgba(79,142,247,0.3)', color: '#7aaff8' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(79,142,247,0.25)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(79,142,247,0.15)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                See live signals →
              </Link>
            </div>
            {/* Mock signal card */}
            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(79,142,247,0.15)', color: '#7aaff8' }}>SIGNAL</span>
                <span className="text-xs" style={{ color: '#4a5a7a' }}>2 min ago</span>
              </div>
              <div className="text-sm font-semibold mb-4" style={{ color: '#F5F5FA' }}>Lakers vs Celtics — Lakers ML</div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  ['Polymarket YES', '62%', '#22c55e'],
                  ['Sportsbook Implied', '54%', '#f59e0b'],
                  ['Edge', '+8.0%', '#4f8ef7'],
                ].map(([label, value, color]) => (
                  <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="text-xs mb-1" style={{ color: '#4a5a7a' }}>{label}</div>
                    <div className="text-lg font-bold" style={{ color }}>{value}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div className="h-full rounded-full" style={{ width: '62%', background: 'linear-gradient(90deg, #22c55e, #4f8ef7)' }} />
                </div>
                <span className="text-xs font-bold" style={{ color: '#4f8ef7' }}>Strong</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section id="features" className="py-20 px-4 sm:px-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <SectionLabel text="FEATURES" />
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ letterSpacing: '-0.02em' }}>
              Everything in one place
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: '#94A3B8' }}>
              One dashboard for every edge — trading, betting, and prediction markets.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURE_TILES.map(f => (
              <div key={f.title}
                className="rounded-2xl p-6 flex flex-col gap-3 transition-all"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(79,142,247,0.3)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(79,142,247,0.06)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div className="text-2xl">{f.icon}</div>
                <h3 className="text-base font-semibold" style={{ color: '#F5F5FA' }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#94A3B8' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-20 px-4 sm:px-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <SectionLabel text="PRICING" />
          <h2 className="text-3xl sm:text-4xl font-bold mb-3" style={{ letterSpacing: '-0.02em' }}>Find Your Edge</h2>
          <p className="text-sm mb-12" style={{ color: '#64748b' }}>Choose the plan that fits your game</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {/* Free */}
            <div className="rounded-2xl p-6 flex flex-col text-left"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="mb-5">
                <div className="text-sm font-bold mb-1" style={{ color: '#F5F5FA' }}>Free</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: '#F5F5FA', lineHeight: 1 }}>
                  $0<span className="text-sm font-normal" style={{ color: '#4a5a7a' }}>/mo</span>
                </div>
              </div>
              <ul className="flex flex-col gap-3 flex-1 mb-6">
                {FREE_FEATURES.map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: '#94A3B8' }}>
                    <span style={{ color: '#22c55e', fontSize: 13 }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link to="/register"
                className="block text-center rounded-xl py-3 text-sm font-semibold transition-all"
                style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(79,142,247,0.4)'; e.currentTarget.style.color = '#F5F5FA'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#94A3B8'; }}>
                Get started free
              </Link>
            </div>

            {/* Pro */}
            <div className="rounded-2xl p-6 flex flex-col text-left relative"
              style={{ background: 'rgba(255,255,255,0.03)', border: '2px solid rgba(79,142,247,0.5)' }}>
              <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', fontSize: 10, fontWeight: 700, padding: '3px 14px', borderRadius: 20, background: '#4f8ef7', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                Most popular
              </div>
              <div className="mb-5">
                <div className="text-sm font-bold mb-1" style={{ color: '#7aaff8' }}>Pro</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: '#F5F5FA', lineHeight: 1 }}>
                  $19<span className="text-sm font-normal" style={{ color: '#4a5a7a' }}>/mo</span>
                </div>
              </div>
              <ul className="flex flex-col gap-3 flex-1 mb-6">
                {PRO_FEATURES.map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: '#94A3B8' }}>
                    <span style={{ color: '#4f8ef7', fontSize: 13 }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link to="/register"
                className="block text-center rounded-xl py-3 text-sm font-semibold transition-all"
                style={{ background: '#4f8ef7', color: '#fff' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#3b7ae0'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#4f8ef7'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                Upgrade to Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-20 px-4 sm:px-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <SectionLabel text="FAQ" />
            <h2 className="text-3xl sm:text-4xl font-bold" style={{ letterSpacing: '-0.02em' }}>Common questions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FAQS.map(faq => <FAQItem key={faq.q} q={faq.q} a={faq.a} />)}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-20 px-4 sm:px-6 text-center relative overflow-hidden"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '120%', height: '60%', background: 'radial-gradient(ellipse at center bottom, rgba(79,142,247,0.06) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div className="relative max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold mb-5" style={{ letterSpacing: '-0.02em' }}>
            Ready to find your edge?
          </h2>
          <p className="text-base mb-10" style={{ color: '#94A3B8' }}>
            Join traders, bettors, and prediction market players who use Sharpr every day.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link to="/register"
              className="px-7 py-3.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: '#4f8ef7', color: '#fff', boxShadow: '0 0 24px rgba(79,142,247,0.25)' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#3b7ae0'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#4f8ef7'; }}>
              Create your free account
            </Link>
            <Link to="/login"
              className="px-7 py-3.5 rounded-xl text-sm font-semibold transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(79,142,247,0.4)'; e.currentTarget.style.color = '#F5F5FA'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#94A3B8'; }}>
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-8 px-4 sm:px-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm font-semibold" style={{ color: '#64748b' }}>Sharpr — Find Your Edge</div>
          <div className="flex items-center gap-5">
            {[
              ['Terms', '#'],
              ['Privacy', '#'],
              ['support@sharprapp.com', 'mailto:support@sharprapp.com'],
            ].map(([label, href]) => (
              <a key={label} href={href}
                className="text-xs transition-colors"
                style={{ color: '#475569' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#94A3B8'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#475569'; }}>
                {label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
