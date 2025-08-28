# Script pour migrer un fichier spécifique
param(
    [Parameter(Mandatory=$true)]
    [string]$FilePath
)

Write-Host "Migration du fichier: $FilePath" -ForegroundColor Green

$content = Get-Content $FilePath -Raw
$originalContent = $content

# Ajouter l'import PopupService s'il n'existe pas déjà
if ($content -notmatch "import.*PopupService") {
    $content = $content -replace "import.*from.*';", "`$0`nimport { PopupService } from '../../services/popup.service';"
}

# Ajouter PopupService au constructeur s'il n'existe pas déjà
if ($content -notmatch "private popupService: PopupService") {
    $content = $content -replace "constructor\(", "constructor(`n        private popupService: PopupService,"
}

# Remplacer les alert() par des appels au service
$content = $content -replace "alert\(message\);", "this.popupService.showInfo(message);"
$content = $content -replace "alert\(msg\);", "this.popupService.showInfo(msg);"

# Sauvegarder le fichier modifié
if ($content -ne $originalContent) {
    $content | Set-Content $FilePath
    Write-Host "Fichier modifie avec succes!" -ForegroundColor Yellow
} else {
    Write-Host "Aucune modification necessaire" -ForegroundColor Gray
}
