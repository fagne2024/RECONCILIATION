# Script pour tester la correction finale de l'encodage

Write-Host "=== TEST DE CORRECTION D'ENCODAGE FINALE ===" -ForegroundColor Cyan
Write-Host ""

# Simuler les donnees avec encodage incorrect (double encodage)
$boData = @(
    @{
        "NumÃƒÂ©ro Trans GU" = "MP250701.0829.C25981"  # Double encodage UTF-8
        "montant" = "1000"
        "Date" = "2024-01-15"
    }
)

$partnerData = @(
    @{
        "NumÃƒÂ©ro Trans GU" = "MP250701.0829.C25981"  # Double encodage UTF-8
        "Amount" = "1000"
        "Date" = "2024-01-15"
    }
)

Write-Host "Donnees originales avec double encodage:" -ForegroundColor Yellow
Write-Host "  Colonnes BO: $($boData[0].Keys -join ', ')" -ForegroundColor White
Write-Host "  Colonnes Partner: $($partnerData[0].Keys -join ', ')" -ForegroundColor White

Write-Host ""
Write-Host "Simulation de la correction d'encodage (double):" -ForegroundColor Yellow

# Simuler la correction d'encodage (double)
$correctedBoColumns = @()
foreach ($col in $boData[0].Keys) {
    $corrected = $col -replace 'ÃƒÂ©', 'é'
    $correctedBoColumns += $corrected
    Write-Host "  '$col' -> '$corrected'" -ForegroundColor Gray
}

$correctedPartnerColumns = @()
foreach ($col in $partnerData[0].Keys) {
    $corrected = $col -replace 'ÃƒÂ©', 'é'
    $correctedPartnerColumns += $corrected
    Write-Host "  '$col' -> '$corrected'" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Colonnes corrigees:" -ForegroundColor Green
Write-Host "  BO: $($correctedBoColumns -join ', ')" -ForegroundColor White
Write-Host "  Partner: $($correctedPartnerColumns -join ', ')" -ForegroundColor White

Write-Host ""
Write-Host "Test de correspondance avec les cles configurees:" -ForegroundColor Yellow

# Cles configurees dans le modele OPPART
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
Write-Host "La correction d'encodage double devrait permettre de retrouver" -ForegroundColor White
Write-Host "les cles configurees dans les modeles." -ForegroundColor White

Write-Host ""
Write-Host "Test termine!" -ForegroundColor Cyan
