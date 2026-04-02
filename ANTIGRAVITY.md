# Sharpr — Project Context for AI Agents

## What this is
Sharpr is an all-in-one analytics terminal for sharp players: day traders (NQ/MNQ futures), sports bettors, and prediction market participants. Core differentiator is Sharp Signals — cross-referencing Polymarket implied probabilities against sportsbook odds to surface mispricings (8%+ edge, $75K+ volume, 14-day window).

## Stack
- Frontend: React + Vite + TailwindCSS → deployed on Vercel
- Backend: Node.js + Express → deployed on Railway (sharpr-production.up.railway.app)
- Auth + DB: Supabase
- Payments: Stripe (live mode)
- AI: Anthropic Claude API
- Odds data: The Odds API
- Prediction markets: Polymarket public API
- Analytics: PostHog

## Local project
- Root: ~/Desktop/sharpr/
- Frontend: ~/Desktop/sharpr/client/ (or src/ — check if unsure)
- Backend: ~/Desktop/sharpr/server/

## Deployment process
- Frontend: git push triggers Vercel auto-deploy (DO NOT run any deploy commands manually)
- Backend: git push triggers Railway auto-deploy (DO NOT run any deploy commands manually)
- Never run `vercel deploy` or `railway up` — always use git push

## Critical rules — do not violate
- NEVER touch Stripe integration, webhook handlers, or any file referencing Stripe
- NEVER modify Supabase auth logic or RLS policies
- NEVER change database schema without explicitly being asked
- NEVER modify the profiles table without writing to BOTH `plan` AND `tier` columns simultaneously
- NEVER push to git — always leave that to the user
- NEVER modify .env files or environment variables
- Do not install new npm packages without confirming with the user first

## Supabase gotcha
The profiles table has both `plan` and `tier` columns. Any plan change must write to both. Standardize reads to `plan` with `tier` as fallback.

## Current priorities
1. Distribution and user acquisition — app is feature-complete
2. Sharp Signals accuracy logging (already built)
3. 7-day probability sparkline on Polymarket market cards (next UI task)

## What NOT to build
Do not suggest or build new features unless explicitly asked. The app has enough features. Focus only on what is requested.
```

---

**First prompt to send to Gemini in Antigravity:**
```
I've added an ANTIGRAVITY.md to the root of this project. Read it before doing anything. Once you've read it, give me a one-paragraph summary of what Sharpr is and list the 3 things you are never allowed to touch. Don't write any code yet.