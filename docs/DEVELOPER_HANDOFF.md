# TradingHub — Developer Handoff

## What this is
A full-stack SaaS app: Polymarket research + day trading journal + sports betting tracker with AI analysis and Stripe subscriptions. Built with React, Node/Express, Supabase, and Stripe.

---

## Accounts you need to create (all free to start)

| Service | URL | What for |
|---|---|---|
| Supabase | supabase.com | Database + user auth |
| Stripe | stripe.com | Payments |
| Anthropic | console.anthropic.com | Claude AI API |
| The Odds API | the-odds-api.com | Live sports odds (Pro users) |
| Vercel | vercel.com | Frontend hosting |
| Railway | railway.app | Backend hosting |

---

## Step-by-step setup

### 1. Supabase
1. Create new project at supabase.com
2. Go to SQL Editor → paste the entire contents of `/docs/supabase-schema.sql` → Run
3. Go to Settings → API → copy:
   - Project URL → `SUPABASE_URL`
   - anon public key → `VITE_SUPABASE_ANON_KEY` (frontend)
   - service_role key → `SUPABASE_SERVICE_KEY` (backend, keep secret)

### 2. Stripe
1. Create account at stripe.com (use test mode first)
2. Products → Create product: "TradingHub Pro", $19/month recurring
3. Copy the Price ID (starts with `price_`) → paste into `/backend/lib/stripe.js` PRICES.pro_monthly
4. Developers → API Keys → copy:
   - Publishable key → `VITE_STRIPE_PUBLISHABLE_KEY`
   - Secret key → `STRIPE_SECRET_KEY`
5. Webhooks → Add endpoint:
   - URL: `https://your-railway-backend.up.railway.app/api/stripe/webhook`
   - Events to listen for: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
   - Copy webhook signing secret → `STRIPE_WEBHOOK_SECRET`

### 3. Anthropic
1. Go to console.anthropic.com → API Keys → Create key
2. Copy → `ANTHROPIC_API_KEY`

### 4. The Odds API
1. Sign up at the-odds-api.com (free tier = 500 requests/month, paid = more)
2. Copy API key → `ODDS_API_KEY`

### 5. Deploy backend to Railway
1. Push code to GitHub
2. railway.app → New Project → Deploy from GitHub → select repo
3. Set root directory to `/backend`
4. Add all backend env vars in Railway dashboard:
   ```
   PORT=3001
   SUPABASE_URL=
   SUPABASE_SERVICE_KEY=
   ANTHROPIC_API_KEY=
   ODDS_API_KEY=
   STRIPE_SECRET_KEY=
   STRIPE_WEBHOOK_SECRET=
   FRONTEND_URL=https://your-vercel-app.vercel.app
   ```
5. Copy your Railway URL (e.g. `https://tradinghub-backend.up.railway.app`)

### 6. Deploy frontend to Vercel
1. vercel.com → New Project → Import from GitHub
2. Set root directory to `/frontend`
3. Add env vars:
   ```
   VITE_API_URL=https://your-railway-backend.up.railway.app
   VITE_SUPABASE_URL=
   VITE_SUPABASE_ANON_KEY=
   VITE_STRIPE_PUBLISHABLE_KEY=
   ```
4. Deploy → copy your Vercel URL

### 7. Update FRONTEND_URL in Railway
Go back to Railway → update `FRONTEND_URL` to your Vercel URL → redeploy.

### 8. Update Stripe webhook URL
Go to Stripe → Webhooks → update endpoint URL to your Railway backend.

---

## Testing payments (test mode)
Use Stripe test card: `4242 4242 4242 4242`, any future expiry, any CVC.
Check Stripe Dashboard → Webhooks → recent deliveries to confirm webhook is firing.

---

## Going live
1. Switch Stripe from test mode to live mode
2. Get new live API keys and update Railway env vars
3. Create a new webhook endpoint in Stripe live mode
4. You're live

---

## Monthly costs at launch

| Service | Cost |
|---|---|
| Vercel | Free |
| Railway | ~$5/mo |
| Supabase | Free up to 50k MAU |
| Anthropic API | ~$20–50/mo (scales with usage) |
| The Odds API | $0–50/mo depending on plan |
| Stripe | 2.9% + $0.30 per transaction |

Break-even at roughly 4–5 Pro subscribers.

---

## Key files reference
- `backend/routes/stripe.js` — All Stripe logic (checkout, webhook, portal)
- `backend/routes/ai.js` — Claude API proxy with tier gating
- `backend/middleware/tier.js` — Free vs Pro limits
- `backend/lib/stripe.js` — Price IDs and tier limits config
- `docs/supabase-schema.sql` — Full database schema
- `frontend/src/hooks/useAuth.js` — Auth state management
- `frontend/src/components/TierGate.jsx` — Wraps Pro-only UI
- `frontend/src/components/UpgradeModal.jsx` — Auto-fires on 403 upgrade responses
