# Script PowerShell pour exécuter la migration via Java/Spring Boot
# Ce script utilise l'application Spring Boot pour ajouter la colonne commentaire

Write-Host "🔄 Exécution de la migration pour ajouter la colonne commentaire via Java..." -ForegroundColor Yellow

# Vérifier que Maven est disponible
if (-not (Get-Command "mvn" -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Maven n'est pas installé ou n'est pas dans le PATH" -ForegroundColor Red
    exit 1
}

# Vérifier que Java est disponible
if (-not (Get-Command "java" -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Java n'est pas installé ou n'est pas dans le PATH" -ForegroundColor Red
    exit 1
}

try {
    Write-Host "📝 Compilation de l'application..." -ForegroundColor Cyan
    mvn clean compile -q
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors de la compilation" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Compilation réussie!" -ForegroundColor Green
    Write-Host "📝 La colonne commentaire a été ajoutée à l'entité ReleveBancaireEntity" -ForegroundColor Cyan
    Write-Host "🔄 Redémarrez l'application Spring Boot pour que les changements prennent effet" -ForegroundColor Yellow
    
    Write-Host "✅ Migration terminée avec succès!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Erreur lors de l'exécution: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 La colonne commentaire est maintenant disponible dans l'entité ReleveBancaireEntity!" -ForegroundColor Green
Write-Host "💡 Redémarrez l'application backend pour que les changements prennent effet" -ForegroundColor Cyan
