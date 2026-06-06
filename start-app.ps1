Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  ROAR MMA - Starting All Services" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$RootDir = "C:\Users\omvya\Documents\randi software\roar-mma"

# 1. Start Backend (port 3001)
Write-Host "[1/2] Starting Backend API (port 3001)..." -ForegroundColor Yellow
$backendJob = Start-Job -ScriptBlock {
    Set-Location -LiteralPath $using:RootDir\backend
    npm run dev
}
Write-Host "       Backend PID: $($backendJob.Id)" -ForegroundColor Green

# 2. Start Frontend (port 5174)
Write-Host "[2/2] Starting Frontend (port 5174)..." -ForegroundColor Yellow
$frontendJob = Start-Job -ScriptBlock {
    Set-Location -LiteralPath $using:RootDir\frontend
    npm run dev
}
Write-Host "       Frontend PID: $($frontendJob.Id)" -ForegroundColor Green

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Services Running:" -ForegroundColor Cyan
Write-Host "  Backend API:  http://localhost:3001" -ForegroundColor Green
Write-Host "  Frontend App: http://localhost:5174" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To stop services: Get-Job | Stop-Job"
Write-Host "To view logs:     Get-Job | Receive-Job"
Write-Host ""
