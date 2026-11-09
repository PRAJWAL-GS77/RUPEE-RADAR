@echo off
echo ===================================================
echo Stopping Rupee Radar processes on ports 8000 and 3000...
echo ===================================================

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    echo Terminating backend process PID %%a...
    taskkill /F /PID %%a 2>nul
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo Terminating frontend process PID %%a...
    taskkill /F /PID %%a 2>nul
)

echo Rupee Radar servers stopped.
