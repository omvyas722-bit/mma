const axios = require('axios');
const BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek/deepseek-chat';
const REQUEST_TIMEOUT = 30000;

const state = { requestsToday: 0, totalRequests: 0, totalTokens: 0, successfulRequests: 0, failedRequests: 0 };

async function completeChat(messages, options = {}) {
  state.requestsToday++;
  state.totalRequests++;
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return { error: 'No API key configured', content: null, finishReason: 'error' };
  try {
    const response = await axios.post(BASE_URL, {
      model: options.model || DEEPSEEK_MODEL,
      messages, max_tokens: options.maxTokens || 1024, temperature: options.temperature ?? 0.7,
    }, { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://roarmma.com.au' }, timeout: REQUEST_TIMEOUT });
    const choice = response.data?.choices?.[0];
    if (!choice) return { error: 'No response', content: null, finishReason: 'error' };
    state.successfulRequests++;
    state.totalTokens += response.data?.usage?.total_tokens || 0;
    return { content: choice.message?.content || '', finishReason: choice.finish_reason || 'stop', usage: response.data?.usage || {}, model: response.data?.model || DEEPSEEK_MODEL };
  } catch (err) {
    state.failedRequests++;
    return { error: err.message, content: null, finishReason: 'error' };
  }
}

module.exports = { completeChat, getStatus: () => state, getUsageStats: () => state };
