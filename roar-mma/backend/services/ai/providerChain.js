const groq = require('./groqClient');
const openRouter = require('./openRouterClient');
const deepseek = require('./deepseekClient');

async function completeChat(messages, options = {}) {
  // Try Groq first (free tier, 14,400 req/day)
  const groqResult = await groq.completeChat(messages, options);
  if (!groqResult.error && groqResult.content) {
    return groqResult;
  }

  // Fallback to OpenRouter
  console.log('[PROVIDER] Groq failed, falling back to OpenRouter:', groqResult.error);
  const orResult = await openRouter.completeChat(messages, options);
  if (!orResult.error && orResult.content) {
    return orResult;
  }

  // Fallback to DeepSeek via OpenRouter
  console.log('[PROVIDER] OpenRouter failed, falling back to DeepSeek:', orResult.error);
  const dsResult = await deepseek.completeChat(messages, options);
  if (!dsResult.error && dsResult.content) {
    return dsResult;
  }

  return {
    error: dsResult.error || 'All providers failed',
    content: null,
    finishReason: 'error',
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    model: 'none'
  };
}

module.exports = {
  completeChat,
  streamChat: openRouter.streamChat,
  getStatus: () => ({ groq: groq.getStatus(), openRouter: openRouter.getStatus(), deepseek: deepseek.getStatus() }),
  getUsageStats: () => ({ groq: groq.getUsageStats(), openRouter: openRouter.getUsageStats(), deepseek: deepseek.getUsageStats() }),
};
