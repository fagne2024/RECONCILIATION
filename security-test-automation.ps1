# Script PowerShell d'automatisation des tests de sécurité
# Application de Réconciliation

param(
    [string]$BackendUrl = "http://localhost:8080",
    [string]$FrontendUrl = "http://localhost:4200"
)

$ErrorActionPreference = "Continue"

# Couleurs
function Write-Success { Write-Host "[OK] $args" -ForegroundColor Green }
function Write-ErrorCustom { Write-Host "[ERROR] $args" -ForegroundColor Red }
function Write-Warning { Write-Host "[WARN] $args" -ForegroundColor Yellow }
function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }

# Créer le répertoire de rapports
$ReportsDir = "security-reports/$(Get-Date -Format 'yyyyMMdd_HHmmss')"
New-Item -ItemType Directory -Force -Path $ReportsDir | Out-Null

Write-Host "=== Démarrage des tests de securite ===" -ForegroundColor Blue
Write-Host "=================================="
Write-Host "Backend URL: $BackendUrl"
Write-Host "Frontend URL: $FrontendUrl"
Write-Host "Rapports: $ReportsDir"
Write-Host ""

# 1. Test de connectivité backend
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "1. Test de connectivité backend"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n"

try {
    $response = Invoke-WebRequest -Uri "$BackendUrl/" -Method GET -TimeoutSec 5 -UseBasicParsing
    Write-Success "Backend accessible (HTTP $($response.StatusCode))"
    $response.Content | Out-File "$ReportsDir/backend-root-response.json" -Encoding UTF8
} catch {
    Write-ErrorCustom "Backend non accessible a $BackendUrl"
    Write-Warning "Assurez-vous que le backend est démarré"
}

# 2. Tests des endpoints sans authentification
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "2. Tests d'accessibilité des endpoints"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n"

$endpoints = @(
    "/api/users",
    "/api/operations",
    "/api/accounts",
    "/api/rankings",
    "/api/auth/login"
)

$unprotectedEndpoints = @()

foreach ($endpoint in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri "$BackendUrl$endpoint" -Method GET -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        $statusCode = $response.StatusCode
        
        if ($statusCode -eq 200 -or $statusCode -eq 201) {
            Write-Warning "$endpoint accessible sans authentification (HTTP $statusCode)"
            $unprotectedEndpoints += "$endpoint : HTTP $statusCode"
        } elseif ($statusCode -eq 401 -or $statusCode -eq 403) {
            Write-Success "$endpoint protégé (HTTP $statusCode)"
        } else {
            Write-Warning "$endpoint réponse inattendue (HTTP $statusCode)"
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 401 -or $statusCode -eq 403) {
            Write-Success "$endpoint protégé (HTTP $statusCode)"
        } elseif ($statusCode -eq 404) {
            Write-Info "$endpoint non trouvé (HTTP $statusCode)"
        } else {
            Write-Warning "$endpoint erreur: $($_.Exception.Message)"
        }
    }
}

if ($unprotectedEndpoints.Count -gt 0) {
    $unprotectedEndpoints | Out-File "$ReportsDir/endpoints-unprotected.txt" -Encoding UTF8
}

# 3. Test CORS
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "3. Test de configuration CORS"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n"

try {
    $headers = @{
        "Origin" = "https://evil.com"
        "Access-Control-Request-Method" = "POST"
    }
    
    $response = Invoke-WebRequest -Uri "$BackendUrl/api/users" -Method OPTIONS -Headers $headers -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    
    $corsHeaders = $response.Headers["Access-Control-Allow-Origin"]
    if ($corsHeaders) {
        if ($corsHeaders -eq "*") {
            Write-ErrorCustom "CORS ouvert (*) detecte - VULNERABILITE"
            "CORS ouvert (*) : $corsHeaders" | Out-File "$ReportsDir/cors-vulnerable.txt" -Encoding UTF8
        } else {
            Write-Warning "CORS configuré: $corsHeaders"
            "CORS configuré: $corsHeaders" | Out-File "$ReportsDir/cors-config.txt" -Encoding UTF8
        }
    } else {
        Write-Success "Pas de header CORS pour origine non autorisée"
    }
} catch {
    Write-Info "Test CORS terminé (peut être normal si OPTIONS non supporté)"
}

# 4. Test des headers de sécurité
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "4. Vérification des headers de sécurité"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n"

try {
    $response = Invoke-WebRequest -Uri "$BackendUrl/api/auth/login" -Method GET -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    
    $securityHeaders = @(
        "X-Content-Type-Options",
        "X-Frame-Options",
        "X-XSS-Protection",
        "Strict-Transport-Security",
        "Content-Security-Policy"
    )
    
    $headersReport = @()
    
    foreach ($header in $securityHeaders) {
        $value = $response.Headers[$header]
        if ($null -eq $value) {
            Write-Warning "Header manquant: $header"
            $headersReport += "❌ $header : MANQUANT"
        } else {
            Write-Success "Header présent: $header"
            $headersReport += "✅ $header : $value"
        }
    }
    
    $headersReport | Out-File "$ReportsDir/security-headers.txt" -Encoding UTF8
} catch {
    Write-Warning "Impossible de tester les headers: $($_.Exception.Message)"
}

# 5. Recherche de secrets dans le code
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "5. Recherche de secrets dans le code"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n"

$secrets = @()

# Chercher les mots de passe en clair
Write-Info "Recherche de mots de passe en clair..."
$passwordMatches = Get-ChildItem -Path "reconciliation-app" -Recurse -Include "*.properties", "*.yml", "*.yaml" | 
    Select-String -Pattern "password\s*=" -CaseSensitive:$false

foreach ($match in $passwordMatches) {
    Write-Warning "Mot de passe trouvé: $($match.Filename):$($match.LineNumber)"
    $secrets += "$($match.Filename):$($match.LineNumber) - $($match.Line.Trim())"
}

# Chercher les secrets
Write-Info "Recherche de secrets..."
$secretMatches = Get-ChildItem -Path "reconciliation-app" -Recurse -Include "*.properties", "*.yml", "*.yaml", "*.java" | 
    Select-String -Pattern "(secret|apikey|api_key|private_key)\s*=" -CaseSensitive:$false

foreach ($match in $secretMatches) {
    Write-Warning "Secret trouvé: $($match.Filename):$($match.LineNumber)"
    $secrets += "$($match.Filename):$($match.LineNumber) - $($match.Line.Trim())"
}

if ($secrets.Count -gt 0) {
    $secrets | Out-File "$ReportsDir/secrets-found.txt" -Encoding UTF8
    Write-ErrorCustom "$($secrets.Count) secret(s) potentiel(s) trouve(s)"
} else {
    Write-Success "Aucun secret évident trouvé"
}

# 6. Scan npm audit
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "6. Scan des vulnérabilités npm (frontend)"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n"

if (Test-Path "reconciliation-app/frontend/package.json") {
    Push-Location "reconciliation-app/frontend"
    try {
        Write-Info "Exécution de npm audit..."
        npm audit --json 2>&1 | Out-File "../../$ReportsDir/npm-audit-frontend.json" -Encoding UTF8
        npm audit 2>&1 | Out-File "../../$ReportsDir/npm-audit-frontend.txt" -Encoding UTF8
        
        $auditJson = npm audit --json 2>&1 | ConvertFrom-Json
        if ($auditJson.metadata.vulnerabilities) {
            $vulnCount = ($auditJson.metadata.vulnerabilities | Get-Member -MemberType NoteProperty).Count
            Write-Warning "$vulnCount vulnérabilité(s) npm trouvée(s) dans le frontend"
        } else {
            Write-Success "Aucune vulnérabilité npm dans le frontend"
        }
    } catch {
        Write-Warning "Erreur lors du scan npm: $($_.Exception.Message)"
    }
    Pop-Location
} else {
    Write-Warning "package.json du frontend non trouvé"
}

# Scan npm audit pour services Node.js
if (Test-Path "reconciliation-app/backend/src/package.json") {
    Write-Host "`nScan npm audit (services Node.js)..."
    Push-Location "reconciliation-app/backend/src"
    try {
        npm audit --json 2>&1 | Out-File "../../../$ReportsDir/npm-audit-node-services.json" -Encoding UTF8
        npm audit 2>&1 | Out-File "../../../$ReportsDir/npm-audit-node-services.txt" -Encoding UTF8
        Write-Success "Scan npm terminé pour les services Node.js"
    } catch {
        Write-Warning "Erreur lors du scan npm services: $($_.Exception.Message)"
    }
    Pop-Location
}

# 7. Analyse des vulnérabilités critiques identifiées
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "7. Analyse des vulnérabilités critiques"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n"

$criticalVulns = @()

# Vérifier les mots de passe en clair dans AuthController
Write-Info "Vérification de l'authentification..."
$authController = Get-Content "reconciliation-app/backend/src/main/java/com/reconciliation/controller/AuthController.java" -ErrorAction SilentlyContinue
if ($authController -match "\.equals\(password\)|getPassword\(\)\.equals") {
    Write-ErrorCustom "VULNERABILITE CRITIQUE: Mots de passe compares en clair dans AuthController"
    $criticalVulns += "CRITIQUE: Mots de passe compares en clair dans AuthController.java ligne 39"
}

# Vérifier application.properties
Write-Info "Vérification de application.properties..."
$appProps = Get-Content "reconciliation-app/backend/src/main/resources/application.properties" -ErrorAction SilentlyContinue
if ($appProps -match "password\s*=$") {
    Write-ErrorCustom "VULNERABILITE CRITIQUE: Mot de passe MySQL vide ou en clair dans application.properties"
    $criticalVulns += "CRITIQUE: Mot de passe MySQL vide/en clair dans application.properties ligne 4"
}

# Vérifier CORS ouvert
Write-Info "Verification de la configuration CORS..."
$corsControllers = Get-ChildItem -Path "reconciliation-app/backend/src" -Recurse -Include "*.java" | 
    Select-String -Pattern 'origins\s*=\s*["'']\*["'']' -CaseSensitive:$false

foreach ($match in $corsControllers) {
    Write-ErrorCustom "VULNERABILITE: CORS ouvert (*) dans $($match.Filename)"
    $criticalVulns += "MOYEN: CORS ouvert (*) dans $($match.Filename):$($match.LineNumber)"
}

if ($criticalVulns.Count -gt 0) {
    $criticalVulns | Out-File "$ReportsDir/critical-vulnerabilities.txt" -Encoding UTF8
    Write-Host "`n[WARN] $($criticalVulns.Count) vulnerabilite(s) critique(s) trouvee(s)" -ForegroundColor Red
} else {
    Write-Success "Aucune vulnérabilité critique évidente trouvée"
}

# 8. Résumé
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "8. Résumé des tests"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n"

Write-Host "Rapports generes dans: $ReportsDir" -ForegroundColor Cyan
Write-Host "`nFichiers générés:"
Get-ChildItem -Path $ReportsDir | ForEach-Object {
    $size = [math]::Round($_.Length / 1KB, 2)
    Write-Host "  - $($_.Name) ($size KB)"
}

Write-Host "`n[OK] Tests de securite termines!"
Write-Host "`nProchaines étapes:"
Write-Host "1. Examiner les rapports dans $ReportsDir"
Write-Host "2. Corriger les vulnérabilités critiques identifiées"
Write-Host "3. Consulter PLAN_TEST_SECURITE.md pour des tests plus approfondis"

