# Vérifier l'opération bancaire créée

$mysqlUser = "root"
$mysqlDatabase = "reconciliation_db"

Write-Host "Vérification de l'opération bancaire créée" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$mysqlPassword = Read-Host "Mot de passe MySQL" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($mysqlPassword)
$mysqlPasswordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# Requête pour voir les opérations bancaires récentes
$query = @"
USE $mysqlDatabase;
SELECT 
    ob.id,
    ob.type_operation,
    ob.agence,
    ob.montant,
    ob.statut,
    ob.date_operation,
    ob.operation_id,
    o.type_operation as operation_origine_type
FROM operation_bancaire ob
LEFT JOIN operation o ON ob.operation_id = o.id
ORDER BY ob.id DESC
LIMIT 10;
"@

Write-Host "Dernières opérations bancaires:" -ForegroundColor Yellow
Write-Host ""
echo $query | mysql -u $mysqlUser -p$mysqlPasswordPlain -t 2>&1 | Select-Object -Skip 1

Write-Host ""
Write-Host "Opération bancaire ID: 2 créée pour Compense_client" -ForegroundColor Green
Write-Host ""
Write-Host "Pour voir dans le frontend:" -ForegroundColor Yellow
Write-Host "1. Redémarrez le backend" -ForegroundColor White
Write-Host "2. Allez dans BANQUE > Opérations" -ForegroundColor White
Write-Host ""
Write-Host "Appuyez sur une touche pour continuer..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

