@echo off
TITLE SonarSentinel Backend Server
cd /d "%~dp0"

if not exist ".venv\Scripts\activate.bat" (
    echo Creating virtual environment...
    python -m venv .venv
    call .venv\Scripts\activate.bat
    pip install -r backend\requirements.txt
) else (
    call .venv\Scripts\activate.bat
)

cd backend
echo Starting SonarSentinel FastAPI on http://localhost:8000 ...
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
