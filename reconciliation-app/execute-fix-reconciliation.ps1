# Script PowerShell pour corriger la logique de réconciliation
# Ce script applique les corrections identifiées dans l'analyse

Write-Host "🔧 Correction de la Logique de Réconciliation" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier que Node.js est installé
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js détecté: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js n'est pas installé ou n'est pas dans le PATH" -ForegroundColor Red
    Write-Host "Veuillez installer Node.js depuis https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Vérifier que les dépendances sont installées
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installation des dépendances..." -ForegroundColor Yellow
    npm install
}

# Vérifier que le backend est en cours d'exécution
Write-Host "🔍 Vérification du backend..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET -TimeoutSec 5
    Write-Host "✅ Backend accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ Le backend n'est pas accessible sur http://localhost:8080" -ForegroundColor Red
    Write-Host "Veuillez démarrer le backend avant d'exécuter ce script" -ForegroundColor Yellow
    Write-Host "Commandes possibles:" -ForegroundColor Yellow
    Write-Host "  - cd backend && mvn spring-boot:run" -ForegroundColor Gray
    Write-Host "  - cd backend && java -jar target/reconciliation-app-*.jar" -ForegroundColor Gray
    exit 1
}

# Sauvegarde de la configuration actuelle
Write-Host "💾 Sauvegarde de la configuration actuelle..." -ForegroundColor Yellow
$backupFile = "backup-models-$(Get-Date -Format 'yyyy-MM-dd-HH-mm-ss').json"
try {
    $currentModels = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    $currentModels | ConvertTo-Json -Depth 10 | Out-File -FilePath $backupFile -Encoding UTF8
    Write-Host "✅ Sauvegarde créée: $backupFile" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Impossible de créer la sauvegarde, continuation..." -ForegroundColor Yellow
}

# Exécuter le script de correction
Write-Host "🚀 Exécution de la correction..." -ForegroundColor Yellow
Write-Host ""

try {
    node fix-reconciliation-logic.js
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "🎉 Correction terminée avec succès !" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Résumé des modifications :" -ForegroundColor Cyan
        Write-Host "  ✅ Modèle TRXBO configuré comme référence BO unique" -ForegroundColor Green
        Write-Host "  ✅ Modèles partenaires (OPPART, USSDPART) référencent TRXBO" -ForegroundColor Green
        Write-Host "  ✅ Clés de réconciliation correctement séparées" -ForegroundColor Green
        Write-Host "  ✅ Étapes de traitement configurées" -ForegroundColor Green
        Write-Host ""
        Write-Host "🔍 Vérification de la configuration..." -ForegroundColor Yellow
        
        # Vérification finale
        try {
            $finalModels = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
            Write-Host "📊 Modèles disponibles après correction:" -ForegroundColor Cyan
            foreach ($model in $finalModels.models) {
                Write-Host "  - $($model.name) ($($model.fileType))" -ForegroundColor White
                Write-Host "    Pattern: $($model.filePattern)" -ForegroundColor Gray
                if ($model.reconciliationKeys.partnerKeys) {
                    Write-Host "    Clés partenaire: $($model.reconciliationKeys.partnerKeys -join ', ')" -ForegroundColor Gray
                }
                if ($model.reconciliationKeys.boKeys) {
                    Write-Host "    Clés BO: $($model.reconciliationKeys.boKeys -join ', ')" -ForegroundColor Gray
                }
                if ($model.reconciliationKeys.boModelReferences) {
                    Write-Host "    Références BO: $($model.reconciliationKeys.boModelReferences.Count)" -ForegroundColor Gray
                }
                Write-Host ""
            }
        } catch {
            Write-Host "⚠️ Impossible de vérifier la configuration finale" -ForegroundColor Yellow
        }
        
    } else {
        Write-Host "❌ Erreur lors de la correction (code: $LASTEXITCODE)" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "❌ Erreur lors de l'exécution du script: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎯 Prochaines étapes recommandées :" -ForegroundColor Cyan
Write-Host "  1. Tester la réconciliation avec un fichier TRXBO" -ForegroundColor White
Write-Host "  2. Tester la réconciliation avec un fichier OPPART" -ForegroundColor White
Write-Host "  3. Vérifier que les résultats sont cohérents" -ForegroundColor White
Write-Host "  4. Consulter le document d'analyse pour les améliorations futures" -ForegroundColor White
Write-Host ""

Write-Host "📚 Documentation :" -ForegroundColor Cyan
Write-Host "  - Analyse complète : ANALYSE_ET_AMELIORATIONS_RECONCILIATION.md" -ForegroundColor Gray
Write-Host "  - Script de correction : fix-reconciliation-logic.js" -ForegroundColor Gray
Write-Host ""

Write-Host "✅ Script terminé avec succès !" -ForegroundColor Green
