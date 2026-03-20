# TradingHub — Full Stack App

Polymarket research + Day Trading journal + Sports Betting tracker with AI analysis and Stripe subscriptions.

## Tech Stack
- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Node.js + Express
- **Database**: Supabase (Postgres + Auth)
- **Payments**: Stripe (subscriptions)
- **AI**: Anthropic Claude API
- **Odds**: The Odds API
- **Hosting**: Vercel (frontend) + Railway or Render (backend)

---

## Quick Start

### 1. Clone & install
```bash
git clone <your-repo>
cd tradinghub

# Install backend deps
cd backend && npm install

# Install frontend deps
cd ../frontend && npm install
```

### 2. Environment variables

Copy `.env.example` to `.env` in both `/backend` and `/frontend` and fill in your keys.

**Backend `.env`:**
```
PORT=3001
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
ANTHROPIC_API_KEY=sk-ant-...
ODDS_API_KEY=your_odds_api_key
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
JWT_SECRET=random_long_string
```

**Frontend `.env`:**
```
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### 3. Supabase setup

Run the SQL in `/docs/supabase-schema.sql` in your Supabase SQL editor.

### 4. Stripe setup

1. Create a product in Stripe Dashboard
2. Create two prices: Free ($0) and Pro ($19/month)
3. Copy price IDs into `/backend/lib/stripe.js`
4. Set up webhook endpoint: `https://your-backend.com/api/stripe/webhook`
5. Add events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`

### 5. Run locally
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

---

## Deployment

### Backend → Railway
1. Connect your GitHub repo to Railway
2. Set root directory to `/backend`
3. Add all env vars in Railway dashboard
4. Deploy — Railway auto-detects Node.js

### Frontend → Vercel
1. Connect repo to Vercel
2. Set root directory to `/frontend`
3. Add `VITE_API_URL` pointing to your Railway backend URL
4. Deploy

---

## Monetization Tiers

| Feature | Free | Pro ($19/mo) |
|---|---|---|
| Polymarket market browser | 20/day | Unlimited |
| AI Research queries | 5/day | Unlimited |
| Day trading journal entries | 50 total | Unlimited |
| Sports bet journal entries | 50 total | Unlimited |
| Live odds feed | — | Yes |
| EV Calculator | Yes | Yes |
| Export to CSV | — | Yes |

---

## File Structure
```
tradinghub/
├── backend/
│   ├── index.js              # Express server entry
│   ├── package.json
│   ├── middleware/
│   │   ├── auth.js           # JWT + Supabase auth middleware
│   │   └── tier.js           # Free/Pro tier gating
│   ├── routes/
│   │   ├── auth.js           # Login, register, me
│   │   ├── stripe.js         # Checkout, webhook, portal
│   │   ├── ai.js             # Claude API proxy
│   │   ├── trades.js         # Day trading CRUD
│   │   ├── bets.js           # Sports bets CRUD
│   │   └── odds.js           # Live odds proxy
│   └── lib/
│       ├── supabase.js       # Supabase client
│       ├── stripe.js         # Stripe client + price IDs
│       └── anthropic.js      # Anthropic client
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── lib/
│       │   ├── api.js        # Axios instance + interceptors
│       │   └── supabase.js   # Supabase client
│       ├── hooks/
│       │   ├── useAuth.js    # Auth state hook
│       │   └── useTier.js    # Subscription tier hook
│       ├── pages/
│       │   ├── Landing.jsx   # Public marketing page
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   ├── Dashboard.jsx # Main app (the trading hub)
│       │   └── Settings.jsx  # Billing, profile
│       └── components/
│           ├── Navbar.jsx
│           ├── TierGate.jsx  # Wraps Pro-only features
│           └── UpgradeModal.jsx
└── docs/
    └── supabase-schema.sql
```
