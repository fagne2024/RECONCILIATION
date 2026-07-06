# Fonctions partagees stop-backend / status-backend

function Get-BackendPidFromFile {
    param([string]$PidFile)
    if (-not (Test-Path -LiteralPath $PidFile)) { return $null }
    $raw = (Get-Content -LiteralPath $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
    if ($raw -match '^\d+$') { return [int]$raw }
    return $null
}

function Get-BackendPortOwnerPid {
    param([int]$Port = 8443)
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $conn) { return $null }
    $ownerPid = [int]$conn.OwningProcess
    if ($ownerPid -le 0) { return $null }
    return $ownerPid
}

function Test-BackendJavaPidAlive {
    param([string]$PidFile)
    $javaPid = Get-BackendPidFromFile -PidFile $PidFile
    if (-not $javaPid) { return $false }
    $proc = Get-Process -Id $javaPid -ErrorAction SilentlyContinue
    return ($null -ne $proc) -and ($proc.ProcessName -match '^java')
}

function Test-IsReconciliAppBackendProcess {
    param([string]$CommandLine)
    if ([string]::IsNullOrWhiteSpace($CommandLine)) { return $false }
    return (
        $CommandLine -match 'csv-reconciliation' -or
        $CommandLine -match 'CsvReconciliationApplication' -or
        ($CommandLine -match 'reconciliation-app\\backend' -and $CommandLine -match 'spring-boot')
    )
}

function Get-ReconciliAppBackendJavaProcesses {
    param([string]$BackendPathPattern)
    $fromWmi = Get-CimInstance Win32_Process -Filter "Name='java.exe' OR Name='javaw.exe'" -ErrorAction SilentlyContinue |
        Where-Object { Test-IsReconciliAppBackendProcess $_.CommandLine }
    if ($fromWmi) { return @($fromWmi) }

    $ownerPid = Get-BackendPortOwnerPid -Port 8443
    if ($ownerPid) {
        $owner = Get-Process -Id $ownerPid -ErrorAction SilentlyContinue
        if ($owner -and $owner.ProcessName -match '^java') {
            return @([PSCustomObject]@{ ProcessId = $ownerPid; CommandLine = '(port 8443)' })
        }
    }
    return @()
}

function Test-BackendPortInUse {
    param([int]$Port = 8443)
    return $null -ne (Get-BackendPortOwnerPid -Port $Port)
}

function Stop-BackendPortOccupant {
    param(
        [int]$Port = 8443,
        [int]$WaitSeconds = 20
    )
    $stopped = 0
    $deadline = (Get-Date).AddSeconds($WaitSeconds)
    while ((Get-Date) -lt $deadline) {
        $ownerPid = Get-BackendPortOwnerPid -Port $Port
        if (-not $ownerPid) { break }
        $owner = Get-Process -Id $ownerPid -ErrorAction SilentlyContinue
        if (-not $owner) { break }
        if ($owner.ProcessName -match '^(java|javaw)$') {
            Write-Host "Arret $($owner.ProcessName) PID $ownerPid (port $Port)..." -ForegroundColor Yellow
            Stop-Process -Id $ownerPid -Force -ErrorAction SilentlyContinue
            $stopped++
            Start-Sleep -Seconds 1
            continue
        }
        Write-Host "Port $Port occupe par $($owner.ProcessName) PID $ownerPid (pas java)." -ForegroundColor Red
        break
    }
    return $stopped
}

function Test-BackendHttpHealthy {
    param(
        [int]$Port = 8443,
        [int]$TimeoutSec = 5
    )
    if (-not (Test-BackendPortInUse -Port $Port)) { return $false }

    try {
        if (Get-Command curl.exe -ErrorAction SilentlyContinue) {
            $out = & curl.exe -sk --max-time $TimeoutSec "https://127.0.0.1:${Port}/health" 2>$null
            return ($out -match '"status"\s*:\s*"UP"') -or ($out -match 'UP')
        }
    } catch { }

    try {
        Add-Type @"
using System.Net;
using System.Security.Cryptography.X509Certificates;
public class ReconciliTrustAllCerts : ICertificatePolicy {
    public bool CheckValidationResult(ServicePoint srvPoint, X509Certificate certificate, WebRequest request, int certificateProblem) { return true; }
}
"@ -ErrorAction SilentlyContinue
        [System.Net.ServicePointManager]::CertificatePolicy = New-Object ReconciliTrustAllCerts
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
        $request = [System.Net.WebRequest]::Create("https://127.0.0.1:${Port}/health")
        $request.Timeout = $TimeoutSec * 1000
        $response = $request.GetResponse()
        $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
        $body = $reader.ReadToEnd()
        $reader.Close()
        $response.Close()
        return $body -match 'UP'
    } catch {
        return $false
    }
}

function Test-BackendRunning {
    param(
        [string]$PidFile,
        [string]$BackendPathPattern,
        [int]$Port = 8443
    )
    if (Test-BackendJavaPidAlive -PidFile $PidFile) { return $true }
    if (Test-BackendHttpHealthy -Port $Port) { return $true }
    if (Test-BackendPortInUse -Port $Port) { return $true }
    if (@(Get-ReconciliAppBackendJavaProcesses -BackendPathPattern $BackendPathPattern).Count -gt 0) { return $true }
    return $false
}

function Sync-BackendPidFileFromPort {
    param(
        [string]$PidFile,
        [int]$Port = 8443
    )
    $ownerPid = Get-BackendPortOwnerPid -Port $Port
    if (-not $ownerPid) { return $false }
    $proc = Get-Process -Id $ownerPid -ErrorAction SilentlyContinue
    if (-not $proc -or $proc.ProcessName -notmatch '^java') { return $false }
    Set-Content -LiteralPath $PidFile -Value $ownerPid -NoNewline
    return $true
}
