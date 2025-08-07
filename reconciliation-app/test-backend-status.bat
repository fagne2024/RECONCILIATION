@echo off
echo Verification du statut du backend TRX SF
echo.

echo 1. Verification des processus Java...
tasklist /fi "imagename eq java.exe" 2>nul
if %errorlevel% equ 0 (
    echo ✅ Processus Java en cours d'execution
) else (
    echo ❌ Aucun processus Java trouve
)

echo.
echo 2. Test de connectivite backend...
curl -s http://localhost:8080/api/trx-sf > nul
if %errorlevel% equ 0 (
    echo ✅ Backend accessible
) else (
    echo ❌ Backend non accessible
)

echo.
echo 3. Test de creation directe d'une transaction...
curl -X POST -H "Content-Type: application/json" -d "{\"idTransaction\":\"TRX_SF_STATUS_001\",\"telephoneClient\":\"+22112345678\",\"montant\":1000.0,\"service\":\"TRANSFERT\",\"agence\":\"AGENCE_A\",\"dateTransaction\":\"2024-01-15T10:30:00\",\"numeroTransGu\":\"GU_12345678\",\"pays\":\"SENEGAL\",\"frais\":100.0,\"commentaire\":\"Test status\"}" http://localhost:8080/api/trx-sf

echo.
echo Test termine.
pause
