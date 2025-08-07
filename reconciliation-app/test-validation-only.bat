@echo off
echo Test de validation CSV TRX SF
echo.

echo Fichier CSV a tester:
type test-simple.csv
echo.

echo Test de validation...
curl -X POST -F "file=@test-simple.csv" http://localhost:8080/api/trx-sf/validate

echo.
echo Test termine.
pause
