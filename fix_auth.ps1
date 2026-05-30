param(
    [string]$FrontendPath = (Join-Path $PSScriptRoot "roar-mma\frontend")
)

$files = Get-ChildItem -Path $FrontendPath -Filter "*.html"

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $name = $file.Name
    
    if ($content -notlike '*auth/login*') {
        Write-Output "Skipping $name (no auth/login)"
        continue
    }
    
    # Step 1: Replace try { + hardcoded login with requireAuth check + try {
    $oldLogin = @'
            try {
                const response = await fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: document.getElementById('email')?.value || '', password: document.getElementById('password')?.value || '' })
                });
                const data = await response.json();
                authToken = data.token;

'@
    $newLogin = @'
            if (!RoarMMA.requireAuth()) return;
            try {

'@
    
    if ($content.Contains($oldLogin)) {
        $content = $content.Replace($oldLogin, $newLogin)
    } else {
        Write-Output "WARNING: Login pattern not found in $name"
        $oldLogin2 = @'
        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'admin@roarmma.com.au', password: 'changeme123' })
            });
            const data = await response.json();
            authToken = data.token;

'@
        $newLogin2 = @'
        if (!RoarMMA.requireAuth()) return;
        try {

'@
        if ($content.Contains($oldLogin2)) {
            $content = $content.Replace($oldLogin2, $newLogin2)
            Write-Output "  (matched alt indentation for $name)"
        } else {
            Write-Output "  FAILED to match any pattern for $name"
        }
    }
    
    # Step 2: Remove let authToken = null;
    $content = $content -replace [regex]::Escape("let authToken = null;"), ""
    $content = $content -replace [regex]::Escape("var authToken = null;"), ""
    $content = $content -replace [regex]::Escape("let authToken;"), ""
    
    # Step 3: Replace API_BASE declaration
    $content = $content -replace [regex]::Escape("const API_BASE = 'http://localhost:3001/api';"), "var API_BASE = RoarMMA.API_BASE;"
    
    # Step 4: Replace Bearer authToken references
    $content = $content -replace [regex]::Escape('`Bearer ${authToken}`'), "'Bearer ' + RoarMMA.getToken()"
    
    # Step 5: Clean up triple+ blank lines
    $content = $content -replace "`n`n`n+", "`n`n"
    
    [System.IO.File]::WriteAllText($file.FullName, $content)
    Write-Output "Fixed auth in: $name"
}

Write-Output "`nAuth fix complete."
