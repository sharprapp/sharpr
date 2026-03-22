const express = require('express');
const router = express.Router();
const anthropic = require('../lib/anthropic');
const { requireAuth } = require('../middleware/auth');
const { checkAILimit, logAIUsage } = require('../middleware/tier');
const crypto = require('crypto');

// In-memory response cache
const aiCache = new Map();
const CACHE_TTL = { sports: 600000, polymarket: 600000, trading: 600000, news: 1800000 }; // 10min / 30min

function getCacheKey(query, type) {
  return crypto.createHash('md5').update(query + '|' + type).digest('hex');
}

const SYSTEM_PROMPTS = {
  polymarket: `You are a sharp Polymarket prediction market analyst. Today is ${new Date().toDateString()}.
RESPOND IN THIS EXACT FORMAT (max 150 words total, no paragraphs):
• 🔍 [current situation in one line]
• 📊 [key factor driving the outcome]
• ⚡ [probability assessment vs market price]
• 🗓️ [upcoming catalyst or deadline]

Confidence: XX%
VERDICT: BET YES 🎯 | BET NO 📉 | FADE 🔥 | PASS ⚠️

Use emojis throughout. Bullets only — no paragraphs. Be direct and actionable.`,

  sports: `You are a sharp sports betting analyst. Today is ${new Date().toDateString()}.
RESPOND IN THIS EXACT FORMAT (max 150 words, no paragraphs):
• 🏟️ [matchup context or recent form]
• 🩹 [injury or lineup news]
• 📈 [line value or sharp money angle]
• 🌦️ [situational edge — venue, weather, rest, travel]

Confidence: XX%
VERDICT: BET [TEAM/SIDE/OVER/UNDER] 🎯 | PASS ⚠️

Use emojis. Bullets only. Sharp takes, no fluff.`,

  trading: `You are a sharp day trader. Today is ${new Date().toDateString()}.
RESPOND IN THIS EXACT FORMAT (max 150 words, no paragraphs):
• 📊 Trend: [current price action and momentum]
• 🎯 Levels: [key support / resistance]
• ⚡ Setup: [pattern or catalyst]
• 💰 Trade: Entry [X] | Stop [X] | Target [X] | R:R [X:X]

Confidence: XX%
VERDICT: LONG 📈 | SHORT 📉 | WAIT ⚠️

Specific numbers. No paragraphs. Be actionable.`,

  news: `You are Sharpr's AI analyst. Today is ${new Date().toDateString()}.
The user has shared a news article or story. Your job is to analyze the NEWS STORY itself.

RESPOND IN THIS EXACT FORMAT:

**What happened**
[3-4 sentences analyzing the actual news — what happened, why it matters, the key context and backstory. This is the main section. Write in clear prose, not bullets.]

---

🎯 **Edge**
[2-3 sentences max on how a sharp bettor or trader could potentially profit — prediction markets, props, futures, or related stocks. Keep this brief and actionable.]

IMPORTANT: Lead with the news analysis. The story is the main event, the edge is the bonus. Do NOT use bullet-point lists or split into separate Polymarket/Sports/Trading sections.`
};

// SSE streaming endpoint
router.post('/stream', requireAuth, checkAILimit, async (req, res) => {
  const { query, type = 'polymarket', use_web_search = true } = req.body;
  if (!query) return res.status(400).json({ error: 'Query required' });

  // Check cache
  const cacheKey = getCacheKey(query, type);
  const cached = aiCache.get(cacheKey);
  const ttl = CACHE_TTL[type] || 600000;
  if (cached && Date.now() - cached.ts < ttl) {
    // Return cached as instant SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write(`data: ${JSON.stringify({ text: cached.result })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
    await logAIUsage(req.user.id);
    return;
  }

  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const messageParams = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      stream: true,
      system: SYSTEM_PROMPTS[type] || SYSTEM_PROMPTS.polymarket,
      messages: [{ role: 'user', content: query }],
    };

    if (use_web_search) {
      messageParams.tools = [{ type: 'web_search_20250305', name: 'web_search' }];
    }

    let fullText = '';
    const stream = anthropic.messages.stream(messageParams);

    stream.on('text', (text) => {
      fullText += text;
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    });

    stream.on('end', async () => {
      res.write('data: [DONE]\n\n');
      res.end();
      // Cache the full response
      aiCache.set(cacheKey, { result: fullText, ts: Date.now() });
      await logAIUsage(req.user.id);
    });

    stream.on('error', (err) => {
      console.error('Stream error:', err.message);
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    });
  } catch (err) {
    console.error('AI stream error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'AI query failed' });
    }
  }
});

// Non-streaming endpoint (kept for backward compatibility)
router.post('/query', requireAuth, checkAILimit, async (req, res) => {
  const { query, type = 'polymarket', use_web_search = true } = req.body;
  if (!query) return res.status(400).json({ error: 'Query required' });

  // Check cache
  const cacheKey = getCacheKey(query, type);
  const cached = aiCache.get(cacheKey);
  const ttl = CACHE_TTL[type] || 600000;
  if (cached && Date.now() - cached.ts < ttl) {
    await logAIUsage(req.user.id);
    return res.json({ result: cached.result, cached: true });
  }

  try {
    const messageParams = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: SYSTEM_PROMPTS[type] || SYSTEM_PROMPTS.polymarket,
      messages: [{ role: 'user', content: query }]
    };

    if (use_web_search) {
      messageParams.tools = [{ type: 'web_search_20250305', name: 'web_search' }];
    }

    const message = await anthropic.messages.create(messageParams);

    const text = message.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    // Cache the response
    aiCache.set(cacheKey, { result: text, ts: Date.now() });

    await logAIUsage(req.user.id);
    res.json({ result: text, model: message.model });
  } catch (err) {
    console.error('AI error:', err.status, err.message, JSON.stringify(err.error));
    res.status(500).json({ error: err.message || 'AI query failed' });
  }
});

module.exports = router;
