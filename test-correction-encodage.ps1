# Script pour tester la correction de l'encodage des caracteres

Write-Host "=== TEST DE CORRECTION D'ENCODAGE ===" -ForegroundColor Cyan
Write-Host ""

# Simuler les donnees avec encodage incorrect
$boData = @(
    @{
        "NumÃ©ro Trans GU" = "MP250701.0829.C25981"  # Encodage incorrect
        "montant" = "1000"
        "Date" = "2024-01-15"
    }
)

$partnerData = @(
    @{
        "NumÃ©ro Trans GU" = "MP250701.0829.C25981"  # Encodage incorrect
        "Amount" = "1000"
        "Date" = "2024-01-15"
    }
)

Write-Host "Donnees originales avec encodage incorrect:" -ForegroundColor Yellow
Write-Host "  Colonnes BO: $($boData[0].Keys -join ', ')" -ForegroundColor White
Write-Host "  Colonnes Partner: $($partnerData[0].Keys -join ', ')" -ForegroundColor White

Write-Host ""
Write-Host "Simulation de la correction d'encodage:" -ForegroundColor Yellow

# Simuler la correction d'encodage
$correctedBoColumns = @()
foreach ($col in $boData[0].Keys) {
    $corrected = $col -replace 'Ã©', 'é' -replace 'Ã¨', 'è' -replace 'Ã ', 'à'
    $correctedBoColumns += $corrected
    Write-Host "  '$col' -> '$corrected'" -ForegroundColor Gray
}

$correctedPartnerColumns = @()
foreach ($col in $partnerData[0].Keys) {
    $corrected = $col -replace 'Ã©', 'é' -replace 'Ã¨', 'è' -replace 'Ã ', 'à'
    $correctedPartnerColumns += $corrected
    Write-Host "  '$col' -> '$corrected'" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Colonnes corrigees:" -ForegroundColor Green
Write-Host "  BO: $($correctedBoColumns -join ', ')" -ForegroundColor White
Write-Host "  Partner: $($correctedPartnerColumns -join ', ')" -ForegroundColor White

Write-Host ""
Write-Host "Test de correspondance avec les cles configurees:" -ForegroundColor Yellow

# Cles configurees dans le modele
$configuredKeys = @("Numéro Trans GU")

foreach ($key in $configuredKeys) {
    Write-Host "  Test de la cle: '$key'" -ForegroundColor White
    
    $boMatch = $correctedBoColumns -contains $key
    $partnerMatch = $correctedPartnerColumns -contains $key
    
    if ($boMatch) {
        Write-Host "    ✅ Correspondance BO trouvee" -ForegroundColor Green
    } else {
        Write-Host "    ❌ Pas de correspondance BO" -ForegroundColor Red
    }
    
    if ($partnerMatch) {
        Write-Host "    ✅ Correspondance Partner trouvee" -ForegroundColor Green
    } else {
        Write-Host "    ❌ Pas de correspondance Partner" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== RESULTAT ===" -ForegroundColor Cyan
Write-Host "La correction d'encodage devrait permettre de retrouver" -ForegroundColor White
Write-Host "les cles configurees dans les modeles." -ForegroundColor White

Write-Host ""
Write-Host "Test termine!" -ForegroundColor Cyan
