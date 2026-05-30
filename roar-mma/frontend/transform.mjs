import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const dir = 'D:\\gym software\\mma\\roar-mma\\frontend';
const exclude = new Set(['index.html', 'transform.mjs', 'transform.ps1', 'debug.mjs', 'classes.html.bak']);

const metaBlock =
    '\n    <meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\' \'unsafe-inline\' https://cdn.jsdelivr.net; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data: blob:; connect-src \'self\' https: ws:; font-src \'self\'; frame-ancestors \'none\';">\n' +
    '    <link rel="icon" type="image/svg+xml" href="/favicon.svg">\n' +
    '    <link rel="preconnect" href="https://cdn.jsdelivr.net">\n' +
    '    <link rel="dns-prefetch" href="https://cdn.jsdelivr.net">\n' +
    '    <script defer src="/public/shared-auth.js"></script>';

const files = readdirSync(dir).filter(f => f.endsWith('.html') && !exclude.has(f));

for (const file of files) {
    const fp = join(dir, file);
    let content = readFileSync(fp, 'utf8');
    let modified = false;

    // 1. Add CSP meta + shared-auth.js after viewport meta
    if (!content.includes('shared-auth.js')) {
        content = content.replace(
            /(<meta name="viewport"[^>]*>\s*\n)\s*<title>/,
            (m, p1) => p1 + metaBlock + '\n    <title>'
        );
        modified = true;
    }

    // 2. Replace nav onclick with data-href
    content = content.replace(/onclick="window\.location\.href='([^']+)'"/g, 'data-href="$1"');
    if (content.includes('onclick="window.location.href')) {
        modified = true;
    }

    // 3. Add role="main" and aria-label to main-content
    const r2 = content.replace('class="main-content"', 'class="main-content" role="main" aria-label="Main content"');
    if (r2 !== content) { modified = true; content = r2; }

    // 4. Replace hardcoded API_BASE with ROAR_API_BASE
    content = content.replace(
        /const API_BASE = 'http:\/\/localhost:3001\/api';\s*\n\s*let authToken = null;/g,
        'var API_BASE = ROAR_API_BASE;'
    );
    content = content.replace(
        /const API_BASE = 'http:\/\/localhost:3001\/api';/g,
        'var API_BASE = ROAR_API_BASE;'
    );
    content = content.replace(/\n\s*let authToken = null;/g, '');
    content = content.replace(/^\s*let authToken = null;\s*\n/gm, '');
    if (content.includes('var API_BASE = ROAR_API_BASE;')) { modified = true; }

    // 5. Replace init() login - match from 'async function init()' through 'authToken = data.token;'
    content = content.replace(
        /async function init\(\) \{[\s\S]*?try \{[\s\S]*?const response = await fetch\(`\$\{API_BASE\}\/auth\/login`[\s\S]*?authToken = data\.token;[\s\S]*?\n\s*\n/,
        'async function init() {\n            var token = await requireAuth();\n            if (!token) return;\n\n'
    );

    // 6. Replace autoLogin - match from 'async function autoLogin()' through '= \'Connected\';'
    content = content.replace(
        /async function autoLogin\(\) \{[\s\S]*?try \{[\s\S]*?const response = await fetch\(`\$\{API_BASE\}\/auth\/login`[\s\S]*?authToken = data\.token;[\s\S]*?document\.getElementById\('server-status'\)\.textContent = 'Connected';/,
        "async function autoLogin() {\n            var token = await requireAuth();\n            if (!token) {\n                document.getElementById('server-status').textContent = 'Offline';\n                return;\n            }\n            document.getElementById('server-status').textContent = 'Connected';"
    );

    // 7. Replace dashboard inline fetch pattern
    content = content.replace(
        /fetch\('http:\/\/localhost:3001\/api\/auth\/login',[\s\S]*?body: JSON\.stringify\(\{email:'admin@roarmma\.com\.au',password:'changeme123'\}\)[\s\S]*?\)\.then\(r => r\.json\(\)\)\.then\(d => \{[\s\S]*?fetch\('http:\/\/localhost:3001\/api\/analytics\/dashboard',\s*\{/,
        "requireAuth().then(function(token) {\n            if (!token) return;\n            fetch(ROAR_API_BASE + '/analytics/dashboard', {"
    );
    content = content.replace(
        /'Authorization': 'Bearer ' \+ d\.token/g,
        "'Authorization': 'Bearer ' + token"
    );

    if (modified) {
        writeFileSync(fp, content, 'utf8');
        console.log('UPDATED: ' + file);
    } else {
        console.log('SKIPPED: ' + file);
    }
}
