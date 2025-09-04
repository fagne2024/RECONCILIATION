# Script pour tester la logique de detection des cles du frontend

Write-Host "=== TEST LOGIQUE DETECTION CLES FRONTEND ===" -ForegroundColor Cyan
Write-Host ""

# Simuler les patterns de cles du frontend (CORRIGES)
$keyPatterns = @(
    @{ pattern = "numéro\s*trans\s*gu"; score = 150; name = "Numéro Trans GU" },
    @{ pattern = "external\s*id"; score = 95; name = "External ID" },
    @{ pattern = "transaction\s*id"; score = 90; name = "Transaction ID" },
    @{ pattern = "id\s*transaction"; score = 70; name = "ID Transaction" },
    @{ pattern = "n°\s*opération"; score = 80; name = "N° Opération" },
    @{ pattern = "référence"; score = 70; name = "Référence" },
    @{ pattern = "reference"; score = 65; name = "Reference" },
    @{ pattern = "numéro"; score = 60; name = "Numéro" },
    @{ pattern = "^id$"; score = 50; name = "ID" },
    @{ pattern = "code"; score = 30; name = "Code" },
    @{ pattern = "clé"; score = 25; name = "Clé" },
    @{ pattern = "key"; score = 20; name = "Key" }
)

# Simuler les colonnes TRXBO (d'apres l'image)
$trxboColumns = @(
    "ID",
    "IDTransaction",
    "téléphone client",
    "montant",
    "Service",
    "Moyen de Paiement",
    "Agence",
    "Agent",
    "Type agent",
    "PIXI",
    "Date",
    "Numéro Trans GU",
    "GRX",
    "Statut",
    "Latitude",
    "Longitude",
    "ID Partenaire DIST",
    "Expéditeur",
    "Pays provenance",
    "Bénéficiaire",
    "Canal de distribution"
)

# Simuler les colonnes OPPART (d'apres l'image)
$oppartColumns = @(
    "ID Opération",
    "Type Opération",
    "Montant",
    "Solde avant",
    "Solde après",
    "Code proprietaire",
    "Téléphone",
    "Statut",
    "ID Transaction",
    "Num bordereau",
    "Date opération",
    "Date de versement",
    "Banque appro",
    "Login demandeur Appro",
    "Login valideur Appro",
    "Motif rejet",
    "Frais connexion",
    "Numéro Trans GU",
    "Agent",
    "Motif régularisation",
    "groupe de réseau"
)

Write-Host "=== COLONNES TRXBO ===" -ForegroundColor Yellow
foreach ($col in $trxboColumns) {
    Write-Host "  - $col" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== COLONNES OPPART ===" -ForegroundColor Yellow
foreach ($col in $oppartColumns) {
    Write-Host "  - $col" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== TEST DETECTION CLES ===" -ForegroundColor Yellow

# Fonction pour simuler la detection des cles
function Test-KeyDetection {
    param($columns, $fileName)
    
    Write-Host "Test pour $($fileName):" -ForegroundColor White
    
    $scores = @()
    
    foreach ($column in $columns) {
        $bestScore = 0
        $bestPattern = ""
        
        foreach ($pattern in $keyPatterns) {
            if ($column -match $pattern.pattern) {
                if ($pattern.score -gt $bestScore) {
                    $bestScore = $pattern.score
                    $bestPattern = $pattern.name
                }
            }
        }
        
        if ($bestScore -gt 0) {
            $scores += @{
                name = $column
                score = $bestScore
                pattern = $bestPattern
            }
        }
    }
    
    # Trier par score decroissant
    $scores = $scores | Sort-Object score -Descending
    
    Write-Host "  Scores des colonnes:" -ForegroundColor Gray
    foreach ($score in $scores) {
        Write-Host "    - $($score.name): $($score.score) ($($score.pattern))" -ForegroundColor Gray
    }
    
    if ($scores.Count -gt 0) {
        $best = $scores[0]
        Write-Host "  🎯 Meilleure colonne: $($best.name) (score: $($best.score))" -ForegroundColor Green
        return $best
    }
    
    return $null
}

# Tester TRXBO
$trxboBest = Test-KeyDetection -columns $trxboColumns -fileName "TRXBO"

Write-Host ""
# Tester OPPART
$oppartBest = Test-KeyDetection -columns $oppartColumns -fileName "OPPART"

Write-Host ""
Write-Host "=== RESULTAT ===" -ForegroundColor Cyan

if ($trxboBest -and $oppartBest) {
    Write-Host "Colonnes detectees:" -ForegroundColor White
    Write-Host "  - TRXBO: $($trxboBest.name)" -ForegroundColor Gray
    Write-Host "  - OPPART: $($oppartBest.name)" -ForegroundColor Gray
    
    if ($trxboBest.name -eq "Numéro Trans GU" -and $oppartBest.name -eq "Numéro Trans GU") {
        Write-Host "✅ SUCCES: Les bonnes colonnes sont detectees!" -ForegroundColor Green
    } else {
        Write-Host "❌ PROBLEME: Mauvaises colonnes detectees!" -ForegroundColor Red
        Write-Host "  Le frontend devrait utiliser 'Numero Trans GU' pour les deux" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Erreur: Impossible de detecter les colonnes" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== DIAGNOSTIC ===" -ForegroundColor Yellow

Write-Host "Le probleme potentiel:" -ForegroundColor White
Write-Host "  - 'ID Transaction' a un score de 85" -ForegroundColor Gray
Write-Host "  - 'Numero Trans GU' a un score de 100" -ForegroundColor Gray
Write-Host "  - Mais l'ordre de detection peut varier selon l'implementation" -ForegroundColor Gray

Write-Host ""
Write-Host "=== SOLUTION ===" -ForegroundColor Green

Write-Host "1. Augmenter le score de 'Numero Trans GU' a 150" -ForegroundColor White
Write-Host "2. Reduire le score de 'ID Transaction' a 70" -ForegroundColor White
Write-Host "3. S'assurer que les cles du modele sont prioritaires" -ForegroundColor White

Write-Host ""
Write-Host "Test termine!" -ForegroundColor Cyan
