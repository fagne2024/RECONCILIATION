#Requires -Version 5.1
<#
.SYNOPSIS
    Enregistre (ou retire) le lancement automatique de Start-App.ps1 à chaque connexion Windows.

.DESCRIPTION
    Crée une tâche planifiée pour l'utilisateur courant, avec -ExecutionPolicy Bypass pour éviter
    les blocages liés à la politique d'exécution après redémarrage.

.PARAMETER Uninstall
    Supprime la tâche planifiée.

.PARAMETER Ssl
    Passe -Ssl à Start-App.ps1 lors du démarrage automatique.

.EXAMPLE
    .\Register-StartAppAtLogon.ps1

.EXAMPLE
    .\Register-StartAppAtLogon.ps1 -Uninstall
#>
param(
    [switch]$Uninstall,
    [switch]$Ssl
)

$ErrorActionPreference = 'Stop'
$taskName = 'ReconciliationStartApp'

if ($Uninstall) {
    $existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if (-not $existing) {
        Write-Host "Aucune tâche nommée '$taskName'."
        return
    }
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "Tâche supprimée : $taskName" -ForegroundColor Green
    return
}

$startApp = Join-Path $PSScriptRoot 'Start-App.ps1'
if (-not (Test-Path -LiteralPath $startApp -PathType Leaf)) {
    Write-Error "Fichier introuvable : $startApp (ce script doit rester dans le même dossier que Start-App.ps1)."
}

$fileArg = '"' + $startApp + '"'
$psArgs = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Normal -File $fileArg"
if ($Ssl) {
    $psArgs += ' -Ssl'
}

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $psArgs
$trigger = New-ScheduledTaskTrigger -AtLogOn
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
Write-Host "Tâche enregistrée : $taskName (au démarrage de session pour $env:USERNAME)." -ForegroundColor Green
Write-Host "Pour désinstaller : .\Register-StartAppAtLogon.ps1 -Uninstall" -ForegroundColor Cyan
