# Script pour générer les lignes avec le nouveau client BETMM0001
# Basé sur les données existantes avec BETCL8400

# Données originales avec BETCL8400
$originalLines = @(
    "CI_CASHIN_WAVE_LONACI	BETCL8400	Frais en %	2.00%	FRAIS CI	Actif	14/09/2025 10:28	14/09/2025 10:28",
    "CASHINMOOVPART_LONACI	BETCL8400	Frais en %	2.00%	FRAIS CI	Actif	14/09/2025 10:27	14/09/2025 10:27",
    "CASHINMTNPART_LONACI	BETCL8400	Frais en %	2.00%	FRAIS CI	Actif	14/09/2025 10:27	14/09/2025 10:27",
    "CASHINOMCIPART_LONACI	BETCL8400	Frais en %	2.00%	FRAIS CI	Actif	14/09/2025 10:26	14/09/2025 10:26",
    "CI_PAIEMENTMARCHANDOM_LONACI	BETCL8400	Frais en %	4.00%	FRAIS PM	Actif	14/09/2025 10:25	14/09/2025 10:25",
    "CI_PAIEMENTWAVE_LONACI	BETCL8400	Frais en %	4.00%	FRAIS PM	Actif	14/09/2025 10:21	14/09/2025 10:21",
    "CI_PAIEMENTMARCHANDMOOV_LONACI	BETCL8400	Frais en %	4.00%	FRAIS PM	Actif	14/09/2025 10:20	14/09/2025 10:20",
    "CI_PAIEMENTMARCHAND_MTNMOMO_LONACI	BETCL8400	Frais en %	4.00%	FRAIS PM	Actif	14/09/2025 10:19	14/09/2025 10:19"
)

# Nouveau client
$newClient = "BETMM0001"

Write-Host "Génération des lignes pour le client: $newClient" -ForegroundColor Green
Write-Host "=" * 60

# Générer les nouvelles lignes
$newLines = @()
foreach ($line in $originalLines) {
    $newLine = $line -replace "BETCL8400", $newClient
    $newLines += $newLine
}

# Afficher les nouvelles lignes
Write-Host "Nouvelles lignes générées:" -ForegroundColor Yellow
Write-Host ""

foreach ($line in $newLines) {
    Write-Host $line
}

Write-Host ""
Write-Host "=" * 60

# Option pour sauvegarder dans un fichier
$saveToFile = Read-Host "Voulez-vous sauvegarder ces lignes dans un fichier? (o/n)"

if ($saveToFile -eq "o" -or $saveToFile -eq "O" -or $saveToFile -eq "oui") {
    $fileName = "lignes_client_$newClient.txt"
    $newLines | Out-File -FilePath $fileName -Encoding UTF8
    Write-Host "Lignes sauvegardées dans le fichier: $fileName" -ForegroundColor Green
}

Write-Host ""
Write-Host "Script terminé!" -ForegroundColor Green
