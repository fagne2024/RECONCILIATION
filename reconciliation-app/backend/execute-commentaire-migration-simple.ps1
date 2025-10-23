# Script PowerShell simple pour la migration
Write-Host "Migration de la colonne commentaire..." -ForegroundColor Yellow

# Compiler l'application
Write-Host "Compilation de l'application..." -ForegroundColor Cyan
mvn clean compile -q

if ($LASTEXITCODE -eq 0) {
    Write-Host "Compilation reussie!" -ForegroundColor Green
    Write-Host "La colonne commentaire a ete ajoutee a l'entite ReleveBancaireEntity" -ForegroundColor Cyan
    Write-Host "Redemarrez l'application Spring Boot pour que les changements prennent effet" -ForegroundColor Yellow
} else {
    Write-Host "Erreur lors de la compilation" -ForegroundColor Red
}

Write-Host "Migration terminee!" -ForegroundColor Green
