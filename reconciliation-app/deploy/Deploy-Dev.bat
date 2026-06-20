@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Deploy-Dev.ps1" -SkipApache %*
set EXIT_CODE=%ERRORLEVEL%
echo.
if %EXIT_CODE% NEQ 0 (
    echo [ERREUR] Deploy-Dev a echoue (code %EXIT_CODE%).
) else (
    echo [OK] Deploy-Dev termine. Lancez Start-DevEnv.ps1 pour demarrer le proxy.
)
pause
exit /b %EXIT_CODE%
