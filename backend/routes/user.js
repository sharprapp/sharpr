const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

const RESERVED = ['admin', 'sharpr', 'support', 'moderator', 'staff', 'official', 'sharprapp', 'null', 'undefined', 'delete', 'root'];

router.post('/set-username', requireAuth, async (req, res) => {
  try {
    const { username } = req.body;
    const userId = req.user.id;
    if (!username) return res.status(400).json({ error: 'Username required' });
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) return res.status(400).json({ error: 'Username must be 3-20 characters, letters, numbers, and underscores only' });
    if (RESERVED.includes(username.toLowerCase())) return res.status(400).json({ error: 'That username is reserved' });

    const { data: existing } = await supabase.from('profiles').select('id').eq('username', username.toLowerCase()).single();
    if (existing && existing.id !== userId) return res.status(409).json({ error: 'Username already taken' });

    const { error } = await supabase.from('profiles').update({ username: username.toLowerCase(), username_set: true }).eq('id', userId);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, username: username.toLowerCase() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/check-username', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) return res.json({ available: false, error: 'Invalid format' });
    if (RESERVED.includes(username.toLowerCase())) return res.json({ available: false, error: 'Reserved' });
    const { data } = await supabase.from('profiles').select('id').eq('username', username.toLowerCase()).single();
    res.json({ available: !data });
  } catch { res.json({ available: true }); }
});

module.exports = router;
