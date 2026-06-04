const axios = require('axios');

const BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

const state = {
  totalRequests: 0,
  totalTokens: 0,
  successfulRequests: 0,
  failedRequests: 0,
};

async function completeChat(messages, options = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return {
      error: 'Groq API key not configured',
      content: null,
      finishReason: 'error',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      model: options.model || DEFAULT_MODEL
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 30000);

  try {
    const response = await axios.post(BASE_URL, {
      model: options.model || DEFAULT_MODEL,
      messages,
      temperature: options.temperature !== undefined ? options.temperature : 0.7,
      max_tokens: options.maxTokens || 1024,
      stop: options.stop,
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    const result = response.data;
    state.totalRequests++;
    state.successfulRequests++;

    const choice = result.choices?.[0];
    const content = choice?.message?.content || null;
    const usage = result.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    state.totalTokens += (usage.total_tokens || 0);

    console.log(`[GROQ] ✓ completeChat — model=${result.model} tokens=${usage.total_tokens}`);

    return {
      content,
      finishReason: choice?.finish_reason || 'stop',
      usage: {
        promptTokens: usage.prompt_tokens || 0,
        completionTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0,
      },
      model: result.model || options.model || DEFAULT_MODEL,
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('[GROQ] Request timed out');
    } else {
      console.error('[GROQ] completeChat error:', error.message);
    }

    state.failedRequests++;

    return {
      error: error.message || 'Unknown error',
      content: null,
      finishReason: 'error',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      model: options.model || DEFAULT_MODEL,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function getStatus() {
  return {
    hasApiKey: !!process.env.GROQ_API_KEY,
    totalRequests: state.totalRequests,
    successfulRequests: state.successfulRequests,
    failedRequests: state.failedRequests,
    model: DEFAULT_MODEL,
  };
}

function getUsageStats() {
  return {
    totalRequests: state.totalRequests,
    totalTokens: state.totalTokens,
    successfulRequests: state.successfulRequests,
    failedRequests: state.failedRequests,
  };
}

module.exports = {
  completeChat,
  getStatus,
  getUsageStats,
};
