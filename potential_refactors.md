# Potential Refactors — ponytail audit

> Findings ranked by impact (biggest cuts first). See `AGENTS.md` for previous audit context.

---

### 1. Replace 22 bespoke component libraries with HTML + Tailwind

**Files:** `roar-mma/frontend/src/components/{Accordion,Alert,Avatar,Badge,Breadcrumb,Card,Dropdown,Forms,Modal,Pagination,Progress,Tabs,Tooltip}/index.jsx`  
**~12,400 lines total**

Each reinvents a native HTML feature or a 3-line Tailwind pattern:
- `Accordion` (491 lines) → `<details>` / `<summary>` (3 lines)
- `Modal` (446 lines, Drawer/BottomSheet/AlertDialog) → `<dialog>` (native since Chrome 37)
- `Dropdown` (415 lines with portal) → `<select>` or a 10-line Tailwind dropdown
- `Card` (463 lines, dozens of subcomponents) → `<div className="rounded-xl p-4 shadow">`

Already on Tailwind — these ship more code than the framework itself. Drop every single one, use builtins.

---

### 2. Collapse 30 of 44 route files into a generic resource router

**Files:** `roar-mma/backend/routes/{privacy,trialAnalytics,leadScoring,makeupClasses,familyDiscounts,certifications,pixel,studentCoaching,staffPerformance,staffSchedule,staffTasks,ptSessions,retention,phone,stock,approvalQueue,automatedMessages,documents,workflows,missionControl,memberPortal,notifications,socialMedia,analytics,attendance,messageTemplates,scheduledMessages,waiverPdf,waivers,agentic}.js`  
**~1,500 lines total**

Every file follows the same pattern: `router.verb('/path', auth, perm, (req,res) => { try { ...dataFn()... } catch { res.status(500)... } })`. A single generic resource router + middleware for the try/catch boilerplate would eliminate ~80% of each file. The thin ones (`trialAnalytics.js`: 31 lines, `privacy.js`: 52 lines) are the worst value-per-file in the project.

---

### 3. Merge 36 SQL migration files into 1–3 files

**Files:** `roar-mma/backend/db/migrations/000_*.sql` through `034_*.sql`  
**94 KB, 36 files**

Most are 2–30 line `ALTER TABLE ADD COLUMN` statements. `022_class_enhancements.sql` is 14 lines. `027_member_portal.sql` is 4 lines. `030_missing_schema_columns.sql` is 6 lines. The final `schema.sql` already captures the full schema. Tracking 36 separate files for a local SQLite gym DB adds zero value. Merge into a single `migrations.sql` or keep only the base + the 3 largest.

---

### 4. Slim the AI agent system

**Files:** `roar-mma/backend/services/ai/agents/*.js` (20 files) + `roar-mma/backend/services/ai/{aiDaemon,aiState,chatEngine,groqClient,openRouterClient,providerChain}.js`  
**~190 KB**

- **5 "team agents"** (`salesTeamAgent`, `memberSuccessTeamAgent`, `operationsTeamAgent`, `financeTeamAgent`, `studentCoachingAgent`) are identical subclasses of `teamAgentBase.js`: same `buildDepartmentContext()` → `completeChat()` → `executeAction()` loop, different system prompts. Collapse to one generic `teamAgent.js` with a config object.
- **`openRouterClient.js`** (328 lines): hand-rolled mutex, rate-limiter with daily/minute counters, retry queue with exponential backoff, RPM tracking — for ~20 LLM calls/day. Replace with `while(retries--)` and a 1-second sleep.
- **15 of 20 agents** (scout, healer, pixel, trials, retention, analytics, stock, staff, messaging, plus all 5 team agents) probably just log text and never trigger side effects. Keep zeus (orchestrator), leads, billing, beltGrading if they actually do something. Drop the rest until a user asks for them.

---

### 5. Make 34 test files actually comprehensive (or keep as-is)

**Files:** `roar-mma/frontend/src/**/*.test.{js,jsx}` (34 files)

Current tests mostly assert "renders without crashing". If we keep them, they should test real behavior: form submission flows, error states, edge cases, API call assertions. Otherwise they're a maintenance tax with no safety net. Either delete or upgrade.

---

### 6. Trim `useCustomHooks.js` to the 3 hooks actually used

**File:** `roar-mma/frontend/src/hooks/useCustomHooks.js` (718 lines)

Exports 15 hooks: `useDebounce`, `useThrottle`, `usePrevious`, `useKeyPress`, `useClickOutside`, `useLocalStorage`, `useMediaQuery`, `useOnlineStatus`, `useIntersectionObserver`, `useWindowSize`, `useScript`, `useCopyToClipboard`, etc.

Most are speculative. Check imports across the codebase — keep the 3 that are actually imported, delete the rest. React 18+ `useSyncExternalStore` covers half of these natively.

---

### 7. Strip `api.js` retry logic

**File:** `roar-mma/frontend/src/lib/api.js`, lines 65–112

Exponential backoff with configurable `RETRY_ATTEMPTS: 3`, `RETRY_DELAY: 1000`, max cap, jitter — all for calls to localhost. If the server is down on localhost, retrying won't bring it up. Delete the entire retry wrapper.

---

### 8. Consolidate `unifiedAnalytics.js` into the analytics route

**File:** `roar-mma/backend/services/unifiedAnalytics.js` (489 lines)

80% are SQL queries (`getRevenueMetrics`, `getLeadMetrics`, `getTrialMetrics`, `getRetentionMetrics`, `getStaffMetrics`, `getPhoneMetrics`, `getMessagingMetrics`) that repeat queries already in individual data files. Either inline into `routes/analytics.js` or replace with aggregation of existing endpoints.

---

### 9. Merge inline dashboard queries

**File:** `roar-mma/backend/routes/dashboard.js` (495 lines)

15 separate SQL queries computed on every request with zero caching. Most could be one `SELECT` with joins. Add a simple TTL cache (even a `Map` with `setTimeout` expiry) to avoid recomputing every page load.

---

### 10. Delete stale setup/seed scripts

**Files:**
- `roar-mma/backend/scripts/api-examples.js`
- `roar-mma/backend/scripts/health-check.js`
- `roar-mma/backend/scripts/init-database.js`
- `roar-mma/backend/scripts/verify-system.js`
- `roar-mma/backend/seed_real_data.js`
- `roar-mma/backend/seed_test_data.js`

These ran once during development. Dead code now. If needed again, git has them.

---

### 11. Assess PerfectGym hub pages (mockups vs real)

**Files:** `roar-mma/frontend/src/pages/perfectgym/{AccessControl,AutomatedBilling,BrandedMemberApp,ClassBooking,CRMLeads,KioskPortal,MarketingAutomation,MembershipManagement,MultiLocation,PointOfSale,ReportingAnalytics,StaffManagement}.jsx`

These appear to be demo/mockup pages showing PerfectGym feature descriptions. If they're not wired to live endpoints, delete them. If they are, they're fine — just verify they're actually integrated.

---

### 12. Deduplicate CSV export logic

**Files:** `roar-mma/backend/routes/members.js:43-61`, `roar-mma/backend/routes/leads.js:61-79`

Identical CSV generation code with different field names. Extract into `lib/csvExport.js`.

---

**net: -40,000+ lines, -5+ dependencies possible.**

Nothing is urgent. Some of these (1, 2, 8, 9) would meaningfully reduce maintenance surface. Others (3, 7, 10) are quick wins when you have 30 minutes. Say which items to proceed on.
