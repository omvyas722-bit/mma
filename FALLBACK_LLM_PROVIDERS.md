# Free LLM API Providers — Fallback Reference for OpenRouter

> Research compiled May 2026. All info verified from official docs.

---

## 1. Google Gemini (Google AI Studio) ✅ FREE

| Field | Value |
|-------|-------|
| **API Endpoint** | `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={API_KEY}` |
| **Auth Header** | API key as query param `?key=` or header `x-goog-api-key` |
| **OpenAI Compatible?** | ❌ No — Google's own request/response format |
| **Credit Card Required?** | ❌ No |
| **Free Models** | `gemini-2.5-flash`, `gemini-2.5-pro-exp`, `gemini-2.0-flash`, `gemini-1.5-pro` |
| **Rate Limits (free)** | 10–30 RPM depending on model; 1,500 RPD for Flash models |
| **Signup** | aistudio.google.com → Get API Key |
| **Node.js SDK** | `@google/generative-ai` |

**Sample Request:**
```bash
curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "role": "user",
      "parts": [{"text": "Hello"}]
    }]
  }'
```

**Verdict:** Great fallback for simple tasks. Not OpenAI-compatible so needs its own adapter.

---

## 2. Anthropic Claude API ⚠️ $5 one-time credits (no ongoing free tier)

| Field | Value |
|-------|-------|
| **API Endpoint** | `https://api.anthropic.com/v1/messages` |
| **Auth Header** | `x-api-key: <key>` (also `anthropic-version: 2023-06-01`) |
| **OpenAI Compatible?** | ❌ No — Anthropic's own format |
| **Credit Card Required?** | ❌ No (for $5 starter credits) |
| **Free Credits** | ~$5 one-time on new account at platform.claude.com |
| **Models** | `claude-sonnet-4-6`, `claude-haiku-4-5`, `claude-opus-4-7` |
| **After credits** | Pay-as-you-go via prepaid Console credits |
| **Signup** | platform.claude.com |
| **Node.js SDK** | `@anthropic-ai/sdk` |

**Verdict:** Poor fallback — $5 runs out fast, no renewing free tier.

---

## 3. Groq ✅ FREE (best for speed, OpenAI-compatible)

| Field | Value |
|-------|-------|
| **API Endpoint** | `https://api.groq.com/openai/v1` |
| **Auth Header** | `Authorization: Bearer <key>` |
| **OpenAI Compatible?** | ✅ **Yes** — drop-in replacement |
| **Credit Card Required?** | ❌ No |
| **Free Models** | `llama-3.1-8b-instant`, `llama-3.3-70b-versatile`, `meta-llama/llama-4-scout-17b-16e-instruct`, `qwen/qwen3-32b`, `openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `groq/compound`, `groq/compound-mini` |
| **Rate Limits (free)** | 30 RPM / 14,400 RPD (8B), 30 RPM / 1,000 RPD (70B), 6,000 TPM |
| **Signup** | console.groq.com |

**Sample Request (OpenAI SDK):**
```js
import OpenAI from 'openai';
const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});
const response = await client.chat.completions.create({
  model: 'llama-3.3-70b-versatile',
  messages: [{ role: 'user', content: 'Hello' }]
});
```

**Verdict:** Excellent fallback. Fastest inference (LPU hardware), OpenAI-compatible, generous free tier.

---

## 4. Together AI ✅ $25 free credits + 80 free models

| Field | Value |
|-------|-------|
| **API Endpoint** | `https://api.together.xyz/v1` |
| **Auth Header** | `Authorization: Bearer <key>` |
| **OpenAI Compatible?** | ✅ **Yes** — drop-in replacement |
| **Credit Card Required?** | ❌ No |
| **Free Credits** | $25 on signup |
| **Free Models (80)** | Llama 3.3 70B, Llama 3.1 70B, Llama 4 Scout, Gemma 4 31B, Gemma 3 27B, Qwen2.5 32B/72B, Qwen3 8B/32B, Mistral Nemo, Mixtral 8x22B, DeepCoder, and more |
| **Rate Limits** | ~60 req/min, ~100K tokens/min (free tier) |
| **Signup** | together.ai |

**Sample Request (OpenAI SDK):**
```js
const client = new OpenAI({
  apiKey: process.env.TOGETHER_API_KEY,
  baseURL: 'https://api.together.xyz/v1'
});
```

**Verdict:** Excellent fallback. Huge free model selection, OpenAI-compatible, $25 goes a long way.

---

## 5. Hugging Face Inference API ✅ Free tier (with limits)

| Field | Value |
|-------|-------|
| **API Endpoint (OpenAI)** | `https://api-inference.huggingface.co/v1` |
| **API Endpoint (legacy)** | `https://api-inference.huggingface.co/models/{model}` |
| **Auth Header** | `Authorization: Bearer <hf_token>` |
| **OpenAI Compatible?** | ✅ **Yes** (at `/v1` endpoint) |
| **Credit Card Required?** | ❌ No |
| **Free Tier** | Rate-limited serverless (~10-20 req/min), models <10B params |
| **Best Models (free)** | Llama 3.2 8B, Qwen 2.5 7B, Mistral 7B, Gemma 2 9B — but availability varies |
| **PRO Tier** | $9/mo for higher limits + 2M monthly credits via Inference Providers |
| **Signup** | huggingface.co → Settings → Tokens |

**Sample Request (OpenAI-compatible):**
```js
const client = new OpenAI({
  apiKey: process.env.HF_TOKEN,
  baseURL: 'https://api-inference.huggingface.co/v1'
});
const response = await client.chat.completions.create({
  model: 'meta-llama/Llama-3.2-8B-Instruct',  // availability not guaranteed
  messages: [{ role: 'user', content: 'Hello' }]
});
```

**Verdict:** Works but unreliable. Free models come and go, cold starts are slow (10-30s). Good last-resort fallback.

---

## 6. Cohere ✅ Free trial (1,000 calls/month)

| Field | Value |
|-------|-------|
| **API Endpoint** | `https://api.cohere.com/v2/chat` |
| **Auth Header** | `Authorization: Bearer <key>` or `x-api-key` |
| **OpenAI Compatible?** | ❌ No — Cohere's own format |
| **Credit Card Required?** | ❌ No |
| **Free Tier** | Trial key: 1,000 API calls/month, 20 req/min (chat), 5 req/min (embed) |
| **Models** | `command-a-plus-05-2026`, `command-a-03-2025`, `command-r-08-2024`, `command-r7b-12-2024` |
| **Signup** | dashboard.cohere.com |

**Sample Request:**
```bash
curl -X POST "https://api.cohere.com/v2/chat" \
  -H "Authorization: Bearer $CO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "command-a-03-2025",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

**Verdict:** 1,000 calls/month is tight. Not OpenAI-compatible. Decent last resort.

---

## 7. DeepSeek ✅ 5M free tokens (no credit card, cheapest paid)

| Field | Value |
|-------|-------|
| **API Endpoint** | `https://api.deepseek.com` |
| **Auth Header** | `Authorization: Bearer <key>` |
| **OpenAI Compatible?** | ✅ **Yes** — fully compatible, drop-in replacement |
| **Credit Card Required?** | ❌ No |
| **Free Credits** | 5M tokens on signup |
| **Models** | `deepseek-v4-flash` (284B MoE), `deepseek-v4-pro` (1.6T MoE) |
| **Legacy Models** | `deepseek-chat` → V4-Flash, `deepseek-reasoner` → V4-Flash thinking (retire July 24, 2026) |
| **Rate Limits** | No enforced rate limits on free credits (2500 concurrent for Flash) |
| **Paid Pricing** | V4-Flash: $0.14/M input, $0.28/M output — extremely cheap |
| **Signup** | platform.deepseek.com |

**Sample Request (OpenAI SDK):**
```js
const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com'
});
const response = await client.chat.completions.create({
  model: 'deepseek-v4-flash',
  messages: [{ role: 'user', content: 'Hello' }]
});
```

**Verdict:** Excellent fallback. OpenAI-compatible, 5M free tokens, insanely cheap paid rates, no rate limits. Top pick.

---

## 8. Perplexity ❌ No free API tier

| Field | Value |
|-------|-------|
| **API Endpoint** | `https://api.perplexity.ai` |
| **Auth Header** | `Authorization: Bearer <key>` |
| **OpenAI Compatible?** | ✅ Yes (chat completions) |
| **Credit Card Required?** | ✅ **Yes** — payment required to generate API key |
| **Free Tier** | ❌ **None.** No free API tier. Must purchase credits. |
| **Models** | `sonar`, `sonar-pro`, `sonar-reasoning-pro`, `sonar-deep-research` |
| **Rate Limits** | Tier 0 (no spend): 50 RPM |
| **Pricing** | Sonar: $1/$1 per 1M tokens (input/output) |

**Verdict:** Skip. No free tier for API access.

---

## Quick Comparison Matrix

| Provider | Free? | OpenAI Compat? | CC Required? | Best Model | Rate Limit |
|----------|-------|---------------|--------------|------------|------------|
| **Groq** | ✅ Yes | ✅ Yes | ❌ No | Llama 3.3 70B | 30 RPM / 1K RPD |
| **Together AI** | ✅ $25 + 80 free | ✅ Yes | ❌ No | Llama 3.3 70B | 60 RPM |
| **DeepSeek** | ✅ 5M tokens | ✅ Yes | ❌ No | DeepSeek V4 Flash | Unlimited |
| **Google Gemini** | ✅ Yes | ❌ No | ❌ No | Gemini 2.5 Flash | 30 RPM |
| **HuggingFace** | ✅ Limited | ✅ Yes | ❌ No | Llama 3.2 8B | ~10-20 RPM |
| **Cohere** | ✅ 1K calls/mo | ❌ No | ❌ No | Command A+ | 20 RPM |
| **Anthropic** | ⚠️ $5 one-time | ❌ No | ❌ No | Claude Sonnet 4.6 | Tiered |
| **Perplexity** | ❌ None | ✅ Yes | ✅ Yes | Sonar Pro | 50 RPM |

---

## Recommended Fallback Strategy (Node.js)

```js
const fallbackProviders = [
  // Tier 1: Best free, OpenAI-compatible (drop-in replacements)
  {
    name: 'groq',
    baseURL: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    apiKey: process.env.GROQ_API_KEY
  },
  {
    name: 'together',
    baseURL: 'https://api.together.xyz/v1',
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    apiKey: process.env.TOGETHER_API_KEY
  },
  {
    name: 'deepseek',
    baseURL: 'https://api.deepseek.com',
    model: 'deepseek-v4-flash',
    apiKey: process.env.DEEPSEEK_API_KEY
  },

  // Tier 2: OpenAI-compatible but less reliable
  {
    name: 'huggingface',
    baseURL: 'https://api-inference.huggingface.co/v1',
    model: 'meta-llama/Llama-3.2-8B-Instruct',
    apiKey: process.env.HF_TOKEN
  },

  // Tier 3: Non-OpenAI-compatible (needs adapter)
  {
    name: 'gemini',
    type: 'google',
    model: 'gemini-2.5-flash',
    apiKey: process.env.GEMINI_API_KEY
  },
  {
    name: 'cohere',
    type: 'cohere',
    model: 'command-a-03-2025',
    apiKey: process.env.COHERE_API_KEY
  }
];
```

Use the OpenAI SDK for the first 4 (just swap `baseURL` + `apiKey`). Write adapters for Gemini and Cohere.
