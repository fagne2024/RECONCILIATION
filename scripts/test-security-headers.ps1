# Script PowerShell pour vérifier les en-têtes de sécurité HTTP
# Usage: .\test-security-headers.ps1 -Url "https://reconciliation.intouchgroup.net"

param(
    [Parameter(Mandatory=$false)]
    [string]$Url = "http://localhost:80",
    
    [Parameter(Mandatory=$false)]
    [switch]$Verbose
)

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Vérification des En-têtes de Sécurité HTTP                  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "URL testée: $Url" -ForegroundColor Yellow
Write-Host ""

# Liste des en-têtes de sécurité attendus
$securityHeaders = @{
    "X-Frame-Options" = @{
        "expected" = 'DENY|SAMEORIGIN'
        "description" = "Protection contre le clickjacking"
        "critical" = $true
    }
    "X-Content-Type-Options" = @{
        "expected" = 'nosniff'
        "description" = "Protection contre le MIME type sniffing"
        "critical" = $true
    }
    "X-XSS-Protection" = @{
        "expected" = '1; mode=block|1;mode=block'
        "description" = "Protection XSS"
        "critical" = $true
    }
    "Strict-Transport-Security" = @{
        "expected" = 'max-age='
        "description" = "Force l'utilisation de HTTPS (HSTS)"
        "critical" = $false
    }
    "Referrer-Policy" = @{
        "expected" = 'strict-origin-when-cross-origin|no-referrer|same-origin'
        "description" = "Contrôle des informations de référent"
        "critical" = $true
    }
    "Permissions-Policy" = @{
        "expected" = 'geolocation='
        "description" = "Contrôle des fonctionnalités du navigateur"
        "critical" = $true
    }
    "Content-Security-Policy" = @{
        "expected" = 'default-src'
        "description" = "Politique de sécurité du contenu (CSP)"
        "critical" = $true
    }
}

# En-têtes à ne PAS avoir (divulgation d'informations)
$unwantedHeaders = @(
    "X-Powered-By",
    "Server"
)

# Fonction pour vérifier un en-tête
function Test-SecurityHeader {
    param(
        [string]$HeaderName,
        [string]$HeaderValue,
        [string]$Expected,
        [string]$Description,
        [bool]$Critical
    )
    
    $status = "❌ ABSENT"
    $color = "Red"
    
    if ($HeaderValue) {
        if ($HeaderValue -match $Expected) {
            $status = "✅ OK"
            $color = "Green"
        } else {
            $status = "⚠️  PRÉSENT (valeur incorrecte)"
            $color = "Yellow"
        }
    } elseif (-not $Critical) {
        $status = "⚠️  ABSENT (recommandé)"
        $color = "Yellow"
    }
    
    Write-Host "$status " -ForegroundColor $color -NoNewline
    Write-Host "$HeaderName" -ForegroundColor White
    Write-Host "    $Description" -ForegroundColor Gray
    
    if ($HeaderValue -and $Verbose) {
        Write-Host "    Valeur: $HeaderValue" -ForegroundColor DarkGray
    }
    
    Write-Host ""
    
    return ($status -like "*OK*")
}

# Fonction pour tester les en-têtes non désirés
function Test-UnwantedHeader {
    param(
        [string]$HeaderName,
        [string]$HeaderValue
    )
    
    if ($HeaderValue) {
        Write-Host "❌ PRÉSENT" -ForegroundColor Red -NoNewline
        Write-Host " $HeaderName" -ForegroundColor White
        Write-Host "    Divulgation d'informations sur le serveur" -ForegroundColor Gray
        if ($Verbose) {
            Write-Host "    Valeur: $HeaderValue" -ForegroundColor DarkGray
        }
        Write-Host ""
        return $false
    } else {
        Write-Host "✅ MASQUÉ" -ForegroundColor Green -NoNewline
        Write-Host " $HeaderName" -ForegroundColor White
        Write-Host "    En-tête correctement masqué" -ForegroundColor Gray
        Write-Host ""
        return $true
    }
}

try {
    # Effectuer la requête HTTP
    Write-Host "Récupération des en-têtes..." -ForegroundColor Cyan
    Write-Host ""
    
    $response = Invoke-WebRequest -Uri $Url -Method HEAD -UseBasicParsing -ErrorAction Stop
    $headers = $response.Headers
    
    # Tester les en-têtes de sécurité
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "EN-TÊTES DE SÉCURITÉ ATTENDUS" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    $successCount = 0
    $totalCount = $securityHeaders.Count
    
    foreach ($header in $securityHeaders.GetEnumerator()) {
        $headerValue = $headers[$header.Key]
        
        $result = Test-SecurityHeader `
            -HeaderName $header.Key `
            -HeaderValue $headerValue `
            -Expected $header.Value.expected `
            -Description $header.Value.description `
            -Critical $header.Value.critical
        
        if ($result) {
            $successCount++
        }
    }
    
    # Tester les en-têtes non désirés
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "EN-TÊTES À MASQUER (Divulgation d'informations)" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    $hiddenCount = 0
    foreach ($headerName in $unwantedHeaders) {
        $headerValue = $headers[$headerName]
        $result = Test-UnwantedHeader -HeaderName $headerName -HeaderValue $headerValue
        if ($result) {
            $hiddenCount++
        }
    }
    
    # Résumé
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "RÉSUMÉ" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    $percentage = [math]::Round(($successCount / $totalCount) * 100)
    $hiddenPercentage = [math]::Round(($hiddenCount / $unwantedHeaders.Count) * 100)
    
    Write-Host "En-têtes de sécurité: " -NoNewline
    if ($percentage -ge 90) {
        Write-Host "$successCount/$totalCount ($percentage%) ✅ EXCELLENT" -ForegroundColor Green
    } elseif ($percentage -ge 70) {
        Write-Host "$successCount/$totalCount ($percentage%) ⚠️  BON" -ForegroundColor Yellow
    } else {
        Write-Host "$successCount/$totalCount ($percentage%) ❌ INSUFFISANT" -ForegroundColor Red
    }
    
    Write-Host "En-têtes masqués: " -NoNewline
    if ($hiddenPercentage -eq 100) {
        Write-Host "$hiddenCount/$($unwantedHeaders.Count) ($hiddenPercentage%) ✅ PARFAIT" -ForegroundColor Green
    } else {
        Write-Host "$hiddenCount/$($unwantedHeaders.Count) ($hiddenPercentage%) ⚠️  À AMÉLIORER" -ForegroundColor Yellow
    }
    
    Write-Host ""
    
    # Score global
    $globalScore = [math]::Round((($successCount + $hiddenCount) / ($totalCount + $unwantedHeaders.Count)) * 100)
    Write-Host "Score global de sécurité: " -NoNewline
    
    if ($globalScore -ge 90) {
        Write-Host "$globalScore% - 🏆 A+" -ForegroundColor Green
    } elseif ($globalScore -ge 80) {
        Write-Host "$globalScore% - ✅ A" -ForegroundColor Green
    } elseif ($globalScore -ge 70) {
        Write-Host "$globalScore% - ⚠️  B" -ForegroundColor Yellow
    } elseif ($globalScore -ge 60) {
        Write-Host "$globalScore% - ⚠️  C" -ForegroundColor Yellow
    } else {
        Write-Host "$globalScore% - ❌ D" -ForegroundColor Red
    }
    
    Write-Host ""
    
    # Recommandations
    if ($globalScore -lt 90) {
        Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host "RECOMMANDATIONS" -ForegroundColor Cyan
        Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host ""
        
        if ($successCount -lt $totalCount) {
            Write-Host "📝 Consultez le fichier SECURITE_HTTP_HEADERS.md pour:" -ForegroundColor Yellow
            Write-Host "   - Configurer les en-têtes manquants" -ForegroundColor Gray
            Write-Host "   - Améliorer les en-têtes existants" -ForegroundColor Gray
            Write-Host ""
        }
        
        if ($hiddenCount -lt $unwantedHeaders.Count) {
            Write-Host "🔒 Masquez les en-têtes divulguant des informations:" -ForegroundColor Yellow
            Write-Host "   - Nginx: server_tokens off; proxy_hide_header X-Powered-By;" -ForegroundColor Gray
            Write-Host "   - Apache: Header always unset X-Powered-By; ServerTokens Prod;" -ForegroundColor Gray
            Write-Host ""
        }
        
        if (-not $headers["Strict-Transport-Security"] -and $Url -like "https://*") {
            Write-Host "⚠️  HSTS non configuré alors que vous utilisez HTTPS" -ForegroundColor Yellow
            Write-Host "   Ajoutez: Strict-Transport-Security: max-age=31536000; includeSubDomains" -ForegroundColor Gray
            Write-Host ""
        }
    }
    
    # Afficher tous les en-têtes si mode verbose
    if ($Verbose) {
        Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host "TOUS LES EN-TÊTES DE RÉPONSE" -ForegroundColor Cyan
        Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host ""
        
        foreach ($header in $headers.GetEnumerator()) {
            Write-Host "$($header.Key): " -ForegroundColor White -NoNewline
            Write-Host $header.Value -ForegroundColor Gray
        }
        Write-Host ""
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ ERREUR lors de la connexion à $Url" -ForegroundColor Red
    Write-Host ""
    Write-Host "Détails de l'erreur:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Gray
    Write-Host ""
    Write-Host "Vérifiez que:" -ForegroundColor Yellow
    Write-Host "  - L'URL est correcte" -ForegroundColor Gray
    Write-Host "  - Le serveur est en cours d'exécution" -ForegroundColor Gray
    Write-Host "  - Vous avez accès au serveur" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Conseil: Utilisez le paramètre -Verbose pour voir tous les en-têtes" -ForegroundColor Cyan
Write-Host "   Exemple: .\test-security-headers.ps1 -Url '$Url' -Verbose" -ForegroundColor Gray
Write-Host ""

