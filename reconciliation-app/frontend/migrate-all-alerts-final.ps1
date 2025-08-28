# Script final pour migrer tous les alert() vers les pop-ups modernes

Write-Host "Migration complete de tous les alert() vers les pop-ups modernes..." -ForegroundColor Green

# Trouver tous les fichiers TypeScript des composants
$componentFiles = Get-ChildItem -Path "src/app/components" -Recurse -Filter "*.component.ts" | Where-Object { $_.Name -notmatch "modern-popup" }

Write-Host "Trouve $($componentFiles.Count) fichiers de composants a traiter" -ForegroundColor Blue

$modifiedFiles = 0

foreach ($file in $componentFiles) {
    Write-Host "Traitement de $($file.Name)..." -ForegroundColor Magenta
    
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    # Vérifier si le fichier contient des alert()
    if ($content -match "alert\(") {
        Write-Host "  Fichier contient des alert() a migrer" -ForegroundColor Green
        
        # Ajouter l'import PopupService s'il n'existe pas déjà
        if ($content -notmatch "import.*PopupService") {
            # Trouver la dernière ligne d'import
            $lines = $content -split "`n"
            $lastImportIndex = -1
            
            for ($i = 0; $i -lt $lines.Count; $i++) {
                if ($lines[$i] -match "^import.*from.*';") {
                    $lastImportIndex = $i
                }
            }
            
            if ($lastImportIndex -ge 0) {
                # Insérer l'import PopupService après le dernier import
                $lines[$lastImportIndex] = $lines[$lastImportIndex] + "`nimport { PopupService } from '../../services/popup.service';"
                $content = $lines -join "`n"
            }
        }
        
        # Ajouter PopupService au constructeur s'il n'existe pas déjà
        if ($content -notmatch "private popupService: PopupService") {
            $content = $content -replace "constructor\(", "constructor(`n        private popupService: PopupService,"
        }
        
        # Remplacer les alert() par des appels au service
        $content = $content -replace "alert\('Erreur: ' \+ err\.error\.error\);", "this.popupService.showError('Erreur: ' + err.error.error);"
        $content = $content -replace "alert\('Erreur lors de l''ajout du frais de transaction'\);", "this.popupService.showError('Erreur lors de l''ajout du frais de transaction');"
        $content = $content -replace "alert\('Erreur lors de la mise à jour du frais de transaction'\);", "this.popupService.showError('Erreur lors de la mise à jour du frais de transaction');"
        $content = $content -replace "alert\('Veuillez remplir tous les champs obligatoires'\);", "this.popupService.showWarning('Veuillez remplir tous les champs obligatoires');"
        $content = $content -replace "alert\('Erreur lors du test du calcul'\);", "this.popupService.showError('Erreur lors du test du calcul');"
        $content = $content -replace "alert\('Aucune donnée à exporter'\);", "this.popupService.showWarning('Aucune donnée à exporter');"
        $content = $content -replace "alert\('Erreur lors de l''export CSV'\);", "this.popupService.showError('Erreur lors de l''export CSV');"
        $content = $content -replace "alert\('Erreur lors de l''export Excel'\);", "this.popupService.showError('Erreur lors de l''export Excel');"
        $content = $content -replace "alert\('Erreur lors de l''export: ' \+ \(response\.error \|\| 'Erreur inconnue'\)\);", "this.popupService.showError('Erreur lors de l''export: ' + (response.error || 'Erreur inconnue'));"
        $content = $content -replace "alert\('Erreur lors de l''export via API'\);", "this.popupService.showError('Erreur lors de l''export via API');"
        $content = $content -replace "alert\(\`Erreur lors de la réconciliation: \$\{error\.message \|\| 'Erreur inconnue'\}\`\);", "this.popupService.showError(\`Erreur lors de la réconciliation: \$\{error.message || 'Erreur inconnue'\}\`);"
        $content = $content -replace "alert\(\`Recommandation appliquée: \$\{recommendation\.description\}\`\);", "this.popupService.showSuccess(\`Recommandation appliquée: \$\{recommendation.description\}\`);"
        $content = $content -replace "alert\('Erreur lors de la création de la permission\. Veuillez réessayer\.'\);", "this.popupService.showError('Erreur lors de la création de la permission. Veuillez réessayer.');"
        $content = $content -replace "alert\('Erreur lors de la mise à jour de la permission\. Veuillez réessayer\.'\);", "this.popupService.showError('Erreur lors de la mise à jour de la permission. Veuillez réessayer.');"
        $content = $content -replace "alert\('Erreur lors de la suppression de la permission\. Veuillez réessayer\.'\);", "this.popupService.showError('Erreur lors de la suppression de la permission. Veuillez réessayer.');"
        $content = $content -replace "alert\('Vous avez cliqué sur : ' \+ label\);", "this.popupService.showInfo('Vous avez cliqué sur : ' + label);"
        $content = $content -replace "alert\('Erreur lors de la création du module\. Veuillez réessayer\.'\);", "this.popupService.showError('Erreur lors de la création du module. Veuillez réessayer.');"
        $content = $content -replace "alert\('Erreur lors de la mise à jour du module\. Veuillez réessayer\.'\);", "this.popupService.showError('Erreur lors de la mise à jour du module. Veuillez réessayer.');"
        $content = $content -replace "alert\('Erreur lors de la suppression du module\. Veuillez réessayer\.'\);", "this.popupService.showError('Erreur lors de la suppression du module. Veuillez réessayer.');"
        $content = $content -replace "alert\('Erreur lors de la suppression du profil\. Veuillez réessayer\.'\);", "this.popupService.showError('Erreur lors de la suppression du profil. Veuillez réessayer.');"
        $content = $content -replace "alert\('Export terminé avec succès !'\);", "this.popupService.showSuccess('Export terminé avec succès !');"
        $content = $content -replace "alert\('Erreur lors de l''export des données'\);", "this.popupService.showError('Erreur lors de l''export des données');"
        $content = $content -replace "alert\('Impossible de valider cette opération\. Le solde du compte est insuffisant\.'\);", "this.popupService.showWarning('Impossible de valider cette opération. Le solde du compte est insuffisant.');"
        $content = $content -replace "alert\('Erreur lors de la validation de l''opération'\);", "this.popupService.showError('Erreur lors de la validation de l''opération');"
        $content = $content -replace "alert\('Opération annulée avec succès\. Le statut a été changé à \"Annulée\"\.'\);", "this.popupService.showSuccess('Opération annulée avec succès. Le statut a été changé à \"Annulée\".');"
        $content = $content -replace "alert\('Impossible d''annuler cette opération\.'\);", "this.popupService.showWarning('Impossible d''annuler cette opération.');"
        $content = $content -replace "alert\('Erreur lors de l''annulation de l''opération'\);", "this.popupService.showError('Erreur lors de l''annulation de l''opération');"
        $content = $content -replace "alert\('Veuillez sélectionner au moins un écart de solde\.'\);", "this.popupService.showWarning('Veuillez sélectionner au moins un écart de solde.');"
        $content = $content -replace "alert\('Veuillez sélectionner au moins un impact OP\.'\);", "this.popupService.showWarning('Veuillez sélectionner au moins un impact OP.');"
        $content = $content -replace "alert\('Veuillez sélectionner au moins une transaction\.'\);", "this.popupService.showWarning('Veuillez sélectionner au moins une transaction.');"
        $content = $content -replace "alert\('Erreur lors de la mise à jour des statuts\.'\);", "this.popupService.showError('Erreur lors de la mise à jour des statuts.');"
        $content = $content -replace "alert\('Erreur lors de la recherche des doublons\.'\);", "this.popupService.showError('Erreur lors de la recherche des doublons.');"
        $content = $content -replace "alert\('Aucun doublon à supprimer\.'\);", "this.popupService.showInfo('Aucun doublon à supprimer.');"
        $content = $content -replace "alert\(\`\$\{response\.removedCount\} doublon\(s\) supprimé\(s\) avec succès\.\`\);", "this.popupService.showSuccess(\`\$\{response.removedCount\} doublon(s) supprimé(s) avec succès.\`);"
        $content = $content -replace "alert\('Erreur lors de la suppression des doublons\.'\);", "this.popupService.showError('Erreur lors de la suppression des doublons.');"
        $content = $content -replace "alert\('❌ Aucune transaction TRX SF chargée\.'\);", "this.popupService.showWarning('❌ Aucune transaction TRX SF chargée.');"
        $content = $content -replace "alert\('❌ Les fichiers Excel ne sont pas encore supportés\. Veuillez utiliser un fichier CSV avec des séparateurs point-virgule \(;\)'\);", "this.popupService.showWarning('❌ Les fichiers Excel ne sont pas encore supportés. Veuillez utiliser un fichier CSV avec des séparateurs point-virgule (;)');"
        $content = $content -replace "alert\(\`❌ Erreur lors du traitement du fichier:\n\$\{error\}\`\);", "this.popupService.showError(\`❌ Erreur lors du traitement du fichier:\n\$\{error\}\`);"
        $content = $content -replace "alert\('❌ Erreur lors de la lecture du fichier'\);", "this.popupService.showError('❌ Erreur lors de la lecture du fichier');"
        $content = $content -replace "alert\(\`❌ Erreur lors du traitement du fichier: \$\{error\}\`\);", "this.popupService.showError(\`❌ Erreur lors du traitement du fichier: \$\{error\}\`);"
        $content = $content -replace "alert\(rapport\);", "this.popupService.showInfo(rapport);"
        $content = $content -replace "alert\(\`❌ Erreur lors de la vérification: \$\{error\}\`\);", "this.popupService.showError(\`❌ Erreur lors de la vérification: \$\{error\}\`);"
        $content = $content -replace "alert\('Format de fichier non supporté\. Veuillez choisir un fichier CSV ou Excel \(\.xls, \.xlsx, \.xlsm, \.xlsb, \.xlt, \.xltx, \.xltm\)'\);", "this.popupService.showWarning('Format de fichier non supporté. Veuillez choisir un fichier CSV ou Excel (.xls, .xlsx, .xlsm, .xlsb, .xlt, .xltx, .xltm)');"
        
        # Remplacer les alert() génériques
        $content = $content -replace "alert\(message\);", "this.popupService.showInfo(message);"
        $content = $content -replace "alert\(msg\);", "this.popupService.showInfo(msg);"
        
        # Remplacer les alert() avec templates
        $content = $content -replace "alert\(\`❌ \$\{errorMessage\}\`\);", "this.popupService.showError(\`❌ \$\{errorMessage\}\`);"
        $content = $content -replace "alert\(\`✅ \$\{.*\}\`\);", "this.popupService.showSuccess(\`✅ \$\{.*\}\`);"
        
        # Sauvegarder le fichier modifié
        if ($content -ne $originalContent) {
            $content | Set-Content $file.FullName
            $modifiedFiles++
            Write-Host "  Fichier modifie: $($file.Name)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  Aucun alert() a migrer" -ForegroundColor Gray
    }
}

Write-Host "Migration terminee !" -ForegroundColor Green
Write-Host "Fichiers modifies: $modifiedFiles" -ForegroundColor Blue
