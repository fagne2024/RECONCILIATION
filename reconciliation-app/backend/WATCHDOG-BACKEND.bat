@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0watchdog-backend.ps1"
exit /b %ERRORLEVEL%
