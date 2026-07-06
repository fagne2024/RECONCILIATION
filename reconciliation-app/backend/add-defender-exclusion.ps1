#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Ajoute une exclusion Windows Defender pour le dossier backend ReconciliApp.
#>
$backendDir = $PSScriptRoot
$paths = @(
    $backendDir,
    (Join-Path $backendDir 'target'),
    (Join-Path $backendDir 'logs')
)

Write-Host 'Exclusions Windows Defender ReconciliApp' -ForegroundColor Cyan
foreach ($p in $paths) {
    try {
        Add-MpPreference -ExclusionPath $p -ErrorAction Stop
        Write-Host "  OK  $p" -ForegroundColor Green
    } catch {
        Write-Host "  ECHEC $p : $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ''
Write-Host 'Verifiez : Get-MpPreference | Select-Object -ExpandProperty ExclusionPath' -ForegroundColor DarkGray
Write-Host ''
Write-Host 'Exclusions enregistrees. Appuyez sur Entree pour fermer.' -ForegroundColor Green
Read-Host
