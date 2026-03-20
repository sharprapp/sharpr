import { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

function MiniMarketCard({ title, yes, no, vol, cat }) {
  const fill = yes > 66 ? '#22c55e' : yes > 40 ? '#f59e0b' : '#ef4444';
  return (
    <div className="rounded-xl p-4 flex flex-col gap-3"
      style={{ background: '#0f1729', border: '1px solid #1e2a4a' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: '#1e2a4a', color: '#94A3B8' }}>{cat}</span>
        <span className="text-xs" style={{ color: '#475569' }}>Vol {vol}</span>
      </div>
      <p className="text-xs font-medium leading-snug" style={{ color: '#F5F5FA' }}>{title}</p>
      <div>
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-xs" style={{ color: '#64748b' }}>YES</span>
          <span className="text-base font-bold" style={{ color: fill }}>{yes}%</span>
          <span className="text-xs" style={{ color: '#64748b' }}>NO {no}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1e2a4a' }}>
          <div className="h-full rounded-full" style={{ width: yes + '%', background: fill }} />
        </div>
      </div>
    </div>
  );
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: '#0f1729', border: '1px solid #1e2a4a' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-5 text-left gap-4">
        <span className="text-sm font-semibold" style={{ color: '#F5F5FA' }}>{q}</span>
        <span className="shrink-0 text-xl leading-none transition-transform"
          style={{ color: '#2563EB', display: 'inline-block', transform: open ? 'rotate(45deg)' : 'none' }}>
          +
        </span>
      </button>
      {open && (
        <div className="px-6 pb-5 pt-4 text-sm leading-relaxed"
          style={{ color: '#94A3B8', borderTop: '1px solid #1e2a4a' }}>
          {a}
        </div>
      )}
    </div>
  );
}

const FEATURES = [
  {
    icon: '🎯',
    title: 'Prediction Markets',
    desc: 'Track 1,500+ live prediction markets across politics, crypto, finance, sports, and more. Filter by category, search, and analyze with AI in one click.',
  },
  {
    icon: '📈',
    title: 'Day Trading Journal',
    desc: 'Log every trade with ticker, entry, exit, and setup type. Track your win rate, P&L, and max drawdown with a visual calendar heat map.',
  },
  {
    icon: '🏈',
    title: 'Sports Betting Tracker',
    desc: 'Log bets across 12+ sports with live ESPN odds. Monthly performance tracker with win rate goals, daily loss limits, and Kelly calculator.',
  },
  {
    icon: '🤖',
    title: 'AI Research Assistant',
    desc: 'Powered by Claude with live web search. Get instant analysis on any market, game, or trade setup with data-backed probability assessments.',
  },
  {
    icon: '📰',
    title: 'Live News Feed',
    desc: 'Real-time sports injury reports, economic calendar with upcoming Fed events, and breaking market news — all filtered for trading relevance.',
  },
  {
    icon: '💬',
    title: 'Community Chat',
    desc: 'Share trade ideas and betting angles with other members. Verified accounts, upvotes, reply threads, and trending posts by channel.',
  },
];

const FREE_FEATURES = [
  'Polymarket markets (limited)',
  'Day trading journal (10 trades/mo)',
  'Sports betting tracker (10 bets/mo)',
  'EV calculator',
  'Community chat — read only',
];

const PRO_FEATURES = [
  'All 1,500+ Polymarket markets',
  'Unlimited trades & bets',
  'AI Research with web search',
  'Live news feed',
  'Full community access',
  'Live sports odds (ESPN)',
  'Monthly performance tracker',
  'Priority support',
];

const FAQS = [
  {
    q: 'Is Sharpr affiliated with Polymarket, ESPN, or any sportsbook?',
    a: "No. Sharpr is an independent platform. We fetch publicly available data from Polymarket's open API and ESPN's public scoreboard API. We are not affiliated with, endorsed by, or partnered with Polymarket, ESPN, or any sportsbook. Sharpr is a journaling and research tool — we do not facilitate actual betting or trading.",
  },
  {
    q: 'Can I cancel my Pro subscription anytime?',
    a: "Yes, absolutely. There are no contracts or lock-in periods. Cancel anytime from your account settings and you'll retain Pro access until the end of your current billing period. No questions asked.",
  },
  {
    q: 'How is my data stored and is it private?',
    a: 'Your trades, bets, and journal data are stored securely in a private Supabase PostgreSQL database with row-level security — only you can access your own data. We do not sell or share your personal data with third parties. Community posts are public within the platform.',
  },
  {
    q: 'Which sports are covered in the odds section?',
    a: "We cover NFL, NBA, MLB, NHL, Soccer (EPL & MLS), UFC/MMA, Tennis, Golf, NASCAR, NCAAF, and NCAAB — 12 sports total via ESPN's public scoreboard API. Live odds are shown when available. Scores and game status are always available.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen" style={{ background: '#080810', color: '#F5F5FA' }}>

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 border-b"
        style={{ background: 'rgba(8,8,16,0.95)', backdropFilter: 'blur(12px)', borderColor: '#1e2a4a' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-6">
          <Logo />
          <div className="hidden md:flex items-center gap-6 ml-4">
            {['Features', 'Pricing', 'FAQ'].map(item => (
              <a key={item} href={'#' + item.toLowerCase()}
                className="text-sm font-medium transition-colors"
                style={{ color: '#94A3B8' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#F5F5FA'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; }}>
                {item}
              </a>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Link to="/login"
              className="text-sm font-medium px-4 py-2 rounded-xl transition-colors"
              style={{ color: '#94A3B8' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#F5F5FA'; e.currentTarget.style.background = '#1e2a4a'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'transparent'; }}>
              Sign in
            </Link>
            <Link to="/register"
              className="text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
              style={{ background: '#2563EB', color: '#fff' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#1d4ed8'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#2563EB'; }}>
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-20 pb-16 px-4 sm:px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-widest mb-8"
            style={{ background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)', color: '#60a5fa' }}>
            MARKETS · TRADING · BETTING
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6"
            style={{ letterSpacing: '-0.03em' }}>
            The all-in-one platform for{' '}
            <span style={{ color: '#2563EB' }}>serious traders</span>{' '}
            and bettors
          </h1>

          <p className="text-lg mb-10 max-w-2xl mx-auto" style={{ color: '#94A3B8', lineHeight: 1.7 }}>
            Track prediction markets, journal your trades and bets, research with AI, and connect
            with a community of sharp minds — all in one dark, fast, pro-grade dashboard.
          </p>

          <div className="flex items-center justify-center gap-4 mb-12 flex-wrap">
            <Link to="/register"
              className="px-6 py-3 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: '#2563EB', color: '#fff' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#1d4ed8'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#2563EB'; }}>
              Start for free — no credit card
            </Link>
            <a href="#features"
              className="px-6 py-3 rounded-xl text-sm font-semibold transition-colors"
              style={{ border: '1px solid #1e2a4a', color: '#94A3B8' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.color = '#F5F5FA'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e2a4a'; e.currentTarget.style.color = '#94A3B8'; }}>
              See all features ↓
            </a>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-10 mb-16 flex-wrap">
            {[['1,500+', 'prediction markets'], ['12', 'sports covered'], ['$19/mo', 'Pro plan']].map(([num, label]) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-bold" style={{ color: '#2563EB' }}>{num}</div>
                <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Dashboard preview */}
          <div className="rounded-2xl p-4 sm:p-6 max-w-3xl mx-auto text-left"
            style={{ background: '#0F1120', border: '1px solid #1e2a4a', boxShadow: '0 0 80px rgba(37,99,235,0.1)' }}>
            <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
              {['Polymarket', 'Day Trading', 'Sports Betting', 'AI Research', 'Community'].map((t, i) => (
                <div key={t} className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap"
                  style={i === 0 ? { background: '#2563EB', color: '#fff' } : { color: '#475569' }}>
                  {t}
                </div>
              ))}
            </div>
            <div className="flex gap-2 mb-4">
              <div className="flex-1 rounded-xl px-4 py-2.5 flex items-center gap-2"
                style={{ background: '#0a0f1e', border: '1px solid #1e2a4a' }}>
                <svg className="w-4 h-4 shrink-0" style={{ color: '#475569' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="text-xs" style={{ color: '#334155' }}>Search markets…</span>
              </div>
              <div className="px-3 py-2.5 rounded-xl text-xs font-medium"
                style={{ border: '1px solid #1e2a4a', color: '#475569' }}>↻ Refresh</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <MiniMarketCard title="Will the Fed cut rates before July 2026?" yes={58} no={42} vol="$2.1M" cat="Finance" />
              <MiniMarketCard title="Will BTC reach $120k in 2026?" yes={41} no={59} vol="$5.4M" cat="Crypto" />
              <MiniMarketCard title="Will Trump sign a crypto bill by Q3 2026?" yes={72} no={28} vol="$3.2M" cat="Politics" />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs" style={{ color: '#334155' }}>1,247 markets loaded</span>
              <span className="text-xs" style={{ color: '#334155' }}>Updated 2 min ago</span>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 px-4 sm:px-6" style={{ borderTop: '1px solid #1e2a4a' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-xs font-semibold tracking-widest mb-4" style={{ color: '#2563EB' }}>EVERYTHING YOU NEED</div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ letterSpacing: '-0.02em' }}>
              One dashboard. Every edge.
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: '#94A3B8' }}>
              Built for people who take markets seriously — whether you're trading stocks,
              fading public bets, or hunting edges in prediction markets.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title}
                className="rounded-2xl p-6 flex flex-col gap-4 transition-all cursor-default"
                style={{ background: '#0f1729', border: '1px solid #1e2a4a' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(37,99,235,0.4)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(37,99,235,0.07)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e2a4a'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div className="text-2xl">{f.icon}</div>
                <div>
                  <h3 className="text-base font-semibold mb-2" style={{ color: '#F5F5FA' }}>{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#94A3B8' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20 px-4 sm:px-6" style={{ borderTop: '1px solid #1e2a4a' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-xs font-semibold tracking-widest mb-4" style={{ color: '#2563EB' }}>SIMPLE PRICING</div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ letterSpacing: '-0.02em' }}>
              Start free. Go Pro when ready.
            </h2>
            <p className="text-base" style={{ color: '#94A3B8' }}>No hidden fees. Cancel anytime.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Free */}
            <div className="rounded-2xl p-7 flex flex-col"
              style={{ background: '#0f1729', border: '1px solid #1e2a4a' }}>
              <div className="mb-6">
                <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#64748b' }}>Free</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold" style={{ color: '#F5F5FA' }}>$0</span>
                  <span className="text-sm" style={{ color: '#64748b' }}>/month</span>
                </div>
                <p className="text-sm mt-2" style={{ color: '#94A3B8' }}>Get started with the basics.</p>
              </div>
              <ul className="flex flex-col gap-3 mb-8 flex-1">
                {FREE_FEATURES.map(feat => (
                  <li key={feat} className="flex items-start gap-2.5 text-sm" style={{ color: '#94A3B8' }}>
                    <span className="mt-0.5 shrink-0" style={{ color: '#475569' }}>○</span>
                    {feat}
                  </li>
                ))}
              </ul>
              <Link to="/register"
                className="block text-center py-3 rounded-xl text-sm font-semibold transition-colors"
                style={{ border: '1px solid #1e2a4a', color: '#94A3B8' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.color = '#F5F5FA'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e2a4a'; e.currentTarget.style.color = '#94A3B8'; }}>
                Get started free
              </Link>
            </div>

            {/* Pro */}
            <div className="rounded-2xl p-7 flex flex-col relative"
              style={{ background: '#0f1729', border: '2px solid #2563EB', boxShadow: '0 0 40px rgba(37,99,235,0.15)' }}>
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="text-xs font-bold px-3 py-1 rounded-full"
                  style={{ background: '#2563EB', color: '#fff' }}>Most popular</span>
              </div>
              <div className="mb-6">
                <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#60a5fa' }}>Pro</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold" style={{ color: '#F5F5FA' }}>$19</span>
                  <span className="text-sm" style={{ color: '#64748b' }}>/month</span>
                </div>
                <p className="text-sm mt-2" style={{ color: '#94A3B8' }}>Everything, unlimited.</p>
              </div>
              <ul className="flex flex-col gap-3 mb-8 flex-1">
                {PRO_FEATURES.map(feat => (
                  <li key={feat} className="flex items-start gap-2.5 text-sm" style={{ color: '#cbd5e1' }}>
                    <span className="mt-0.5 shrink-0" style={{ color: '#60a5fa' }}>✓</span>
                    {feat}
                  </li>
                ))}
              </ul>
              <Link to="/register"
                className="block text-center py-3 rounded-xl text-sm font-semibold transition-colors"
                style={{ background: '#2563EB', color: '#fff' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#1d4ed8'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#2563EB'; }}>
                Start Pro — $19/mo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-4 sm:px-6" style={{ borderTop: '1px solid #1e2a4a' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-xs font-semibold tracking-widest mb-4" style={{ color: '#2563EB' }}>FAQ</div>
            <h2 className="text-3xl sm:text-4xl font-bold" style={{ letterSpacing: '-0.02em' }}>Common questions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FAQS.map(faq => <FAQItem key={faq.q} q={faq.q} a={faq.a} />)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 text-center" style={{ borderTop: '1px solid #1e2a4a' }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold mb-5" style={{ letterSpacing: '-0.02em' }}>
            Start trading smarter today
          </h2>
          <p className="text-base mb-10" style={{ color: '#94A3B8' }}>
            Join traders and bettors who use Sharpr to track every edge, every day.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link to="/register"
              className="px-7 py-3.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: '#2563EB', color: '#fff' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#1d4ed8'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#2563EB'; }}>
              Create your free account
            </Link>
            <Link to="/login"
              className="px-7 py-3.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ border: '1px solid #1e2a4a', color: '#94A3B8' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.color = '#F5F5FA'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e2a4a'; e.currentTarget.style.color = '#94A3B8'; }}>
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-4 sm:px-6" style={{ borderTop: '1px solid #1e2a4a' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <p className="text-xs text-center" style={{ color: '#475569' }}>
            © {new Date().getFullYear()} Sharpr. Not affiliated with Polymarket, ESPN, or any sportsbook.
          </p>
          <div className="flex items-center gap-5">
            {['Terms', 'Privacy', 'Contact'].map(l => (
              <a key={l} href="#"
                className="text-xs transition-colors"
                style={{ color: '#475569' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#94A3B8'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#475569'; }}>
                {l}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
