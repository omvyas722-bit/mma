param(
    [string]$FrontendPath = (Join-Path $PSScriptRoot "roar-mma\frontend")
)

$fileFixes = @{
    "members.html" = "modalClose"
    "member-form.html" = "form:member-form:handleSubmit"
    "lead-form.html" = "form:lead-form:handleSubmit"
    "instructors.html" = "form:instructor-form:handleSubmit"
    "locations.html" = "form:location-form:handleSubmit"
    "membership-tiers.html" = "form:tier-form:handleSubmit"
    "product-form.html" = "form:product-form:handleSubmit"
    "pt-session-form.html" = "form:session-form:handleSubmit"
    "member-portal.html" = "form:profile-form:updateProfile"
}

foreach ($file in (Get-ChildItem -Path $FrontendPath -Filter "*.html")) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $name = $file.Name
    
    if (-not $fileFixes.ContainsKey($name)) { continue }
    
    $fix = $fileFixes[$name]
    $changed = $false
    
    if ($fix -eq "modalClose") {
        # Find the last init() call and add closeModal listener before it
        $listenerBlock = "`n        // Wire up event listeners`n        document.querySelector('.modal-close')?.addEventListener('click', closeModal);`n        document.getElementById('member-modal')?.addEventListener('click', function(e) { if (e.target === this) closeModal(); });"
        $content = $content -replace [regex]::Escape("`n        init();"), "$listenerBlock`n        init();"
        $changed = $true
    }
    
    if ($fix -match '^form:([\w-]+):(\w+)$') {
        $formId = $Matches[1]
        $handler = $Matches[2]
        
        # Add listener after requireAuth in init()
        $listener = "`n            document.getElementById('$formId')?.addEventListener('submit', $handler);"
        $pattern = 'if \(!RoarMMA\.requireAuth\(\)\) return;'
        $replacement = "if (!RoarMMA.requireAuth()) return;$listener"
        $content = $content -replace $pattern, $replacement
        $changed = $true
    }
    
    if ($changed) {
        [System.IO.File]::WriteAllText($file.FullName, $content)
        Write-Output "Fixed events in: $name"
    }
}
