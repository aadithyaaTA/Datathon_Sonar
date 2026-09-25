# SonarSentinel PowerShell Launcher
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "  SONARSENTINEL - Automated Underwater Debris and Anomaly Detection" -ForegroundColor White
Write-Host "  Problem Statement SIH26057 - Ministry of Earth Sciences (MoES)" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

$RootPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RootPath

# 1. Python Environment Check
if (-not (Test-Path ".venv\Scripts\Activate.ps1")) {
    Write-Host "[1/3] Creating virtual environment (.venv)..." -ForegroundColor Yellow
    python -m venv .venv
    & ".venv\Scripts\pip.exe" install -r backend\requirements.txt
} else {
    Write-Host "[1/3] Python virtual environment ready." -ForegroundColor Green
}

# 2. Frontend Check
Set-Location "$RootPath\frontend"
if (-not (Test-Path "node_modules")) {
    Write-Host "[2/3] Installing frontend npm packages..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "[2/3] Frontend npm packages ready." -ForegroundColor Green
}
Set-Location $RootPath

# 3. Launch Servers
Write-Host "[3/3] Launching Backend & Frontend services..." -ForegroundColor Cyan
Write-Host "  - Backend API: http://localhost:8000 (Swagger: http://localhost:8000/docs)" -ForegroundColor Gray
Write-Host "  - Frontend UI:  http://localhost:5173" -ForegroundColor Gray
Write-Host ""

# Start Backend in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$RootPath'; & '.venv\Scripts\Activate.ps1'; Set-Location backend; uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

Start-Sleep -Seconds 2

# Start Frontend in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$RootPath\frontend'; npm run dev"

Start-Sleep -Seconds 3

# Open Browser
Start-Process "http://localhost:5173"

Write-Host "SonarSentinel is running! Press Ctrl+C in the respective windows to stop." -ForegroundColor Green
