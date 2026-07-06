@echo off
REM Demarrage minimal : cmd -> java.exe (sans PowerShell)
cd /d "%~dp0"

if not exist "target\csv-reconciliation-1.0.0.jar" (
    echo JAR absent. Compilation...
    call mvn package -DskipTests -q
    if errorlevel 1 exit /b 1
)

netstat -ano | findstr ":8443.*LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo ERREUR: port 8443 deja occupe.
    echo Lancez stop-backend.ps1 puis reessayez.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   ReconciliApp - java -jar (cmd direct)
echo   NE FERMEZ PAS cette fenetre
echo ========================================
echo.

java -Xms512m -Xmx4096m -Xss512k ^
  -XX:MaxMetaspaceSize=512m -XX:MaxDirectMemorySize=512m ^
  -XX:+UseG1GC -XX:+UseStringDeduplication ^
  -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=./logs/heap-dump.hprof ^
  -XX:ErrorFile=./logs/hs_err_jvm.log ^
  -Djava.awt.headless=true ^
  -jar target\csv-reconciliation-1.0.0.jar

echo.
echo Backend arrete (code %ERRORLEVEL%)
pause
