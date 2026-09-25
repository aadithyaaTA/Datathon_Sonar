@echo off
setlocal enabledelayedexpansion
TITLE SonarSentinel Launcher

echo =====================================================================
echo   SONARSENTINEL - Automated Underwater Debris and Anomaly Detection
echo   Problem Statement SIH26057 - Ministry of Earth Sciences (MoES)
echo =====================================================================
echo.

cd /d "%~dp0"

REM 1. Verify Python virtual environment
if not exist ".venv\Scripts\activate.bat" (
    echo [1/3] Creating Python virtual environment in .venv...
    python -m venv .venv
    echo Installing backend dependencies...
    call .venv\Scripts\activate.bat
    python -m pip install --upgrade pip
    pip install -r backend\requirements.txt
) else (
    echo [1/3] Python environment found (.venv).
)

REM 2. Check frontend dependencies
echo [2/3] Checking frontend npm packages...
cd frontend
if not exist "node_modules" (
    echo Installing frontend packages...
    call npm install
)
cd ..

REM 3. Launch Backend and Frontend
echo [3/3] Starting SonarSentinel Services...
echo.
echo   - Backend API: http://localhost:8000 (Swagger: http://localhost:8000/docs)
echo   - Frontend UI:  http://localhost:5173
echo.

start "SonarSentinel Backend (FastAPI)" cmd /k "cd /d ""%~dp0"" && call .venv\Scripts\activate.bat && cd backend && uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 3 /nobreak >nul

start "SonarSentinel Frontend (Vite)" cmd /k "cd /d ""%~dp0\frontend"" && npm run dev"

timeout /t 3 /nobreak >nul
echo Opening SonarSentinel in browser...
start http://localhost:5173

echo.
echo =====================================================================
echo   SonarSentinel is running! Press any key to exit this launcher window.
echo =====================================================================
pause >nul
