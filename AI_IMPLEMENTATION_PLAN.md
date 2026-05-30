# ROAR MMA — Persistent AI Employee Implementation Plan

## Overview

A persistent, autonomous AI employee that lives inside the gym management system,
powered by **OpenRouter's free LLM API**. It monitors, decides, and acts across
every module — 24/7 — while preserving all existing manual functionality.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │ AI Chat    │  │ AI Dashboard │  │ AI Status Indicator     │ │
│  │ Page       │  │ (Activity    │  │ (Navbar badge)          │ │
│  │            │  │  Log + Stats)│  │                         │ │
│  └─────┬──────┘  └──────┬───────┘  └───────────┬─────────────┘ │
└────────┼─────────────────┼──────────────────────┼───────────────┘
         │                 │                      │
    ┌────▼─────────────────▼──────────────────────▼──────────────┐
    │                    HTTP / WebSocket                         │
    └────┬────────────────────────────────────────────────────────┘
         │
┌────────▼────────────────────────────────────────────────────────┐
│                     Backend (Express)                           │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Routes / API                                            │   │
│  │  /api/ai/chat   /api/ai/status   /api/ai/history         │   │
│  │  /api/ai/agents/enable   /api/ai/config                  │   │
│  └────────────────────┬────────────────────────────────────┘   │
│                       │                                        │
│  ┌────────────────────▼────────────────────────────────────┐   │
│  │              AI Orchestrator (Daemon)                    │   │
│  │                                                          │   │
│  │  ┌──────────────────────┐   ┌────────────────────────┐  │   │
│  │  │ OpenRouter Client    │   │ AI State Manager       │  │   │
│  │  │ (rate-limited,       │   │ (activity log, task    │  │   │
│  │  │  retry, model mgmt)  │   │  queue, agent state)   │  │   │
│  │  └──────────┬───────────┘   └────────────────────────┘  │   │
│  │             │                                            │   │
│  │  ┌──────────▼────────────────────────────────────────┐   │   │
│  │  │           Domain Agent Pipeline                   │   │   │
│  │  │                                                   │   │   │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌─────────┐ │   │   │
│  │  │  │ Lead Agent   │  │ Trial Agent  │  │Retention│ │   │   │
│  │  │  │              │  │              │  │ Agent   │ │   │   │
│  │  │  └──────────────┘  └──────────────┘  └─────────┘ │   │   │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌─────────┐ │   │   │
│  │  │  │ Task Agent   │  │ Analytics    │  │ Billing │ │   │   │
│  │  │  │              │  │ Agent        │  │ Agent   │ │   │   │
│  │  │  └──────────────┘  └──────────────┘  └─────────┘ │   │   │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌─────────┐ │   │   │
│  │  │  │ Belt Grading │  │ Stock Agent  │  │ Staff   │ │   │   │
│  │  │  │ Agent        │  │              │  │ Agent   │ │   │   │
│  │  │  └──────────────┘  └──────────────┘  └─────────┘ │   │   │
│  │  │  ┌──────────────┐                                │   │   │
│  │  │  │ Messaging    │                                │   │   │
│  │  │  │ Agent        │                                │   │   │
│  │  │  └──────────────┘                                │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  │                                                          │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │           Chat Engine (NLP)                       │   │   │
│  │  │  Parses natural language → intent → action        │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              External Services Layer                     │   │
│  │  Existing: leadsData, membersData, transactionsData,    │   │
│  │  staffTasksData, retentionData, scheduledMessagesData,  │   │
│  │  stockData, beltGradingData, etc.                       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| **LLM Provider** | OpenRouter (free tier) | Zero cost, OpenAI-compatible API, multiple free models |
| **Free Model** | `openrouter/free` | Auto-routes to best available free model |
| **Daemon Interval** | 60 seconds | Balances responsiveness with API rate limits (20 RPM) |
| **State Store** | SQLite (existing DB) + in-memory cache | No extra infra; persists across restarts |
| **Rate Limits** | Model-aware, tokens/second, queue-based | Stays inside OpenRouter free tier (50 req/day for free keys, 1000/day after $10 purchase) |
| **Fallback** | Degrade gracefully — log what AI *would* do if rate limited | Never blocks business operations |

---

## New Files to Create

### Backend — Core AI Infrastructure

| # | File | Purpose |
|---|---|---|
| 1 | `backend/services/ai/openRouterClient.js` | OpenRouter API wrapper — chat completions, streaming, rate limiting, retry logic |
| 2 | `backend/services/ai/aiState.js` | Persist/replay AI activity log, task queue, agent state, config |
| 3 | `backend/services/ai/aiDaemon.js` | Heartbeat loop — ticks every 60s, runs agent pipeline, broadcasts WebSocket updates |
| 4 | `backend/services/ai/chatEngine.js` | Parses natural language queries → structured intent → executes against data layer |

### Backend — Domain Agents (one file per agent)

| # | Agent | Responsibility |
|---|---|---|
| 5 | `agents/leadAgent.js` | Score new leads, trigger contact sequences, flag hot leads for staff |
| 6 | `agents/trialAgent.js` | Monitor trial pipeline, send follow-ups, detect no-shows, analyze conversion |
| 7 | `agents/retentionAgent.js` | Detect at-risk members, generate retention offers, run win-back campaigns |
| 8 | `agents/taskAgent.js` | Auto-create and prioritize staff tasks, escalate overdue items |
| 9 | `agents/analyticsAgent.js` | Generate daily briefings, anomaly detection, predictive insights |
| 10 | `agents/billingAgent.js` | Monitor failed payments, send reminders, flag overdue accounts |
| 11 | `agents/beltGradingAgent.js` | Check grading eligibility, suggest sessions, send milestone notifications |
| 12 | `agents/stockAgent.js` | Low stock alerts, reorder suggestions, inventory valuation summaries |
| 13 | `agents/staffAgent.js` | Track performance, leaderboard updates, coaching suggestions |
| 14 | `agents/messagingAgent.js` | Intelligent send-time optimization, A/B subject lines, engagement tracking |

### Backend — Routes

| # | File | Endpoints |
|---|---|---|
| 15 | `routes/ai.js` | `GET /api/ai/status`, `GET /api/ai/history`, `POST /api/ai/agents/:name/enable`, `PUT /api/ai/config` |
| 16 | `routes/aiChat.js` | `POST /api/ai/chat` — natural language query |

### Backend — Data Store (DB Migrations)

| # | Table | Purpose |
|---|---|---|
| 17 | `ai_activity_log` | Every action AI takes — type, agent, payload, timestamp, success |
| 18 | `ai_agent_config` | Per-agent enabled/disabled, custom intervals, model overrides |
| 19 | `ai_task_queue` | Pending AI tasks with priority, status, retry count |

### Frontend

| # | File | Purpose |
|---|---|---|
| 20 | `frontend/src/pages/AIAssistant.jsx` | Full-page AI chat interface |
| 21 | `frontend/src/pages/AIDashboard.jsx` | AI activity log, current status, agent controls |
| 22 | `frontend/src/components/AI/ChatPanel.jsx` | Reusable chat panel with message bubbles |
| 23 | `frontend/src/components/AI/ActivityFeed.jsx` | Real-time feed of AI actions |
| 24 | `frontend/src/components/AI/AgentToggle.jsx` | Enable/disable individual agents |
| 25 | `frontend/src/hooks/useAiChat.js` | Hook for chat API calls + SSE streaming |

### Env Additions

```
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=openrouter/free
AI_DAEMON_ENABLED=true
AI_DAEMON_INTERVAL_MS=60000
AI_AGENT_LEADS=true
AI_AGENT_TRIALS=true
AI_AGENT_RETENTION=true
AI_AGENT_TASKS=true
AI_AGENT_ANALYTICS=true
AI_AGENT_BILLING=true
AI_AGENT_GRADING=true
AI_AGENT_STOCK=true
AI_AGENT_STAFF=true
AI_AGENT_MESSAGING=true
```

---

## How the Daemon Tick Works

```
tick()
  │
  ├─ 1. Check rate limit budget (RPM, daily quota remaining)
  │
  ├─ 2. For each enabled agent (parallel):
  │     ├─ Agent reads relevant data (SQL queries)
  │     ├─ Agent formulates prompt for LLM
  │     ├─ Agent calls OpenRouter (with fallback if throttled)
  │     ├─ Agent parses LLM decision → structured actions
  │     ├─ Agent executes actions (create task, send message, etc.)
  │     └─ Agent logs activity to ai_activity_log
  │
  ├─ 3. Process AI task queue (pending tasks)
  │     ├─ Mark overdue tasks for escalation
  │     └─ Execute scheduled AI actions
  │
  ├─ 4. Broadcast summary via WebSocket
  │
  └─ 5. Schedule next tick
```

---

## OpenRouter Integration Details

- **Base URL**: `https://openrouter.ai/api/v1`
- **Auth**: `Authorization: Bearer <key>`
- **Model**: `openrouter/free` (auto-routes to best free model)
- **Rate Limits**: 50 req/day (free tier), 20 RPM max
- **Headers**: `HTTP-Referer: https://roarmma.com.au`, `X-Title: ROAR MMA AI`
- **Supported params**: `model, messages, max_tokens, temperature, tools, stream`
- Each agent call uses **structured output** (JSON mode) for reliable parsing

---

## Implementation Order (by build teams)

### Team 1 — Core Infrastructure
- `openRouterClient.js` — rate-limited HTTP client with retries
- `aiState.js` — activity log + task queue persistence
- `aiDaemon.js` — heartbeat loop, agent pipeline orchestrator
- DB migration tables (`ai_activity_log`, `ai_agent_config`, `ai_task_queue`)
- Update `backend/server.js` — mount daemon, wire routes

### Team 2 — Domain Agents (all 10)
- Each agent: reads data → prompts LLM → executes actions
- Agents log every decision to activity log
- Agents respect enabled/disabled config

### Team 3 — Chat + API + Frontend
- `chatEngine.js` — NLP query parser + response generator
- `routes/ai.js` — status, history, config endpoints
- `routes/aiChat.js` — chat endpoint with streaming
- Frontend pages: AIAssistant, AIDashboard
- Frontend components: ChatPanel, ActivityFeed, AgentToggle
- App.jsx routing updates

---

## Testing Strategy

- **Unit tests** for each agent's decision logic (mock OpenRouter)
- **Integration tests** for daemon tick cycle
- **E2E tests** for chat flow (frontend → API → LLM → response)
- **Load tests** for rate limit compliance

---

## Rollout Plan

1. Phase 1: Core infra + daemon (runs but no agents enabled)
2. Phase 2: Enable agents one by one (leads first, then trials, etc.)
3. Phase 3: Chat interface for staff
4. Phase 4: AI dashboard for monitoring

Each phase is independently revertible.

---

## Guardrails

- All AI actions are **logged and auditable**
- Every agent has an **enabled/disabled toggle**
- Rate limits are **strictly enforced** — never exceed OpenRouter quota
- AI **never deletes data** — only creates/suggests
- Critical actions (e.g., cancelling membership) require human approval
- Daemon gracefully handles all errors — never crashes the main server
