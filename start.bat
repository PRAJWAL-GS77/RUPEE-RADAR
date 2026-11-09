@echo off
echo ===================================================
echo Starting Rupee Radar Backend and Frontend...
echo ===================================================

start "Rupee Radar Backend" cmd /k "cd /d "%~dp0" && call .venv\Scripts\activate.bat && python -m uvicorn backend.app.main:app --reload --port 8000"

start "Rupee Radar Frontend" cmd /k "cd /d "%~dp0frontend" && if not exist node_modules (npm install) && npm run dev"

echo Waiting 8 seconds for servers to initialize...
timeout /t 8 /nobreak >nul

echo Opening Rupee Radar in browser...
start http://localhost:3000

echo Done! Leave the terminal windows open.
