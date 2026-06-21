const groq = require('./groqClient');
const openRouter = require('./openRouterClient');

function isDownError(msg) {
  if (!msg) return false;
  return /timeout|econn|enotfound|etimedout|status code 5|socket|network|abort|eai_again/i.test(msg);
}

async function completeChat(messages, options = {}) {
  const groqResult = await groq.completeChat(messages, options);
  if (groqResult.content) return groqResult;
  if (groqResult.error && !isDownError(groqResult.error)) return groqResult;
  if (groqResult.error && groqResult.error.includes('not configured')) return openRouter.completeChat(messages, options);
  if (groqResult.error) console.log('[PROVIDER] Groq appears down, falling back to OpenRouter:', groqResult.error);
  return openRouter.completeChat(messages, options);
}

function streamChat(messages, options = {}) {
  return openRouter.streamChat(messages, options);
}

module.exports = {
  completeChat,
  streamChat,
  getStatus: () => ({ primary: groq.getStatus(), fallback: openRouter.getStatus() }),
  getUsageStats: () => {
    const g = groq.getUsageStats();
    const o = openRouter.getUsageStats();
    return {
      groq: g,
      openRouter: o,
      totalRequests: g.totalRequests + o.totalRequests,
      totalTokens: g.totalTokens + o.totalTokens,
      successfulRequests: g.successfulRequests + o.successfulRequests,
      failedRequests: g.failedRequests + o.failedRequests,
    };
  },
};
