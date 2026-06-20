#Requires -Version 5.1
<#
.SYNOPSIS
    Déploie l'environnement DEV sur le même serveur que la production.

.DESCRIPTION
    - Frontend Angular -> C:\reconciliation-app\frontend\dist-dev
    - Backend Spring Boot profil dev, port 8081, base top20_dev
    - Apache VirtualHost dev.reconciliation.intouchgroup.net

    Lien partageable : https://dev.reconciliation.intouchgroup.net

.PARAMETER ProjectRoot
    Dépôt source (défaut : parent du dossier deploy).

.PARAMETER ServerRoot
    Racine de déploiement sur le serveur (défaut : C:\reconciliation-app).

.PARAMETER SkipBuild
    Ne pas recompiler (utiliser les artefacts existants).

.PARAMETER SkipDatabase
    Ne pas exécuter init-dev-database.sql.

.PARAMETER SkipApache
    Ne pas copier/recharger la config Apache.

.PARAMETER StartBackend
    Démarrer le backend DEV en arrière-plan après déploiement.

.EXAMPLE
    .\Deploy-Dev.ps1
    .\Deploy-Dev.ps1 -StartBackend
#>
[CmdletBinding()]
param(
    [string]$ProjectRoot = '',
    [string]$ServerRoot = 'C:\reconciliation-app',
    [switch]$SkipBuild,
    [switch]$SkipDatabase,
    [switch]$SkipApache,
    [switch]$StartBackend
)

$ErrorActionPreference = 'Stop'
$DevUrl = 'https://dev.reconciliation.intouchgroup.net'

function Invoke-Native {
    param(
        [Parameter(Mandatory = $true)]
        [scriptblock]$Command
    )
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & $Command
        return [int]$LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previous
    }
}

function Write-ExternalOutput {
    param([object]$Line)
    if ($Line -is [System.Management.Automation.ErrorRecord]) {
        $text = $Line.ToString()
        # Avertissements connus (stderr) — pas des erreurs bloquantes
        if ($text -match 'Node\.js version|Odd numbered Node|Using a password on the command line') {
            Write-Host $text -ForegroundColor DarkYellow
            return
        }
        Write-Warning $text
        return
    }
    Write-Host $Line
}

function Invoke-Npm {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $output = & npm @Arguments 2>&1
        $exitCode = [int]$LASTEXITCODE
        foreach ($line in @($output)) {
            Write-ExternalOutput $line
        }
        return $exitCode
    } finally {
        $ErrorActionPreference = $previous
    }
}

if ([string]::IsNullOrWhiteSpace($ProjectRoot)) {
    $ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
}

$backendSrc = Join-Path $ProjectRoot 'backend'
$frontendSrc = Join-Path $ProjectRoot 'frontend'
$backendDest = Join-Path $ServerRoot 'backend'
$frontendDestDev = Join-Path $ServerRoot 'frontend\dist-dev\csv-reconciliation'
$apacheExtra = 'C:\Apache24\conf\extra'
$apacheMain = 'C:\Apache24\conf\httpd.conf'
$apacheDevConfName = 'reconciliation-dev.conf'

function Write-Step([string]$Message) {
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Test-Command([string]$Name) {
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

Write-Host @"

========================================
  Deploiement environnement DEV
  URL : $DevUrl
========================================
"@ -ForegroundColor Green

# --- 1. Synchroniser le code vers ServerRoot si différent ---
Write-Step 'Preparation des dossiers'
@($backendDest, $frontendDestDev, (Join-Path $backendDest 'logs')) | ForEach-Object {
    New-Item -ItemType Directory -Force -Path $_ | Out-Null
}

if ($ProjectRoot.TrimEnd('\') -ne $ServerRoot.TrimEnd('\')) {
    Write-Host "Copie backend depuis $ProjectRoot vers $ServerRoot ..."
    Invoke-Native { robocopy $backendSrc $backendDest /MIR /XD target logs node_modules .git /NFL /NDL /NJH /NJS /NC /NS | Out-Null } | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "robocopy backend a echoue (code $LASTEXITCODE)" }

    $frontendDestParent = Split-Path $frontendDestDev -Parent
    New-Item -ItemType Directory -Force -Path $frontendDestParent | Out-Null
    Invoke-Native { robocopy $frontendSrc (Join-Path $ServerRoot 'frontend') /MIR /XD dist dist-dev node_modules .git /NFL /NDL /NJH /NJS /NC /NS | Out-Null } | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "robocopy frontend a echoue (code $LASTEXITCODE)" }
}

$workBackend = if (Test-Path (Join-Path $backendDest 'pom.xml')) { $backendDest } else { $backendSrc }
$workFrontend = if (Test-Path (Join-Path (Join-Path $ServerRoot 'frontend') 'package.json')) {
    Join-Path $ServerRoot 'frontend'
} else {
    $frontendSrc
}

# --- 2. Base de données DEV ---
if (-not $SkipDatabase) {
    Write-Step 'Initialisation base top20_dev'
    $sqlFile = Join-Path $PSScriptRoot 'init-dev-database.sql'
    if (-not (Test-Path $sqlFile)) {
        Write-Warning "Script SQL introuvable : $sqlFile"
    }
    else {
        if (Test-Command 'mysql') {
            $mysqlExe = (Get-Command mysql).Source
        } else {
            $mysqlCandidates = @(
                'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe',
                'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe'
            )
            $mysqlExe = $mysqlCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
        }

        if ($mysqlExe) {
            $mysqlArgs = @('-u', 'root', '--batch', '--skip-column-names')
            if ($env:MYSQL_PWD) { $mysqlArgs += @("-p$env:MYSQL_PWD") }
            elseif ($env:DB_PASSWORD) { $mysqlArgs += @("-p$env:DB_PASSWORD") }
            else { $mysqlArgs += @('-proot') }
            $sqlContent = Get-Content $sqlFile -Raw
            $mysqlExit = Invoke-Native { $sqlContent | & $mysqlExe @mysqlArgs 2>$null | Out-Null }
            if ($mysqlExit -ne 0) {
                $mysqlExit = Invoke-Native {
                    "CREATE DATABASE IF NOT EXISTS top20_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" |
                        & $mysqlExe @mysqlArgs 2>$null | Out-Null
                }
            }
            if ($mysqlExit -eq 0) {
                Write-Host 'Base top20_dev prete.' -ForegroundColor Green
            } else {
                Write-Warning 'Echec mysql — executer manuellement deploy\init-dev-database.sql'
            }
        } else {
            Write-Warning @"
mysql CLI introuvable. Executer manuellement sur le serveur :
  mysql -u root -p < "$sqlFile"
"@
        }
    }
}

# --- 3. Build frontend DEV ---
if (-not $SkipBuild) {
    Write-Step 'Build frontend Angular (dist-dev)'
    $nodeVersion = try { node -v 2>$null } catch { 'inconnue' }
    Write-Host "Node.js : $nodeVersion (avertissement v25 = normal, le build continue)" -ForegroundColor DarkGray
    Push-Location $workFrontend
    if (-not (Test-Path 'node_modules')) {
        Write-Host 'npm install...'
        $installExit = Invoke-Npm @('ci')
        if ($installExit -ne 0) { Invoke-Npm @('install') | Out-Null }
    }
    Write-Host 'Compilation en cours (2 a 5 min)...' -ForegroundColor Yellow
    $buildExit = Invoke-Npm @(
        'run', 'build', '--',
        '--configuration', 'development',
        '--output-path', 'dist-dev/csv-reconciliation'
    )
    if ($buildExit -ne 0) {
        Write-Warning 'Build development echoue — tentative copie depuis dist/ existant...'
        $prodDist = Join-Path $workFrontend 'dist\csv-reconciliation'
        $devDist = Join-Path $workFrontend 'dist-dev\csv-reconciliation'
        if (Test-Path (Join-Path $prodDist 'index.html')) {
            New-Item -ItemType Directory -Force -Path $devDist | Out-Null
            robocopy $prodDist $devDist /MIR /NFL /NDL /NJH /NJS /NC /NS | Out-Null
            if ($LASTEXITCODE -ge 8) { throw 'Build frontend echoue et copie dist impossible.' }
        } else {
            throw 'Build frontend echoue.'
        }
    }
    Pop-Location

    $builtFrontend = Join-Path $workFrontend 'dist-dev\csv-reconciliation'
    if ($builtFrontend -ne $frontendDestDev) {
        robocopy $builtFrontend $frontendDestDev /MIR /NFL /NDL /NJH /NJS /NC /NS | Out-Null
        if ($LASTEXITCODE -ge 8) { throw "Copie frontend DEV echouee." }
    }
    Write-Host "Frontend DEV : $frontendDestDev" -ForegroundColor Green
}

# --- 4. Build backend ---
if (-not $SkipBuild) {
    Write-Step 'Build backend Spring Boot'
    Push-Location $workBackend
    $mvnExit = Invoke-Native { mvn package -DskipTests -q 2>&1 | Out-Host; $LASTEXITCODE }
    if ($mvnExit -ne 0) { throw 'Build backend echoue.' }
    Pop-Location
    Write-Host 'JAR pret.' -ForegroundColor Green
}

# --- 5. Apache DEV ---
if (-not $SkipApache) {
    Write-Step 'Configuration Apache DEV'
    $apacheDevSrc = Join-Path $ProjectRoot 'apache-dev.conf'
    if (-not (Test-Path $apacheDevSrc)) {
        Write-Warning "apache-dev.conf introuvable dans $ProjectRoot"
    }
    elseif (-not (Test-Path $apacheExtra)) {
        Write-Warning "Apache non trouve ($apacheExtra). Copier manuellement apache-dev.conf."
    }
    else {
        $destConf = Join-Path $apacheExtra $apacheDevConfName
        Copy-Item $apacheDevSrc $destConf -Force
        Write-Host "Copie -> $destConf"

        if (Test-Path $apacheMain) {
            $includeLine = "Include conf/extra/$apacheDevConfName"
            $content = Get-Content $apacheMain -Raw
            if ($content -notmatch [regex]::Escape($apacheDevConfName)) {
                Add-Content -Path $apacheMain -Value "`n# Environnement DEV`n$includeLine"
                Write-Host "Include ajoute dans httpd.conf"
            }
        }

        if (Test-Command 'httpd') {
            & httpd -t
            if ($LASTEXITCODE -eq 0) {
                $apacheService = Get-Service -Name 'Apache2.4' -ErrorAction SilentlyContinue
                if ($apacheService) {
                    Restart-Service 'Apache2.4'
                    Write-Host 'Apache redemarre.' -ForegroundColor Green
                } else {
                    Write-Warning 'Service Apache2.4 introuvable — redemarrer Apache manuellement.'
                }
            } else {
                Write-Warning 'Syntaxe Apache invalide — verifier le certificat SSL DEV.'
            }
        }
    }
}

# --- 6. Demarrage backend DEV ---
if ($StartBackend) {
    Write-Step 'Demarrage backend DEV (port 8081)'
    $jar = Join-Path $workBackend 'target\csv-reconciliation-1.0.0.jar'
    if (-not (Test-Path $jar)) {
        throw "JAR introuvable : $jar"
    }

    $existing = Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host 'Port 8081 deja utilise — backend DEV probablement actif.' -ForegroundColor Yellow
    }
    else {
        $logOut = Join-Path $workBackend 'logs\backend-dev-stdout.log'
        $logErr = Join-Path $workBackend 'logs\backend-dev-stderr.log'
        $jvmArgs = '-Xms256m -Xmx2048m -XX:MaxMetaspaceSize=384m -XX:+UseG1GC'
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = 'java'
        $psi.Arguments = "$jvmArgs -Dspring.profiles.active=dev -jar `"$jar`""
        $psi.WorkingDirectory = $workBackend
        $psi.RedirectStandardOutput = $true
        $psi.RedirectStandardError = $true
        $psi.UseShellExecute = $false
        $psi.CreateNoWindow = $true
        $proc = [System.Diagnostics.Process]::Start($psi)
        Start-Sleep -Seconds 4
        if (-not $proc.HasExited) {
            Write-Host "Backend DEV demarre (PID $($proc.Id))." -ForegroundColor Green
        } else {
            Write-Warning 'Le backend DEV s est arrete immediatement — voir logs/application-dev.log'
        }
    }
}

Write-Host @"

========================================
  Deploiement DEV termine
========================================

  Lien testeurs : https://reconciliation.intouchgroup.net:8444
  (ou https://dev.reconciliation.intouchgroup.net:8444 apres DNS OVH)

  Demarrer le proxy DEV :
    cd $ProjectRoot\deploy
    .\Start-DevEnv.ps1

  Backend       : http://localhost:8081 (profil dev)
  Base MySQL    : top20_dev

  Demarrer le backend DEV manuellement :
    cd $workBackend
    .\start-dev.bat

"@ -ForegroundColor Green
