const axios = require('axios');

const BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-4o-mini';
const MAX_RPM = 20;
const MAX_DAILY = 50;
const MAX_RETRIES = 3;
const REQUEST_TIMEOUT = 30000;

const state = {
  requestsToday: 0,
  requestsLimit: MAX_DAILY,
  rpmRemaining: MAX_RPM,
  isRateLimited: false,
  model: DEFAULT_MODEL,
  lastResetDate: new Date().toDateString(),
  minuteStart: Date.now(),
  minuteCount: 0,
  totalRequests: 0,
  totalTokens: 0,
  successfulRequests: 0,
  failedRequests: 0,
  queuedRequests: 0
};

// Simple mutex to prevent concurrent rate limit bypasses
const rateLimitLock = {
  locked: false,
  queue: [],
  async acquire() {
    if (!this.locked) {
      this.locked = true;
      return;
    }
    return new Promise(resolve => {
      this.queue.push(resolve);
    });
  },
  release() {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next();
    } else {
      this.locked = false;
    }
  }
};

function resetDailyCounter() {
  const now = new Date();
  const utcDateStr = now.toISOString().split('T')[0];
  if (state.lastResetDate !== utcDateStr) {
    state.requestsToday = 0;
    state.lastResetDate = utcDateStr;
    state.isRateLimited = false;
    console.log('[OPENROUTER] Daily counter reset for new day');
  }
}

function resetMinuteCounter() {
  const now = Date.now();
  if (now - state.minuteStart >= 60000) {
    state.minuteCount = 0;
    state.minuteStart = now;
    state.rpmRemaining = MAX_RPM;
    console.log('[OPENROUTER] Minute counter reset');
  }
}

function updateRateLimitState() {
  resetDailyCounter();
  resetMinuteCounter();

  state.rpmRemaining = Math.max(0, MAX_RPM - state.minuteCount);
  state.isRateLimited = state.requestsToday >= state.requestsLimit || state.minuteCount >= MAX_RPM;
}

function getAuthHeaders() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn('[OPENROUTER] OPENROUTER_API_KEY not set in environment');
    return {};
  }
  return {
    'Authorization': `Bearer ${apiKey}`,
    'HTTP-Referer': 'https://roarmma.com.au',
    'X-Title': 'ROAR MMA AI',
    'Content-Type': 'application/json'
  };
}

function buildRequestBody(messages, options = {}) {
  const body = {
    model: options.model || DEFAULT_MODEL,
    messages,
    temperature: options.temperature !== undefined ? options.temperature : 0.7,
    max_tokens: options.maxTokens || 2048
  };

  if (options.jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  if (options.stop) {
    body.stop = options.stop;
  }

  return body;
}

async function executeWithRetry(requestFn, retries = MAX_RETRIES) {
  let lastError = null;
  let delay = 1000;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const result = await requestFn();
      return result;
    } catch (error) {
      lastError = error;

      if (attempt > retries) {
        break;
      }

      const status = error.response?.status;
      if (!status || status === 429 || (status >= 500 && status < 600)) {
        console.log(`[OPENROUTER] Retry ${attempt}/${retries} after ${delay}ms (status=${status || 'network error'})`);
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
      } else {
        break;
      }
    }
  }

  throw lastError;
}

async function completeChat(messages, options = {}) {
  await rateLimitLock.acquire();
  try {
    updateRateLimitState();

    if (state.isRateLimited) {
      state.queuedRequests++;
      console.log('[OPENROUTER] Rate limited — returning throttled response');
      return {
        error: 'Rate limited. Please try again later.',
        content: null,
        finishReason: 'rate_limited',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        model: options.model || DEFAULT_MODEL
      };
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return {
        error: 'OpenRouter API key not configured',
        content: null,
        finishReason: 'error',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        model: options.model || DEFAULT_MODEL
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || REQUEST_TIMEOUT);

    try {
      const result = await executeWithRetry(async () => {
        const response = await axios.post(BASE_URL, buildRequestBody(messages, options), {
          headers: getAuthHeaders(),
          signal: controller.signal
        });
        return response.data;
      }, MAX_RETRIES);

      state.totalRequests++;
      state.minuteCount++;
      state.requestsToday++;

      const choice = result.choices?.[0];
      const content = choice?.message?.content || null;
      const finishReason = choice?.finish_reason || 'stop';
      const usage = result.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

      state.successfulRequests++;
      state.totalTokens += (usage.total_tokens || 0);

      console.log(`[OPENROUTER] ✓ completeChat — model=${result.model} finish=${finishReason} tokens=${usage.total_tokens}`);

      return {
        content,
        finishReason,
        usage: {
          promptTokens: usage.prompt_tokens || 0,
          completionTokens: usage.completion_tokens || 0,
          totalTokens: usage.total_tokens || 0
        },
        model: result.model || options.model || DEFAULT_MODEL
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('[OPENROUTER] Request timed out');
      } else {
        console.error('[OPENROUTER] completeChat error:', error.message);
      }

      state.failedRequests++;

      return {
        error: error.message || 'Unknown error',
        content: null,
        finishReason: 'error',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        model: options.model || DEFAULT_MODEL
      };
    } finally {
      clearTimeout(timeoutId);
    }
  } finally {
    rateLimitLock.release();
  }
}

async function* streamChat(messages, options = {}) {
  updateRateLimitState();

  if (state.isRateLimited) {
    state.queuedRequests++;
    yield { content: 'Rate limited. Please try again later.', done: true };
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    yield { content: 'OpenRouter API key not configured', done: true };
    return;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || REQUEST_TIMEOUT);

  let requestSucceeded = false;
  try {
    const response = await executeWithRetry(async () => {
      const res = await axios.post(BASE_URL, buildRequestBody(messages, { ...options, stream: true }), {
        headers: getAuthHeaders(),
        signal: controller.signal,
        responseType: 'stream'
      });
      return res;
    }, MAX_RETRIES);

    clearTimeout(timeoutId);

    state.totalRequests++;
    state.minuteCount++;
    state.requestsToday++;
    requestSucceeded = true;

    const stream = response.data;

    for await (const chunk of stream) {
      const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6);
          if (jsonStr === '[DONE]') {
            yield { content: null, done: true };
            state.successfulRequests++;
            return;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta;
            const content = delta?.content || null;
            yield { content, done: false };
          } catch (parseError) {
            console.error('[OPENROUTER] Failed to parse streaming chunk:', parseError.message);
          }
        }
      }
    }

    yield { content: null, done: true };
    state.successfulRequests++;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('[OPENROUTER] Stream request timed out');
    } else {
      console.error('[OPENROUTER] streamChat error:', error.message);
    }

    if (!requestSucceeded) {
      state.failedRequests++;
    }
    yield { content: null, done: true };
  } finally {
    clearTimeout(timeoutId);
  }
}

function getStatus() {
  updateRateLimitState();
  return {
    requestsToday: state.requestsToday,
    requestsLimit: state.requestsLimit,
    rpmRemaining: state.rpmRemaining,
    isRateLimited: state.isRateLimited,
    model: state.model,
    lastResetDate: state.lastResetDate,
    queuedRequests: state.queuedRequests,
    hasApiKey: !!process.env.OPENROUTER_API_KEY
  };
}

function getUsageStats() {
  return {
    totalRequests: state.totalRequests,
    totalTokens: state.totalTokens,
    successfulRequests: state.successfulRequests,
    failedRequests: state.failedRequests,
    queuedRequests: state.queuedRequests
  };
}

module.exports = {
  completeChat,
  streamChat,
  getStatus,
  getUsageStats
};
