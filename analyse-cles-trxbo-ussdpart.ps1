# Script d'analyse des clés TRXBO et USSDPART
# Ce script analyse les vraies colonnes disponibles pour identifier la bonne clé de réconciliation

Write-Host "🔍 Analyse des clés TRXBO et USSDPART" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Configuration
$API_BASE_URL = "http://localhost:8080/api"

# Fonction pour analyser les colonnes d'un fichier
function Analyze-FileColumns {
    param($filePath, $fileName)
    
    Write-Host "📄 Analyse du fichier: $fileName" -ForegroundColor Yellow
    
    try {
        # Lire les premières lignes du fichier pour identifier les colonnes
        $content = Get-Content -Path $filePath -Encoding UTF8 -TotalCount 5
        
        if ($content.Count -eq 0) {
            Write-Host "❌ Fichier vide ou inaccessible" -ForegroundColor Red
            return $null
        }
        
        # Analyser les en-têtes (première ligne)
        $headers = $content[0] -split ','
        $headers = $headers | ForEach-Object { $_.Trim('"').Trim() }
        
        Write-Host "📋 Colonnes trouvées ($($headers.Count)):" -ForegroundColor Green
        for ($i = 0; $i -lt $headers.Count; $i++) {
            Write-Host "  $i: $($headers[$i])" -ForegroundColor Gray
        }
        
        # Analyser quelques lignes de données pour identifier les patterns
        Write-Host "`n📊 Analyse des données (premières 3 lignes):" -ForegroundColor Yellow
        
        for ($lineIndex = 1; $lineIndex -lt [Math]::Min(4, $content.Count); $lineIndex++) {
            $line = $content[$lineIndex]
            $values = $line -split ','
            $values = $values | ForEach-Object { $_.Trim('"').Trim() }
            
            Write-Host "  Ligne $lineIndex:" -ForegroundColor Gray
            for ($i = 0; $i -lt [Math]::Min($headers.Count, $values.Count); $i++) {
                $value = if ($values[$i]) { $values[$i] } else { "(vide)" }
                Write-Host "    $($headers[$i]): $value" -ForegroundColor DarkGray
            }
            Write-Host ""
        }
        
        return @{
            headers = $headers
            sampleData = $content[1..([Math]::Min(3, $content.Count-1))]
        }
    } catch {
        Write-Host "❌ Erreur lors de l'analyse du fichier: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Fonction pour identifier les clés potentielles
function Find-PotentialKeys {
    param($trxboAnalysis, $ussdpartAnalysis)
    
    Write-Host "🔑 Identification des clés potentielles..." -ForegroundColor Yellow
    
    $potentialKeys = @()
    
    # Chercher des colonnes communes
    $commonColumns = $trxboAnalysis.headers | Where-Object { $ussdpartAnalysis.headers -contains $_ }
    
    if ($commonColumns.Count -gt 0) {
        Write-Host "✅ Colonnes communes trouvées:" -ForegroundColor Green
        foreach ($column in $commonColumns) {
            Write-Host "  - $column" -ForegroundColor Gray
            $potentialKeys += $column
        }
    } else {
        Write-Host "⚠️ Aucune colonne commune trouvée" -ForegroundColor Yellow
    }
    
    # Chercher des colonnes avec des noms similaires
    Write-Host "`n🔍 Recherche de colonnes similaires..." -ForegroundColor Yellow
    
    $similarColumns = @()
    
    foreach ($trxboCol in $trxboAnalysis.headers) {
        foreach ($ussdpartCol in $ussdpartAnalysis.headers) {
            # Normaliser les noms pour la comparaison
            $trxboNormalized = $trxboCol.ToLower() -replace '[^a-z0-9]', ''
            $ussdpartNormalized = $ussdpartCol.ToLower() -replace '[^a-z0-9]', ''
            
            if ($trxboNormalized -eq $ussdpartNormalized -and $trxboCol -ne $ussdpartCol) {
                $similarColumns += @{
                    trxbo = $trxboCol
                    ussdpart = $ussdpartCol
                    normalized = $trxboNormalized
                }
            }
        }
    }
    
    if ($similarColumns.Count -gt 0) {
        Write-Host "✅ Colonnes similaires trouvées:" -ForegroundColor Green
        foreach ($similar in $similarColumns) {
            Write-Host "  - TRXBO: $($similar.trxbo) ↔ USSDPART: $($similar.ussdpart)" -ForegroundColor Gray
            $potentialKeys += $similar.trxbo
            $potentialKeys += $similar.ussdpart
        }
    }
    
    # Chercher des colonnes avec des patterns de clés
    $keyPatterns = @(
        'id', 'transaction', 'reference', 'numero', 'code', 'key', 'cle',
        'external', 'internal', 'unique', 'primary', 'identifier'
    )
    
    Write-Host "`n🎯 Recherche de colonnes avec patterns de clés..." -ForegroundColor Yellow
    
    $keyPatternColumns = @()
    
    foreach ($pattern in $keyPatterns) {
        $trxboMatches = $trxboAnalysis.headers | Where-Object { $_.ToLower() -like "*$pattern*" }
        $ussdpartMatches = $ussdpartAnalysis.headers | Where-Object { $_.ToLower() -like "*$pattern*" }
        
        if ($trxboMatches.Count -gt 0 -or $ussdpartMatches.Count -gt 0) {
            Write-Host "  Pattern '$pattern':" -ForegroundColor Gray
            if ($trxboMatches.Count -gt 0) {
                Write-Host "    TRXBO: $($trxboMatches -join ', ')" -ForegroundColor DarkGray
                $keyPatternColumns += $trxboMatches
            }
            if ($ussdpartMatches.Count -gt 0) {
                Write-Host "    USSDPART: $($ussdpartMatches -join ', ')" -ForegroundColor DarkGray
                $keyPatternColumns += $ussdpartMatches
            }
        }
    }
    
    $potentialKeys += $keyPatternColumns | Sort-Object -Unique
    
    return @{
        commonColumns = $commonColumns
        similarColumns = $similarColumns
        keyPatternColumns = $keyPatternColumns | Sort-Object -Unique
        allPotentialKeys = $potentialKeys | Sort-Object -Unique
    }
}

# Fonction pour tester la réconciliation avec différentes clés
function Test-ReconciliationWithKeys {
    param($trxboAnalysis, $ussdpartAnalysis, $potentialKeys)
    
    Write-Host "`n🧪 Test de réconciliation avec différentes clés..." -ForegroundColor Yellow
    
    $results = @()
    
    foreach ($key in $potentialKeys.allPotentialKeys) {
        Write-Host "`n🔍 Test avec la clé: $key" -ForegroundColor Cyan
        
        # Vérifier si la clé existe dans les deux fichiers
        $trxboHasKey = $trxboAnalysis.headers -contains $key
        $ussdpartHasKey = $ussdpartAnalysis.headers -contains $key
        
        if ($trxboHasKey -and $ussdpartHasKey) {
            Write-Host "  ✅ Clé présente dans les deux fichiers" -ForegroundColor Green
            
            # Analyser les valeurs de la clé dans les deux fichiers
            $trxboValues = @()
            $ussdpartValues = @()
            
            # Extraire les valeurs de la clé depuis les données d'échantillon
            $keyIndexTRXBO = [array]::IndexOf($trxboAnalysis.headers, $key)
            $keyIndexUSSDPART = [array]::IndexOf($ussdpartAnalysis.headers, $key)
            
            foreach ($line in $trxboAnalysis.sampleData) {
                $values = $line -split ','
                $values = $values | ForEach-Object { $_.Trim('"').Trim() }
                if ($keyIndexTRXBO -lt $values.Count) {
                    $trxboValues += $values[$keyIndexTRXBO]
                }
            }
            
            foreach ($line in $ussdpartAnalysis.sampleData) {
                $values = $line -split ','
                $values = $values | ForEach-Object { $_.Trim('"').Trim() }
                if ($keyIndexUSSDPART -lt $values.Count) {
                    $ussdpartValues += $values[$keyIndexUSSDPART]
                }
            }
            
            Write-Host "  📊 Valeurs TRXBO: $($trxboValues -join ', ')" -ForegroundColor Gray
            Write-Host "  📊 Valeurs USSDPART: $($ussdpartValues -join ', ')" -ForegroundColor Gray
            
            # Vérifier s'il y a des correspondances
            $matches = $trxboValues | Where-Object { $ussdpartValues -contains $_ }
            
            if ($matches.Count -gt 0) {
                Write-Host "  ✅ Correspondances trouvées: $($matches -join ', ')" -ForegroundColor Green
                $score = $matches.Count / [Math]::Max($trxboValues.Count, $ussdpartValues.Count)
                Write-Host "  📈 Score de correspondance: $([Math]::Round($score * 100, 1))%" -ForegroundColor Green
            } else {
                Write-Host "  ❌ Aucune correspondance trouvée" -ForegroundColor Red
                $score = 0
            }
            
            $results += @{
                key = $key
                trxboHasKey = $trxboHasKey
                ussdpartHasKey = $ussdpartHasKey
                trxboValues = $trxboValues
                ussdpartValues = $ussdpartValues
                matches = $matches
                score = $score
            }
        } else {
            Write-Host "  ❌ Clé manquante dans un des fichiers" -ForegroundColor Red
            Write-Host "    TRXBO: $trxboHasKey" -ForegroundColor DarkGray
            Write-Host "    USSDPART: $ussdpartHasKey" -ForegroundColor DarkGray
        }
    }
    
    return $results
}

# Fonction pour recommander la meilleure clé
function Recommend-BestKey {
    param($testResults)
    
    Write-Host "`n🏆 Recommandation de la meilleure clé..." -ForegroundColor Yellow
    
    if ($testResults.Count -eq 0) {
        Write-Host "❌ Aucun test de clé effectué" -ForegroundColor Red
        return $null
    }
    
    # Trier par score de correspondance
    $sortedResults = $testResults | Sort-Object -Property score -Descending
    
    Write-Host "📊 Résultats triés par score:" -ForegroundColor Green
    
    foreach ($result in $sortedResults) {
        $scorePercent = [Math]::Round($result.score * 100, 1)
        $color = if ($result.score -gt 0.5) { "Green" } elseif ($result.score -gt 0.2) { "Yellow" } else { "Red" }
        
        Write-Host "  $($result.key): $scorePercent% ($($result.matches.Count) correspondances)" -ForegroundColor $color
    }
    
    $bestResult = $sortedResults[0]
    
    if ($bestResult.score -gt 0) {
        Write-Host "`n✅ Meilleure clé recommandée: $($bestResult.key)" -ForegroundColor Green
        Write-Host "   Score: $([Math]::Round($bestResult.score * 100, 1))%" -ForegroundColor Gray
        Write-Host "   Correspondances: $($bestResult.matches.Count)" -ForegroundColor Gray
        
        return $bestResult
    } else {
        Write-Host "`n❌ Aucune clé avec correspondances trouvée" -ForegroundColor Red
        Write-Host "   Recommandation: Vérifier les données ou utiliser une clé composite" -ForegroundColor Yellow
        
        return $null
    }
}

# Fonction principale
function Main {
    Write-Host "🚀 Démarrage de l'analyse des clés..." -ForegroundColor Green
    
    # Demander les chemins des fichiers
    Write-Host "`n📁 Veuillez fournir les chemins des fichiers:" -ForegroundColor Cyan
    
    $trxboPath = Read-Host "Chemin du fichier TRXBO (ex: C:\temp\TRXBO.csv)"
    $ussdpartPath = Read-Host "Chemin du fichier USSDPART (ex: C:\temp\USSDPART.csv)"
    
    # Vérifier que les fichiers existent
    if (-not (Test-Path $trxboPath)) {
        Write-Host "❌ Fichier TRXBO introuvable: $trxboPath" -ForegroundColor Red
        return
    }
    
    if (-not (Test-Path $ussdpartPath)) {
        Write-Host "❌ Fichier USSDPART introuvable: $ussdpartPath" -ForegroundColor Red
        return
    }
    
    # Analyser les fichiers
    Write-Host "`n1️⃣ Analyse du fichier TRXBO..." -ForegroundColor Yellow
    $trxboAnalysis = Analyze-FileColumns -filePath $trxboPath -fileName "TRXBO"
    
    Write-Host "`n2️⃣ Analyse du fichier USSDPART..." -ForegroundColor Yellow
    $ussdpartAnalysis = Analyze-FileColumns -filePath $ussdpartPath -fileName "USSDPART"
    
    if (-not $trxboAnalysis -or -not $ussdpartAnalysis) {
        Write-Host "❌ Impossible d'analyser un des fichiers" -ForegroundColor Red
        return
    }
    
    # Identifier les clés potentielles
    Write-Host "`n3️⃣ Identification des clés potentielles..." -ForegroundColor Yellow
    $potentialKeys = Find-PotentialKeys -trxboAnalysis $trxboAnalysis -ussdpartAnalysis $ussdpartAnalysis
    
    # Tester la réconciliation avec différentes clés
    Write-Host "`n4️⃣ Test de réconciliation..." -ForegroundColor Yellow
    $testResults = Test-ReconciliationWithKeys -trxboAnalysis $trxboAnalysis -ussdpartAnalysis $ussdpartAnalysis -potentialKeys $potentialKeys
    
    # Recommander la meilleure clé
    Write-Host "`n5️⃣ Recommandation..." -ForegroundColor Yellow
    $bestKey = Recommend-BestKey -testResults $testResults
    
    # Générer le script de correction
    if ($bestKey) {
        Write-Host "`n🔧 Génération du script de correction..." -ForegroundColor Yellow
        
        $correctionScript = @"
# Script de correction avec la clé recommandée: $($bestKey.key)

`$trxboModel = @{
    name = "Modèle TRXBO - Référence BO"
    filePattern = "*TRXBO*.csv"
    fileType = "bo"
    autoApply = `$true
    templateFile = "TRXBO.csv"
    reconciliationKeys = `$null
}

`$ussdpartModel = @{
    name = "Modèle USSDPART - Partenaire"
    filePattern = "*USSDPART*.csv"
    fileType = "partner"
    autoApply = `$true
    templateFile = "USSDPART.csv"
    reconciliationKeys = @{
        partnerKeys = @("$($bestKey.key)")
        boKeys = @("$($bestKey.key)")
        boModelReferences = @()
    }
}

# Utilisez ce script pour corriger la configuration
"@
        
        $correctionScript | Out-File -FilePath "correction-cles-recommandee.ps1" -Encoding UTF8
        Write-Host "✅ Script de correction généré: correction-cles-recommandee.ps1" -ForegroundColor Green
    }
    
    Write-Host "`n✅ Analyse terminée!" -ForegroundColor Green
}

# Exécuter le script principal
Main
