const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { stripe, PRICES } = require('../lib/stripe');
const { requireAuth } = require('../middleware/auth');
const supabase = require('../lib/supabase');
const recentCheckouts = new Map(); // userId -> timestamp

// Create Stripe checkout session → redirect user to Stripe hosted page
router.post('/create-checkout', requireAuth, async (req, res) => {
  try {
    const { price_id = PRICES.pro_monthly } = req.body;
    // Prevent double-click: reject if checkout created within last 10 seconds
    const lastCheckout = recentCheckouts.get(req.user.id);
    if (lastCheckout && Date.now() - lastCheckout < 10000) {
      return res.status(429).json({ error: 'Checkout already in progress. Please wait.' });
    }
    recentCheckouts.set(req.user.id, Date.now());
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
      metadata: { supabase_user_id: user.id },
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
  console.log('[Stripe webhook]', event.type, '| metadata:', JSON.stringify(data.metadata || {}));

  switch (event.type) {
    case 'checkout.session.completed': {
      // This fires first — before subscription events. Use customer ID to find user.
      const customerId = data.customer;
      const subscriptionId = data.subscription;
      console.log('[Stripe checkout.session.completed] customer:', customerId, '| subscription:', subscriptionId);

      if (customerId) {
        const { data: profile, error: findErr } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (findErr) console.error('[Stripe] Find user by customer error:', findErr);

        if (profile?.id) {
          const { error: updateErr } = await supabase
            .from('profiles')
            .update({
              tier: 'pro', plan: 'pro', plan_status: 'active',
              stripe_subscription_id: subscriptionId, subscription_status: 'active'
            })
            .eq('id', profile.id);

          if (updateErr) console.error('[Stripe] Update plan error:', updateErr);
          else console.log('[Stripe] User', profile.id, 'upgraded to Pro via checkout.session.completed');
        }
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const userId = data.metadata?.supabase_user_id;
      const subStatus = data.status;
      console.log('[Stripe sub update] userId:', userId, '| status:', subStatus, '| customer:', data.customer);

      // Only upgrade on active/trialing. Only downgrade on canceled/unpaid — NOT on past_due/incomplete
      const isActive = ['active', 'trialing'].includes(subStatus);
      const isCanceled = ['canceled', 'unpaid'].includes(subStatus);
      // For intermediate statuses (past_due, incomplete), only update subscription_status — don't change plan
      const planUpdate = isActive ? { tier: 'pro', plan: 'pro', plan_status: 'active' }
        : isCanceled ? { tier: 'free', plan: 'free', plan_status: 'cancelled' }
        : { plan_status: subStatus }; // past_due, incomplete — keep current plan, just log status

      const updatePayload = {
        ...planUpdate,
        stripe_subscription_id: data.id,
        subscription_status: subStatus,
        current_period_end: data.current_period_end ? new Date(data.current_period_end * 1000).toISOString() : null,
      };

      // Find user by metadata or customer ID
      let targetUserId = userId;
      if (!targetUserId) {
        const { data: profile } = await supabase.from('profiles').select('id').eq('stripe_customer_id', data.customer).single();
        targetUserId = profile?.id;
      }
      if (targetUserId) {
        const { error: subErr } = await supabase.from('profiles').update(updatePayload).eq('id', targetUserId);
        if (subErr) console.error('[Stripe] Sub update error:', subErr);
        else console.log('[Stripe] Updated user', targetUserId, '| plan:', planUpdate.plan || '(unchanged)', '| sub_status:', subStatus);
      } else {
        console.warn('[Stripe] Could not find user for sub update | customer:', data.customer);
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const userId = data.metadata?.supabase_user_id;
      if (!userId) break;
      await supabase
        .from('profiles')
        .update({ tier: 'free', plan: 'free', plan_status: 'cancelled', subscription_status: 'canceled' })
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
    plan: req.tier,
    tier: req.tier,
    status: p?.subscription_status || p?.plan_status || 'none',
    current_period_end: p?.current_period_end || null
  });
});

module.exports = router;
