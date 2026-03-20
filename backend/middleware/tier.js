const { TIER_LIMITS } = require('../lib/stripe');
const supabase = require('../lib/supabase');

// Usage: router.post('/query', requireAuth, requirePro, handler)
function requirePro(req, res, next) {
  if (req.tier !== 'pro') {
    return res.status(403).json({
      error: 'Pro plan required',
      upgrade: true,
      message: 'Upgrade to Sharpr Pro to access this feature.'
    });
  }
  next();
}

// Check daily AI query limit for free users
async function checkAILimit(req, res, next) {
  if (req.tier === 'pro') return next();

  const today = new Date().toISOString().split('T')[0];
  const { count } = await supabase
    .from('ai_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', req.user.id)
    .gte('created_at', today);

  const limit = TIER_LIMITS.free.ai_queries_per_day;
  if (count >= limit) {
    return res.status(429).json({
      error: 'Daily AI query limit reached',
      upgrade: true,
      limit,
      message: `Free plan includes ${limit} AI queries/day. Upgrade for unlimited.`
    });
  }
  next();
}

// Log AI usage after successful query
async function logAIUsage(userId) {
  await supabase.from('ai_usage').insert({ user_id: userId });
}

module.exports = { requirePro, checkAILimit, logAIUsage };
