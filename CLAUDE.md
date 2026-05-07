Always read ANTIGRAVITY.md at the start of every session and follow all rules in it.
# Sharpr — Claude Code Context

## Project
Solo founder: Agostino Vitiello. All-in-one analytics terminal for sharp players — day traders, sports bettors, prediction market participants.

## Local Path
~/Desktop/sharpr/
- Frontend: frontend/src/
- Backend: backend/

## Tech Stack
- Frontend: React/Vite + TailwindCSS → Vercel
- Backend: Node/Express → Railway (sharpr-production.up.railway.app)
- Database/Auth: Supabase
- Payments: Stripe (live mode, acct_1TCitlKsOciIAMbu)
- AI: Anthropic Claude API
- Odds data: The Odds API (20K request plan)
- Prediction markets: Polymarket public API + CLOB API
- Analytics: PostHog (Stripe revenue syncing live)

## Deployment — CRITICAL
ALWAYS deploy via `git push` only. NEVER use `vercel deploy` or `railway up` directly.

## Design System — "Institutional Dark"
- Background: #0A0A0F
- Primary accent: #6C63FF (electric indigo)
- Secondary: #00E5B4 (neon teal)
- Danger: #FF4560
- Glassmorphism cards with backdrop-filter blur

## Monetization
Free tier + Pro at $19/month. Elite tier removed.

## Sharp Signals
Core feature. Cross-references Polymarket implied probabilities vs sportsbook odds. Criteria: 8%+ edge, $75K+ min volume, 14-day window. Thresholds loosened to 30-day / $50K to surface more signals. Outcome logging in Supabase for accuracy tracking.

## Known Gotchas — READ THESE

### Supabase profiles table
ALWAYS write to both `plan` AND `tier` columns simultaneously on any plan change. Mismatch between these caused persistent Pro upgrade failures.

### Railway env vars
`STRIPE_WEBHOOK_SECRET` must be entered via Raw Editor with zero quotes and zero whitespace. Caused repeated webhook failures.

### Gemini/Antigravity pattern failure
Gemini uses regex/script overlays (e.g. apply_glass_v3.js) instead of rewriting files — produces superficial changes. Use Claude Code via terminal as fallback.

### Gemini import breakage
Large Gemini edits repeatedly break Dashboard.jsx imports (particularly `useAuth` from `../hooks/useAuth`). Check after every major Gemini edit.

### AI language
All verdict-style AI outputs removed and replaced with analytical disclaimers. Maintain this going forward.

## IDE Division of Labor
- Antigravity (Gemini): UI/design/frontend visual work
- Claude Code (terminal): logic, API integrations, backend, auth, data

## Current State
- Production-ready and live, zero users acquired
- PostHog funnel data should drive feature prioritization — no building without conversion signal
- Sharp Signals outcome logging accumulates accuracy data over time
- Kalshi integration on hold pending API key
- Legal consultation outstanding and non-optional at scale

## Distribution In Progress
- Reddit: r/Daytrading, r/sportsbook, r/Polymarket, r/Kalshi
- Discord: sports picks servers, Polymarket Discord
- TikTok: screen recordings, no face cam, CapCut editing — Script 1 ("The Gap") is hero video
- Goal: 10 users on 20-min discovery calls

## Preferences
- All terminal commands should be complete and ready to paste
- Combined commands preferred
- Direct, no padding
- Brutal honesty on product feedback
cat >> ~/Desktop/sharpr/ANTIGRAVITY.md << 'EOF'

## Session Rules
- Always `git push` after every change that works
- Use combined commands where possible
- Never explain what you're about to do — just do it
- No padding or unnecessary output
- Always write to both `plan` AND `tier` columns on any Supabase plan change
- Never use `vercel deploy` or `railway up` — only `git push`
- Check for broken imports in Dashboard.jsx after any major edit