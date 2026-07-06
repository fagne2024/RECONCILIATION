#Requires -Version 5.1
<#
.SYNOPSIS
    Arrete toutes les instances backend ReconciliApp (mvn spring-boot:run, java).
#>
$ErrorActionPreference = 'SilentlyContinue'

$backendDir = $PSScriptRoot
. (Join-Path $backendDir 'backend-common.ps1')

$javaPidFile = Join-Path $backendDir 'logs\backend-java.pid'
$stopLog = Join-Path $backendDir 'logs\backend-stop.log'
$BackendPort = 8443
$selfPid = $PID

Add-Content -LiteralPath $stopLog -Value ("{0} stop-backend.ps1 appele (shell PID {1})" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $selfPid)

$stoppedJava = 0

$savedPid = Get-BackendPidFromFile -PidFile $javaPidFile
if ($savedPid -and (Get-Process -Id $savedPid -ErrorAction SilentlyContinue)) {
    Write-Host "Arret java PID $savedPid (fichier PID)..." -ForegroundColor Yellow
    Stop-Process -Id $savedPid -Force
    $stoppedJava++
}

$stoppedJava += Stop-BackendPortOccupant -Port $BackendPort -WaitSeconds 5

Get-CimInstance Win32_Process -Filter "Name='java.exe' OR Name='javaw.exe'" |
    Where-Object { Test-IsReconciliAppBackendProcess $_.CommandLine } |
    ForEach-Object {
        Write-Host "Arret java PID $($_.ProcessId)..." -ForegroundColor Yellow
        Stop-Process -Id $_.ProcessId -Force
        $stoppedJava++
    }

Get-CimInstance Win32_Process -Filter "Name='cmd.exe' OR Name='powershell.exe'" |
    Where-Object {
        $_.ProcessId -ne $selfPid -and
        $_.CommandLine -match 'spring-boot:run' -and
        $_.CommandLine -match 'reconciliation-app\\backend'
    } |
    ForEach-Object {
        Write-Host "Arret processus Maven PID $($_.ProcessId)..." -ForegroundColor Yellow
        Stop-Process -Id $_.ProcessId -Force
    }

Remove-Item -LiteralPath $javaPidFile -Force -ErrorAction SilentlyContinue

$stoppedJava += Stop-BackendPortOccupant -Port $BackendPort -WaitSeconds 15

$stillListening = Get-NetTCPConnection -LocalPort $BackendPort -State Listen -ErrorAction SilentlyContinue
if ($stillListening) {
    Write-Host "Le port $BackendPort est encore occupe (PID $($stillListening.OwningProcess))." -ForegroundColor Red
}
elseif ($stoppedJava -eq 0) {
    Write-Host 'Aucune instance ReconciliApp en cours.' -ForegroundColor DarkGray
}
else {
    Write-Host "$stoppedJava processus java arretes." -ForegroundColor Green
}
