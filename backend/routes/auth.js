const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const { data, error } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true
  });
  if (error) return res.status(400).json({ error: error.message });

  // Create profile row
  await supabase.from('profiles').insert({
    id: data.user.id,
    email: data.user.email,
    tier: 'free'
  });

  res.json({ message: 'Account created. Please sign in.' });
});

// Get current user profile + tier
router.get('/me', requireAuth, async (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    tier: req.tier,
    profile: req.profile
  });
});

module.exports = router;
