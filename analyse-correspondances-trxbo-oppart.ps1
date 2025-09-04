# Analyse des correspondances TRXBO/OPPART
Write-Host "🔍 Analyse des correspondances TRXBO/OPPART" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Yellow

$API_BASE_URL = "http://localhost:8080/api/reconciliation"

# Étape 1: Récupérer les fichiers disponibles
Write-Host "`n📋 Étape 1: Récupération des fichiers disponibles" -ForegroundColor Cyan

try {
    $filesResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/files" -Method GET
    Write-Host "✅ Fichiers trouvés: $($filesResponse.files.Count)" -ForegroundColor Green
    
    $trxboFile = $null
    $oppartFile = $null
    
    foreach ($file in $filesResponse.files) {
        if ($file.fileName -like "*TRXBO*") {
            $trxboFile = $file
            Write-Host "   📄 TRXBO trouvé: $($file.fileName)" -ForegroundColor Green
        }
        if ($file.fileName -like "*OPPART*") {
            $oppartFile = $file
            Write-Host "   📄 OPPART trouvé: $($file.fileName)" -ForegroundColor Green
        }
    }
    
    if (-not $trxboFile) {
        Write-Host "❌ Fichier TRXBO non trouvé" -ForegroundColor Red
        exit 1
    }
    
    if (-not $oppartFile) {
        Write-Host "❌ Fichier OPPART non trouvé" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Erreur lors de la récupération des fichiers" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Étape 2: Analyser les colonnes des fichiers
Write-Host "`n📋 Étape 2: Analyse des colonnes" -ForegroundColor Cyan

Write-Host "📊 Colonnes TRXBO:" -ForegroundColor Yellow
foreach ($column in $trxboFile.columns) {
    Write-Host "   - $column" -ForegroundColor Gray
}

Write-Host "`n📊 Colonnes OPPART:" -ForegroundColor Yellow
foreach ($column in $oppartFile.columns) {
    Write-Host "   - $column" -ForegroundColor Gray
}

# Étape 3: Identifier la colonne de clé commune
Write-Host "`n📋 Étape 3: Identification de la colonne de clé commune" -ForegroundColor Cyan

$commonColumns = @()
foreach ($trxboCol in $trxboFile.columns) {
    foreach ($oppartCol in $oppartFile.columns) {
        if ($trxboCol -eq $oppartCol) {
            $commonColumns += $trxboCol
            Write-Host "   🔗 Colonne commune trouvée: $trxboCol" -ForegroundColor Green
        }
    }
}

if ($commonColumns.Count -eq 0) {
    Write-Host "❌ Aucune colonne commune trouvée" -ForegroundColor Red
    exit 1
}

# Étape 4: Analyser les valeurs de clé
Write-Host "`n📋 Étape 4: Analyse des valeurs de clé" -ForegroundColor Cyan

$keyColumn = $commonColumns[0]  # Utiliser la première colonne commune
Write-Host "🔑 Utilisation de la colonne clé: $keyColumn" -ForegroundColor Yellow

# Récupérer quelques échantillons de données pour analyse
try {
    $trxboSampleResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/files/$($trxboFile.fileName)/sample" -Method GET
    $oppartSampleResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/files/$($oppartFile.fileName)/sample" -Method GET
    
    Write-Host "📊 Échantillon TRXBO (5 premières lignes):" -ForegroundColor Yellow
    for ($i = 0; $i -lt [Math]::Min(5, $trxboSampleResponse.data.Count); $i++) {
        $record = $trxboSampleResponse.data[$i]
        $keyValue = $record.$keyColumn
        Write-Host "   Ligne $($i+1): $keyValue" -ForegroundColor Gray
    }
    
    Write-Host "`n📊 Échantillon OPPART (5 premières lignes):" -ForegroundColor Yellow
    for ($i = 0; $i -lt [Math]::Min(5, $oppartSampleResponse.data.Count); $i++) {
        $record = $oppartSampleResponse.data[$i]
        $keyValue = $record.$keyColumn
        Write-Host "   Ligne $($i+1): $keyValue" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "⚠️ Impossible de récupérer les échantillons de données" -ForegroundColor Yellow
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Étape 5: Effectuer une réconciliation de test
Write-Host "`n📋 Étape 5: Réconciliation de test" -ForegroundColor Cyan

$reconciliationRequest = @{
    boFileName = $trxboFile.fileName
    partnerFileName = $oppartFile.fileName
    boKeyColumn = $keyColumn
    partnerKeyColumn = $keyColumn
    comparisonColumns = @(
        @{
            boColumn = $keyColumn
            partnerColumn = $keyColumn
        }
    )
}

try {
    Write-Host "🔄 Lancement de la réconciliation de test..." -ForegroundColor Yellow
    $reconciliationResponse = Invoke-RestMethod -Uri "$API_BASE_URL/reconcile" -Method POST -Body ($reconciliationRequest | ConvertTo-Json -Depth 10) -ContentType "application/json"
    
    Write-Host "✅ Réconciliation terminée!" -ForegroundColor Green
    Write-Host "📊 Résultats:" -ForegroundColor Yellow
    Write-Host "   - Total TRXBO: $($reconciliationResponse.totalBoRecords)" -ForegroundColor Gray
    Write-Host "   - Total OPPART: $($reconciliationResponse.totalPartnerRecords)" -ForegroundColor Gray
    Write-Host "   - Correspondances parfaites: $($reconciliationResponse.totalMatches)" -ForegroundColor Green
    Write-Host "   - Écarts: $($reconciliationResponse.totalMismatches)" -ForegroundColor Yellow
    Write-Host "   - Uniquement TRXBO: $($reconciliationResponse.totalBoOnly)" -ForegroundColor Red
    Write-Host "   - Uniquement OPPART: $($reconciliationResponse.totalPartnerOnly)" -ForegroundColor Red
    
    # Analyser les correspondances trouvées
    if ($reconciliationResponse.matches.Count -gt 0) {
        Write-Host "`n🎯 Correspondances parfaites trouvées:" -ForegroundColor Green
        for ($i = 0; $i -lt [Math]::Min(3, $reconciliationResponse.matches.Count); $i++) {
            $match = $reconciliationResponse.matches[$i]
            Write-Host "   Match $($i+1): Clé = $($match.key)" -ForegroundColor Gray
        }
    } else {
        Write-Host "`n❌ Aucune correspondance parfaite trouvée" -ForegroundColor Red
        Write-Host "💡 Suggestions pour créer des correspondances:" -ForegroundColor Yellow
        Write-Host "   1. Vérifier que les valeurs de clé sont identiques entre TRXBO et OPPART" -ForegroundColor Gray
        Write-Host "   2. S'assurer qu'il y a exactement 2 lignes OPPART pour chaque ligne TRXBO" -ForegroundColor Gray
        Write-Host "   3. Vérifier le format des données (espaces, caractères spéciaux, etc.)" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "❌ Erreur lors de la réconciliation" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n✅ Analyse terminée!" -ForegroundColor Green
