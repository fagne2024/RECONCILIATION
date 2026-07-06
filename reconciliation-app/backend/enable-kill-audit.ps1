#Requires -Version 5.1
<#
.SYNOPSIS
    Active l'audit Windows (creation + terminaison de process) pour identifier
    le process qui tue le backend Java.
.DESCRIPTION
    Doit etre lance en admin (via ACTIVER-AUDIT-KILL.bat).
    Active :
      - Process Termination (succes) => evenement 4689 a la mort de java.exe
      - Process Creation (succes) => evenement 4688, utile pour reperer un
        taskkill.exe / process AV qui apparait juste AVANT la mort
        (4689 seul ne dit pas QUI a tue le process, seulement QUE le process
        est mort - c'est la correlation avec 4688 qui reperera le coupable)
      - Inclusion de la ligne de commande dans les evenements 4688 (registre)
#>

$ErrorActionPreference = 'Stop'

function Test-IsAdmin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $p = New-Object Security.Principal.WindowsPrincipal($id)
    return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-IsAdmin)) {
    Write-Host 'Ce script doit etre execute en administrateur.' -ForegroundColor Red
    Write-Host 'Utilisez ACTIVER-AUDIT-KILL.bat (il demande l elevation automatiquement).' -ForegroundColor Yellow
    Read-Host 'Appuyez sur Entree pour fermer'
    exit 1
}

Write-Host 'Activation audit "Process Termination" (succes)...' -ForegroundColor Cyan
auditpol /set /subcategory:"Process Termination" /success:enable | Out-Null

Write-Host 'Activation audit "Process Creation" (succes)...' -ForegroundColor Cyan
auditpol /set /subcategory:"Process Creation" /success:enable | Out-Null

Write-Host 'Activation de la ligne de commande dans les evenements 4688...' -ForegroundColor Cyan
$regPath = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System\Audit'
if (-not (Test-Path $regPath)) {
    New-Item -Path $regPath -Force | Out-Null
}
New-ItemProperty -Path $regPath -Name 'ProcessCreationIncludeCmdLine_Enabled' -PropertyType DWord -Value 1 -Force | Out-Null

Write-Host ''
Write-Host 'Audit active avec succes.' -ForegroundColor Green
Write-Host 'Etapes suivantes :' -ForegroundColor Yellow
Write-Host '  1. Relancez le backend (DEMARRER-BACKEND.bat)' -ForegroundColor Yellow
Write-Host '  2. Attendez le prochain crash (idealement avec DIAGNOSTIQUER-BACKEND.bat ouvert en parallele)' -ForegroundColor Yellow
Write-Host '  3. Lancez TROUVER-TUEUR.bat pour analyser le journal Securite' -ForegroundColor Yellow
Write-Host ''
Read-Host 'Appuyez sur Entree pour fermer'
