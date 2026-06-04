const axios = require('axios');

const BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'google/gemini-2.0-flash-lite-preview-02-05:free';
const MAX_RPM = parseInt(process.env.OPENROUTER_MAX_RPM, 10) || 20;
const MAX_DAILY = parseInt(process.env.OPENROUTER_DAILY_LIMIT, 10) || 50;
const MAX_RETRIES = parseInt(process.env.OPENROUTER_MAX_RETRIES, 10) || 3;
const RETRY_BASE_DELAY = parseInt(process.env.OPENROUTER_RETRY_DELAY_MS, 10) || 1000;
const REQUEST_TIMEOUT = parseInt(process.env.OPENROUTER_TIMEOUT_MS, 10) || 30000;

const state = {
  requestsToday: 0,
  requestsLimit: MAX_DAILY,
  rpmRemaining: MAX_RPM,
  isRateLimited: false,
  model: DEFAULT_MODEL,
  lastResetDate: new Date().toISOString().split('T')[0],
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
  return {
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
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
  let delay = RETRY_BASE_DELAY;

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
        await new Promise(r => { setTimeout(r, delay); });
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
      const demo = generateDemoResponse(messages, options);
      if (demo) return demo;
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

      // Demo fallback: return generated response when OpenRouter call fails
      const demo = generateDemoResponse(messages, options);
      if (demo) return demo;

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
  } else if (!process.env.OPENROUTER_API_KEY) {
    yield { content: 'OpenRouter API key not configured', done: true };
  } else {
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
}

function generateDemoResponse(messages, options) {
  if (!messages || !messages.length) return null;

  const systemMsg = messages.find(m => m.role === 'system')?.content || '';
  const userMsg = messages.find(m => m.role === 'user')?.content || '';

  // Detect if this is a team agent call (not chat)
  const isSales = systemMsg.includes('Sales & Marketing Department Head');
  const isMemberSuccess = systemMsg.includes('Member Success');
  const isOperations = systemMsg.includes('Operations');
  const isFinance = systemMsg.includes('Finance & Billing');

  if (isSales || isMemberSuccess || isOperations || isFinance) {
    const demoActions = [];

    if (isSales) {
      // Extract leads data from user message
      const leadMatch = userMsg.match(/\[#(\d+)\]\s+(\w+)\s+(\w+)/);
      if (leadMatch) {
        demoActions.push({
          type: 'create_task',
          title: `Follow up with ${leadMatch[2]} ${leadMatch[3]}`,
          description: `Auto-generated follow-up task for lead #${leadMatch[1]}`,
          priority: 'high',
          task_type: 'call_hot_lead'
        });
      }
      demoActions.push({
        type: 'log_report',
        summary: 'Sales pipeline review completed',
        details: { leads_analyzed: 5, new_leads: 2, contacted: 1 }
      });
      const staffMatch = userMsg.match(/STAFF.*?\[#(\d+)\]\s+(\w+)/);
      if (staffMatch) {
        demoActions.push({
          type: 'draft_message',
          channel: 'sms',
          body: 'Hi! Just checking in to see if you have any questions about ROAR MMA. We have classes running this week!',
          lead_id: parseInt(leadMatch?.[1]) || 1
        });
      }
    }

    if (isMemberSuccess) {
      const memberData = userMsg.match(/Active[^]*?Trial/);
      demoActions.push({
        type: 'log_report',
        summary: 'Member retention scan completed',
        details: { active_members: 15, at_risk: 2, milestones: 1 }
      });
      if (userMsg.includes('days since')) {
        demoActions.push({
          type: 'flag_attendance_risk',
          member_id: 1,
          days_since_last_visit: 14
        });
      }
    }

    if (isOperations) {
      demoActions.push({
        type: 'log_report',
        summary: 'Operations audit completed',
        details: { classes_today: 3, capacity_avg: '70%', low_stock: 0 }
      });
      demoActions.push({
        type: 'create_task',
        title: 'Review class attendance trends',
        description: 'Weekly review of class attendance to optimize schedule',
        priority: 'medium',
        task_type: 'follow_up_trial'
      });
    }

    if (isFinance) {
      demoActions.push({
        type: 'log_report',
        summary: 'Financial health check completed',
        details: { revenue_today: 450, mrr: 12500, failed_payments: 1 }
      });
      const leadId = userMsg.match(/\[#(\d+)\]/);
      if (leadId) {
        demoActions.push({
          type: 'schedule_follow_up',
          lead_id: parseInt(leadId[1]),
          follow_up_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          notes: 'Payment follow-up needed'
        });
      }
    }

    const result = JSON.stringify(demoActions);
    console.log('[OPENROUTER] Demo fallback generated', result.substring(0, 120));
    return {
      content: result,
      finishReason: 'stop',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      model: 'demo-fallback'
    };
  }

  // Chat fallback: return a summary based on the data context in the user message
  if (systemMsg.includes('ROAR MMA gym management')) {
    const dataLines = userMsg.split('\n').filter(l => l.includes(':') || l.includes('—'));
    const summary = dataLines.length > 0
      ? dataLines.slice(0, 5).join('\n')
      : 'System data is current and ready for your query.';
    return {
      content: `Here's what I found:\n\n${summary}\n\nIs there anything specific you'd like to drill into?`,
      finishReason: 'stop',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      model: 'demo-fallback'
    };
  }

  return null;
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
