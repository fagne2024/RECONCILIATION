@echo off
REM Demarrage backend detache (fenetre peut etre fermee)
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-backend-jar.ps1" -Detached
pause
