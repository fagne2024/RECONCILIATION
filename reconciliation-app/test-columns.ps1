Write-Host "Test de récupération des colonnes..." -ForegroundColor Green

try {
    $files = Invoke-RestMethod -Uri "http://localhost:3000/api/file-watcher/available-files" -Method GET
    Write-Host "Fichiers trouvés: $($files.Count)" -ForegroundColor Yellow
    
    foreach ($file in $files) {
        Write-Host "`nFichier: $($file.fileName)" -ForegroundColor Cyan
        Write-Host "Type: $($file.fileType)" -ForegroundColor White
        Write-Host "Colonnes: $($file.columns -join ', ')" -ForegroundColor Green
        Write-Host "Enregistrements: $($file.recordCount)" -ForegroundColor White
    }
} catch {
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
} 