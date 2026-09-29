@echo off
title Personal Workspace
cd /d "%~dp0"

echo.
echo ==========================================
echo   Personal Workspace - Starting...
echo ==========================================
echo.

if not exist "node_modules" (
    echo ... Installing dependencies (first run)...
    call npm install --no-audit --no-fund
)

echo ... Starting Vite dev server on port 5173
echo     Browser will open in a few seconds.
echo.

start "vite-dev" node node_modules\vite\bin\vite.js --host --port 5173

timeout /t 5 /nobreak >nul

start "" "http://localhost:5173"

echo ==========================================
echo   Started!  http://localhost:5173
echo   Close the "vite-dev" window to stop.
echo ==========================================
echo.
pause
