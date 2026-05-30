param(
    [string]$FrontendPath = "D:\gym software\mma\roar-mma\frontend"
)

$files = Get-ChildItem -Path $FrontendPath -Filter "*.html"

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $name = $file.Name
    
    if ($content -notlike '*auth/login*') {
        Write-Output "Skipping $name"
        continue
    }
    
    # Find the login block: "            try {" through "authToken = data.token;" and the following blank line
    $startMarker = "            try {"
    $endMarker = "authToken = data.token;"
    $replacementBlock = "            if (!RoarMMA.requireAuth()) return;`r`n            try {"
    
    $startIdx = $content.IndexOf($startMarker)
    if ($startIdx -ge 0) {
        $endIdx = $content.IndexOf($endMarker, $startIdx)
        if ($endIdx -ge 0) {
            $endOfLine = $content.IndexOf("`r`n", $endIdx)
            if ($endOfLine -lt 0) { $endOfLine = $content.IndexOf("`n", $endIdx) }
            
            # Skip the blank line after authToken line
            $lookStart = $endOfLine + 2  # skip \r\n
            if ($content.Substring($lookStart, 1) -eq "`r") { $lookStart++ }
            if ($content.Substring($lookStart, 1) -eq "`n") { $lookStart++ }
            # Also skip a potential second blank line
            if ($lookStart + 1 -lt $content.Length) {
                $nextChar = $content.Substring($lookStart, 1)
                if ($nextChar -eq "`r" -or $nextChar -eq "`n") {
                    if ($content.Substring($lookStart, 2) -eq "`r`n") { $lookStart += 2 }
                    elseif ($content.Substring($lookStart, 1) -eq "`n") { $lookStart++ }
                }
            }
            
            $before = $content.Substring(0, $startIdx)
            $after = $content.Substring($lookStart)
            
            $newContent = $before + $replacementBlock + $after
            [System.IO.File]::WriteAllText($file.FullName, $newContent)
            Write-Output "Fixed login in: $name"
        } else {
            Write-Output "ERROR: end marker not found in $name"
        }
    } else {
        Write-Output "ERROR: start marker not found in $name"
    }
}
