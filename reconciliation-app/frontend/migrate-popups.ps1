# Script de migration des pop-ups pour remplacer alert() et confirm() par des pop-ups modernes
# Usage: .\migrate-popups.ps1

Write-Host "🚀 Début de la migration des pop-ups..." -ForegroundColor Green

# Fonction pour ajouter l'import PopupService si nécessaire
function Add-PopupServiceImport {
    param([string]$filePath)
    
    $content = Get-Content $filePath -Raw
    $lines = Get-Content $filePath
    
    # Vérifier si PopupService est déjà importé
    if ($content -notmatch "import.*PopupService") {
        Write-Host "  ➕ Ajout de l'import PopupService dans $filePath" -ForegroundColor Yellow
        
        # Trouver la dernière ligne d'import
        $lastImportIndex = -1
        for ($i = 0; $i -lt $lines.Count; $i++) {
            if ($lines[$i] -match "^import.*from") {
                $lastImportIndex = $i
            }
        }
        
        if ($lastImportIndex -ge 0) {
            # Insérer l'import PopupService après le dernier import
            $newLines = @()
            for ($i = 0; $i -le $lastImportIndex; $i++) {
                $newLines += $lines[$i]
            }
            $newLines += "import { PopupService } from '../../services/popup.service';"
            for ($i = ($lastImportIndex + 1); $i -lt $lines.Count; $i++) {
                $newLines += $lines[$i]
            }
            $newLines | Set-Content $filePath
        }
    }
}

# Fonction pour ajouter PopupService au constructeur si nécessaire
function Add-PopupServiceToConstructor {
    param([string]$filePath)
    
    $content = Get-Content $filePath -Raw
    $lines = Get-Content $filePath
    
    # Vérifier si PopupService est déjà dans le constructeur
    if ($content -match "PopupService" -and $content -match "constructor") {
        # Trouver la ligne du constructeur
        for ($i = 0; $i -lt $lines.Count; $i++) {
            if ($lines[$i] -match "constructor\(") {
                # Vérifier si PopupService est déjà dans les paramètres
                $constructorStart = $i
                $constructorEnd = $i
                $parenCount = 0
                $foundStart = $false
                
                for ($j = $i; $j -lt $lines.Count; $j++) {
                    $line = $lines[$j]
                    if ($line -match "constructor\(") {
                        $foundStart = $true
                        $parenCount = ($line | Select-String -Pattern "\(" -AllMatches).Matches.Count
                        $parenCount -= ($line | Select-String -Pattern "\)" -AllMatches).Matches.Count
                    } elseif ($foundStart) {
                        $parenCount += ($line | Select-String -Pattern "\(" -AllMatches).Matches.Count
                        $parenCount -= ($line | Select-String -Pattern "\)" -AllMatches).Matches.Count
                        
                        if ($parenCount -le 0) {
                            $constructorEnd = $j
                            break
                        }
                    }
                }
                
                # Vérifier si PopupService est déjà dans les paramètres
                $constructorContent = $lines[$constructorStart..$constructorEnd] -join "`n"
                if ($constructorContent -notmatch "PopupService") {
                    Write-Host "  ➕ Ajout de PopupService au constructeur dans $filePath" -ForegroundColor Yellow
                    
                    # Trouver la dernière ligne des paramètres du constructeur
                    $lastParamIndex = $constructorEnd - 1
                    while ($lastParamIndex -gt $constructorStart -and $lines[$lastParamIndex] -match "^\s*\)") {
                        $lastParamIndex--
                    }
                    
                    # Ajouter PopupService avant la fermeture des paramètres
                    $newLines = @()
                    for ($i = 0; $i -lt $lastParamIndex; $i++) {
                        $newLines += $lines[$i]
                    }
                    $newLines += $lines[$lastParamIndex] + ","
                    $newLines += "        private popupService: PopupService"
                    for ($i = ($lastParamIndex + 1); $i -lt $lines.Count; $i++) {
                        $newLines += $lines[$i]
                    }
                    $newLines | Set-Content $filePath
                }
                break
            }
        }
    }
}

# Fonction pour remplacer les alert() et confirm()
function Replace-PopupCalls {
    param([string]$filePath)
    
    $content = Get-Content $filePath -Raw
    $originalContent = $content
    
    # Remplacer les alert() par des appels au service
    $content = $content -replace 'alert\s*\(\s*([^)]+)\s*\)', 'this.popupService.showInfo($1)'
    
    # Remplacer les confirm() par des appels au service
    $content = $content -replace 'if\s*\(\s*confirm\s*\(\s*([^)]+)\s*\)\s*\)', 'const confirmed = await this.popupService.showConfirm($1); if (confirmed)'
    
    # Si le contenu a changé, sauvegarder
    if ($content -ne $originalContent) {
        Write-Host "  🔄 Remplacement des pop-ups dans $filePath" -ForegroundColor Cyan
        $content | Set-Content $filePath
        return $true
    }
    
    return $false
}

# Trouver tous les fichiers TypeScript des composants
$componentFiles = Get-ChildItem -Path "src/app/components" -Recurse -Filter "*.component.ts" | Where-Object { $_.Name -notmatch "modern-popup" }

Write-Host "📁 Trouvé $($componentFiles.Count) fichiers de composants à traiter" -ForegroundColor Blue

$modifiedFiles = 0

foreach ($file in $componentFiles) {
    Write-Host "`n🔧 Traitement de $($file.Name)..." -ForegroundColor Magenta
    
    $content = Get-Content $file.FullName -Raw
    
    # Vérifier si le fichier contient des alert() ou confirm()
    if ($content -match "alert\(" -or $content -match "confirm\(") {
        Write-Host "  ✅ Fichier contient des pop-ups à migrer" -ForegroundColor Green
        
        # Ajouter l'import PopupService
        Add-PopupServiceImport -filePath $file.FullName
        
        # Ajouter PopupService au constructeur
        Add-PopupServiceToConstructor -filePath $file.FullName
        
        # Remplacer les appels
        $wasModified = Replace-PopupCalls -filePath $file.FullName
        
        if ($wasModified) {
            $modifiedFiles++
        }
    } else {
        Write-Host "  ⏭️  Aucun pop-up à migrer" -ForegroundColor Gray
    }
}

Write-Host "`n🎉 Migration terminée !" -ForegroundColor Green
Write-Host "📊 Fichiers modifiés: $modifiedFiles" -ForegroundColor Blue
Write-Host "`n💡 Prochaines étapes:" -ForegroundColor Yellow
Write-Host "   1. Vérifier que tous les imports sont corrects" -ForegroundColor White
Write-Host "   2. Tester les pop-ups dans l'application" -ForegroundColor White
Write-Host "   3. Ajuster les types de pop-ups selon le contexte (success, error, warning, info)" -ForegroundColor White
