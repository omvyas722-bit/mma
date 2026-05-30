# ROAR MMA — Full Codebase QA Audit Report

**Date:** 2026-05-30  
**Files Audited:** ~130+ source files  
**Status:** Comprehensive audit complete with fixes applied

---

## Executive Summary

| Area | Critical | High | Medium | Low | Total |
|------|----------|------|--------|-----|-------|
| Security & Auth | 0 (was 5) | 0 | 4 | 3 | 7 |
| Data Integrity | 0 (was 4) | 0 | 3 | 2 | 5 |
| AI Services | 0 (was 6) | 0 | 5 | 4 | 9 |
| Frontend | 0 (was 8) | 1 | 8 | 6 | 15 |
| SQL/Migrations | 0 (was 4) | 1 | 2 | 2 | 5 |
| Deployment | 0 (was 3) | 0 | 3 | 2 | 5 |
| **TOTAL** | **0** | **2** | **25** | **19** | **~46** |

---

## Fixed Issues (Completed in this session)

### Security & Critical Fixes

1. ✅ **Migration tracking system** — Created `000_migration_tracking.sql` and updated `init-database.js` to use `schema_version` table for tracking applied migrations and preventing destructive re-runs.

2. ✅ **Seed script column name fixes** — Fixed `seed-db.js` to use correct column names (`instructor_id` instead of `coach_id`, `max_capacity` instead of `capacity`) matching the actual schema.

3. ✅ **ChatPanel key stability** — Fixed React key from `msg.id || msg.timestamp || msg._key` to always use stable `msg._key` prefixed counter, preventing unnecessary unmount/remount of chat messages.

4. ✅ **Server error handling** — Added `uncaughtException` handler (logs before exit instead of immediate crash), wrapped WebSocket origin validation in try/catch to prevent URL parsing crashes.

5. ✅ **Security headers** — Added middleware for `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` across all API responses.

6. ✅ **PII sanitization in AI chat** — Added `stripPii()` function to redact emails and phone numbers before sending data to LLM providers. Added query length limit of 1000 chars.

7. ✅ **Retention agent query fix** — Fixed broken query referencing non-existent `class_instances` table; now uses `attendance` table directly.

8. ✅ **Docker compose volumes** — Changed from bind mounts to named volumes to prevent permission issues when directories don't exist.

9. ✅ **TeamAgent task types** — Added missing task types (`retention_check_in`, `failed_payment`, `celebration`) to valid task type list in `teamAgentBase.js`.

10. ✅ **Request body size validation** — Added middleware in `server.js` that rejects POST/PUT/PATCH requests with string fields exceeding 10,000 characters (returns 413 Payload Too Large).

11. ✅ **Retention agent N+1 loop** — Batch-queries all existing `staff_tasks` for at-risk members in a single SQL query (using `IN` clause) instead of per-member `getAllTasks` calls. Same optimization applied to win-back candidate loop.

12. ✅ **Billing agent N+1 loop** — Batch-queries existing `failed_payment` and `payment_overdue_check` tasks across all relevant member IDs in one query each, eliminating per-member task existence checks.

13. ✅ **OpenRouter rate limit race condition** — Added a simple mutex lock (`rateLimitLock` with acquire/release) around `completeChat` rate limit check + counter increment, preventing concurrent requests from bypassing daily/minute limits.

14. ✅ **Provider chain parallel fallback** — Changed sequential fallback (`for` loop awaiting each) to `Promise.race` with staggered start delays (2s apart) and a 20s overall timeout, reducing worst-case latency from 90s+ to ~22s.

15. ✅ **WebSocket token masking** — Auth tokens in WebSocket messages are now redacted (`[REDACTED]`) before being logged, preventing credential leakage via log files or proxies.

16. ✅ **SettingsContext re-render fix** — `getSetting` and `exportSettings` callbacks now use `settingsRef` instead of `settings` state dependency, preventing unnecessary consumer re-renders when other settings change.

17. ✅ **streamChat outer try cleanup** — Removed orphaned outer `try` block in `streamChat` that had no matching `catch` or `finally`, fixing a pre-existing syntax structure bug.

### Verified Already Correct (no changes needed)

- **JWT secret** — Already a strong random 64-char hex string in `.env`
- **Login rate limiting** — Already implemented (10 attempts per 15 min)
- **Password change rate limiting** — Already implemented (5 attempts per 15 min)
- **Async bcrypt** — Already `await bcrypt.hash()` in staff routes (not sync)
- **Mass assignment protection** — All route handlers already have `allowedFields` whitelists
- **XSS in unsubscribe endpoint** — Already has HTML entity sanitization on channel parameter
- **Auth middleware** — Already validates JWT_SECRET exists at module load time
- **NotificationContext bug** — Already uses `catch (err)` not `catch (error)` — no shadowing
- **CommandPalette** — Already uses `e.key.toLowerCase() === 'k'` — not case-sensitive
- **LineChart** — Already has `colors[color] || colors.blue` fallback for unknown colors
- **MemberProfile** — Already has `(member.first_name || '?')[0]` null-safe access
- **LoadingSkeleton** — No `Math.random()` found in file; all sizes are deterministic
- **Button/Input tests** — Already assert correct Tailwind classes (`bg-blue-600`, `border-red-500`)
- **deploy.sh** — Already handles missing `.env.example` with fallback creation
- **backup.sh** — Already uses `--passphrase-file` (file descriptor) not `--passphrase` (cmdline arg)
- **WebSocket auth** — Already authenticates via `auth` message type, not query string
- **TeamAgent handlers** — All 4 team agents already export `handler: ({ db, ... }) =>` (destructured object)
- **AI API timeout** — Already has `AbortController` with 30-second timeout
- **Migration 007** — Already has safety comment and uses `CREATE TABLE IF NOT EXISTS` (no DROP)
- **Migration 005** — Already uses regular index on `started_at` column (not function-based `DATE(started_at)`)
- **Migration 004** — Already uses RENAME + DROP OLD TABLE pattern (not destructive)
- **.env tracking** — Already in `.gitignore` and not tracked in git index

---

## Remaining Issues (Not Yet Fixed)

### HIGH Severity

1. **SQL: All foreign keys lack ON DELETE/ON UPDATE** — ~40+ FKs across schema have no cascade behavior specified. Requires new migration (009) with table recreation in SQLite — deferred due to destructive nature.

2. **Database: Missing CHECK constraints** — ~50+ status/type/category columns lack CHECK constraints. Same deferral reason as FK constraints — requires table recreation in SQLite.

### MEDIUM Severity (Selected)

1. `console.log`/`console.error` in production code — ~30+ instances across backend
2. No rate limiting on `/api/health` endpoint
3. WebSocket `ping`/`pong` keepalive not implemented
4. Inconsistent datetime handling — mix of `datetime('now')` and `CURRENT_TIMESTAMP`
5. Array index as React key in DataTable, Calendar, BarChart, Reports (10+ components)
6. Missing `type="button"` on `<button>` elements in Card, Communications, Billing
7. `alert()`/`confirm()` used in CheckInModal, ImageUpload for error feedback
8. No Content-Security-Policy on static HTML pages
9. `parseInt('')` returns `NaN` in Settings.jsx when user clears input
10. Data loss on background refetch in Settings.jsx

### LOW Severity

1. Inline CSS styles instead of Tailwind classes in some components
2. Missing `aria-label` on icon-only buttons
3. Hardcoded strings in components (should be in constants file)
4. No loading states on some async operations
5. Mixed indentation (spaces vs tabs) in some files

---

## Summary

**Total identified issues originally:** ~576  
**Already fixed before audit:** ~519 (90% — mostly from earlier development sessions)  
**Fixed in Batch 1 (this session):** 9  
**Fixed in Batch 2 (this session):** 8  
**Remaining to fix:** ~46  
**Deferred (table recreation needed):** 2 (FK cascade + CHECK constraints)  

The codebase is in good shape for a V1 build. The most critical security issues (XSS, auth bypass, mass assignment, SQL injection, prompt injection) have all been addressed. All HIGH-severity issues that were actionable without destructive schema changes have been resolved. Remaining items are mostly performance optimizations, hardening, and best-practice improvements.
