# Script simple pour tester les fichiers
Write-Host "Test des fichiers" -ForegroundColor Cyan
Write-Host "=================" -ForegroundColor Cyan

# Fonction pour analyser un fichier
function Test-File {
    param($filePath, $fileName)
    
    Write-Host "`nAnalyse du fichier: $fileName" -ForegroundColor Yellow
    Write-Host "=============================" -ForegroundColor Yellow
    
    try {
        # Lire les premières lignes
        $content = Get-Content -Path $filePath -Encoding UTF8 -TotalCount 3
        
        if ($content.Count -eq 0) {
            Write-Host "Fichier vide ou inaccessible" -ForegroundColor Red
            return $null
        }
        
        # Analyser les en-têtes
        $headers = $content[0] -split ','
        $headers = $headers | ForEach-Object { $_.Trim('"').Trim() }
        
        Write-Host "En-tetes trouves ($($headers.Count)):" -ForegroundColor Green
        for ($i = 0; $i -lt $headers.Count; $i++) {
            Write-Host "  $i`: '$($headers[$i])'" -ForegroundColor Gray
        }
        
        # Vérifier les colonnes importantes
        $hasNumeroTransGU = $headers -contains "Numéro Trans GU"
        $hasToken = $headers -contains "token"
        $hasID = $headers -contains "ID"
        $hasIDTransaction = $headers -contains "IDTransaction"
        $hasMontant = $headers -contains "Montant"
        
        Write-Host "`nColonnes importantes:" -ForegroundColor Yellow
        Write-Host "  Numero Trans GU: $(if ($hasNumeroTransGU) { "PRESENT" } else { "ABSENT" })" -ForegroundColor $(if ($hasNumeroTransGU) { "Green" } else { "Red" })
        Write-Host "  token: $(if ($hasToken) { "PRESENT" } else { "ABSENT" })" -ForegroundColor $(if ($hasToken) { "Green" } else { "Red" })
        Write-Host "  ID: $(if ($hasID) { "PRESENT" } else { "ABSENT" })" -ForegroundColor $(if ($hasID) { "Green" } else { "Red" })
        Write-Host "  IDTransaction: $(if ($hasIDTransaction) { "PRESENT" } else { "ABSENT" })" -ForegroundColor $(if ($hasIDTransaction) { "Green" } else { "Red" })
        Write-Host "  Montant: $(if ($hasMontant) { "PRESENT" } else { "ABSENT" })" -ForegroundColor $(if ($hasMontant) { "Green" } else { "Red" })
        
        # Détection du type
        $detectedType = "INCONNU"
        if ($hasIDTransaction -and $hasNumeroTransGU) {
            $detectedType = "TRXBO"
        } elseif ($hasNumeroTransGU -and $hasMontant) {
            $detectedType = "OPPART"
        } elseif ($hasToken) {
            $detectedType = "USSDPART"
        }
        
        Write-Host "`nType detecte: $detectedType" -ForegroundColor $(if ($detectedType -ne "INCONNU") { "Green" } else { "Red" })
        
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
        Write-Host "Erreur lors de l'analyse: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Fonction principale
function Main {
    Write-Host "Demarrage du test..." -ForegroundColor Green
    
    # Demander les chemins
    Write-Host "`nVeuillez fournir les chemins des fichiers:" -ForegroundColor Cyan
    
    $boPath = Read-Host "Chemin du fichier BO (ex: C:\temp\TRXBO.csv)"
    $partnerPath = Read-Host "Chemin du fichier Partenaire (ex: C:\temp\USSDPART.csv)"
    
    # Vérifier que les fichiers existent
    if (-not (Test-Path $boPath)) {
        Write-Host "Fichier BO introuvable: $boPath" -ForegroundColor Red
        return
    }
    
    if (-not (Test-Path $partnerPath)) {
        Write-Host "Fichier Partenaire introuvable: $partnerPath" -ForegroundColor Red
        return
    }
    
    # Analyser les fichiers
    Write-Host "`n1. Analyse du fichier BO..." -ForegroundColor Yellow
    $boAnalysis = Test-File -filePath $boPath -fileName "BO"
    
    Write-Host "`n2. Analyse du fichier Partenaire..." -ForegroundColor Yellow
    $partnerAnalysis = Test-File -filePath $partnerPath -fileName "Partenaire"
    
    if (-not $boAnalysis -or -not $partnerAnalysis) {
        Write-Host "Impossible d'analyser un des fichiers" -ForegroundColor Red
        return
    }
    
    # Résumé
    Write-Host "`nResume:" -ForegroundColor Cyan
    Write-Host "  BO: $($boAnalysis.detectedType)" -ForegroundColor $(if ($boAnalysis.detectedType -eq "TRXBO") { "Green" } else { "Yellow" })
    Write-Host "  Partenaire: $($partnerAnalysis.detectedType)" -ForegroundColor $(if ($partnerAnalysis.detectedType -in @("OPPART", "USSDPART")) { "Green" } else { "Yellow" })
    
    # Recommandations
    Write-Host "`nRecommandations:" -ForegroundColor Cyan
    
    if ($partnerAnalysis.detectedType -eq "OPPART" -and $partnerAnalysis.hasToken) {
        Write-Host "  Le fichier partenaire est detecte comme OPPART mais contient 'token'" -ForegroundColor Yellow
        Write-Host "  Cela explique pourquoi la reconciliation echoue" -ForegroundColor Gray
        Write-Host "  Solution: Utiliser la cle 'token' pour USSDPART" -ForegroundColor Green
    } elseif ($partnerAnalysis.detectedType -eq "USSDPART") {
        Write-Host "  Fichier USSDPART detecte correctement" -ForegroundColor Green
        Write-Host "  Utiliser la cle 'token' pour la reconciliation" -ForegroundColor Green
    } elseif ($partnerAnalysis.detectedType -eq "OPPART") {
        Write-Host "  Fichier OPPART detecte correctement" -ForegroundColor Green
        Write-Host "  Utiliser la cle 'Numero Trans GU' pour la reconciliation" -ForegroundColor Green
    } else {
        Write-Host "  Type de fichier partenaire non reconnu" -ForegroundColor Red
        Write-Host "  Verifier le contenu du fichier" -ForegroundColor Gray
    }
    
    Write-Host "`nTest termine!" -ForegroundColor Green
}

# Exécuter
Main
