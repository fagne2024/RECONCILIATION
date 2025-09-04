# Script de correction frontend pour les règles de traitement des colonnes
# Problème : Les règles ne sont pas sauvegardées correctement

Write-Host "🔧 CORRECTION FRONTEND - RÈGLES DE TRAITEMENT DES COLONNES" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan

# Chemin vers le fichier à modifier
$componentFile = "reconciliation-app/frontend/src/app/components/auto-processing-models/auto-processing-models.component.ts"

Write-Host "`n📋 Fichier à modifier: $componentFile" -ForegroundColor Yellow

# 1. Vérifier que le fichier existe
if (-not (Test-Path $componentFile)) {
    Write-Host "❌ ERREUR: Le fichier $componentFile n'existe pas!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Fichier trouvé" -ForegroundColor Green

# 2. Créer une sauvegarde
$backupFile = "$componentFile.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item $componentFile $backupFile
Write-Host "✅ Sauvegarde créée: $backupFile" -ForegroundColor Green

# 3. Lire le contenu actuel
$content = Get-Content $componentFile -Raw
Write-Host "✅ Contenu lu (taille: $($content.Length) caractères)" -ForegroundColor Green

# 4. Appliquer les corrections

# Correction 1: Améliorer saveColumnProcessingRule()
Write-Host "`n🔧 Correction 1: Amélioration de saveColumnProcessingRule()..." -ForegroundColor Yellow

$saveColumnProcessingRulePattern = 'saveColumnProcessingRule\(\): void \{[\s\S]*?if \(this\.columnProcessingRuleForm\.valid\) \{[\s\S]*?const ruleData = this\.columnProcessingRuleForm\.value;'

$saveColumnProcessingRuleReplacement = @"
saveColumnProcessingRule(): void {
    if (this.columnProcessingRuleForm.valid) {
      const ruleData = this.columnProcessingRuleForm.value;
      
      console.log('🔍 [DEBUG] Règle à sauvegarder:', ruleData);
      console.log('🔍 [DEBUG] Règles existantes avant ajout:', this.columnProcessingRules.length);
      
      // Validation supplémentaire pour la colonne source
      if (!ruleData.sourceColumn || ruleData.sourceColumn.trim() === '') {
        this.errorMessage = 'Veuillez sélectionner une colonne source';
        return;
      }
      
      // S'assurer que les colonnes sont à jour avec la méthode centralisée
      this.ensureModelColumnsLoaded();
      this.updateAllSectionsWithModelColumns();
      
      // Vérifier que la colonne source existe dans les colonnes disponibles (normalisées)
      const normalizedSourceColumn = this.normalizeColumnName(ruleData.sourceColumn);
      const availableColumns = [...this.availableTemplateColumns, ...this.availableColumnsForTemplate];
      
      if (!availableColumns.includes(normalizedSourceColumn) && !availableColumns.includes(ruleData.sourceColumn)) {
        this.errorMessage = `La colonne source "${ruleData.sourceColumn}" n'est pas disponible dans le modèle. Colonnes disponibles: ${availableColumns.join(', ')}`;
        return;
      }
      
      // Utiliser la colonne normalisée si elle est différente
      const finalSourceColumn = normalizedSourceColumn !== ruleData.sourceColumn ? normalizedSourceColumn : ruleData.sourceColumn;
      
      if (this.editingColumnProcessingRule === -1) {
        // Ajouter une nouvelle règle avec la colonne normalisée
        this.columnProcessingRules.push({
          ...ruleData,
          sourceColumn: finalSourceColumn
        });
        console.log('✅ [DEBUG] Nouvelle règle ajoutée. Total:', this.columnProcessingRules.length);
      } else {
        // Modifier une règle existante avec la colonne normalisée
        this.columnProcessingRules[this.editingColumnProcessingRule] = {
          ...ruleData,
          sourceColumn: finalSourceColumn
        };
        console.log('✅ [DEBUG] Règle modifiée. Total:', this.columnProcessingRules.length);
      }
      
      this.editingColumnProcessingRule = null;
      this.columnProcessingRuleForm.reset();
      this.successMessage = 'Règle de traitement sauvegardée avec colonnes normalisées';
      
      console.log('🔍 [DEBUG] Règles après modification:', this.columnProcessingRules);
      console.log('✅ Règle de traitement sauvegardée:', {
        originalColumn: ruleData.sourceColumn,
        normalizedColumn: finalSourceColumn,
        availableColumns: availableColumns.length
      });
    }
  }
"@

# Correction 2: Améliorer saveModel()
Write-Host "`n🔧 Correction 2: Amélioration de saveModel()..." -ForegroundColor Yellow

$saveModelPattern = 'savePromise\.then\(savedModel => \{[\s\S]*?// Sauvegarder les règles de traitement des colonnes si elles existent[\s\S]*?if \(this\.columnProcessingRules\.length > 0 && savedModel\.modelId\) \{'

$saveModelReplacement = @"
savePromise.then(savedModel => {
        console.log('✅ [DEBUG] Modèle sauvegardé:', savedModel);
        
        // Sauvegarder les règles de traitement des colonnes si elles existent
        if (this.columnProcessingRules.length > 0 && savedModel.modelId) {
          console.log('🔄 [DEBUG] Sauvegarde des règles pour le modèle:', savedModel.modelId);
          console.log('🔍 [DEBUG] Règles à sauvegarder:', this.columnProcessingRules);
          
          this.autoProcessingService.saveColumnProcessingRulesBatch(savedModel.modelId, this.columnProcessingRules)
            .then((savedRules) => {
              console.log('✅ [DEBUG] Règles sauvegardées avec succès:', savedRules);
              this.successMessage = `Modèle ${this.editingModel ? 'modifié' : 'créé'} avec ${this.columnProcessingRules.length} règle(s) de traitement`;
            })
            .catch(error => {
              console.error('❌ [DEBUG] Erreur lors de la sauvegarde des règles:', error);
              this.successMessage = `Modèle ${this.editingModel ? 'modifié' : 'créé'} mais erreur lors de la sauvegarde des règles`;
            });
        } else {
          console.log('ℹ️ [DEBUG] Aucune règle à sauvegarder');
          this.successMessage = `Modèle ${this.editingModel ? 'modifié' : 'créé'} avec succès`;
        }
"@

# Correction 3: Améliorer loadColumnProcessingRules()
Write-Host "`n🔧 Correction 3: Amélioration de loadColumnProcessingRules()..." -ForegroundColor Yellow

$loadColumnProcessingRulesPattern = 'loadColumnProcessingRules\(modelId: string\): void \{[\s\S]*?this\.autoProcessingService\.getColumnProcessingRules\(modelId\)[\s\S]*?\.then\(rules => \{[\s\S]*?this\.columnProcessingRules = rules;[\s\S]*?\}\)[\s\S]*?\.catch\(error => \{[\s\S]*?console\.error\([\s\S]*?this\.columnProcessingRules = \[\];[\s\S]*?\}\);[\s\S]*?\}'

$loadColumnProcessingRulesReplacement = @"
loadColumnProcessingRules(modelId: string): void {
    console.log('🔄 [DEBUG] Chargement des règles pour le modèle:', modelId);
    
    this.autoProcessingService.getColumnProcessingRules(modelId)
      .then(rules => {
        console.log('✅ [DEBUG] Règles chargées:', rules);
        this.columnProcessingRules = rules;
      })
      .catch(error => {
        console.error('❌ [DEBUG] Erreur lors du chargement des règles:', error);
        this.columnProcessingRules = [];
      });
  }
"@

# Correction 4: Ajouter des logs dans saveModel() avant la sauvegarde
Write-Host "`n🔧 Correction 4: Ajout de logs dans saveModel()..." -ForegroundColor Yellow

$saveModelBeforePattern = 'console\.log\(\'🔍 \[DEBUG\] JSON stringifié:\', JSON\.stringify\(modelData, null, 2\)\);[\s\S]*?// 🔧 SOLUTION: Supprimer l\'ancien modèle puis créer un nouveau'

$saveModelBeforeReplacement = @"
console.log('🔍 [DEBUG] JSON stringifié:', JSON.stringify(modelData, null, 2));
console.log('🔍 [DEBUG] Règles avant sauvegarde du modèle:', this.columnProcessingRules);
console.log('🔍 [DEBUG] Nombre de règles:', this.columnProcessingRules.length);

// 🔧 SOLUTION: Supprimer l'ancien modèle puis créer un nouveau
"@

# 5. Appliquer les corrections
Write-Host "`n🔧 Application des corrections..." -ForegroundColor Yellow

# Essayer d'appliquer les corrections une par une
$correctionsApplied = 0

# Correction 1
if ($content -match $saveColumnProcessingRulePattern) {
    $content = $content -replace $saveColumnProcessingRulePattern, $saveColumnProcessingRuleReplacement
    Write-Host "✅ Correction 1 appliquée" -ForegroundColor Green
    $correctionsApplied++
} else {
    Write-Host "⚠️ Correction 1 non trouvée (pattern peut-être différent)" -ForegroundColor Yellow
}

# Correction 2
if ($content -match $saveModelPattern) {
    $content = $content -replace $saveModelPattern, $saveModelReplacement
    Write-Host "✅ Correction 2 appliquée" -ForegroundColor Green
    $correctionsApplied++
} else {
    Write-Host "⚠️ Correction 2 non trouvée (pattern peut-être différent)" -ForegroundColor Yellow
}

# Correction 3
if ($content -match $loadColumnProcessingRulesPattern) {
    $content = $content -replace $loadColumnProcessingRulesPattern, $loadColumnProcessingRulesReplacement
    Write-Host "✅ Correction 3 appliquée" -ForegroundColor Green
    $correctionsApplied++
} else {
    Write-Host "⚠️ Correction 3 non trouvée (pattern peut-être différent)" -ForegroundColor Yellow
}

# Correction 4
if ($content -match $saveModelBeforePattern) {
    $content = $content -replace $saveModelBeforePattern, $saveModelBeforeReplacement
    Write-Host "✅ Correction 4 appliquée" -ForegroundColor Green
    $correctionsApplied++
} else {
    Write-Host "⚠️ Correction 4 non trouvée (pattern peut-être différent)" -ForegroundColor Yellow
}

# 6. Sauvegarder le fichier modifié
Write-Host "`n💾 Sauvegarde du fichier modifié..." -ForegroundColor Yellow
$content | Set-Content $componentFile -Encoding UTF8
Write-Host "✅ Fichier modifié sauvegardé" -ForegroundColor Green

# 7. Vérifier les modifications
Write-Host "`n📊 Résumé des modifications:" -ForegroundColor Yellow
Write-Host "   - Corrections appliquées: $correctionsApplied" -ForegroundColor White
Write-Host "   - Fichier modifié: $componentFile" -ForegroundColor White
Write-Host "   - Sauvegarde créée: $backupFile" -ForegroundColor White

# 8. Instructions de test
Write-Host "`n🧪 Instructions de test:" -ForegroundColor Yellow
Write-Host @"

1. REDÉMARRER LE FRONTEND :
   cd reconciliation-app/frontend
   npm start

2. TESTER LES RÈGLES DE TRAITEMENT :
   - Ouvrir l'interface de création/modification de modèles
   - Aller dans la section "Règles de traitement des colonnes"
   - Ajouter une nouvelle règle
   - Vérifier les logs dans la console du navigateur
   - Sauvegarder le modèle
   - Vérifier que les règles sont bien sauvegardées

3. VÉRIFIER LES LOGS :
   - Ouvrir les outils de développement (F12)
   - Aller dans l'onglet Console
   - Chercher les messages [DEBUG] pour les règles de traitement

4. TESTER LA RÉCUPÉRATION :
   - Éditer un modèle existant avec des règles
   - Vérifier que les règles sont chargées correctement

"@ -ForegroundColor White

Write-Host "`n✅ Correction frontend terminée!" -ForegroundColor Green
Write-Host "📝 Prochaines étapes:" -ForegroundColor Yellow
Write-Host "   1. Redémarrer le frontend" -ForegroundColor White
Write-Host "   2. Tester l'interface utilisateur" -ForegroundColor White
Write-Host "   3. Vérifier les logs de débogage" -ForegroundColor White
Write-Host "   4. Confirmer que les règles sont sauvegardées" -ForegroundColor White
