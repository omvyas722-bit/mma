const openRouter = require('./openRouterClient');
const axios = require('axios');

const FALLBACKS = [
  {
    name: 'Groq',
    baseURL: 'https://api.groq.com/openai/v1',
    envKey: 'GROQ_API_KEY',
    defaultModel: 'llama-3.3-70b-versatile'
  },
  {
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com',
    envKey: 'DEEPSEEK_API_KEY',
    defaultModel: 'deepseek-chat'
  },
  {
    name: 'Together AI',
    baseURL: 'https://api.together.xyz/v1',
    envKey: 'TOGETHER_API_KEY',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free'
  }
];

function buildPayload(messages, options) {
  return {
    model: options.model || null,
    messages,
    temperature: options.temperature !== undefined ? options.temperature : 0.7,
    max_tokens: options.maxTokens || 2048
  };
}

function parseResponse(data, model) {
  if (!data) {
    return { error: 'null response', content: null, finishReason: 'error', usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, model: model || 'none' };
  }
  const choice = data.choices?.[0];
  const usage = data.usage || {};
  return {
    content: choice?.message?.content || null,
    finishReason: choice?.finish_reason || 'stop',
    usage: {
      promptTokens: usage.prompt_tokens || 0,
      completionTokens: usage.completion_tokens || 0,
      totalTokens: usage.total_tokens || 0
    },
    model: data.model || model
  };
}

async function callFallback(provider, messages, options) {
  const apiKey = process.env[provider.envKey];
  if (!apiKey) {
    return { error: `${provider.name} API key not configured (set ${provider.envKey})` };
  }

  try {
    const payload = buildPayload(messages, options);
    payload.model = payload.model || provider.defaultModel;

    const response = await axios.post(`${provider.baseURL}/chat/completions`, payload, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: options.timeout || 30000
    });

    if (!response || !response.data) {
      return { error: `${provider.name}: null response` };
    }

    return parseResponse(response.data, provider.defaultModel);
  } catch (error) {
    const status = error.response?.status;
    const detail = error.response?.data?.error?.message || error.message;
    console.warn(`[PROVIDER-CHAIN] ${provider.name} failed (${status || 'network'}): ${detail}`);
    return { error: `${provider.name}: ${detail}` };
  }
}

async function completeChat(messages, options = {}) {
  const orResult = await openRouter.completeChat(messages, options);

  if (!orResult.error && orResult.content) {
    return orResult;
  }

  console.warn(`[PROVIDER-CHAIN] OpenRouter unavailable (${orResult.error || 'empty response'}), trying fallbacks in parallel...`);

  const results = await Promise.race(
    FALLBACKS.map((provider, i) =>
      new Promise((resolve) => {
        setTimeout(async () => {
          const result = await callFallback(provider, messages, { ...options, timeout: 15000 });
          if (!result.error && result.content) {
            console.log(`[PROVIDER-CHAIN] ✓ ${provider.name} responded (model: ${result.model})`);
            resolve(result);
          } else {
            resolve({ error: `${provider.name} failed` });
          }
        }, i * 2000);
      })
    ).concat(
      new Promise(resolve => { setTimeout(() => resolve({ error: 'timeout' }), 20000); })
    )
  );

  if (results && !results.error && results.content) {
    return results;
  }

  return {
    error: 'All AI providers failed. Check API keys and try again.',
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
