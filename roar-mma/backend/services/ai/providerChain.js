const openRouter = require('./openRouterClient');

async function completeChat(messages, options = {}) {
  const result = await openRouter.completeChat(messages, options);

  if (!result.error && result.content) {
    return result;
  }

  return {
    error: result.error || 'OpenRouter returned empty response',
    content: null,
    finishReason: 'error',
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    model: 'none'
  };
}

module.exports = {
  completeChat,
  streamChat: openRouter.streamChat,
  getStatus: openRouter.getStatus,
  getUsageStats: openRouter.getUsageStats
};
