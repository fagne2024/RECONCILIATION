# Test simple d'annulation pour identifier l'erreur 500
Write-Host "🧪 Test simple d'annulation" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan

$baseUrl = "http://localhost:8080"
$operationId = 1505

Write-Host "`n🔄 Test d'annulation de l'opération ID: $operationId" -ForegroundColor Yellow

try {
    # Récupérer l'opération avant annulation
    Write-Host "📋 Récupération de l'opération avant annulation..." -ForegroundColor Gray
    $operationAvant = Invoke-RestMethod -Uri "$baseUrl/api/operations/$operationId" -Method GET
    Write-Host "   Type: $($operationAvant.typeOperation)" -ForegroundColor Gray
    Write-Host "   Montant: $($operationAvant.montant)" -ForegroundColor Gray
    Write-Host "   Statut: $($operationAvant.statut)" -ForegroundColor Gray
    
    # Tenter l'annulation
    Write-Host "`n🔄 Tentative d'annulation..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "$baseUrl/api/operations/$operationId/cancel" -Method PUT -ContentType "application/json"
    Write-Host "   ✅ Annulation réussie: $response" -ForegroundColor Green
    
} catch {
    Write-Host "`n❌ Erreur lors de l'annulation:" -ForegroundColor Red
    Write-Host "   Message: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        try {
            $errorStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorStream)
            $errorBody = $reader.ReadToEnd()
            Write-Host "   Détails: $errorBody" -ForegroundColor Red
        } catch {
            Write-Host "   Impossible de lire les détails de l'erreur" -ForegroundColor Red
        }
    }
}

Write-Host "`n✅ Test terminé" -ForegroundColor Cyan
