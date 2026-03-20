const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Replace these with your actual Stripe Price IDs from the Dashboard
const PRICES = {
  pro_monthly: 'price_1TCiw63XoUOK63pTRdMWY5r2', // $19/month
  elite_monthly: process.env.STRIPE_ELITE_PRICE_ID || '', // $49/month
};

// Feature limits per tier
const TIER_LIMITS = {
  free: {
    ai_queries_per_day: 5,
    trade_entries: 50,
    bet_entries: 50,
    live_odds: false,
    export_csv: false,
    market_detail_ai: false,
    sports_props: false,
  },
  pro: {
    ai_queries_per_day: 50,
    trade_entries: Infinity,
    bet_entries: Infinity,
    live_odds: true,
    export_csv: true,
    market_detail_ai: true,
    sports_props: true,
  },
  elite: {
    ai_queries_per_day: Infinity,
    trade_entries: Infinity,
    bet_entries: Infinity,
    live_odds: true,
    export_csv: true,
    market_detail_ai: true,
    sports_props: true,
  },
};

module.exports = { stripe, PRICES, TIER_LIMITS };
