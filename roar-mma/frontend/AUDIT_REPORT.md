# QA Audit Report — ROAR MMA Frontend

**Date:** 2026-05-30
**Scope:** 47 files (33 static HTML pages, 1 SPA entry point, 13 configuration/utility files)
**Auditor:** opencode

---

## Severity Legend

| Severity | Meaning |
|----------|---------|
| 🔴 CRITICAL | Security vulnerability, data exposure, or broken core functionality |
| 🟠 HIGH     | Significant maintainability issue, missing feature, or broken navigation |
| 🟡 MEDIUM   | Suboptimal practice, code duplication, or minor missing feature |
| 🔵 LOW      | Cosmetic, accessibility gap, or nice-to-have improvement |

---

## 🔴 CRITICAL

### C1 — Hardcoded admin credentials in source code & documentation

**Files:**
- `src/test/mocks/handlers.js:12` — `owner@roarmma.com.au` / `admin123`
- `playwright_e2e_test.cjs:47` — `owner@roarmma.com.au` / `admin123`
- `playwright_e2e_test.cjs:50` — `admin@roarmma.com.au` / `changeme123`
- `TROUBLESHOOTING.md:192` — curl example with `admin123`
- `QUICKSTART.md:43` — documents password as `admin123`

**Issue:** Production credentials hardcoded in test files mock handlers, E2E test scripts, and documentation. Anyone with repo access can see default login credentials.

**Fix:** Remove hardcoded credentials. Use environment variables or a secrets file for test credentials. Never commit real credentials.

---

### C2 — CDN script tags missing Subresource Integrity (SRI)

**Files (6 occurrences):**
- `dashboard.html:7`
- `reports.html:7`
- `trial-bookings.html:7`
- `advanced-analytics.html:7`
- `discipline-tracking.html:7`
- `command-center-v2.html:7`

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
```

**Issue:** No `integrity` attribute on any CDN-loaded script. If jsDelivr is compromised or serves a malicious version, every page loading Chart.js will execute it. Supply chain attack vector.

**Fix:** Add `integrity="sha384-..." crossorigin="anonymous"` using the hash provided by the CDN. Pin to exact version (already done: `@4.4.0`) but the integrity hash must match.

---

### C3 — No Content-Security-Policy in any static HTML page

**Files:** All 33 static HTML pages (every `.html` except `index.html`)

**Issue:** Zero HTML pages include a `<meta http-equiv="Content-Security-Policy">` tag. The only CSP exists in `nginx.conf:18` but:
   - `script-src 'self' 'unsafe-inline'` allows any inline script execution
   - `'unsafe-inline'` in script-src defeats XSS protection
   - Static HTML pages opened via `file://` or dev-server bypass nginx entirely
   - No nonce or hash-based CSP is used

**Fix:** Add strict CSP meta tags to every HTML page. Use nonces or hashes for inline scripts instead of `'unsafe-inline'`.

---

### C4 — XSS via inline `onclick` handlers in sidebar navigation

**Files:** All 33 static HTML pages

```html
<div class="nav-item" onclick="window.location.href='dashboard.html'">📊 Dashboard</div>
```

**Issue:** Using `onclick` attributes for navigation is a reflected XSS vector if any user-controllable data enters the href string. Also `window.location.href` assignment is preventable. With CSP `'unsafe-inline'`, any injected inline script executes.

**Fix:** Use `<a>` tags with real `href` attributes instead of `<div>` elements with `onclick`. This also enables right-click → open in new tab, SEO, and accessibility.

---

### C5 — Plaintext `prompt()` for credentials (credential exposure)

**Files (all pages with the duplicated auth block):**
- `dashboard.html:73-76`
- `reports.html:323-326`
- `trial-bookings.html:353-356`
- Plus 24+ other pages

```javascript
function login() {
    const email = prompt('Email:');
    const password = prompt('Password:');
    return JSON.stringify({ email, password });
}
```

**Issue:** `prompt()` renders credentials in plain text in the browser UI, shown to anyone walking by. Credentials are visible in the dialog, stored in browser history, and viewable via DevTools. This is not a secure authentication mechanism.

**Fix:** Use a proper login form with `<input type="password">`. Consider that these static pages appear to be legacy/demo pages that should redirect to the SPA login.

---

## 🟠 HIGH

### H1 — Massive code duplication: auth/login logic copied across 27+ files

**Files (27 occurrences of `sessionStorage.getItem('authToken')`):**
`settings.html`, `command-center-v2.html`, `command-center.html`, `dashboard.html`, `member-portal.html`, `trial-bookings.html`, `stock.html`, `retention.html`, `reports.html`, `pt-sessions.html`, `pt-session-form.html`, `pt-session-detail.html`, `product-form.html`, `product-detail.html`, `membership-tiers.html`, `member-form.html`, `member-detail.html`, `locations.html`, `lead-detail.html`, `lead-form.html`, `leads.html`, `instructors.html`, `belt-progression.html`, `billing.html`, `checkin.html`, `classes.html`, `members.html`

Each file contains identical copies of:
```javascript
function login() { ... prompt('Email:') ... }
function getAuthToken() { ... sessionStorage.getItem('authToken') ... }
function setAuthToken(token) { ... sessionStorage.setItem('authToken', token) ... }
```

**Issue:** Maintenance nightmare. Any change to auth logic (e.g., token refresh, new storage mechanism, logout) requires updating 27+ files. Inconsistent updates are inevitable.

**Fix:** Extract auth logic into a single shared `.js` file (e.g., `auth.js`) and load via `<script src="auth.js">` in all pages. Or deprecate static pages in favor of the SPA.

---

### H2 — Zero accessibility attributes across all static HTML pages

**Files:** All 33 static HTML pages

- **No `alt` attributes** — zero matches across all `.html` files for `alt=`
- **No ARIA attributes** — zero matches for `aria-label`, `aria-labelledby`, `role=`
- **Icon-only navigation** — All sidebar items use emoji as icons with no text fallback for screen readers (e.g., `📊 Dashboard` — the emoji is decorative but has no `aria-hidden="true"`)
- **No focus management** — Navigation via `onclick` on `<div>` elements doesn't support keyboard navigation (no `tabindex`, no `role`)

**Fix:** Add `role` attributes to interactive elements, `aria-label` to icon-only elements, `alt` to any `<img>` tags, `aria-hidden="true"` to decorative emoji. Use `<nav>` element for sidebar.

---

### H3 — Broken link: `trial-booking-form.html` referenced but missing

**File:** `trial-bookings.html:115`
```html
<button class="btn btn-primary" onclick="window.open('trial-booking-form.html', '_blank')">Public Booking Form</button>
```

**Issue:** The file `trial-booking-form.html` does not exist. Clicking this button will result in a 404 error.

**Fix:** Create the missing file or remove the button.

---

### H4 — Synchronous `<script>` in `<head>` blocks page rendering

**Files (6 with Chart.js):**
- `dashboard.html:7`
- `reports.html:7`
- `trial-bookings.html:7`
- `advanced-analytics.html:7`
- `discipline-tracking.html:7`
- `command-center-v2.html:7`

**Issue:** Chart.js is loaded as a synchronous script in `<head>` without `defer` or `async`. This blocks HTML parsing and rendering until the script downloads and executes. Users see a blank white screen until Chart.js loads.

**Fix:** Add `defer` attribute to the script tag, or move it to just before `</body>`.

---

## 🟡 MEDIUM

### M1 — Auth token stored in `sessionStorage` (XSS-vulnerable)

**Files:** All 27+ pages with duplicated auth code

```javascript
sessionStorage.setItem('authToken', token);
```

**Issue:** `sessionStorage` is accessible to any JavaScript running on the page. A single XSS vulnerability exposes the auth token. `httpOnly` cookies would be more secure.

**Fix:** Use `httpOnly` cookies for auth tokens, or store tokens in memory only and use refresh tokens.

---

### M2 — Hardcoded mock data with no live API fallback

**Files (multiple):**
- `trial-bookings.html:393-402` — 8 hardcoded booking records
- `reports.html:365-462` — Hardcoded chart data arrays
- Plus many other pages with hardcoded demo data

**Issue:** All static pages render hardcoded data when API calls fail. The mock data is embedded in the script, making it impossible to distinguish between real and demo data. The `catch` blocks silently use mock data without warning the user.

**Fix:** Add clear visual indicators when showing fallback/mock data. Load real data from API and only fall back with a warning banner.

---

### M3 — Token expiry hardcoded to 1 hour

**Files:** All 27+ pages with duplicated auth code

```javascript
sessionStorage.setItem('authTokenExpiry', Date.now() + 3600000); // 1 hour
```

**Issue:** Token expiry is hardcoded rather than being derived from the server response. If the server issues tokens with different expiry (e.g., 24h), the client will incorrectly invalidate them after 1 hour.

**Fix:** Read `expires_in` from the login API response instead of hardcoding.

---

### M4 — PWA meta tags missing from all static pages

**Files:** All 33 static HTML pages (present only in `index.html:8-10`)

`index.html` includes:
```html
<meta name="theme-color" content="#2563eb">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

**Issue:** Only the SPA entry point has PWA meta tags. All static HTML pages lack these, providing a degraded mobile experience when bookmarked to home screen.

**Fix:** Add the same mobile-web-app meta tags to all HTML pages.

---

### M5 — Inconsistent sidebar navigation across pages

**Files:** All static HTML pages

**Issue:** Different pages show different sidebar items. Some pages show the full nav (e.g., `dashboard.html` has 19 items), while others show a shorter nav (e.g., `trial-bookings.html` has 15 items, missing `membership-tiers`, `instructors`, `specialized-programs`, `advanced-analytics`, `contracts`, `discipline-tracking`). This is confusing for users navigating between pages.

**Fix:** Use a consistent sidebar across all pages. Ideally, extract the sidebar into a shared HTML fragment loaded via JavaScript or server-side include.

---

### M6 — No `type="module"` or `nomodule` on any static page scripts

**Files:** All static HTML pages

**Issue:** Inline scripts use `var`/`function` in global scope. No ES module pattern is used. This pollutes the global namespace and prevents modern bundling/optimization.

**Fix:** Refactor inline scripts into ES modules or at minimum use IIFE patterns to avoid global scope pollution.

---

### M7 — `event.target` used without checking event parameter

**Files:**
- `reports.html:467` — `event.target.classList.add('active')`
- `trial-bookings.html:452` — `event.target.classList.add('active')`

```javascript
function switchReport(type) {
    document.querySelectorAll('.report-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');  // event is undefined in strict mode
    alert(`Switching to ${type} report`);
}
```

**Issue:** `event.target` relies on the global `window.event` which is non-standard and not available in strict mode or in modern frameworks. This will throw a `ReferenceError` in strict mode or when called programmatically.

**Fix:** Pass event parameter explicitly: `function switchReport(type, event) { ... event.target.classList.add('active'); ... }`

---

### M8 — `filterBookings()` called but does nothing

**File:** `trial-bookings.html:456-459`

```javascript
function filterBookings() {
    // Filter logic here
    renderAllBookings();
}
```

**Issue:** Filter function is attached to `onchange` handlers on all filter dropdowns but ignores the selected filter values and just re-renders all bookings. The filter is a no-op.

**Fix:** Implement actual filter logic that reads the select values and filters the `bookings` array.

---

## 🔵 LOW

### L1 — `favicon.svg` not referenced from static HTML pages

**Files:** All static HTML pages (only `index.html:5` has the favicon link)

**Issue:** Static HTML pages don't include a favicon. Browser tabs will show a default icon.

**Fix:** Add `<link rel="icon" type="image/svg+xml" href="/favicon.svg">` to all pages.

---

### L2 — Emoji-based icons not hidden from screen readers

**Files:** All static HTML pages (sidebar navigation)

**Issue:** Emoji characters used as icons (📊, 🤖, ⚙️, 📍, 🎯, 💎, 👨‍🏫, 🎓, 📄, 🥊, 📅, 🥋, ✅, ⚠️, 💳, 📈, 👥, 📞, 🏋️, 📦) are read aloud by screen readers as their Unicode descriptions (e.g., "chart with upwards trend"). This creates confusing auditory output.

**Fix:** Wrap emoji in `<span aria-hidden="true">📊</span>` or use CSS-based icons (e.g., SVG icons) instead.

---

### L3 — Missing `Cache-Control` headers for HTML pages in nginx

**File:** `nginx.conf:32-35`

```nginx
location / {
    try_files $uri $uri/ /index.html;
    add_header Cache-Control "no-cache";
}
```

**Issue:** The SPA catch-all location serves all routes with `no-cache` which is correct for the SPA, but the static `.html` pages (dashboard.html, reports.html, etc.) would also be served with `no-cache` and thus never cached by the browser.

**Fix:** Explicitly set `Cache-Control` for known static HTML pages, or distinguish between SPA routes and static pages.

---

### L4 — No `VITE_API_URL` validation in static HTML pages

**Files:** All static HTML pages

```javascript
const API_BASE = window.location.origin + '/api';
```

**Issue:** Static HTML pages derive the API URL from `window.location.origin` rather than using the `VITE_API_URL` environment variable. This makes it impossible to configure the API endpoint separately from the frontend URL.

**Fix:** Use a configurable API base URL or inject it via a small inline config script.

---

### L5 — Health check endpoint has no monitoring

**File:** `nginx.conf:38-42`

```nginx
location /health {
    access_log off;
    default_type text/plain;
    return 200 "healthy\n";
}
```

**Issue:** The health check endpoint always returns 200 with no actual application-level health verification (database connection, API availability). The Docker HEALTHCHECK (`Dockerfile:30-31`) does `curl -f http://localhost:80/` which only checks if nginx is running, not if the application serves correctly.

**Fix:** The health endpoint should verify backend API connectivity and database status.

---

### L6 — No environment-based config validation

**Files:** `.env`, `vite.config.js`

**Issue:** `.env` has `VITE_ENV=development` but there is no validation that required environment variables are set at build time. Missing `VITE_API_URL` would silently fall back to `localhost`.

**Fix:** Add validation in `vite.config.js` or a startup script to check required env vars.

---

### L7 — `clean` script uses inline Node.js with `require`

**File:** `package.json:13`

```json
"clean": "node -e \"const fsp=require('fs/promises');..."
```

**Issue:** `package.json` has `"type": "module"`, but the `clean` script uses `require()` and CommonJS syntax via `node -e`. This works because `node -e` defaults to CJS, but it's inconsistent with the module-based project.

**Fix:** Use `import()` syntax or create a proper `clean.mjs` script.

---

## Summary Statistics

| Category | Count |
|----------|-------|
| 🔴 CRITICAL | 5 |
| 🟠 HIGH     | 4 |
| 🟡 MEDIUM   | 8 |
| 🔵 LOW      | 7 |
| **Total**   | **24** |

### Key Themes

1. **Security (7 issues):** C1-C5 represent significant security concerns — hardcoded credentials, no SRI, no CSP, XSS vectors, and credential exposure via `prompt()`.
2. **Duplication (3 issues):** H1, M5, and duplicated inline `<style>` blocks across 33 files represents enormous code bloat and maintenance debt.
3. **Accessibility (3 issues):** H2, L1, L2 — zero accessibility features across all static pages makes the system unusable with screen readers.
4. **Missing files (1 issue):** H3 — `trial-booking-form.html` linked but never created.
5. **Code quality (5 issues):** M3, M6, M7, M8, L7 — issues with hardcoded values, global scope pollution, non-standard event handling, and no-op functions.

### Recommended Action Items (Priority Order)

1. 🔴 Remove hardcoded credentials from all files
2. 🔴 Add SRI hashes to all CDN script tags
3. 🔴 Add CSP meta tags to all HTML pages
4. 🔴 Replace `prompt()` auth with a proper login mechanism
5. 🟠 Extract duplicated auth code into a shared module
6. 🟠 Fix broken `trial-booking-form.html` link
7. 🟠 Add accessibility attributes to all pages
8. 🟠 Add `defer` to all synchronous script tags
9. 🟡 Standardize sidebar navigation across pages
10. 🟡 Fix `event.target` references without parameter
