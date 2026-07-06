@echo off
REM Surveillance mort brutale du backend Java + rapport automatique
cd /d "%~dp0"
echo.
echo ========================================
echo   Diagnostic mort backend ReconciliApp
echo   Laissez cette fenetre OUVERTE en parallele
echo   du backend (DEMARRER-BACKEND.bat)
echo ========================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0diagnose-backend-kill.ps1" %*
echo.
pause
