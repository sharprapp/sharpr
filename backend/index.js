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

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
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

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',      authLimiter, require('./routes/auth'));
app.use('/api/stripe',    require('./routes/stripe'));
app.use('/api/ai',        aiLimiter,   require('./routes/ai'));
app.use('/api/trades',    require('./routes/trades'));
app.use('/api/bets',      require('./routes/bets'));
app.use('/api/odds',      require('./routes/odds'));
app.use('/api/news',      require('./routes/news'));
app.use('/api/polymarket',require('./routes/polymarket'));
app.use('/api/markets',   require('./routes/markets'));   // no rate limit — cached public data
app.use('/api/espn',      require('./routes/espn'));      // no rate limit — cached public data
app.use('/api/community', require('./routes/community'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => console.log(`Sharpr backend running on port ${PORT}`));
