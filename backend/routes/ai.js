const express = require('express');
const router = express.Router();
const anthropic = require('../lib/anthropic');
const { requireAuth } = require('../middleware/auth');
const { checkAILimit, logAIUsage } = require('../middleware/tier');

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

  news: `You are a cross-market analyst. Today is ${new Date().toDateString()}.
RESPOND IN THIS EXACT FORMAT (max 150 words):
🔮 Polymarket: • [impact on prediction markets]
🏈 Sports betting: • [impact on lines or props]
📈 Trading: • [impact on tickers or sectors]

KEY PLAY: [one specific actionable recommendation with emoji]

No paragraphs. Sharp takes only.`
};

router.post('/query', requireAuth, checkAILimit, async (req, res) => {
  const { query, type = 'polymarket', use_web_search = true } = req.body;
  if (!query) return res.status(400).json({ error: 'Query required' });

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

    await logAIUsage(req.user.id);
    res.json({ result: text, model: message.model });
  } catch (err) {
    console.error('AI error:', err.status, err.message, JSON.stringify(err.error));
    res.status(500).json({ error: err.message || 'AI query failed' });
  }
});

module.exports = router;
