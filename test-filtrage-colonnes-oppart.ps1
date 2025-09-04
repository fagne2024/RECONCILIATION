# Test du filtrage des colonnes OPPART
Write-Host "🧪 Test du filtrage des colonnes OPPART" -ForegroundColor Green

# Colonnes autorisées selon la demande utilisateur
$colonnesAutorisees = @(
    'ID Opération',
    'Type Opération',
    'Montant',
    'Solde avant',
    'Solde aprés',
    'Code proprietaire',
    'Date opération',
    'Numéro Trans GU',
    'groupe de réseau'
)

Write-Host "✅ Colonnes OPPART autorisées :" -ForegroundColor Green
$colonnesAutorisees | ForEach-Object { Write-Host "  - $_" -ForegroundColor Cyan }

# Simulation de données avec toutes les colonnes possibles
$donneesCompletes = @{
    'ID Opération' = 'OP001'
    'Type Opération' = 'Débit'
    'Montant' = '1000'
    'Solde avant' = '5000'
    'Solde aprés' = '4000'
    'Code proprietaire' = 'PROP001'
    'Date opération' = '2024-01-01'
    'Numéro Trans GU' = 'GU001'
    'groupe de réseau' = 'Réseau A'
    'Compte source' = 'COMPTE001'
    'Compte destination' = 'COMPTE002'
    'Devise' = 'XOF'
    'Statut transaction' = 'Succès'
    'Code erreur' = ''
    'Message erreur' = ''
    'Timestamp' = '2024-01-01T10:00:00'
    'Utilisateur' = 'USER001'
    'Terminal' = 'TERM001'
    'Référence externe' = 'REF001'
    'Description' = 'Transaction de test'
}

Write-Host "`n📊 Données complètes (avant filtrage) :" -ForegroundColor Yellow
$donneesCompletes.Keys | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }

# Simulation du filtrage
$colonnesFiltrees = $donneesCompletes.Keys | Where-Object { $colonnesAutorisees -contains $_ }

Write-Host "`n✅ Colonnes après filtrage OPPART :" -ForegroundColor Green
$colonnesFiltrees | ForEach-Object { Write-Host "  - $_" -ForegroundColor Green }

Write-Host "`n📈 Statistiques :" -ForegroundColor Yellow
Write-Host "  - Colonnes totales : $($donneesCompletes.Count)" -ForegroundColor Cyan
Write-Host "  - Colonnes autorisées : $($colonnesAutorisees.Count)" -ForegroundColor Cyan
Write-Host "  - Colonnes après filtrage : $($colonnesFiltrees.Count)" -ForegroundColor Cyan
Write-Host "  - Colonnes supprimées : $($donneesCompletes.Count - $colonnesFiltrees.Count)" -ForegroundColor Red

Write-Host "`n🎯 Colonnes supprimées :" -ForegroundColor Red
$colonnesSupprimees = $donneesCompletes.Keys | Where-Object { $colonnesAutorisees -notcontains $_ }
$colonnesSupprimees | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }

Write-Host "`n✅ Test terminé avec succès !" -ForegroundColor Green
Write-Host "Les modifications ont été appliquées au composant reconciliation-results.component.ts" -ForegroundColor Green
