@echo off
echo Test de validation TRX SF
echo.

echo 1. Test de connectivite backend...
curl -s http://localhost:8080/api/trx-sf > nul
if %errorlevel% equ 0 (
    echo ✅ Backend accessible
) else (
    echo ❌ Backend non accessible
    exit /b 1
)

echo.
echo 2. Test de validation avec fichier simple...
curl -X POST -F "file=@test-simple.csv" http://localhost:8080/api/trx-sf/validate

echo.
echo 3. Test de creation directe...
curl -X POST -H "Content-Type: application/json" -d "{\"idTransaction\":\"TRX_SF_TEST_001\",\"telephoneClient\":\"+22112345678\",\"montant\":1000.0,\"service\":\"TRANSFERT\",\"agence\":\"AGENCE_A\",\"dateTransaction\":\"2024-01-15T10:30:00\",\"numeroTransGu\":\"GU_12345678\",\"pays\":\"SENEGAL\",\"frais\":100.0,\"commentaire\":\"Test\"}" http://localhost:8080/api/trx-sf

echo.
echo Test termine.
pause
