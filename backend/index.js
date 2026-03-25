require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3001;

// Gzip/deflate compression — must be registered before routes
app.use(require('compression')());

// Raw body needed for Stripe webhook signature verification
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL || 'https://sharprapp.com',
  'https://sharprapp.com',
  'https://www.sharprapp.com',
  'http://localhost:5173',
  'http://localhost:5174',
].filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('CORS blocked: ' + origin));
  },
  credentials: true,
}));

// ── Rate limiters ────────────────────────────────────────────────────────────

// Global fallback: 1000 req / 15 min — skips routes with their own limiters
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Routes with dedicated limiters or no limit needed skip the global one
    return (
      req.path.startsWith('/api/markets') ||
      req.path.startsWith('/api/ai') ||
      req.path.startsWith('/api/auth') ||
      req.path.startsWith('/api/espn')
    );
  },
});
app.use(globalLimiter);

// Auth: 50 req / 15 min (prevents credential-stuffing loops)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
});

// AI queries: 30 req / min (each call is expensive — Claude + web search)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

// Default cache headers for GET requests
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/auth') && !req.path.startsWith('/api/stripe')) {
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
  }
  next();
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',      authLimiter, require('./routes/auth'));
app.use('/api/stripe',    require('./routes/stripe'));
app.use('/api/ai',        aiLimiter,   require('./routes/ai'));
app.use('/api/trades',    require('./routes/trades'));
app.use('/api/bets',      require('./routes/bets'));
app.use('/api/odds-legacy', require('./routes/polymarket-categories'));
app.use('/api/odds',        require('./routes/odds-api'));
app.use('/api/news',      require('./routes/news'));
app.use('/api/polymarket',require('./routes/polymarket'));
app.use('/api/markets',   require('./routes/markets'));   // no rate limit — cached public data
app.use('/api/espn',      require('./routes/espn'));      // no rate limit — cached public data
app.use('/api/community', require('./routes/community'));
app.use('/api/sharpsignal', require('./routes/sharpsignal'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/user',      require('./routes/user'));
app.use('/api/performance', require('./routes/performance'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Keep alive — ping self every 5 minutes to prevent Railway sleep
const BACKEND_URL = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : `http://localhost:${PORT}`;

setInterval(async () => {
  try { await fetch(`${BACKEND_URL}/api/health`); } catch {}
}, 5 * 60 * 1000);

app.listen(PORT, () => console.log(`Sharpr backend running on port ${PORT}`));
