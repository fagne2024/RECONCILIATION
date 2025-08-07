@echo off
echo Redemarrage du backend avec les nouvelles modifications TRX SF
echo.

echo 1. Arret des processus Java existants...
taskkill /f /im java.exe 2>nul
timeout /t 3 /nobreak >nul

echo 2. Compilation du projet...
cd backend
mvn clean compile
if %errorlevel% neq 0 (
    echo ❌ Erreur de compilation
    pause
    exit /b 1
)

echo 3. Demarrage du backend...
mvn spring-boot:run

echo.
echo Backend redemarre avec les nouvelles modifications.
pause
