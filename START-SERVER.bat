@echo off
title The Rajmahal Palace - local server
cd /d "%~dp0"
echo.
echo   ============================================================
echo    THE RAJMAHAL PALACE  -  http://localhost:8000
echo    Keep this window open. Close it (or press Ctrl+C) to stop.
echo   ============================================================
echo.
where node >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:8000
  node scripts\serve.js
  goto :end
)
where py >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:8000
  py -m http.server 8000
  goto :end
)
where python >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:8000
  python -m http.server 8000
  goto :end
)
echo Neither Node.js nor Python was found on this PC.
echo Install Node from https://nodejs.org/ and run this file again.
:end
pause
