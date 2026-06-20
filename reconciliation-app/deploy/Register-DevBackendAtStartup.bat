@echo off
REM Enregistre le backend DEV comme tache planifiee (demarrage au boot)
setlocal
set TASK_NAME=ReconciliationBackendDEV
set SCRIPT=%~dp0..\backend\start-dev.bat

schtasks /Query /TN "%TASK_NAME%" >nul 2>&1
if %ERRORLEVEL%==0 (
    echo Tache %TASK_NAME% existe deja.
    schtasks /Run /TN "%TASK_NAME%"
    exit /b 0
)

schtasks /Create /TN "%TASK_NAME%" /TR "\"%SCRIPT%\"" /SC ONSTART /RU SYSTEM /RL HIGHEST /F
if errorlevel 1 (
    echo Echec creation tache. Executer en administrateur.
    exit /b 1
)

echo Tache %TASK_NAME% creee. Demarrage...
schtasks /Run /TN "%TASK_NAME%"
echo Backend DEV planifie au demarrage du serveur.
