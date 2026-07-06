#Requires -Version 5.1
$backendDir = $PSScriptRoot
. (Join-Path $backendDir 'backend-common.ps1')

$BackendPort = 8443
$backendPathPattern = [regex]::Escape('reconciliation-app\backend')
$javaPidFile = Join-Path $backendDir 'logs\backend-java.pid'

$savedPid = Get-BackendPidFromFile -PidFile $javaPidFile
$pidAlive = Test-BackendJavaPidAlive -PidFile $javaPidFile
$port = Test-BackendPortInUse -Port $BackendPort
$javaProcs = @(Get-ReconciliAppBackendJavaProcesses -BackendPathPattern $backendPathPattern)

Write-Host '=== ReconciliApp Backend ===' -ForegroundColor Cyan
if ($savedPid) {
    $state = if ($pidAlive) { 'actif' } else { 'inactif' }
    Write-Host ("PID fichier {0} : {1}" -f $savedPid, $state) -ForegroundColor $(if ($pidAlive) { 'Green' } else { 'Red' })
}
if ($javaProcs) {
    foreach ($p in $javaProcs) {
        Write-Host ("Java PID {0}" -f $p.ProcessId) -ForegroundColor Green
    }
} elseif (-not $pidAlive) {
    Write-Host 'Aucun processus Java ReconciliApp detecte.' -ForegroundColor Red
}

if ($port) {
    $owner = Get-BackendPortOwnerPid -Port $BackendPort
    Write-Host ("Port {0} en ecoute (PID {1})" -f $BackendPort, $owner) -ForegroundColor Green
} else {
    Write-Host ("Port {0} libre." -f $BackendPort) -ForegroundColor Red
}

$httpOk = Test-BackendHttpHealthy -Port $BackendPort
if ($httpOk) {
    Write-Host 'Sante HTTP /health : OK' -ForegroundColor Green
} elseif ($port) {
    Write-Host 'Sante HTTP /health : echec (port ouvert mais API non repond)' -ForegroundColor Yellow
}

Write-Host 'Demarrage : DEMARRER-BACKEND.bat (premier plan) ou DEMARRER-BACKEND-DETACHE.bat' -ForegroundColor DarkGray
Write-Host 'Watchdog  : WATCHDOG-BACKEND.bat ou INSTALLER-WATCHDOG-BACKEND.bat (tache planifiee, port 8443)' -ForegroundColor DarkGray
Write-Host 'Diagnostic  : DIAGNOSTIQUER-BACKEND.bat (rapport si mort brutale)' -ForegroundColor DarkGray
Write-Host 'Cause arret : terminal Java + logs/last-shutdown-cause.txt' -ForegroundColor DarkGray
