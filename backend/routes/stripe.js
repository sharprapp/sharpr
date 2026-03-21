const express = require('express');
const router = express.Router();
const { stripe, PRICES } = require('../lib/stripe');
const { requireAuth } = require('../middleware/auth');
const supabase = require('../lib/supabase');

// Create Stripe checkout session → redirect user to Stripe hosted page
router.post('/create-checkout', requireAuth, async (req, res) => {
  try {
    const { price_id = PRICES.pro_monthly } = req.body;
    const user = req.user;
    const profile = req.profile;

    // Reuse existing Stripe customer or create new one
    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id }
      });
      customerId = customer.id;
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: price_id, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/dashboard`,
      subscription_data: {
        metadata: { supabase_user_id: user.id }
      }
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Open Stripe billing portal — lets user cancel, update card, see invoices
router.post('/portal', requireAuth, async (req, res) => {
  try {
    const customerId = req.profile?.stripe_customer_id;
    if (!customerId) return res.status(400).json({ error: 'No billing account found' });

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.FRONTEND_URL}/settings`
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: 'Failed to open billing portal' });
  }
});

// Stripe webhook — keeps your DB in sync with subscription state
// This is the source of truth for who is Pro
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const data = event.data.object;

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const userId = data.metadata?.supabase_user_id;
      if (!userId) break;
      const isActive = ['active', 'trialing'].includes(data.status);
      await supabase
        .from('profiles')
        .update({
          tier: isActive ? 'pro' : 'free',
          stripe_subscription_id: data.id,
          subscription_status: data.status,
          current_period_end: new Date(data.current_period_end * 1000).toISOString()
        })
        .eq('id', userId);
      break;
    }
    case 'customer.subscription.deleted': {
      const userId = data.metadata?.supabase_user_id;
      if (!userId) break;
      await supabase
        .from('profiles')
        .update({ tier: 'free', subscription_status: 'canceled' })
        .eq('id', userId);
      break;
    }
    case 'invoice.payment_failed': {
      // Optional: send email, flag account
      console.log('Payment failed for customer:', data.customer);
      break;
    }
  }

  res.json({ received: true });
});

// Get current subscription status
router.get('/status', requireAuth, async (req, res) => {
  const p = req.profile;
  res.json({
    tier: req.tier,
    status: p?.subscription_status || 'none',
    current_period_end: p?.current_period_end || null
  });
});

module.exports = router;
