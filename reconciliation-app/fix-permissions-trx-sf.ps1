# Script pour vérifier et corriger les permissions TRX SF
Write-Host "=== Vérification et correction des permissions TRX SF ===" -ForegroundColor Green

# Configuration de la base de données
$dbHost = "localhost"
$dbPort = "3306"
$dbName = "reconciliation_db"
$dbUser = "root"
$dbPassword = ""

Write-Host "`n1. Vérification des permissions actuelles..." -ForegroundColor Yellow

# Vérifier si la permission TRX SF existe
$checkPermission = @"
SELECT COUNT(*) as count FROM permission WHERE nom = 'TRX SF';
"@

try {
    $result = mysql -h $dbHost -P $dbPort -u $dbUser -p$dbPassword $dbName -e $checkPermission 2>$null
    $count = ($result -split "`n")[1]
    
    if ($count -gt 0) {
        Write-Host "✅ Permission TRX SF existe" -ForegroundColor Green
    } else {
        Write-Host "❌ Permission TRX SF n'existe pas" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erreur lors de la vérification: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n2. Vérification du lien module-permission..." -ForegroundColor Yellow

# Vérifier le lien module-permission
$checkModulePermission = @"
SELECT COUNT(*) as count 
FROM module m
JOIN module_permission mp ON m.id = mp.module_id
JOIN permission p ON mp.permission_id = p.id
WHERE m.nom = 'Suivi des écarts' AND p.nom = 'TRX SF';
"@

try {
    $result = mysql -h $dbHost -P $dbPort -u $dbUser -p$dbPassword $dbName -e $checkModulePermission 2>$null
    $count = ($result -split "`n")[1]
    
    if ($count -gt 0) {
        Write-Host "✅ Lien module-permission TRX SF existe" -ForegroundColor Green
    } else {
        Write-Host "❌ Lien module-permission TRX SF n'existe pas" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erreur lors de la vérification: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n3. Vérification du lien profil-permission..." -ForegroundColor Yellow

# Vérifier le lien profil-permission
$checkProfilPermission = @"
SELECT COUNT(*) as count 
FROM profil pr
JOIN profil_permission pp ON pr.id = pp.profil_id
JOIN permission p ON pp.permission_id = p.id
WHERE pr.nom = 'ADMIN' AND p.nom = 'TRX SF';
"@

try {
    $result = mysql -h $dbHost -P $dbPort -u $dbUser -p$dbPassword $dbName -e $checkProfilPermission 2>$null
    $count = ($result -split "`n")[1]
    
    if ($count -gt 0) {
        Write-Host "✅ Lien profil-permission TRX SF existe" -ForegroundColor Green
    } else {
        Write-Host "❌ Lien profil-permission TRX SF n'existe pas" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erreur lors de la vérification: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n4. Application des corrections si nécessaire..." -ForegroundColor Yellow

# Exécuter le script de correction
$fixScript = Get-Content "fix-permissions-trx-sf.sql" -Raw

try {
    mysql -h $dbHost -P $dbPort -u $dbUser -p$dbPassword $dbName -e $fixScript 2>$null
    Write-Host "✅ Corrections appliquées avec succès" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de l'application des corrections: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n5. Vérification finale..." -ForegroundColor Yellow

# Vérification finale
$finalCheck = @"
SELECT 
    'Permission TRX SF' as type,
    COUNT(*) as nombre
FROM permission 
WHERE nom = 'TRX SF'
UNION ALL
SELECT 
    'Lien module-permission' as type,
    COUNT(*) as nombre
FROM module m
JOIN module_permission mp ON m.id = mp.module_id
JOIN permission p ON mp.permission_id = p.id
WHERE m.nom = 'Suivi des écarts' AND p.nom = 'TRX SF'
UNION ALL
SELECT 
    'Lien profil-permission' as type,
    COUNT(*) as nombre
FROM profil pr
JOIN profil_permission pp ON pr.id = pp.profil_id
JOIN permission p ON pp.permission_id = p.id
WHERE pr.nom = 'ADMIN' AND p.nom = 'TRX SF';
"@

try {
    $result = mysql -h $dbHost -P $dbPort -u $dbUser -p$dbPassword $dbName -e $finalCheck 2>$null
    Write-Host "✅ Vérification finale réussie" -ForegroundColor Green
    Write-Host $result -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erreur lors de la vérification finale: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Vérification terminée ===" -ForegroundColor Green
Write-Host "💡 Redémarrez l'application pour que les changements prennent effet" -ForegroundColor Yellow
