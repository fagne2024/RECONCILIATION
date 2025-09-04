# Script simple pour tester les colonnes TRXBO
$API_BASE_URL = "http://localhost:8080/api"

Write-Host "Test des colonnes TRXBO" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/file-watcher/available-files" -Method GET
    Write-Host "Nombre de fichiers: $($response.Count)" -ForegroundColor Green
    
    Write-Host "Fichiers disponibles:" -ForegroundColor Cyan
    foreach ($file in $response) {
        Write-Host "  $($file.fileName)" -ForegroundColor Gray
    }
    
    $trxboFile = $response | Where-Object { $_.fileName -like "*TRXBO*" } | Select-Object -First 1
    
    if ($trxboFile) {
        Write-Host "Fichier TRXBO trouve: $($trxboFile.fileName)" -ForegroundColor Cyan
        Write-Host "Colonnes:" -ForegroundColor Green
        foreach ($colonne in $trxboFile.columns) {
            Write-Host "  $colonne" -ForegroundColor Gray
        }
    } else {
        Write-Host "Aucun fichier TRXBO trouve" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "Test termine!" -ForegroundColor Green
