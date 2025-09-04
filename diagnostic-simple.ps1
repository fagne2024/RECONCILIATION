# Script de diagnostic simple des fichiers
Write-Host "🔍 Diagnostic Simple des Fichiers" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Fonction pour analyser un fichier
function Analyze-File {
    param($filePath, $fileName)
    
    Write-Host "`n📄 Analyse du fichier: $fileName" -ForegroundColor Yellow
    Write-Host "=================================" -ForegroundColor Yellow
    
    try {
        # Lire les premières lignes
        $content = Get-Content -Path $filePath -Encoding UTF8 -TotalCount 5
        
        if ($content.Count -eq 0) {
            Write-Host "❌ Fichier vide ou inaccessible" -ForegroundColor Red
            return $null
        }
        
        # Analyser les en-têtes
        $headers = $content[0] -split ','
        $headers = $headers | ForEach-Object { $_.Trim('"').Trim() }
        
        Write-Host "📋 En-têtes trouvés ($($headers.Count)):" -ForegroundColor Green
        for ($i = 0; $i -lt $headers.Count; $i++) {
            Write-Host "  $i`: '$($headers[$i])'" -ForegroundColor Gray
        }
        
        # Vérifier les colonnes importantes
        $hasNumeroTransGU = $headers -contains "Numéro Trans GU"
        $hasToken = $headers -contains "token"
        $hasID = $headers -contains "ID"
        $hasIDTransaction = $headers -contains "IDTransaction"
        $hasMontant = $headers -contains "Montant"
        
        Write-Host "`n🔑 Colonnes importantes:" -ForegroundColor Yellow
        Write-Host "  Numéro Trans GU: $(if ($hasNumeroTransGU) { "✅" } else { "❌" })" -ForegroundColor $(if ($hasNumeroTransGU) { "Green" } else { "Red" })
        Write-Host "  token: $(if ($hasToken) { "✅" } else { "❌" })" -ForegroundColor $(if ($hasToken) { "Green" } else { "Red" })
        Write-Host "  ID: $(if ($hasID) { "✅" } else { "❌" })" -ForegroundColor $(if ($hasID) { "Green" } else { "Red" })
        Write-Host "  IDTransaction: $(if ($hasIDTransaction) { "✅" } else { "❌" })" -ForegroundColor $(if ($hasIDTransaction) { "Green" } else { "Red" })
        Write-Host "  Montant: $(if ($hasMontant) { "✅" } else { "❌" })" -ForegroundColor $(if ($hasMontant) { "Green" } else { "Red" })
        
        # Détection du type
        $detectedType = "INCONNU"
        if ($hasIDTransaction -and $hasNumeroTransGU) {
            $detectedType = "TRXBO"
        } elseif ($hasNumeroTransGU -and $hasMontant) {
            $detectedType = "OPPART"
        } elseif ($hasToken) {
            $detectedType = "USSDPART"
        }
        
        Write-Host "`n🎯 Type détecté: $detectedType" -ForegroundColor $(if ($detectedType -ne "INCONNU") { "Green" } else { "Red" })
        
        return @{
            headers = $headers
            detectedType = $detectedType
            hasNumeroTransGU = $hasNumeroTransGU
            hasToken = $hasToken
            hasID = $hasID
            hasIDTransaction = $hasIDTransaction
            hasMontant = $hasMontant
        }
        
    } catch {
        Write-Host "❌ Erreur lors de l'analyse: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Fonction principale
function Main {
    Write-Host "🚀 Démarrage du diagnostic..." -ForegroundColor Green
    
    # Demander les chemins
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
    $boAnalysis = Analyze-File -filePath $boPath -fileName "BO"
    
    Write-Host "`n2️⃣ Analyse du fichier Partenaire..." -ForegroundColor Yellow
    $partnerAnalysis = Analyze-File -filePath $partnerPath -fileName "Partenaire"
    
    if (-not $boAnalysis -or -not $partnerAnalysis) {
        Write-Host "❌ Impossible d'analyser un des fichiers" -ForegroundColor Red
        return
    }
    
    # Résumé
    Write-Host "`n📊 Résumé:" -ForegroundColor Cyan
    Write-Host "  BO: $($boAnalysis.detectedType)" -ForegroundColor $(if ($boAnalysis.detectedType -eq "TRXBO") { "Green" } else { "Yellow" })
    Write-Host "  Partenaire: $($partnerAnalysis.detectedType)" -ForegroundColor $(if ($partnerAnalysis.detectedType -in @("OPPART", "USSDPART")) { "Green" } else { "Yellow" })
    
    # Recommandations
    Write-Host "`n💡 Recommandations:" -ForegroundColor Cyan
    
    if ($partnerAnalysis.detectedType -eq "OPPART" -and $partnerAnalysis.hasToken) {
        Write-Host "  ⚠️ Le fichier partenaire est détecté comme OPPART mais contient 'token'" -ForegroundColor Yellow
        Write-Host "  💡 Cela explique pourquoi la réconciliation échoue" -ForegroundColor Gray
        Write-Host "  🔧 Solution: Utiliser la clé 'token' pour USSDPART" -ForegroundColor Green
    } elseif ($partnerAnalysis.detectedType -eq "USSDPART") {
        Write-Host "  ✅ Fichier USSDPART détecté correctement" -ForegroundColor Green
        Write-Host "  🔧 Utiliser la clé 'token' pour la réconciliation" -ForegroundColor Green
    } elseif ($partnerAnalysis.detectedType -eq "OPPART") {
        Write-Host "  ✅ Fichier OPPART détecté correctement" -ForegroundColor Green
        Write-Host "  🔧 Utiliser la clé 'Numéro Trans GU' pour la réconciliation" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Type de fichier partenaire non reconnu" -ForegroundColor Red
        Write-Host "  💡 Vérifier le contenu du fichier" -ForegroundColor Gray
    }
    
    Write-Host "`n✅ Diagnostic terminé!" -ForegroundColor Green
}

# Exécuter
Main
