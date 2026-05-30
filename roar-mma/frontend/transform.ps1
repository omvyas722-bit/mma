param([string]$Path = "D:\gym software\mma\roar-mma\frontend")

$exclude = @("index.html", "members.html", "transform.ps1")
$files = Get-ChildItem -Path $Path -Filter "*.html" | Where-Object { $_.Name -notin $exclude }

# --- Common text blocks ---
$metaBlock = @'
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https: ws:; font-src 'self'; frame-ancestors 'none';">
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="preconnect" href="https://cdn.jsdelivr.net">
    <link rel="dns-prefetch" href="https://cdn.jsdelivr.net">
    <script defer src="/public/shared-auth.js"></script>
'@

$navDelegate = @'
var API_BASE = ROAR_API_BASE;

document.addEventListener('click', function(e) {
    var item = e.target.closest('[data-href]');
    if (item) { e.stopPropagation(); window.location.href = item.getAttribute('data-href'); }
});
'@

function Apply-Fixes {
    param([string]$FilePath)

    Write-Host "Processing: $FilePath"
    $content = Get-Content -Path $FilePath -Raw
    $orig = $content
    $name = Split-Path $FilePath -Leaf

    # 1. Insert meta/link/script after viewport meta
    $content = $content -replace '(?s)(<meta name="viewport"[^>]*>)', "`$1`n$metaBlock"

    # 2. Replace nav onclick with data-href
    $content = $content -replace 'onclick="window\.location\.href=''([^'']+)''"', 'data-href="$1"'

    # 3. Add role="main" aria-label to main-content
    $content = $content -replace 'class="main-content"', 'class="main-content" role="main" aria-label="Main content"'

    # 4. Replace auth functions block (very precise matching)
    # The auth functions are always in the exact same format (just indentation of API_BASE line varies)
    $authPattern = '(?s)(\s*)const API_BASE = window\.location\.origin \+ ''/api'';\s*\n' +
                  'function login\(\) \{\s*\n' +
                  '\s*const email = prompt\(''Email:''\);\s*\n' +
                  '\s*const password = prompt\(''Password:''\);\s*\n' +
                  '\s*return JSON\.stringify\(\{ email, password \}\);\s*\n' +
                  '\}\s*\n' +
                  'function getAuthToken\(\) \{\s*\n' +
                  '\s*const token = sessionStorage\.getItem\(''authToken''\);\s*\n' +
                  '\s*const expiry = sessionStorage\.getItem\(''authTokenExpiry''\);\s*\n' +
                  '\s*if \(token && expiry && Date\.now\(\) < parseInt\(expiry\)\) \{\s*\n' +
                  '\s*return token;\s*\n' +
                  '\s*\}\s*\n' +
                  '\s*return null;\s*\n' +
                  '\}\s*\n' +
                  'function setAuthToken\(token\) \{\s*\n' +
                  '\s*sessionStorage\.setItem\(''authToken'', token\);\s*\n' +
                  '\s*sessionStorage\.setItem\(''authTokenExpiry'', Date\.now\(\) \+ 3600000\);\s*\n' +
                  '\}'

    $content = $content -replace $authPattern, $navDelegate

    # 5. Replace init() login pattern
    # Match "async function init() { ... try { const response = await fetch(.../auth/login...); ... setAuthToken(data.token); }"
    $initPattern = '(?s)(async function init\(\) \{\s*)try \{[^}]*const response = await fetch\(\`\$\{API_BASE\}\/auth\/login\`[^;]*;[^}]*const data = await response\.json\(\);[^}]*setAuthToken\(data\.token\);([^}]*)\}'
    $content = $content -replace $initPattern, '${1}var token = await requireAuth();${2}if (!token) return;'

    # 6. Replace autoLogin pattern
    $autoPattern = '(?s)(async function autoLogin\(\) \{\s*)try \{[^}]*const response = await fetch\(\`\$\{API_BASE\}\/auth\/login\`[^;]*;[^}]*if \(response\.ok\) \{[^}]*const data = await response\.json\(\);[^}]*setAuthToken\(data\.token\);'
    $autoReplace = '${1}var token = await requireAuth();\r\n            if (!token) {\r\n                document.getElementById(''server-status'').textContent = ''Offline'';\r\n                return;\r\n            }\r\n            document.getElementById(''server-status'').textContent = ''Connected'';'
    $content = $content -replace $autoPattern, $autoReplace

    # 7. Handle top-level fetch login (dashboard.html pattern)
    # This is the most complex - need special handling
    if ($name -eq "dashboard.html") {
        $content = $content -replace '(?s)(\s*)fetch\(API_BASE \+ ''/auth/login'',\s*\{[^}]*body: login\(\)[^;]*;[^}]*\}\)',
                                         '${1}requireAuth().then(function(token) {'
        $content = $content -replace '(?s)\.then\(r => \{[^}]*return r\.json\(\);\}\)\.then\(d => \{[^}]*setAuthToken\(d\.token\);\s*const tok = getAuthToken\(\);\s*\n',
                                     '    if (!token) return;\r\n    const tok = token;\r\n'
    }

    # 8. Replace remaining alert/prompt non-auth calls with data-action pattern
    # (keep these as-is for now since they're business logic, not auth)

    if ($content -ne $orig) {
        Set-Content -Path $FilePath -Value $content -NoNewline
        Write-Host "  -> Updated: $name"
    } else {
        Write-Host "  -> No changes: $name"
    }
}

foreach ($file in $files) {
    Apply-Fixes -FilePath $file.FullName
}

Write-Host "Done!"
