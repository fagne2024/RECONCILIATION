Write-Host '=== VÉRIFICATION DES OPÉRATIONS ANNULEES ===' -ForegroundColor Cyan
Write-Host ''

$sqlScript = 'verifier-operations-annulees.sql'

if (-not (Test-Path $sqlScript)) {
    Write-Host '❌ Erreur: Le fichier $sqlScript n existe pas.' -ForegroundColor Red
    exit 1
}

Write-Host '📋 Script de vérification: $sqlScript' -ForegroundColor Yellow

$sqlContent = Get-Content $sqlScript -Raw

Write-Host '📊 Contenu du script SQL:' -ForegroundColor Cyan
Write-Host $sqlContent -ForegroundColor Gray

Write-Host ''
Write-Host '📝 Instructions:' -ForegroundColor Yellow
Write-Host '1. Ouvrez votre client MySQL' -ForegroundColor White
Write-Host '2. Connectez-vous à votre base de données' -ForegroundColor White
Write-Host '3. Copiez et exécutez le contenu du fichier: $sqlScript' -ForegroundColor White
Write-Host '4. Analysez les résultats' -ForegroundColor White
Write-Host ''

Write-Host '🔍 Ce script va vous montrer:' -ForegroundColor Green
Write-Host '   • Nombre total d opérations annulées' -ForegroundColor White
Write-Host '   • Répartition par type d opération' -ForegroundColor White
Write-Host '   • Répartition par service' -ForegroundColor White
Write-Host '   • Répartition par agence' -ForegroundColor White
Write-Host '   • Répartition par mois' -ForegroundColor White
Write-Host '   • Détails des 10 dernières opérations annulées' -ForegroundColor White
Write-Host ''

$confirmation = Read-Host 'Voulez-vous continuer vers la suppression ? (oui/non)'

if ($confirmation -eq 'oui') {
    Write-Host ''
    Write-Host '🚨 ATTENTION: Suppression définitive !' -ForegroundColor Red
    Write-Host 'Cette action est irréversible.' -ForegroundColor Red
    Write-Host ''
    
    $finalConfirmation = Read-Host 'Êtes-vous ABSOLUMENT sûr ? (oui/non)'
    
    if ($finalConfirmation -eq 'oui') {
        Write-Host '✅ Lancement de la suppression...' -ForegroundColor Green
        Write-Host ''
        
        & '.\supprimer-operations-annulees.ps1'
    } else {
        Write-Host '❌ Suppression annulée.' -ForegroundColor Red
    }
} else {
    Write-Host 'ℹ️ Vérification terminée. Aucune suppression effectuée.' -ForegroundColor Yellow
}

Write-Host ''
Write-Host '=== FIN ===' -ForegroundColor Cyan 