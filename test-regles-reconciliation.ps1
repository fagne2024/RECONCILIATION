# Script de test pour vérifier l'intégration des règles de traitement des colonnes
Write-Host "🧪 TEST D'INTÉGRATION - RÈGLES DE TRAITEMENT DES COLONNES" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan

# 1. Vérifier que le backend est démarré
Write-Host "`n📋 1. Vérification du backend..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET -TimeoutSec 10
    Write-Host "✅ Backend accessible - $($response.Count) modèles trouvés" -ForegroundColor Green
    
    # Afficher les modèles avec leurs règles
    foreach ($model in $response) {
        $rulesCount = if ($model.columnProcessingRules) { $model.columnProcessingRules.Count } else { 0 }
        Write-Host "   - $($model.name) ($($model.fileType)): $rulesCount règles" -ForegroundColor Gray
        
        if ($rulesCount -gt 0) {
            foreach ($rule in $model.columnProcessingRules) {
                Write-Host "     * Colonne: $($rule.sourceColumn)" -ForegroundColor DarkGray
                Write-Host "       Actions: $($rule.removeSpecialChars ? 'Supprimer caractères spéciaux' : '') $($rule.trimSpaces ? 'Nettoyer espaces' : '') $($rule.toUpperCase ? 'Majuscules' : '')" -ForegroundColor DarkGray
            }
        }
    }
} catch {
    Write-Host "❌ Backend non accessible: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Test de récupération des règles pour un modèle spécifique
Write-Host "`n📋 2. Test de récupération des règles..." -ForegroundColor Yellow

try {
    # Récupérer le premier modèle partenaire
    $models = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models" -Method GET
    $partnerModels = $models | Where-Object { $_.fileType -eq "partner" }
    
    if ($partnerModels.Count -gt 0) {
        $firstModel = $partnerModels[0]
        Write-Host "✅ Test avec le modèle: $($firstModel.name)" -ForegroundColor Green
        
        # Récupérer les règles de traitement des colonnes
        $rules = Invoke-RestMethod -Uri "http://localhost:8080/api/auto-processing/models/$($firstModel.modelId)/column-rules" -Method GET
        Write-Host "✅ Règles récupérées: $($rules.Count) règles" -ForegroundColor Green
        
        foreach ($rule in $rules) {
            Write-Host "   - Règle pour $($rule.sourceColumn):" -ForegroundColor Gray
            Write-Host "     * Supprimer caractères spéciaux: $($rule.removeSpecialChars)" -ForegroundColor DarkGray
            Write-Host "     * Nettoyer espaces: $($rule.trimSpaces)" -ForegroundColor DarkGray
            Write-Host "     * Majuscules: $($rule.toUpperCase)" -ForegroundColor DarkGray
        }
    } else {
        Write-Host "⚠️ Aucun modèle partenaire trouvé" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Erreur lors de la récupération des règles: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Test de simulation de réconciliation avec règles
Write-Host "`n📋 3. Test de simulation de réconciliation..." -ForegroundColor Yellow

Write-Host @"

SIMULATION DE RÉCONCILIATION AVEC RÈGLES :

1. Chargement des données brutes
2. Application des règles de traitement des colonnes :
   - Supprimer les caractères spéciaux
   - Nettoyer les espaces
   - Convertir en majuscules
3. Réconciliation avec les données nettoyées

EXEMPLE DE TRANSFORMATION :
- Donnée brute: "  ID_CM_123  "
- Après nettoyage: "ID123"

"@ -ForegroundColor White

# 4. Instructions de test manuel
Write-Host "`n📋 4. Instructions de test manuel..." -ForegroundColor Yellow
Write-Host @"

ÉTAPES DE TEST MANUEL :

1. Créer un modèle avec des règles de traitement :
   - Aller dans "Modèles de traitement automatique"
   - Créer un nouveau modèle partenaire
   - Ajouter des règles de traitement pour "Numéro Trans GU"
   - Cocher "Supprimer les caractères spéciaux" et "Nettoyer les espaces"

2. Préparer des données de test :
   - Créer un fichier Excel avec des données brutes
   - Exemple: "  ID_CM_123  ", "  REF_ML_456  "
   - Sauvegarder dans le dossier watch-folder

3. Lancer la réconciliation :
   - Aller dans "Réconciliation"
   - Sélectionner le modèle créé
   - Lancer la réconciliation
   - Vérifier que les données sont nettoyées

4. Vérifier les logs :
   - Ouvrir la console (F12)
   - Chercher les logs de traitement des colonnes
   - Vérifier que les transformations sont appliquées

LOGS À VÉRIFIER :
- "🔍 Application des règles de traitement pour la colonne: ..."
- "✅ Donnée transformée: ... → ..."
- "📊 Règles appliquées: X transformations"

"@ -ForegroundColor White

Write-Host "`n✅ Test d'intégration terminé!" -ForegroundColor Green
