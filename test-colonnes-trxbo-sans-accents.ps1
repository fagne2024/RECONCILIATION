# Script pour tester que les colonnes TRXBO sont préservées sans accents ajoutés
$API_BASE_URL = "http://localhost:8080/api"

Write-Host "🧪 Test de préservation des colonnes TRXBO sans accents ajoutés" -ForegroundColor Yellow

# 1. Vérifier que le dossier watch-folder existe
Write-Host "`n📁 Vérification du dossier watch-folder..." -ForegroundColor Cyan
$watchFolder = "watch-folder"

if (Test-Path $watchFolder) {
    Write-Host "✅ Dossier watch-folder trouvé: $watchFolder" -ForegroundColor Green
    
    # Lister les fichiers Excel dans le dossier
    $excelFiles = Get-ChildItem -Path $watchFolder -Filter "*.xls*" | Where-Object { !$_.PSIsContainer }
    Write-Host "📊 Fichiers Excel trouvés: $($excelFiles.Count)" -ForegroundColor Green
    
    foreach ($file in $excelFiles) {
        Write-Host "📄 Fichier Excel: $($file.Name)" -ForegroundColor Cyan
    }
} else {
    Write-Host "❌ Dossier watch-folder manquant: $watchFolder" -ForegroundColor Red
}

# 2. Tester l'endpoint de récupération des fichiers disponibles
Write-Host "`n🔍 Test de l'endpoint /file-watcher/available-files..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/file-watcher/available-files" -Method GET
    Write-Host "✅ Réponse reçue:" -ForegroundColor Green
    Write-Host "📊 Nombre de fichiers: $($response.Count)" -ForegroundColor Green
    
    # Chercher spécifiquement le fichier TRXBO
    $trxboFile = $response | Where-Object { $_.fileName -like "*TRXBO*" } | Select-Object -First 1
    
    if ($trxboFile) {
        Write-Host "`n📄 Fichier TRXBO trouvé: $($trxboFile.fileName)" -ForegroundColor Cyan
        Write-Host "📊 Colonnes détectées: $($trxboFile.columns.Count)" -ForegroundColor Green
        
        # Vérifier les colonnes TRXBO spécifiques
        $colonnesTRXBO = @(
            "ID",
            "IDTransaction", 
            "telephone client",  # Sans accent
            "montant",
            "Service",
            "Moyen de Paiement",
            "Agence",
            "Agent",
            "Type agent",
            "PIXI",
            "Date",
            "Numero Trans GU",   # Sans accent
            "GRX",
            "Statut",
            "Latitude",
            "Longitude",
            "ID Partenaire DIST",
            "Expediteur",        # Sans accent
            "Pays provenance",
            "Beneficiaire",      # Sans accent
            "Canal de distribution"
        )
        
        Write-Host "`n🔍 Vérification des colonnes TRXBO attendues (sans accents):" -ForegroundColor Cyan
        foreach ($colonneAttendue in $colonnesTRXBO) {
            $trouvee = $trxboFile.columns | Where-Object { $_ -eq $colonneAttendue }
            if ($trouvee) {
                Write-Host "✅ $colonneAttendue" -ForegroundColor Green
            } else {
                Write-Host "❌ $colonneAttendue (manquante)" -ForegroundColor Red
            }
        }
        
        Write-Host "`n📋 Toutes les colonnes du fichier TRXBO:" -ForegroundColor Cyan
        foreach ($colonne in $trxboFile.columns) {
            Write-Host "   $colonne" -ForegroundColor Gray
        }
        
        # Vérifier s'il y a des accents ajoutés automatiquement
        Write-Host "`n🔍 Vérification des accents ajoutés automatiquement:" -ForegroundColor Cyan
        $colonnesAvecAccents = $trxboFile.columns | Where-Object { 
            $_ -like "*é*" -or $_ -like "*è*" -or $_ -like "*à*" -or $_ -like "*â*" -or 
            $_ -like "*ê*" -or $_ -like "*î*" -or $_ -like "*ô*" -or $_ -like "*ù*" -or 
            $_ -like "*û*" -or $_ -like "*ç*" -or $_ -like "*É*" -or $_ -like "*È*" -or 
            $_ -like "*À*" -or $_ -like "*Â*" -or $_ -like "*Ê*" -or $_ -like "*Î*" -or 
            $_ -like "*Ô*" -or $_ -like "*Ù*" -or $_ -like "*Û*" -or $_ -like "*Ç*"
        }
        
        if ($colonnesAvecAccents) {
            Write-Host "⚠️ Colonnes avec accents détectées (peuvent être ajoutées automatiquement):" -ForegroundColor Yellow
            foreach ($colonne in $colonnesAvecAccents) {
                Write-Host "   $colonne" -ForegroundColor Yellow
            }
        } else {
            Write-Host "✅ Aucune colonne avec accents détectée - préservation correcte" -ForegroundColor Green
        }
        
    } else {
        Write-Host "⚠️ Aucun fichier TRXBO trouvé dans les fichiers disponibles" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Erreur lors de la récupération des fichiers: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Tester l'analyse d'un fichier TRXBO spécifique
Write-Host "`n🔍 Test de l'analyse d'un fichier TRXBO..." -ForegroundColor Cyan
try {
    if ($trxboFile) {
        Write-Host "📄 Analyse du fichier TRXBO: $($trxboFile.fileName)" -ForegroundColor Cyan
        
        $analyzeResponse = Invoke-RestMethod -Uri "$API_BASE_URL/file-watcher/analyze-file" -Method POST -Body (@{
            filePath = $trxboFile.filePath
        } | ConvertTo-Json) -ContentType "application/json"
        
        Write-Host "✅ Analyse terminée:" -ForegroundColor Green
        Write-Host "📊 Colonnes: $($analyzeResponse.columns.Count)" -ForegroundColor Green
        Write-Host "📊 Données d'exemple: $($analyzeResponse.sampleData.Count) lignes" -ForegroundColor Green
        Write-Host "📊 Enregistrements totaux: $($analyzeResponse.recordCount)" -ForegroundColor Green
        
        Write-Host "`n📋 Colonnes après analyse:" -ForegroundColor Cyan
        foreach ($colonne in $analyzeResponse.columns) {
            Write-Host "   $colonne" -ForegroundColor Gray
        }
    } else {
        Write-Host "⚠️ Aucun fichier TRXBO trouvé pour l'analyse" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Erreur lors de l'analyse: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n✅ Test terminé!" -ForegroundColor Green
