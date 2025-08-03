# Script pour planifier des sauvegardes automatiques
# Configuration
$SCRIPT_PATH = "$(Get-Location)\backup-automatique.ps1"
$TASK_NAME = "Sauvegarde_Base_Top20"
$TASK_DESCRIPTION = "Sauvegarde automatique quotidienne de la base de données top20"

Write-Host "=== Planification de sauvegarde automatique ===" -ForegroundColor Green
Write-Host "Script: $SCRIPT_PATH" -ForegroundColor Yellow
Write-Host "Tâche: $TASK_NAME" -ForegroundColor Yellow
Write-Host ""

# Vérifier si le script de sauvegarde existe
if (-not (Test-Path $SCRIPT_PATH)) {
    Write-Host "❌ Erreur: Le script de sauvegarde n'existe pas: $SCRIPT_PATH" -ForegroundColor Red
    Write-Host "Veuillez d'abord créer le script backup-automatique.ps1" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Script de sauvegarde trouvé" -ForegroundColor Green

# Supprimer la tâche existante si elle existe
Write-Host "Suppression de la tâche existante..." -ForegroundColor Cyan
schtasks /delete /tn $TASK_NAME /f 2>$null

# Créer la nouvelle tâche planifiée
Write-Host "Création de la nouvelle tâche planifiée..." -ForegroundColor Cyan

# Commande pour créer la tâche (tous les jours à 2h00 du matin)
$CREATE_TASK_CMD = "schtasks /create /tn `"$TASK_NAME`" /tr `"powershell.exe -ExecutionPolicy Bypass -File `"$SCRIPT_PATH`"`" /sc daily /st 02:00 /ru `"SYSTEM`" /f"

Write-Host "Commande: $CREATE_TASK_CMD" -ForegroundColor Gray

# Exécuter la commande
try {
    Invoke-Expression $CREATE_TASK_CMD
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Tâche planifiée créée avec succès!" -ForegroundColor Green
        Write-Host "📅 Nom: $TASK_NAME" -ForegroundColor Yellow
        Write-Host "⏰ Programmation: Tous les jours à 02:00" -ForegroundColor Yellow
        Write-Host "📝 Description: $TASK_DESCRIPTION" -ForegroundColor Yellow
        
        # Afficher les détails de la tâche
        Write-Host ""
        Write-Host "=== Détails de la tâche ===" -ForegroundColor Cyan
        schtasks /query /tn $TASK_NAME /fo table
        
        Write-Host ""
        Write-Host "=== Commandes utiles ===" -ForegroundColor Cyan
        Write-Host "Pour voir la tâche: schtasks /query /tn $TASK_NAME" -ForegroundColor White
        Write-Host "Pour supprimer la tâche: schtasks /delete /tn $TASK_NAME /f" -ForegroundColor White
        Write-Host "Pour exécuter la tâche maintenant: schtasks /run /tn $TASK_NAME" -ForegroundColor White
        
    } else {
        Write-Host "❌ Erreur lors de la création de la tâche (code: $LASTEXITCODE)" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "❌ Erreur lors de la création de la tâche: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Instructions supplémentaires ===" -ForegroundColor Cyan
Write-Host "Pour modifier la fréquence de sauvegarde:" -ForegroundColor White
Write-Host "- Quotidienne: /sc daily /st 02:00" -ForegroundColor Gray
Write-Host "- Hebdomadaire: /sc weekly /d MON /st 02:00" -ForegroundColor Gray
Write-Host "- Mensuelle: /sc monthly /d 1 /st 02:00" -ForegroundColor Gray
Write-Host ""
Write-Host "Pour exécuter une sauvegarde manuelle:" -ForegroundColor White
Write-Host ".\backup-automatique.ps1" -ForegroundColor Yellow 