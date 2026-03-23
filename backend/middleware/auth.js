const supabase = require('../lib/supabase');

// Validates the Supabase JWT sent in Authorization header
// Attaches user + subscription tier to req
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Invalid token' });

    // Fetch user profile (includes stripe_customer_id and tier)
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    req.user = user;
    req.profile = profile || {};
    req.tier = profile?.plan || profile?.tier || 'free';
    console.log('[auth] user:', user.id?.slice(0, 8), '| plan:', req.tier, '| raw:', { plan: profile?.plan, tier: profile?.tier });
    next();
  } catch (err) {
    console.error('[auth] failed:', err.message);
    return res.status(401).json({ error: 'Auth failed' });
  }
}

// Optional auth — attaches req.user if token present, silently skips if not
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
  const token = authHeader.split(' ')[1];
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      req.user = user;
      req.profile = profile || {};
      req.tier = profile?.plan || profile?.tier || 'free';
    }
  } catch {}
  next();
}

module.exports = { requireAuth, optionalAuth };
