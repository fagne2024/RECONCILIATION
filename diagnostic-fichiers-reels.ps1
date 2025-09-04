# Script de diagnostic des fichiers réels
# Ce script analyse le vrai contenu des fichiers pour comprendre la détection

Write-Host "🔍 Diagnostic des Fichiers Réels" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan

# Configuration de l'API
$API_BASE_URL = "http://localhost:8080/api"

# Fonction pour analyser un fichier en détail
function Analyze-FileDetail {
    param($filePath, $fileName)
    
    Write-Host "`n📄 Analyse détaillée du fichier: $fileName" -ForegroundColor Yellow
    Write-Host "=========================================" -ForegroundColor Yellow
    
    try {
        # Lire les premières lignes du fichier
        $content = Get-Content -Path $filePath -Encoding UTF8 -TotalCount 10
        
        if ($content.Count -eq 0) {
            Write-Host "❌ Fichier vide ou inaccessible" -ForegroundColor Red
            return $null
        }
        
        # Analyser les en-têtes
        $headers = $content[0] -split ','
        $headers = $headers | ForEach-Object { $_.Trim('"').Trim() }
        
        Write-Host "📋 En-têtes trouvés ($($headers.Count)):" -ForegroundColor Green
        for ($i = 0; $i -lt $headers.Count; $i++) {
            Write-Host "  $i: '$($headers[$i])'" -ForegroundColor Gray
        }
        
        # Analyser les données d'échantillon
        Write-Host "`n📊 Données d'échantillon (premières 3 lignes):" -ForegroundColor Yellow
        
        for ($lineIndex = 1; $lineIndex -lt [Math]::Min(4, $content.Count); $lineIndex++) {
            $line = $content[$lineIndex]
            $values = $line -split ','
            $values = $values | ForEach-Object { $_.Trim('"').Trim() }
            
            Write-Host "  Ligne $lineIndex:" -ForegroundColor Gray
            for ($i = 0; $i -lt [Math]::Min($headers.Count, $values.Count); $i++) {
                $value = if ($values[$i]) { $values[$i] } else { "(vide)" }
                Write-Host "    '$($headers[$i])': '$value'" -ForegroundColor DarkGray
            }
            Write-Host ""
        }
        
        # Détection automatique du type
        Write-Host "🔍 Détection automatique du type:" -ForegroundColor Yellow
        
        # Colonnes TRXBO
        $trxboColumns = @("IDTransaction", "téléphone client", "montant", "Service", "Numéro Trans GU")
        $trxboMatches = $headers | Where-Object { $trxboColumns -contains $_ }
        
        # Colonnes OPPART
        $oppartColumns = @("Type Opération", "Montant", "Solde avant", "Solde après", "Numéro Trans GU")
        $oppartMatches = $headers | Where-Object { $oppartColumns -contains $_ }
        
        # Colonnes USSDPART
        $ussdpartColumns = @("token", "Montant", "Date", "Statut")
        $ussdpartMatches = $headers | Where-Object { $ussdpartColumns -contains $_ }
        
        $trxboColor = if ($trxboMatches.Count -gt 0) { "Green" } else { "Gray" }
        $oppartColor = if ($oppartMatches.Count -gt 0) { "Green" } else { "Gray" }
        $ussdpartColor = if ($ussdpartMatches.Count -gt 0) { "Green" } else { "Gray" }
        
        Write-Host "  Colonnes TRXBO trouvées: $($trxboMatches -join ', ')" -ForegroundColor $trxboColor
        Write-Host "  Colonnes OPPART trouvées: $($oppartMatches -join ', ')" -ForegroundColor $oppartColor
        Write-Host "  Colonnes USSDPART trouvées: $($ussdpartMatches -join ', ')" -ForegroundColor $ussdpartColor
        
        # Détection du type
        $detectedType = "INCONNU"
        if ($trxboMatches.Count -ge 3) {
            $detectedType = "TRXBO"
        } elseif ($oppartMatches.Count -ge 2) {
            $detectedType = "OPPART"
        } elseif ($ussdpartMatches.Count -ge 2) {
            $detectedType = "USSDPART"
        }
        
        $typeColor = if ($detectedType -ne "INCONNU") { "Green" } else { "Red" }
        Write-Host "  Type détecté: $detectedType" -ForegroundColor $typeColor
        
        # Vérification des clés de réconciliation
        Write-Host "`n🔑 Vérification des clés de réconciliation:" -ForegroundColor Yellow
        
        $hasNumeroTransGU = $headers -contains "Numéro Trans GU"
        $hasToken = $headers -contains "token"
        $hasID = $headers -contains "ID"
        
        $numeroTransGUStatus = if ($hasNumeroTransGU) { "✅ Présente" } else { "❌ Absente" }
        $tokenStatus = if ($hasToken) { "✅ Présente" } else { "❌ Absente" }
        $idStatus = if ($hasID) { "✅ Présente" } else { "❌ Absente" }
        
        $numeroTransGUColor = if ($hasNumeroTransGU) { "Green" } else { "Red" }
        $tokenColor = if ($hasToken) { "Green" } else { "Red" }
        $idColor = if ($hasID) { "Green" } else { "Red" }
        
        Write-Host "  Colonne 'Numéro Trans GU': $numeroTransGUStatus" -ForegroundColor $numeroTransGUColor
        Write-Host "  Colonne 'token': $tokenStatus" -ForegroundColor $tokenColor
        Write-Host "  Colonne 'ID': $idStatus" -ForegroundColor $idColor
        
        return @{
            headers = $headers
            detectedType = $detectedType
            hasNumeroTransGU = $hasNumeroTransGU
            hasToken = $hasToken
            hasID = $hasID
            sampleData = $content[1..([Math]::Min(3, $content.Count-1))]
        }
        
    } catch {
        Write-Host "❌ Erreur lors de l'analyse: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Fonction pour tester la réconciliation avec les vraies données
function Test-RealReconciliation {
    param($boAnalysis, $partnerAnalysis)
    
    Write-Host "`n🧪 Test de réconciliation avec les vraies données..." -ForegroundColor Yellow
    
    # Déterminer les clés à utiliser
    $boKey = "Numéro Trans GU"  # Toujours pour TRXBO
    $partnerKey = if ($partnerAnalysis.hasToken) { "token" } else { "Numéro Trans GU" }
    
    Write-Host "  Clé BO: $boKey" -ForegroundColor Gray
    Write-Host "  Clé Partenaire: $partnerKey" -ForegroundColor Gray
    
    # Vérifier que les clés existent
    if (-not $boAnalysis.hasNumeroTransGU) {
        Write-Host "  ❌ Clé BO '$boKey' manquante dans le fichier BO" -ForegroundColor Red
        return $false
    }
    
    if (-not $partnerAnalysis.headers.Contains($partnerKey)) {
        Write-Host "  ❌ Clé Partenaire '$partnerKey' manquante dans le fichier partenaire" -ForegroundColor Red
        return $false
    }
    
    Write-Host "  ✅ Clés disponibles dans les deux fichiers" -ForegroundColor Green
    
    # Extraire quelques valeurs d'échantillon pour test
    $boKeyIndex = [array]::IndexOf($boAnalysis.headers, $boKey)
    $partnerKeyIndex = [array]::IndexOf($partnerAnalysis.headers, $partnerKey)
    
    $boValues = @()
    $partnerValues = @()
    
    foreach ($line in $boAnalysis.sampleData) {
        $values = $line -split ','
        $values = $values | ForEach-Object { $_.Trim('"').Trim() }
        if ($boKeyIndex -lt $values.Count) {
            $boValues += $values[$boKeyIndex]
        }
    }
    
    foreach ($line in $partnerAnalysis.sampleData) {
        $values = $line -split ','
        $values = $values | ForEach-Object { $_.Trim('"').Trim() }
        if ($partnerKeyIndex -lt $values.Count) {
            $partnerValues += $values[$partnerKeyIndex]
        }
    }
    
    Write-Host "  📊 Valeurs BO ($boKey): $($boValues -join ', ')" -ForegroundColor Gray
    Write-Host "  📊 Valeurs Partenaire ($partnerKey): $($partnerValues -join ', ')" -ForegroundColor Gray
    
    # Vérifier les correspondances
    $matches = $boValues | Where-Object { $partnerValues -contains $_ }
    
    if ($matches.Count -gt 0) {
        Write-Host "  ✅ Correspondances trouvées: $($matches -join ', ')" -ForegroundColor Green
        $score = $matches.Count / [Math]::Max($boValues.Count, $partnerValues.Count)
        Write-Host "  📈 Score de correspondance: $([Math]::Round($score * 100, 1))%" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  ❌ Aucune correspondance trouvée" -ForegroundColor Red
        return $false
    }
}

# Fonction principale
function Main {
    Write-Host "🚀 Démarrage du diagnostic des fichiers..." -ForegroundColor Green
    
    # Demander les chemins des fichiers
    Write-Host "`n📁 Veuillez fournir les chemins des fichiers:" -ForegroundColor Cyan
    
    $boPath = Read-Host "Chemin du fichier BO (ex: C:\temp\TRXBO.csv)"
    $partnerPath = Read-Host "Chemin du fichier Partenaire (ex: C:\temp\USSDPART.csv)"
    
    # Vérifier que les fichiers existent
    if (-not (Test-Path $boPath)) {
        Write-Host "❌ Fichier BO introuvable: $boPath" -ForegroundColor Red
        return
    }
    
    if (-not (Test-Path $partnerPath)) {
        Write-Host "❌ Fichier Partenaire introuvable: $partnerPath" -ForegroundColor Red
        return
    }
    
    # Analyser les fichiers
    Write-Host "`n1️⃣ Analyse du fichier BO..." -ForegroundColor Yellow
    $boAnalysis = Analyze-FileDetail -filePath $boPath -fileName "BO"
    
    Write-Host "`n2️⃣ Analyse du fichier Partenaire..." -ForegroundColor Yellow
    $partnerAnalysis = Analyze-FileDetail -filePath $partnerPath -fileName "Partenaire"
    
    if (-not $boAnalysis -or -not $partnerAnalysis) {
        Write-Host "❌ Impossible d'analyser un des fichiers" -ForegroundColor Red
        return
    }
    
    # Résumé de la détection
    Write-Host "`n📊 Résumé de la détection:" -ForegroundColor Cyan
    $boColor = if ($boAnalysis.detectedType -eq "TRXBO") { "Green" } else { "Yellow" }
    $partnerColor = if ($partnerAnalysis.detectedType -in @("OPPART", "USSDPART")) { "Green" } else { "Yellow" }
    
    Write-Host "  Fichier BO détecté comme: $($boAnalysis.detectedType)" -ForegroundColor $boColor
    Write-Host "  Fichier Partenaire détecté comme: $($partnerAnalysis.detectedType)" -ForegroundColor $partnerColor
    
    # Test de réconciliation
    Write-Host "`n3️⃣ Test de réconciliation..." -ForegroundColor Yellow
    $reconciliationPossible = Test-RealReconciliation -boAnalysis $boAnalysis -partnerAnalysis $partnerAnalysis
    
    # Recommandations
    Write-Host "`n💡 Recommandations:" -ForegroundColor Cyan
    
    if ($partnerAnalysis.detectedType -eq "OPPART" -and $partnerAnalysis.hasToken) {
        Write-Host "  ⚠️ Le fichier partenaire est détecté comme OPPART mais contient 'token'" -ForegroundColor Yellow
        Write-Host "  💡 Cela explique pourquoi la réconciliation échoue" -ForegroundColor Gray
        Write-Host "  🔧 Solution: Utiliser la clé 'token' pour USSDPART" -ForegroundColor Green
    } elseif ($partnerAnalysis.detectedType -eq "USSDPART" -and $partnerAnalysis.hasNumeroTransGU) {
        Write-Host "  ⚠️ Le fichier USSDPART contient 'Numéro Trans GU'" -ForegroundColor Yellow
        Write-Host "  💡 Cela fait que le système le détecte comme OPPART" -ForegroundColor Gray
        Write-Host "  🔧 Solution: Vérifier le contenu du fichier USSDPART" -ForegroundColor Green
    } elseif ($reconciliationPossible) {
        Write-Host "  ✅ Réconciliation possible avec les clés identifiées" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Réconciliation impossible avec les clés actuelles" -ForegroundColor Red
        Write-Host "  💡 Vérifier les données et les clés utilisées" -ForegroundColor Gray
    }
    
    Write-Host "`n✅ Diagnostic terminé!" -ForegroundColor Green
}

# Exécuter le script principal
Main
