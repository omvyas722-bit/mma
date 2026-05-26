# ROAR MMA System Maintenance Script (Windows PowerShell)
# Run daily for backups, health checks, and cleanup

param(
    [string]$BackupDir = "C:\backups\roar-mma",
    [int]$RetentionDays = 30
)

$ErrorActionPreference = "Continue"

$DBPath = Join-Path $PSScriptRoot "..\..\data\roarmma.db"
$LogDir = Join-Path $PSScriptRoot "..\logs"
$Date = Get-Date -Format "yyyyMMdd-HHmmss"

Write-Host "ROAR MMA System Maintenance" -ForegroundColor Cyan
Write-Host "=============================="
Write-Host "Started: $(Get-Date)"
Write-Host ""

# Create backup directory
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

# 1. Database Backup
Write-Host "Backing up database..." -ForegroundColor Yellow
if (Test-Path $DBPath) {
    $BackupFile = Join-Path $BackupDir "roarmma-$Date.db"
    Copy-Item $DBPath $BackupFile
    Write-Host "   [OK] Database backed up: roarmma-$Date.db" -ForegroundColor Green

    # Get database size
    $DBSize = (Get-Item $DBPath).Length / 1MB
    Write-Host "   Database size: $([math]::Round($DBSize, 2)) MB"
} else {
    Write-Host "   [WARN] Database not found at $DBPath" -ForegroundColor Yellow
}

# 2. Clean old backups
Write-Host ""
Write-Host "Cleaning old backups (>$RetentionDays days)..." -ForegroundColor Yellow
$CutoffDate = (Get-Date).AddDays(-$RetentionDays)
$OldBackups = Get-ChildItem -Path $BackupDir -Filter "roarmma-*.db" -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -lt $CutoffDate }
$DeletedCount = $OldBackups.Count
$OldBackups | Remove-Item -Force
Write-Host "   [OK] Deleted $DeletedCount old backup(s)" -ForegroundColor Green

# 3. Check disk space
Write-Host ""
Write-Host "Checking disk space..." -ForegroundColor Yellow
$Drive = (Get-Item $DBPath).PSDrive
$DiskInfo = Get-PSDrive $Drive.Name
$UsedPercent = [math]::Round((($DiskInfo.Used / ($DiskInfo.Used + $DiskInfo.Free)) * 100), 2)
Write-Host "   Disk usage: $UsedPercent%"
if ($UsedPercent -gt 80) {
    Write-Host "   [WARN] Disk usage above 80%" -ForegroundColor Yellow
}

# 4. Check if server is running
Write-Host ""
Write-Host "Checking server status..." -ForegroundColor Yellow
try {
    $Response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    if ($Response.StatusCode -eq 200) {
        Write-Host "   [OK] Server is running" -ForegroundColor Green

        # Get uptime
        $HealthData = $Response.Content | ConvertFrom-Json
        if ($HealthData.uptime) {
            $UptimeHours = [math]::Round($HealthData.uptime / 3600, 2)
            Write-Host "   Uptime: ${UptimeHours}h"
        }
    }
} catch {
    Write-Host "   [ERROR] Server is not responding" -ForegroundColor Red
    Write-Host "   Check if server is running: node server.js"
}

# 5. Database statistics using health check script
Write-Host ""
Write-Host "Database statistics..." -ForegroundColor Yellow
$HealthCheckScript = Join-Path $PSScriptRoot "health-check.js"
if (Test-Path $HealthCheckScript) {
    try {
        $HealthOutput = node $HealthCheckScript 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   [OK] System healthy" -ForegroundColor Green
        } else {
            Write-Host "   [WARN] Health check reported issues" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   [WARN] Could not run health check" -ForegroundColor Yellow
    }
} else {
    Write-Host "   [WARN] Health check script not found" -ForegroundColor Yellow
}

# 6. Check log files
Write-Host ""
Write-Host "Checking log files..." -ForegroundColor Yellow
if (Test-Path $LogDir) {
    $LogSize = (Get-ChildItem $LogDir -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB
    $LogCount = (Get-ChildItem $LogDir -File -Recurse -ErrorAction SilentlyContinue).Count
    Write-Host "   Log directory size: $([math]::Round($LogSize, 2)) MB"
    Write-Host "   Log files: $LogCount"

    # Clean old logs (>7 days)
    $LogCutoff = (Get-Date).AddDays(-7)
    Get-ChildItem $LogDir -Filter "*.log" -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -lt $LogCutoff } | Remove-Item -Force
    Write-Host "   [OK] Cleaned logs older than 7 days" -ForegroundColor Green
} else {
    Write-Host "   [WARN] Log directory not found" -ForegroundColor Yellow
}

# 7. Summary
Write-Host ""
Write-Host "=============================="
Write-Host "[OK] Maintenance complete" -ForegroundColor Green
Write-Host "Finished: $(Get-Date)"
Write-Host ""
Write-Host "Backup location: $BackupDir\roarmma-$Date.db"
Write-Host ""

# Exit with appropriate code
if ($UsedPercent -gt 90) {
    Write-Host "[WARN] Critical disk space" -ForegroundColor Red
    exit 1
}

exit 0
