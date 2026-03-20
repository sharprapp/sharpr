const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Replace these with your actual Stripe Price IDs from the Dashboard
const PRICES = {
  pro_monthly: 'price_1TCiw63XoUOK63pTRdMWY5r2', // $19/month
};

// Feature limits per tier
const TIER_LIMITS = {
  free: {
    ai_queries_per_day: 5,
    trade_entries: 50,
    bet_entries: 50,
    live_odds: false,
    export_csv: false,
  },
  pro: {
    ai_queries_per_day: Infinity,
    trade_entries: Infinity,
    bet_entries: Infinity,
    live_odds: true,
    export_csv: true,
  }
};

module.exports = { stripe, PRICES, TIER_LIMITS };
