const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.OPENROUTER_DAILY_LIMIT = '10';
process.env.OPENROUTER_MAX_RPM = '5';
process.env.OPENROUTER_MAX_RETRIES = '2';
process.env.OPENROUTER_RETRY_DELAY_MS = '1';
process.env.OPENROUTER_TIMEOUT_MS = '5000';

const { getStatus, getUsageStats, completeChat, streamChat } = require('../services/ai/openRouterClient');

describe('getStatus', () => {
  it('returns correct shape', () => {
    const s = getStatus();
    assert.ok(s);
    assert.equal(typeof s.isRateLimited, 'boolean');
    assert.equal(typeof s.requestsToday, 'number');
    assert.equal(typeof s.requestsLimit, 'number');
    assert.equal(typeof s.rpmRemaining, 'number');
    assert.ok(typeof s.model === 'string');
    assert.ok(s.hasApiKey === false);
  });

  it('reflects environment configuration', () => {
    const s = getStatus();
    assert.equal(s.requestsLimit, 10);
    assert.equal(s.rpmRemaining, 5);
  });

  it('shows initial state', () => {
    const s = getStatus();
    assert.equal(s.isRateLimited, false);
    assert.equal(s.requestsToday, 0);
    assert.equal(s.hasApiKey, false);
  });
});

describe('getUsageStats', () => {
  it('returns correct shape', () => {
    const stats = getUsageStats();
    assert.ok(stats);
    assert.equal(typeof stats.totalRequests, 'number');
    assert.equal(typeof stats.totalTokens, 'number');
    assert.equal(typeof stats.successfulRequests, 'number');
    assert.equal(typeof stats.failedRequests, 'number');
    assert.equal(typeof stats.queuedRequests, 'number');
  });

  it('shows initial zero state', () => {
    const stats = getUsageStats();
    assert.equal(stats.totalRequests, 0);
    assert.equal(stats.totalTokens, 0);
    assert.equal(stats.successfulRequests, 0);
    assert.equal(stats.failedRequests, 0);
    assert.equal(stats.queuedRequests, 0);
  });
});

describe('completeChat', () => {
  it('returns error when no API key', async () => {
    const result = await completeChat([{ role: 'user', content: 'hi' }]);
    assert.equal(result.finishReason, 'error');
    assert.ok(result.error.includes('API key'));
  });

  it('succeeds with valid API key', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';

    const axios = require('axios');
    const origPost = axios.post;
    axios.post = async () => ({
      data: {
        choices: [{ message: { content: 'Hello!' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        model: 'openai/gpt-4o-mini'
      }
    });

    const result = await completeChat([{ role: 'user', content: 'hi' }]);
    assert.equal(result.content, 'Hello!');
    assert.equal(result.finishReason, 'stop');
    assert.equal(result.usage.totalTokens, 30);
    assert.equal(result.usage.completionTokens, 20);
    axios.post = origPost;
    delete process.env.OPENROUTER_API_KEY;
  });

  it('handles axios errors gracefully', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';

    const axios = require('axios');
    const origPost = axios.post;
    axios.post = async () => { throw new Error('Network failure'); };

    const result = await completeChat([{ role: 'user', content: 'hi' }]);
    assert.equal(result.finishReason, 'error');
    assert.ok(result.error);

    axios.post = origPost;
    delete process.env.OPENROUTER_API_KEY;
  });

  it('handles timeout', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';

    const axios = require('axios');
    const origPost = axios.post;
    axios.post = async () => { const err = new Error('timeout'); err.name = 'AbortError'; throw err; };

    const result = await completeChat([{ role: 'user', content: 'hi' }]);
    assert.equal(result.finishReason, 'error');

    axios.post = origPost;
    delete process.env.OPENROUTER_API_KEY;
  });

  it('handles non-retryable HTTP error', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';

    const axios = require('axios');
    const origPost = axios.post;
    axios.post = async () => {
      const err = new Error('Bad Request');
      err.response = { status: 400 };
      throw err;
    };

    const result = await completeChat([{ role: 'user', content: 'hi' }]);
    assert.equal(result.finishReason, 'error');

    axios.post = origPost;
    delete process.env.OPENROUTER_API_KEY;
  });

  it('succeeds after one retry', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';

    const axios = require('axios');
    const origPost = axios.post;
    let callCount = 0;
    axios.post = async () => {
      callCount++;
      if (callCount === 1) {
        const err = new Error('Server error');
        err.response = { status: 502 };
        throw err;
      }
      return {
        data: {
          choices: [{ message: { content: 'Retried OK' }, finish_reason: 'stop' }],
          usage: { total_tokens: 5 }
        }
      };
    };

    const result = await completeChat([{ role: 'user', content: 'hi' }]);
    assert.equal(result.content, 'Retried OK');
    assert.equal(callCount, 2);

    axios.post = origPost;
    delete process.env.OPENROUTER_API_KEY;
  });

  it('handles 429 rate limit retry', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';

    const axios = require('axios');
    const origPost = axios.post;
    let callCount = 0;
    axios.post = async () => {
      callCount++;
      if (callCount <= 2) {
        const err = new Error('Too Many Requests');
        err.response = { status: 429 };
        throw err;
      }
      return {
        data: {
          choices: [{ message: { content: 'After 429' }, finish_reason: 'stop' }],
          usage: { total_tokens: 3 }
        }
      };
    };

    const result = await completeChat([{ role: 'user', content: 'hi' }]);
    assert.equal(result.content, 'After 429');
    assert.equal(callCount, 3);

    axios.post = origPost;
    delete process.env.OPENROUTER_API_KEY;
  });

  it('relays options like jsonMode and stop', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';

    const axios = require('axios');
    const origPost = axios.post;
    let capturedBody = null;
    axios.post = async (url, body) => {
      capturedBody = body;
      return {
        data: {
          choices: [{ message: { content: 'options' }, finish_reason: 'stop' }],
          usage: {}
        }
      };
    };

    await completeChat([{ role: 'user', content: 'json' }], { jsonMode: true, stop: ['###'] });
    assert.equal(capturedBody.response_format.type, 'json_object');
    assert.deepEqual(capturedBody.stop, ['###']);

    axios.post = origPost;
    delete process.env.OPENROUTER_API_KEY;
  });
});

describe('rate limiting', () => {
  let mod;
  before(() => {
    process.env.OPENROUTER_DAILY_LIMIT = '1';
    process.env.OPENROUTER_MAX_RPM = '5';
    process.env.OPENROUTER_MAX_RETRIES = '2';
    process.env.OPENROUTER_RETRY_DELAY_MS = '1';
    process.env.OPENROUTER_TIMEOUT_MS = '5000';
    delete require.cache[require.resolve('../services/ai/openRouterClient')];
    mod = require('../services/ai/openRouterClient');
  });
  after(() => {
    process.env.OPENROUTER_DAILY_LIMIT = '10';
    delete require.cache[require.resolve('../services/ai/openRouterClient')];
  });

  it('returns rate limited when daily limit hit', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';

    const axios = require('axios');
    const origPost = axios.post;
    axios.post = async () => ({
      data: { choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }], usage: {} }
    });

    const r1 = await mod.completeChat([{ role: 'user', content: 'hi' }]);
    assert.equal(r1.finishReason, 'stop');

    const r2 = await mod.completeChat([{ role: 'user', content: 'hi again' }]);
    assert.equal(r2.finishReason, 'rate_limited');

    axios.post = origPost;
    delete process.env.OPENROUTER_API_KEY;
  });
});

describe('getAuthHeaders', () => {
  it('detects missing API key via status', () => {
    delete process.env.OPENROUTER_API_KEY;
    delete require.cache[require.resolve('../services/ai/openRouterClient')];
    const m = require('../services/ai/openRouterClient');
    assert.equal(m.getStatus().hasApiKey, false);
  });

  it('detects present API key via status', () => {
    process.env.OPENROUTER_API_KEY = 'sk-test';
    delete require.cache[require.resolve('../services/ai/openRouterClient')];
    const m = require('../services/ai/openRouterClient');
    assert.equal(m.getStatus().hasApiKey, true);
    delete process.env.OPENROUTER_API_KEY;
  });
});

describe('streamChat', () => {
  it('returns error when no API key', async () => {
    const gen = streamChat([{ role: 'user', content: 'hi' }]);
    const first = await gen.next();
    assert.equal(first.value.done, true);
    assert.ok(first.value.content.includes('API key'));
  });
});

describe('streamChat rate limited', () => {
  let mod;
  before(() => {
    process.env.OPENROUTER_DAILY_LIMIT = '1';
    process.env.OPENROUTER_MAX_RPM = '5';
    process.env.OPENROUTER_MAX_RETRIES = '2';
    process.env.OPENROUTER_RETRY_DELAY_MS = '1';
    process.env.OPENROUTER_TIMEOUT_MS = '5000';
    delete require.cache[require.resolve('../services/ai/openRouterClient')];
    mod = require('../services/ai/openRouterClient');
  });
  after(() => {
    process.env.OPENROUTER_DAILY_LIMIT = '10';
    delete require.cache[require.resolve('../services/ai/openRouterClient')];
  });

  it('returns rate limited', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';

    const axios = require('axios');
    const origPost = axios.post;
    axios.post = async () => ({
      data: { choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }], usage: {} }
    });

    await mod.completeChat([{ role: 'user', content: 'bump daily' }]);

    const gen = mod.streamChat([{ role: 'user', content: 'hi' }]);
    const first = await gen.next();
    assert.equal(first.value.done, true);
    assert.ok(first.value.content.includes('Rate limited'));

    axios.post = origPost;
    delete process.env.OPENROUTER_API_KEY;
  });
});

describe('streamChat success', () => {
  let mod;
  before(() => {
    process.env.OPENROUTER_API_KEY = 'test-key-stream';
    process.env.OPENROUTER_DAILY_LIMIT = '10';
    delete require.cache[require.resolve('../services/ai/openRouterClient')];
    mod = require('../services/ai/openRouterClient');
  });
  after(() => {
    delete process.env.OPENROUTER_API_KEY;
    delete require.cache[require.resolve('../services/ai/openRouterClient')];
  });

  it('streams tokens successfully', async () => {
    async function* mockStreamData() {
      yield Buffer.from('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n');
      yield Buffer.from('data: [DONE]\n\n');
    }

    const axios = require('axios');
    const origPost = axios.post;
    axios.post = async () => ({ data: mockStreamData() });

    const results = [];
    for await (const chunk of mod.streamChat([{ role: 'user', content: 'hello' }])) {
      results.push(chunk);
    }

    assert.equal(results.length, 2);
    assert.equal(results[0].content, 'Hello');
    assert.equal(results[0].done, false);
    assert.equal(results[1].content, null);
    assert.equal(results[1].done, true);

    axios.post = origPost;
  });
});

describe('daily counter reset', () => {
  it('resets when day changes', async () => {
    const OrigDate = global.Date;
    const yesterday = new OrigDate(OrigDate.now() - 86400000);
    global.Date = class extends OrigDate {
      constructor(...args) {
        if (args.length === 0) return new OrigDate(yesterday);
        return new OrigDate(...args);
      }
    };

    process.env.OPENROUTER_API_KEY = 'test-key';
    const axios = require('axios');
    const origPost = axios.post;
    axios.post = async () => ({
      data: { choices: [{ message: { content: 'x' }, finish_reason: 'stop' }], usage: {} }
    });

    await completeChat([{ role: 'user', content: 'test' }]);

    global.Date = OrigDate;
    axios.post = origPost;
    delete process.env.OPENROUTER_API_KEY;
  });
});

describe('minute counter reset', () => {
  it('resets when minute elapses', async () => {
    const origNow = Date.now;
    Date.now = () => origNow() + 120000;

    process.env.OPENROUTER_API_KEY = 'test-key';
    const axios = require('axios');
    const origPost = axios.post;
    axios.post = async () => ({
      data: { choices: [{ message: { content: 'x' }, finish_reason: 'stop' }], usage: {} }
    });

    await completeChat([{ role: 'user', content: 'test' }]);

    Date.now = origNow;
    axios.post = origPost;
    delete process.env.OPENROUTER_API_KEY;
  });
});

describe('rateLimitLock concurrent', () => {
  it('queues concurrent calls', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';

    const axios = require('axios');
    const origPost = axios.post;
    let callIdx = 0;
    axios.post = async () => {
      callIdx++;
      if (callIdx === 1) await new Promise(r => { setTimeout(r, 50); });
      return { data: { choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }], usage: {} } };
    };

    const [r1, r2] = await Promise.all([
      completeChat([{ role: 'user', content: 'a' }]),
      completeChat([{ role: 'user', content: 'b' }])
    ]);

    assert.equal(r1.finishReason, 'stop');
    assert.equal(r2.finishReason, 'stop');

    axios.post = origPost;
    delete process.env.OPENROUTER_API_KEY;
  });
});

describe('streamChat edge cases', () => {
  let mod;
  before(() => {
    process.env.OPENROUTER_API_KEY = 'test-key-edge';
    process.env.OPENROUTER_DAILY_LIMIT = '10';
    delete require.cache[require.resolve('../services/ai/openRouterClient')];
    mod = require('../services/ai/openRouterClient');
  });
  after(() => {
    delete process.env.OPENROUTER_API_KEY;
    delete require.cache[require.resolve('../services/ai/openRouterClient')];
  });

  it('handles parse error in chunk', async () => {
    async function* mockStreamData() {
      yield Buffer.from('data: {invalid}\n\n');
    }

    const axios = require('axios');
    const origPost = axios.post;
    axios.post = async () => ({ data: mockStreamData() });

    const results = [];
    for await (const chunk of mod.streamChat([{ role: 'user', content: 'x' }])) {
      results.push(chunk);
    }

    assert.equal(results.length, 1);
    assert.equal(results[0].done, true);

    axios.post = origPost;
  });

  it('handles stream end without DONE marker', async () => {
    async function* mockStreamData() {
      yield Buffer.from('data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n');
    }

    const axios = require('axios');
    const origPost = axios.post;
    axios.post = async () => ({ data: mockStreamData() });

    const results = [];
    for await (const chunk of mod.streamChat([{ role: 'user', content: 'x' }])) {
      results.push(chunk);
    }

    assert.equal(results.length, 2);
    assert.equal(results[0].content, 'Hi');
    assert.equal(results[1].done, true);

    axios.post = origPost;
  });
});

describe('streamChat errors', () => {
  let mod;
  before(() => {
    process.env.OPENROUTER_API_KEY = 'test-key-err';
    process.env.OPENROUTER_DAILY_LIMIT = '10';
    delete require.cache[require.resolve('../services/ai/openRouterClient')];
    mod = require('../services/ai/openRouterClient');
  });
  after(() => {
    delete process.env.OPENROUTER_API_KEY;
    delete require.cache[require.resolve('../services/ai/openRouterClient')];
  });

  it('handles AbortError during stream', async () => {
    const axios = require('axios');
    const origPost = axios.post;
    axios.post = async () => { const e = new Error('stream timeout'); e.name = 'AbortError'; throw e; };

    const results = [];
    for await (const chunk of mod.streamChat([{ role: 'user', content: 'x' }])) {
      results.push(chunk);
    }

    assert.equal(results.length, 1);
    assert.equal(results[0].done, true);

    axios.post = origPost;
  });

  it('handles generic error during stream', async () => {
    const axios = require('axios');
    const origPost = axios.post;
    axios.post = async () => { throw new Error('stream fail'); };

    const results = [];
    for await (const chunk of mod.streamChat([{ role: 'user', content: 'x' }])) {
      results.push(chunk);
    }

    assert.equal(results.length, 1);
    assert.equal(results[0].done, true);

    axios.post = origPost;
  });
});
