# Script de diagnostic et correction pour l'erreur 400 lors de la suppression de modèle
# Problème identifié: model_7b1f2704-09ac-4834-b490-79a3032f646a

Write-Host "🔍 Diagnostic de l'erreur 400 - Suppression de modèle" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Yellow

$API_BASE_URL = "http://localhost:8080/api/auto-processing"

# Étape 1: Vérifier l'existence du modèle problématique
Write-Host "`n📋 Étape 1: Vérification de l'existence du modèle" -ForegroundColor Cyan
$problematicModelId = "model_7b1f2704-09ac-4834-b490-79a3032f646a"

try {
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/models/$problematicModelId" -Method GET
    Write-Host "✅ Modèle trouvé: $($response.model.name)" -ForegroundColor Green
    Write-Host "   ID: $($response.model.modelId)" -ForegroundColor Gray
    Write-Host "   Type: $($response.model.fileType)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Modèle non trouvé ou erreur d'accès" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Étape 2: Vérifier les règles de traitement des colonnes associées
Write-Host "`n📋 Étape 2: Vérification des règles de traitement des colonnes" -ForegroundColor Cyan

try {
    $rulesResponse = Invoke-RestMethod -Uri "$API_BASE_URL/models/$problematicModelId/column-rules" -Method GET
    if ($rulesResponse.success) {
        Write-Host "✅ Règles trouvées: $($rulesResponse.rules.Count) règles" -ForegroundColor Green
        foreach ($rule in $rulesResponse.rules) {
            Write-Host "   - $($rule.sourceColumn) → $($rule.targetColumn)" -ForegroundColor Gray
        }
    } else {
        Write-Host "⚠️ Aucune règle trouvée ou erreur" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Erreur lors de la récupération des règles" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# Étape 3: Tentative de suppression manuelle des règles d'abord
Write-Host "`n📋 Étape 3: Suppression manuelle des règles de traitement" -ForegroundColor Cyan

try {
    # Supprimer les règles une par une si elles existent
    $rulesResponse = Invoke-RestMethod -Uri "$API_BASE_URL/models/$problematicModelId/column-rules" -Method GET
    if ($rulesResponse.success && $rulesResponse.rules.Count -gt 0) {
        Write-Host "🗑️ Suppression de $($rulesResponse.rules.Count) règles..." -ForegroundColor Yellow
        foreach ($rule in $rulesResponse.rules) {
            try {
                Invoke-RestMethod -Uri "$API_BASE_URL/column-rules/$($rule.id)" -Method DELETE
                Write-Host "   ✅ Règle $($rule.id) supprimée" -ForegroundColor Green
            } catch {
                Write-Host "   ❌ Erreur suppression règle $($rule.id): $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "ℹ️ Aucune règle à supprimer" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️ Impossible de récupérer les règles pour suppression" -ForegroundColor Yellow
}

# Étape 4: Tentative de suppression du modèle
Write-Host "`n📋 Étape 4: Tentative de suppression du modèle" -ForegroundColor Cyan

try {
    $deleteResponse = Invoke-RestMethod -Uri "$API_BASE_URL/models/$problematicModelId" -Method DELETE
    if ($deleteResponse.success) {
        Write-Host "✅ Modèle supprimé avec succès!" -ForegroundColor Green
    } else {
        Write-Host "❌ Échec de la suppression du modèle" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erreur lors de la suppression du modèle" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    
    # Afficher plus de détails sur l'erreur
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Détails: $responseBody" -ForegroundColor Red
    }
}

# Étape 5: Vérification finale
Write-Host "`n📋 Étape 5: Vérification finale" -ForegroundColor Cyan

try {
    $finalCheck = Invoke-RestMethod -Uri "$API_BASE_URL/models" -Method GET
    Write-Host "✅ Modèles restants: $($finalCheck.models.Count)" -ForegroundColor Green
    foreach ($model in $finalCheck.models) {
        Write-Host "   - $($model.name) (ID: $($model.modelId))" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Erreur lors de la vérification finale" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nDiagnostic termine!" -ForegroundColor Green
