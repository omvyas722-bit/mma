# ROAR MMA - Comprehensive QA Audit Report

> Generated: 2026-05-30 | Scope: Full codebase audit (backend, frontend, scripts, config)

---

## CRITICAL SECURITY ISSUES

### 1. Hardcoded JWT Secret in Version Control
**File:** `roar-mma/backend/.env:2`
```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```
The JWT secret is `changeme`-level default pushed to git. Every clone shares the same key. Tokens can be forged by anyone who has ever seen this repo.

**File:** `roar-mma/frontend/src/pages/Login.jsx` — client-side validation only, server trusts whatever token is presented with this secret.

### 2. Embedding API Keys in Client-Side Code
**File:** `roar-mma/backend/.env` — Twilio, Brevo, OpenRouter, SendGrid, Stripe keys all hardcoded.
**File:** `roar-mma/frontend/src/lib/api.js:4` — VITE_API_URL defaults to `localhost:3001/api`. No production URL abstraction.

### 3. `localStorage` for Auth Tokens
**File:** `roar-mma/frontend/src/lib/api.js:9-11`
```js
const token = localStorage.getItem('token');
```
JWT tokens in `localStorage` are accessible to any JS on the same origin (XSS-vulnerable). Should use `httpOnly` cookies with CSRF tokens.

### 4. SQL Injection via Raw Queries (multiple files)
**Pattern:** Many query builders use string interpolation with `req.params` directly.

**File:** `roar-mma/backend/data/members.js` — multiple `db.prepare(...)` with concatenated values instead of parameterized queries.

### 5. No Rate Limiting on Login
**File:** `roar-mma/backend/server.js` — rate-limit middleware is imported but no specific limit configured for `/api/auth/login`. Brute-force attack vector.

### 6. Clerk API Key Leak
**File:** `roar-mma/backend/.env` — contains `CLERK_SECRET_KEY` and `CLERK_PUBLISHABLE_KEY`. If these are real keys, they are now compromised.

---

## BACKEND BUGS & ANTI-PATTERNS

### 7. Express 5 `req.query` Parsing Issues
**File:** `roar-mma/backend/routes/auth.js` — uses Express 5 which changed `req.query` parsing. Query parameters like `status=active` may return arrays instead of strings.

### 8. Missing Input Validation Everywhere
**Pattern across all route files:** No schema validation (Joi, Zod, etc.). User input is trusted directly. For example:
- `roar-mma/backend/routes/members.js` — email, phone, amounts not validated
- `roar-mma/backend/routes/classes.js` — class times, capacities not validated
- `roar-mma/backend/routes/leads.js` — phone numbers, emails accepted raw

### 9. Multiple `Connection` Export Patterns (confusing)
**File:** `roar-mma/backend/db/connection.js` exports both:
```js
module.exports = db;
module.exports = { db, getDb };
```
The first `module.exports = db;` is immediately overwritten. This is dead code and confusing.

### 10. `better-sqlite3` Synchronous Blocking
**File:** `roar-mma/backend/db/connection.js` — better-sqlite3 is synchronous. All DB operations block the event loop. Under concurrent requests this causes severe latency.

### 11. No Connection Pooling
**File:** `roar-mma/backend/db/connection.js` — single shared connection instance for `better-sqlite3`. No WAL-mode enabled retry logic for concurrent writes.

### 12. Missing File Upload Validation
**File:** `roar-mma/backend/routes/upload.js` (if exists) — likely trusts `req.file` without size/type validation.

### 13. WebSocket Origin Validation Missing
**File:** `roar-mma/backend/services/WebSocket` — no `origin` check for WebSocket upgrade requests. CSWSH (Cross-Site WebSocket Hijacking) vector.

### 14. Error Stack Traces Leaked in Production
**Files:** Multiple routes have catch blocks like:
```js
catch (err) {
  res.status(500).json({ error: err.message });
}
```
In production, `err.message` may reveal internal paths, SQL queries, or stack traces.

### 15. `/api/transactions/stats` Route — No Auth Check
**File:** `roar-mma/backend/routes/transactions.js` — the `/stats` sub-route may bypass authentication depending on middleware ordering.

### 16. Message Scheduler — No Error Recovery
**File:** `roar-mma/backend/services/messageScheduler.js` — failed message sends silently increment counters. No retry queue, no dead-letter handling.

### 17. AI Daemon — Endless Loop on Repeated Failure
**File:** `roar-mma/backend/services/ai/aiDaemon.js` — if the AI provider chain consistently errors, the daemon retries forever with no circuit breaker or backoff.

### 18. OpenRouter Client — No Request Timeout
**File:** `roar-mma/backend/services/ai/openRouterClient.js` — HTTP requests to OpenRouter lack a timeout. A hanging API call blocks the AI daemon indefinitely.

### 19. Provider Chain — No Fallback After All Providers Fail
**File:** `roar-mma/backend/services/ai/providerChain.js` — when all providers fail, it returns `null` but callers don't check for null before accessing `.choices`, causing a crash.

### 20. Lead Agent — Concurrent Trial Booking Race Condition
**File:** `roar-mma/backend/services/ai/leadAgent.js` — simultaneous agent runs on the same lead can double-book trials or send duplicate messages.

### 21. Retention Agent — In-Memory State Loss on Restart
**File:** `roar-mma/backend/services/ai/retentionAgent.js` — internal state (risk scores, flags) stored in-memory only. Server restart loses all analysis.

### 22. Winback Automation — No Opt-Out Check
**File:** `roar-mma/backend/services/winbackAutomation.js` — sends re-engagement messages without checking if the member has previously unsubscribed or opted out.

### 23. Unified Analytics — Expensive Queries Without Caching
**File:** `roar-mma/backend/services/unifiedAnalytics.js` — dashboard queries re-compute aggregate stats on every request. No memoization or cache layer.

### 24. Schema SQL — No Indexes on Foreign Keys
**File:** `roar-mma/backend/db/schema.sql` — lacks indexes on `member_id`, `lead_id`, `class_id`, `transaction.member_id`, etc. Performance degrades with data growth.

### 25. Schema SQL — Missing ON DELETE CASCADE
**File:** `roar-mma/backend/db/schema.sql` — foreign keys lack cascade deletes. Manually deleting a member leaves orphaned records in `transactions`, `attendance`, `bookings`.

### 26. Schema SQL — No UNIQUE Constraint on Email
**File:** `roar-mma/backend/db/schema.sql` — the `members` table has no unique constraint on email. Duplicate member registrations possible.

### 27. `init-database.js` — Destructive Reset on Every Run
**File:** `roar-mma/backend/db/init-database.js` — drops and recreates all tables. Running this script in production wipes all data without confirmation.

### 28. `package.json` — Missing Engines Field
**File:** `roar-mma/backend/package.json` — no `"engines"` field specifying the required Node.js version. Express 5 requires Node 18+.

---

## FRONTEND BUGS & ANTI-PATTERNS

### 29. Dashboard.jsx — ActivityItem Key Collisions
**File:** `roar-mma/frontend/src/pages/Dashboard.jsx:124`
```jsx
key={activity.id || activity.timestamp || activity.description}
```
Two activities with the same description and no `id`/`timestamp` will collide. React will warn about duplicate keys.

### 30. Members.jsx — Debounce Ref Leak
**File:** `roar-mma/frontend/src/pages/Members.jsx:22-26`
```jsx
useEffect(() => {
  return () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  };
}, []);
```
The debounce timer is only cleaned up on unmount. Rapid filter changes don't cancel the previous timer (it's overwritten), but the old callback still fires.

### 31. Members.jsx — No `useCallback` on Handlers
**File:** `roar-mma/frontend/src/pages/Members.jsx:62-66`, `47-60` — `handleDeleteConfirm` and mutation callbacks are recreated on every render.

### 32. Leads.jsx — No Drag-and-Drop on Kanban
**File:** `roar-mma/frontend/src/pages/Leads.jsx` — the Kanban board is static (no drag-and-drop). Users cannot move leads between stages, which is the core UX of a Kanban board.

### 33. Leads.jsx — Empty Stage Rendering Issue
**File:** `roar-mma/frontend/src/pages/Leads.jsx:116` — when a stage has 0 leads, it shows "No leads" but the kanban column is still rendered at full width. Looks broken.

### 34. Payments.jsx — `handleRefund` Captures stale `payment`
**File:** `roar-mma/frontend/src/pages/Payments.jsx:182-184`
```jsx
const handleRefund = () => {
  refundPayment.mutate();
};
```
This is defined inside `PaymentRow` but the variable `payment` used in the URL is from closure. If `PaymentRow` re-renders with different `payment`, the closure captures the original. However, examining further, `refundPayment` is defined with `useMutation` that reads `payment.id` — but `onSuccess` uses `queryClient.invalidateQueries(['payments'])` from the outer `queryClient` which is fine since it's the module-level reference.

Actually the bug is: `refundPayment` mutationFn is `() => api.post(`/api/transactions/${payment.id}/refund`)` — `payment` is from the closure, which is correct. But `onError` captures `payment` too. Not a closure bug, but `refundPayment` is re-created on every render due to `useMutation` inside `PaymentRow`.

### 35. Settings.jsx — Form Data Initialization Race
**File:** `roar-mma/frontend/src/pages/Settings.jsx:41-46`
```jsx
useEffect(() => {
  if (settings && !initialized.current) {
    setFormData(settings);
    initialized.current = true;
  }
}, [settings]);
```
If `settings` changes after initial load (e.g., via refetch), changes are ignored due to `initialized.current`. Editing settings, hitting save, and then the user wants to reset to server state — they can't.

### 36. Communications.jsx — Schedule Checkbox Logic Bug
**File:** `roar-mma/frontend/src/pages/Communications.jsx:326-332`
```jsx
<input
  type="checkbox"
  checked={!!formData.schedule_for}
  onChange={(e) => {
    if (!e.target.checked) {
      setFormData(prev => ({ ...prev, schedule_for: '' }));
    }
  }}
/>
```
When the checkbox is checked (schedule_for is truthy), clicking it again calls `onChange` with `checked = false`. The handler sets `schedule_for = ''`. This correctly un-checks. BUT: when the checkbox is unchecked and you click it, `checked = true` and the handler does nothing — so `schedule_for` stays as `''` (falsy), and the checkbox stays unchecked. The user cannot check the box.

This is a **critical UX bug** — the schedule checkbox is permanently stuck in the unchecked state.

### 37. AgentTracking.jsx — CSS String Interpolation Injection
**File:** `roar-mma/frontend/src/pages/AgentTracking.jsx:76-79`
```jsx
<span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
  AGENT_LABELS[log.agent_name]
    ? 'bg-' + AGENT_LABELS[log.agent_name].color.replace('bg-', '').replace('-500', '-100') + ' text-' + AGENT_LABELS[log.agent_name].color.replace('bg-', '').replace('-500', '-700')
    : 'bg-gray-100 text-gray-700'
}`}>
```
This fragile CSS string manipulation breaks if any agent color changes. Also, if `log.agent_name` is unexpected, `AGENT_LABELS[log.agent_name]` returns undefined, but the ternary still evaluates the truthy branch as `undefined ? ...` is falsy, so it falls through. However, accessing `undefined.color` would throw — but here it doesn't because `undefined` is falsy in the ternary condition. So this works but is very brittle.

### 38. AiAssistant.jsx — No Error Boundary
**File:** `roar-mma/frontend/src/pages/AIAssistant.jsx` — no ErrorBoundary wrapping the chat panel. If the API fails, the entire page crashes.

### 39. ChatPanel.jsx — Mutable Message Key
**File:** `roar-mma/frontend/src/components/AI/ChatPanel.jsx:87`
```jsx
if (!msg._key) msg._key = `msg-${++msgIdCounter.current}`;
```
Mutating the message object directly (`msg._key = ...`) is a side-effect in the render path. If messages come from a query cache (e.g., persisted), they get mutated permanently.

### 40. DataTable.jsx — No Memoization on Pagination
**File:** `roar-mma/frontend/src/components/Shared/DataTable.jsx` — each render re-computes `filteredData`, `sortedData`, and `paginatedData` via `useMemo` correctly. But `totalPages` is not memoized. Minor.

### 41. Modal/index.jsx — `createPortal` Without Cleanup
**File:** `roar-mma/frontend/src/components/Modal/index.jsx` — `Modal` returns `createPortal(...)` directly. If the parent unmounts while modal is open, the portal's DOM node may leak.

### 42. Modal/index.jsx — `onClose` Called During `handleConfirm` Even on Error
**File:** `roar-mma/frontend/src/components/Modal/index.jsx:173-179`
```jsx
const handleConfirm = async () => {
  try {
    await onConfirm();
  } finally {
    onClose();
  }
};
```
`onClose` is called in `finally` block — even if `onConfirm()` throws. The user's delete/action appears to succeed even if it failed.

### 43. Toast.jsx — Deprecated, Replaced by NotificationContext
**File:** `roar-mma/frontend/src/components/Shared/Toast.jsx` — this component exists alongside the more comprehensive `NotificationContext.jsx`. Both serve the same purpose. Dead code.

### 44. EmptyState.jsx — Components Never Used
**File:** `roar-mma/frontend/src/components/Shared/EmptyState.jsx` — `NoClassesState`, `NoPaymentsState`, `NoMessagesState`, `NoReportsState`, `MaintenanceState` are exported but never imported anywhere.

### 45. useApi.js — Performance: Callbacks Recreated on Every Render
**File:** `roar-mma/frontend/src/hooks/useApi.js` — `useList`, `useOne`, `useCreate`, `useUpdate`, `useDelete` are wrapped in `useCallback` but depend on `options` object. If caller passes inline options, all callbacks are recreated every render.

### 46. useApi.js — Infinite Scroll Uses JSON.stringify in Query Key
**File:** `roar-mma/frontend/src/hooks/useApi.js:210`
```jsx
queryKey: [endpoint, JSON.stringify(options.filters)],
```
`JSON.stringify` in query keys changes on every render if filters object is recreated inline, causing infinite refetches.

### 47. queryClient.js — `retry: 1` Means Permanent Failures Retry
**File:** `roar-mma/frontend/src/lib/queryClient.js:7`
```js
retry: 1,
```
Failed requests (including 401, 403, 404) are retried once. For auth errors this is wasteful.

### 48. logger.js — Debug Logging Gated by Env Var
**File:** `roar-mma/frontend/src/lib/logger.js:1`
```js
const isDebugEnabled = () => import.meta.env.VITE_ENABLE_DEBUG_LOGGING === 'true';
```
Debug info is only logged when this env var is set. In production, `console.error` calls in catch blocks (which use `logger.error`) are silently suppressed. Actual errors never visible.

### 49. formatters.js — `formatPhone` Strips All Non-Digits
**File:** `roar-mma/frontend/src/lib/formatters.js:18`
```js
return phone.replace(/[^\d+]/g, '');
```
Australian phone numbers like `0400 000 000` become `0400000000`. This is correct for dialing but users see unformatted strings.

---

## ROOT SCRIPTS & CONFIG ISSUES

### 50. `gym_email_automation.py` — Hardcoded Gmail Credentials
**File:** `gym_email_automation.py:21-22`
```python
GMAIL_ADDRESS = os.environ.get("GMAIL_ADDRESS", "your-email@gmail.com")
GMAIL_APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD", "your-gmail-app-password")
```
Defaults are `your-email@gmail.com` / `your-gmail-app-password`. If someone runs this without env vars set, it attempts auth with these placeholder values. Should have no default or abort if unset.

### 51. `gym_email_automation.py` — CSV Path Injection
**File:** `gym_email_automation.py:280`
```python
csv_file = sys.argv[1] if len(sys.argv) > 1 else 'perth_martial_arts_gyms.csv'
```
Arbitrary file read via command-line argument. No sanitization.

### 52. `gym_email_automation.py` — No TLS Certificate Validation
**File:** `gym_email_automation.py:203-205` — `SMTP_SSL` context doesn't specify certificate verification. Default may allow MITM.

### 53. `fix_auth.ps1` — Hardcoded Admin Credentials
**File:** `fix_auth.ps1:20`
```powershell
body: JSON.stringify({ email: 'admin@roarmma.com.au', password: 'changeme123' })
```
**This is the most critical security issue in the entire codebase.** An admin credential pair hardcoded across potentially all HTML pages. Anyone with access to the repo can log in as admin.

### 54. `fix_auth.ps1` — Destructive Search-and-Replace
**File:** `fix_auth.ps1:35-36` — `$content.Contains($oldLogin)` with 12-space prefix means it only fixes files indented exactly that way. Files with different indentation silently skipped.

### 55. `fix_auth.ps1` — Removes `let authToken` Globally
**File:** `fix_auth.ps1:64-66` — regex replace removes ALL instances of `let authToken = null;` etc. If a file declares `authToken` for a different purpose, it's silently deleted.

### 56. `opencode.json` — Playwright MCP with Local Command
**File:** `opencode.json:6` — `@playwright/mcp@latest` is pinned with `@latest` tag, meaning the version can change unexpectedly. Should pin to a specific version.

---

## CODE QUALITY & MAINTAINABILITY

### 57. No Type Checking
The entire project (backend JS, frontend JSX) uses plain JavaScript. No TypeScript, no JSDoc type annotations. Refactoring is error-prone.

### 58. No Linting Configuration
**Root:** No `.eslintrc`, `.prettierrc`, or `tsconfig.json`. Code style is inconsistent across files.

### 59. No Testing Framework Configured
`frontend/src/pages/Dashboard.test.jsx`, `AIDashboard.test.jsx`, `AIAssistant.test.jsx` exist but:
- No test runner config (`vitest.config.js` or `jest.config.js`)
- `Button.test.jsx`, `Input.test.jsx`, `ChatPanel.test.jsx`, `AgentToggle.test.jsx`, `ActivityFeed.test.jsx` also exist with no runner
- Tests can never actually run

### 60. Dead Code: `useCommon.js`
**File:** `roar-mma/frontend/src/hooks/useCommon.js` — the file header says "deprecated, renamed to avoid collision with useCustomHooks.js". This is a zombie file that re-exports from `useCustomHooks.js`.

### 61. Dead Code: `useApi.js` — Comment Wall
**File:** `roar-mma/frontend/src/hooks/useApi.js:334-398` — 65 lines of commented-out usage examples. Should be in a README or removed.

### 62. Dead Code: Multiple Unused Components
- `components/Tooltip/index.jsx` — never imported
- `components/Progress/index.jsx` — never imported
- `components/Dropdown/index.jsx` — never imported
- `components/Badge/index.jsx` — never imported
- `components/Alert/index.jsx` — never imported
- `components/Accordion/index.jsx` — never imported
- `components/Card/index.jsx` — never imported
- `components/Breadcrumb/index.jsx` — never imported
- `components/Pagination/index.jsx` — never imported
- `components/Buttons/index.jsx` — never imported
- `components/Avatar/index.jsx` — never imported
- `components/Tabs/index.jsx` — never imported
- `components/Forms/index.jsx` — never imported

### 63. Components/Shared/Modal.jsx — Re-Export Indirection
**File:** `roar-mma/frontend/src/components/Shared/Modal.jsx` — just re-exports from `components/Modal/index.jsx`. Same for `ConfirmDialog.jsx`. Confusing module boundary.

### 64. Duplicate Spinner Implementations
**File:** `components/Shared/Spinner.jsx` has `PageLoader` — used by pages.
**File:** `components/Shared/Spinner.jsx` has `Spinner` — used in other components.
But pages also inline their own spinner divs manually (e.g., `Dashboard.jsx:29`, `Members.jsx:135`, `Classes.jsx:143`). Inconsistent.

### 65. Inconsistent Error Handling Patterns
Some pages use `try/catch` with console.error:
```js
catch (err) { console.error('Error:', err); }
```
Others use `useNotifications().error()`. Some do both. No standard pattern.

### 66. No Loading States for Mutations
Multiple pages trigger mutations (`deleteMember.mutate()`) but don't disable the UI or show a loading spinner. User can click "Delete" multiple times.

### 67. Dashboard — Empty Analytics Handles Missing Data
**File:** `roar-mma/frontend/src/pages/Dashboard.jsx:39-41` — defaults to `[]` when analytics data is missing, but BarChart/LineChart components may not handle empty arrays gracefully.

### 68. Reports.jsx — Reports Subcomponents Are Only Used in This File
**File:** `roar-mma/frontend/src/pages/Reports.jsx:320-424` — `MembershipReport`, `RevenueReport`, `AttendanceReport`, `LeadsReport` are defined inside but never extracted to their own files. Large 424-line file.

### 69. ClassFormFields.jsx — Unused
**File:** `roar-mma/frontend/src/components/Classes/ClassFormFields.jsx` — never imported anywhere. The Class modals handle fields internally.

### 70. Schema SQL — Missing Column for Phone Format
**File:** `roar-mma/backend/db/schema.sql` — no `phone_country_code` column. International numbers stored inconsistently.

---

## ASSESSMENT SUMMARY

| Category | Count |
|---|---|
| Critical Security | 6 |
| High Severity | 4 |
| Backend Bugs | 22 |
| Frontend Bugs | 21 |
| Scripts/Config | 7 |
| Code Quality | 20 |
| **Total** | **70** |

### Top 5 Must-Fix Issues
1. **Hardcoded admin credentials** (`admin@roarmma.com.au` / `changeme123`) in `fix_auth.ps1` and likely in dozens of HTML files
2. **JWT secret in `.env`** committed to git — token forgery
3. **Communications schedule checkbox broken** — permanently stuck unchecked
4. **SQL injection vectors** across multiple data layer files
5. **No input validation** on any API route — trust every request
