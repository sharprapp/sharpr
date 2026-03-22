const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:support@sharprapp.com',
  process.env.VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

// POST /api/notifications/subscribe
router.post('/subscribe', requireAuth, async (req, res) => {
  const { subscription } = req.body;
  if (!subscription) return res.status(400).json({ error: 'Subscription required' });

  try {
    // Remove old subscriptions for this user
    await supabase.from('push_subscriptions').delete().eq('user_id', req.user.id);
    // Insert new
    const { error } = await supabase.from('push_subscriptions').insert({
      user_id: req.user.id,
      subscription,
    });
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    console.error('Push subscribe error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/notifications/unsubscribe
router.post('/unsubscribe', requireAuth, async (req, res) => {
  try {
    await supabase.from('push_subscriptions').delete().eq('user_id', req.user.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/notifications/send — internal, sends push to a user
router.post('/send', async (req, res) => {
  const { userId, title, body, url } = req.body;
  if (!userId || !title) return res.status(400).json({ error: 'userId and title required' });

  try {
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId);

    const payload = JSON.stringify({ title, body: body || '', url: url || '/dashboard' });
    let sent = 0;
    for (const sub of subs || []) {
      try {
        await webpush.sendNotification(sub.subscription, payload);
        sent++;
      } catch (e) {
        // Subscription expired — clean up
        if (e.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('subscription', sub.subscription);
        }
      }
    }
    res.json({ sent });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/notifications/broadcast — sends to all Pro users with subscriptions
router.post('/broadcast', async (req, res) => {
  const { title, body, url } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });

  try {
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('subscription');

    const payload = JSON.stringify({ title, body: body || '', url: url || '/dashboard' });
    let sent = 0, failed = 0;
    for (const sub of subs || []) {
      try {
        await webpush.sendNotification(sub.subscription, payload);
        sent++;
      } catch {
        failed++;
      }
    }
    res.json({ sent, failed });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/notifications/vapid-key
router.get('/vapid-key', (req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY || '' });
});

module.exports = router;
