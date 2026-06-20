@echo off
setlocal
echo Demarrage backend DEV (profil dev, port 8081, base top20_dev)...

cd /d "%~dp0"

if not exist "logs" mkdir logs

set JAVA_OPTS=-Xms256m -Xmx2048m -XX:MaxMetaspaceSize=384m -XX:+UseG1GC -XX:+UseStringDeduplication

if exist "target\csv-reconciliation-1.0.0.jar" (
    java %JAVA_OPTS% -Dspring.profiles.active=dev -jar target\csv-reconciliation-1.0.0.jar
) else (
    echo JAR introuvable — build Maven en cours...
    call mvn package -DskipTests -q
    if errorlevel 1 (
        echo Echec du build Maven.
        exit /b 1
    )
    java %JAVA_OPTS% -Dspring.profiles.active=dev -jar target\csv-reconciliation-1.0.0.jar
)

pause
