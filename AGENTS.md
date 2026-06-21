## Graphify / Knowledge Graph First
Before answering any question about this codebase, consult the Graphify knowledge graph first.

Use this exact executable path because `graphify` is not on PATH:

```powershell
& "C:\Users\DA PRO XTREME GENJI\AppData\Roaming\uv\tools\graphifyy\Scripts\graphify.exe" query "<question>"

Rules:

Prefer graphify query "<question>" over reading raw files or grepping.
Use the graph first for architecture, ownership, dependencies, side effects, and “where is X handled?” questions.
Use graphify explain "<node>" for node-level clarification.
Use graphify path "<A>" "<B>" for relationships between two nodes.
Use graphify affected "<X>" for reverse impact analysis.
Use GRAPH_REPORT.md only for broad architecture review.
Read raw files only if the graph is missing, stale, or clearly insufficient.

If the graph seems stale after code changes, update it with the full executable path before continuing:

& "C:\Users\DA PRO XTREME GENJI\AppData\Roaming\uv\tools\graphifyy\Scripts\graphify.exe" update "D:\gym software\mma"

## CRITICAL: Groq API Key

The Groq API key (`GROQ_API_KEY`) is stored in `roar-mma/backend/.env`.
- NEVER remove it from `.env` or any `.env.*` file (except `.env.example`)
- NEVER hardcode it in any code file (`.js`, `.ts`, `.jsx`, `.tsx`, etc.)
- If found hardcoded in code, remove it immediately and reference `process.env.GROQ_API_KEY` instead
- The `.env` file is gitignored; `.env.example` has a placeholder value

## Agent-Browser Test Backups

Two folders at repo root:
- `agent-browser tests backup/` — **original untouched backup** of all Playwright E2E tests. NEVER modify.
- `agent-browser tests/` — **working copy** cloned from backup. Free to modify on demand.

If you need to run or edit these tests, work from `roar-mma/frontend/e2e/` instead.

## Audit Findings (June 2026)

### Build Status
- `npx vite build` in frontend: **SUCCEEDS** — 67 chunks, no errors

### GAP_ANALYSIS.md Claims that are WRONG
1. "No audit log middleware" → FALSE. `backend/middleware/auditLog.js` exists, used in members/leads/classes/staff/transactions routes
2. "No webhook configuration in Settings" → FALSE. Settings.jsx has webhooks tab with `WebhooksSettings` component
3. "No 2FA setup/management in Settings" → FALSE. Settings.jsx lines 963-1011 implement 2FA enable/disable
4. "No Lightspeed manual sync trigger" → FALSE. Settings.jsx has sync button + `POST /api/webhooks/lightspeed/sync` route
5. "No barcode field on products" → FALSE. POS.jsx has keyboard buffer barcode scanning (lines 48-75)
6. "No revenue forecast section" → FALSE. Billing.jsx queries `/api/dashboard/revenue-forecast` and displays it
7. "No charts/graphs in frontend" (Reports) → FALSE. Reports.jsx uses Recharts: LineChart, PieChart, AreaChart
8. "No export to PDF" (Reports) → FALSE. Reports.jsx has `handlePrintPDF` using `window.print()`
9. "No conversion funnel visualization" → FALSE. Reports.jsx has funnel at lines 615-687
10. "Stripe has no customer-facing payment UI" → FALSE. Billing.jsx lines 503-526: full Stripe modal with StripeWrapper + StripePaymentForm
11. "No coach performance dashboard" → FALSE. Staff.jsx has performance metrics: classes_taught, avg_fill_rate, pt_sessions, pt_clients
12. "No win-back pipeline" → FALSE. Leads.jsx has win-back query + UI display
13. "Waitlist not implemented" → FALSE. Classes.jsx has waitlist count, roster filtering, visual indicators

### GAP_ANALYSIS.md Claims that are CORRECT (still open)
<i>(all gaps closed)</i>

### Additional Verified Gaps (still open)
<i>(all gaps closed)</i>

### Gaps Closed by Prior Commits
- Certificate generation in Gradings (`CertificateModal`, `Gradings.jsx:315`)
- Fighter leaderboard (`FighterLeaderboard`, `Gradings.jsx:355`, leaderboard tab exists)
- Class level color coding (`TYPE_COLORS` in `Classes.jsx:16`, fill-based border coloring)
- Kids waiver auto-sign flow (`SEND_PARENT_WAIVER` event → messaging agent → pending signatures, Waivers.jsx with pending status + resend)
- Class fill heatmap (`Reports.jsx:512` — "Class Fill Heatmap — by Day of Week")
- Receipt printing (POS.jsx `ReceiptPreview` with email receipt + real transaction_id)
- Split-screen location view (`Classes.jsx:52` `splitView` state, side-by-side toggle button)
- Member CSV import (`Members.jsx` imports `MemberCSVImportModal`)
- Emergency contact in member profile (`MemberProfile.jsx:201` shows badge)
- Health declaration tracking (`DocumentsPanel.jsx:71`)
- Fighter competition result logging (`MemberProfile.jsx` competitions section)
- Bulk operations (backend `POST /api/members/bulk-delete`, `POST /api/members/bulk-update`, `POST /api/leads/bulk-update`; frontend Leads.jsx bulk selection mode)
- Unified notification system (migration `033_unified_notifications.sql`, `notificationService.js`, `routes/notifications.js` with preferences)
- Data retention policy UI (`Privacy.jsx` — RetentionPolicies tab)
- Data export request portal (`Privacy.jsx` — data export requests section)
- API key management UI (`Settings.jsx` — ApiKeysSettings component)
- Role permissions UI (`Settings.jsx` — RolePermissionsSettings component)
- Pixel tracking management UI (`Settings.jsx` — PixelTrackingSettings component, backend `GET /api/pixel/list`, `POST /api/pixel/create`)
- PerfectGym pages API wiring — added `GET /api/settings/locations` endpoint, fixed `PUT /api/settings` to persist, exposed custom keys at top level of settings response
- TikTok "Coming soon" removed — TikTok platforms now show Connect/Disconnect buttons
- Meta API live posting — verified already implemented (`metaApi.js` with `postToFacebook`/`postToInstagram`, publish route working)
- Class capacity override audit trail — verified already implemented (`classes.js:182` `auditLog('update_capacity', ...)`)
