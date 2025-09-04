# Script de vérification des tables supprimées

Write-Host "🔍 Vérification de la suppression des tables..." -ForegroundColor Cyan

$checkSQL = @"
USE top20;
SHOW TABLES LIKE '%auto_processing%';
SHOW TABLES LIKE '%processing_steps%';
"@

try {
    $result = $checkSQL | mysql -u root -p top20
    Write-Host "Résultat de la vérification:" -ForegroundColor Yellow
    Write-Host $result
    
    if ($result -eq "") {
        Write-Host "✅ Les tables ont été supprimées avec succès !" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Certaines tables existent encore" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Erreur lors de la vérification: $($_.Exception.Message)" -ForegroundColor Red
}
