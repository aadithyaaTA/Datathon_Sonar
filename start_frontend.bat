@echo off
TITLE SonarSentinel Frontend UI
cd /d "%~dp0\frontend"

if not exist "node_modules" (
    echo Installing npm dependencies...
    call npm install
)

echo Starting SonarSentinel React UI on http://localhost:5173 ...
npm run dev
