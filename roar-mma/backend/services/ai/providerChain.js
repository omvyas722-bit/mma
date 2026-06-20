// ponytail: single-provider (groq), was fallback chain; add openrouter fallback if groq reliability is an issue
const groq = require('./groqClient');

async function completeChat(messages, options = {}) {
  return groq.completeChat(messages, options);
}

module.exports = {
  completeChat,
  streamChat: null,
  getStatus: groq.getStatus,
  getUsageStats: groq.getUsageStats,
};
