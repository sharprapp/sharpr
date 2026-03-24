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

// SSE streaming endpoint — supports conversation history
router.post('/stream', requireAuth, checkAILimit, async (req, res) => {
  const { query, type = 'polymarket', use_web_search = true, history } = req.body;
  if (!query) return res.status(400).json({ error: 'Query required' });

  const hasHistory = Array.isArray(history) && history.length > 0;

  // Check cache (only for single queries, not conversations)
  if (!hasHistory) {
    const cacheKey = getCacheKey(query, type);
    const cached = aiCache.get(cacheKey);
    const ttl = CACHE_TTL[type] || 600000;
    if (cached && Date.now() - cached.ts < ttl) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.write(`data: ${JSON.stringify({ text: cached.result })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      if (!hasHistory || history.length <= 1) await logAIUsage(req.user.id);
      return;
    }
  }

  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const chatMessages = hasHistory
      ? [...history.slice(-6), { role: 'user', content: query }]
      : [{ role: 'user', content: query }];

    const chatSystemPrompt = `You are a sharp analyst for trading, sports betting, and prediction markets. Today is ${new Date().toDateString()}. Give direct, specific, confident analysis. Use emojis and clear formatting. Keep language simple and easy to understand — no jargon.

VERDICT rules:
- Sports betting: use simple verdicts like BET THIS, SKIP THIS, WAIT, STRONG PLAY, RISKY BET
- Polymarket: always give YES or NO with a probability %
- Trading: use BUY, SELL, HOLD, WAIT, AVOID
- General questions: no verdict needed

MANDATORY RULE — You MUST follow this without exception:
Any response that contains a betting pick, trade recommendation, investment suggestion, market play, or any actionable advice MUST end with this exact text on its own line:

⚠️ *This is for informational purposes only. Not financial or betting advice. Sharpr is not liable for any losses. Bet and trade responsibly.*

This is non-negotiable. If you recommend a bet, trade, or market play — the disclaimer MUST appear as the last line. No exceptions. Only skip for purely factual/educational answers with no actionable recommendation.
Never say "As an AI" or add generic caveats before answers.`;

    const systemPrompt = hasHistory ? chatSystemPrompt : (SYSTEM_PROMPTS[type] || SYSTEM_PROMPTS.polymarket);

    // Only enable web search for queries that clearly need current data
    // This avoids the 5-10s delay from search tool on every message
    const needsSearch = use_web_search && !hasHistory && /today|tonight|current|latest|right now|this week|live|score|odds|price/i.test(query);

    const messageParams = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      stream: true,
      system: systemPrompt,
      messages: chatMessages,
    };

    if (needsSearch) {
      messageParams.tools = [{ type: 'web_search_20250305', name: 'web_search' }];
    }

    // Send immediate "thinking" signal so frontend knows stream is alive
    res.write(`data: ${JSON.stringify({ status: 'streaming' })}\n\n`);

    let fullText = '';
    const stream = anthropic.messages.stream(messageParams);

    stream.on('text', (text) => {
      fullText += text;
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    });

    stream.on('end', async () => {
      res.write('data: [DONE]\n\n');
      res.end();
      if (!hasHistory) {
        const cacheKey = getCacheKey(query, type);
        aiCache.set(cacheKey, { result: fullText, ts: Date.now() });
      }
      if (!hasHistory || history.length <= 1) await logAIUsage(req.user.id);
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
  const { query, type = 'polymarket', use_web_search = true, history } = req.body;
  if (!query) return res.status(400).json({ error: 'Query required' });

  // Skip cache when conversation history is provided (chat mode)
  const hasHistory = Array.isArray(history) && history.length > 0;
  if (!hasHistory) {
    const cacheKey = getCacheKey(query, type);
    const cached = aiCache.get(cacheKey);
    const ttl = CACHE_TTL[type] || 600000;
    if (cached && Date.now() - cached.ts < ttl) {
      await logAIUsage(req.user.id);
      return res.json({ result: cached.result, cached: true });
    }
  }

  try {
    // Build messages: include last 6 history messages for context
    const chatMessages = hasHistory
      ? [...history.slice(-6), { role: 'user', content: query }]
      : [{ role: 'user', content: query }];

    const chatSystemPrompt = `You are a sharp analyst for trading, sports betting, and prediction markets. Today is ${new Date().toDateString()}. Give direct, specific, confident analysis. Use emojis and clear formatting. Keep language simple and easy to understand — no jargon.

VERDICT rules:
- Sports betting: use simple verdicts like BET THIS, SKIP THIS, WAIT, STRONG PLAY, RISKY BET
- Polymarket: always give YES or NO with a probability %
- Trading: use BUY, SELL, HOLD, WAIT, AVOID
- General questions: no verdict needed

DISCLAIMER rule:
Whenever your response includes any betting, trading, or investment recommendation, always add this exact line at the very end:
⚠️ *This is for informational purposes only. Not financial or betting advice. Sharpr is not liable for any losses. Bet and trade responsibly.*

Do not add the disclaimer for general knowledge questions or explanations.
Do not repeat disclaimers or warnings mid-response.
Never say "As an AI" or add generic caveats before answers.`;

    const systemPrompt = hasHistory ? chatSystemPrompt : (SYSTEM_PROMPTS[type] || SYSTEM_PROMPTS.polymarket);

    const messageParams = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: chatMessages,
    };

    // Only enable web search when query needs current data
    const needsSearch = use_web_search && !hasHistory && /today|tonight|current|latest|right now|this week|live|score|odds|price/i.test(query);
    if (needsSearch) {
      messageParams.tools = [{ type: 'web_search_20250305', name: 'web_search' }];
    }

    const message = await anthropic.messages.create(messageParams);

    const text = message.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    // Only cache single-query responses (not chat)
    if (!hasHistory) {
      const cacheKey = getCacheKey(query, type);
      aiCache.set(cacheKey, { result: text, ts: Date.now() });
    }

    // Only count first message in a chat session against quota (not follow-ups)
    if (!hasHistory || history.length <= 1) await logAIUsage(req.user.id);
    res.json({ result: text, model: message.model });
  } catch (err) {
    console.error('AI error:', err.status, err.message, JSON.stringify(err.error));
    res.status(500).json({ error: err.message || 'AI query failed' });
  }
});

// POST /api/ai/parse-image — extract bet/trade data from screenshot
router.post('/parse-image', requireAuth, async (req, res) => {
  const { image, type = 'bet' } = req.body;
  if (!image) return res.status(400).json({ error: 'Image required' });

  // Check pro tier
  if (req.tier !== 'pro' && req.tier !== 'elite') {
    return res.status(403).json({ error: 'Pro feature', upgrade: true });
  }

  const prompt = type === 'trade'
    ? 'Extract from this trade screenshot: ticker/symbol, action (buy/sell/long/short), quantity, entry price, P&L/profit if shown, date. Return JSON only, no markdown: {"ticker":"","direction":"","qty":"","entry":"","pnl":"","notes":""}'
    : 'Extract from this bet screenshot: sportsbook name, teams/event, bet type (moneyline/spread/over-under/parlay/prop), odds in American format, stake amount. Return JSON only, no markdown: {"sportsbook":"","match":"","type":"","odds":"","stake":"","notes":""}';

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: image.startsWith('/9j/') ? 'image/jpeg' : 'image/png', data: image.replace(/^data:image\/\w+;base64,/, '') } },
          { type: 'text', text: prompt },
        ],
      }],
    });

    const text = message.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    await logAIUsage(req.user.id);
    res.json({ parsed, raw: text });
  } catch (err) {
    console.error('Image parse error:', err.message);
    res.status(500).json({ error: 'Could not read screenshot. Try a clearer image.' });
  }
});

module.exports = router;
