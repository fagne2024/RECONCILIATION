# Script PowerShell simple pour verifier les en-tetes de securite HTTP
param(
    [Parameter(Mandatory=$false)]
    [string]$Url = "http://localhost:80"
)

Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "   Verification des En-tetes de Securite HTTP" -ForegroundColor Cyan
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "URL testee: $Url" -ForegroundColor Yellow
Write-Host ""

try {
    Write-Host "Recuperation des en-tetes..." -ForegroundColor Cyan
    $response = Invoke-WebRequest -Uri $Url -Method HEAD -UseBasicParsing -ErrorAction Stop -TimeoutSec 10
    $headers = $response.Headers
    
    Write-Host ""
    Write-Host "===============================================================" -ForegroundColor Cyan
    Write-Host "EN-TETES DE SECURITE" -ForegroundColor Cyan
    Write-Host "===============================================================" -ForegroundColor Cyan
    Write-Host ""
    
    $successCount = 0
    $totalCount = 7
    
    # X-Frame-Options
    $header = $headers['X-Frame-Options']
    if ($header -and ($header -match 'DENY' -or $header -match 'SAMEORIGIN')) {
        Write-Host "[OK] X-Frame-Options: $header" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "[MANQUANT] X-Frame-Options" -ForegroundColor Red
    }
    
    # X-Content-Type-Options
    $header = $headers['X-Content-Type-Options']
    if ($header -and $header -match 'nosniff') {
        Write-Host "[OK] X-Content-Type-Options: $header" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "[MANQUANT] X-Content-Type-Options" -ForegroundColor Red
    }
    
    # X-XSS-Protection
    $header = $headers['X-XSS-Protection']
    if ($header -and $header -match 'mode=block') {
        Write-Host "[OK] X-XSS-Protection: $header" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "[MANQUANT] X-XSS-Protection" -ForegroundColor Red
    }
    
    # Strict-Transport-Security
    $header = $headers['Strict-Transport-Security']
    if ($header) {
        Write-Host "[OK] Strict-Transport-Security: $header" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "[INFO] Strict-Transport-Security (recommande pour HTTPS)" -ForegroundColor Yellow
    }
    
    # Referrer-Policy
    $header = $headers['Referrer-Policy']
    if ($header) {
        Write-Host "[OK] Referrer-Policy: $header" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "[MANQUANT] Referrer-Policy" -ForegroundColor Red
    }
    
    # Permissions-Policy
    $header = $headers['Permissions-Policy']
    if ($header) {
        Write-Host "[OK] Permissions-Policy: (configure)" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "[MANQUANT] Permissions-Policy" -ForegroundColor Red
    }
    
    # Content-Security-Policy
    $header = $headers['Content-Security-Policy']
    if ($header) {
        Write-Host "[OK] Content-Security-Policy: (configure)" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "[MANQUANT] Content-Security-Policy" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "===============================================================" -ForegroundColor Cyan
    Write-Host "EN-TETES A MASQUER" -ForegroundColor Cyan
    Write-Host "===============================================================" -ForegroundColor Cyan
    Write-Host ""
    
    $hiddenCount = 0
    
    # X-Powered-By
    $header = $headers['X-Powered-By']
    if (-not $header) {
        Write-Host "[OK] X-Powered-By: masque" -ForegroundColor Green
        $hiddenCount++
    } else {
        Write-Host "[PRESENT] X-Powered-By: $header (devrait etre masque)" -ForegroundColor Yellow
    }
    
    # Server
    $header = $headers['Server']
    if (-not $header -or $header -eq 'nginx') {
        Write-Host "[OK] Server: masque ou minimal" -ForegroundColor Green
        $hiddenCount++
    } else {
        Write-Host "[INFO] Server: $header (visible)" -ForegroundColor Yellow
        $hiddenCount++
    }
    
    Write-Host ""
    Write-Host "===============================================================" -ForegroundColor Cyan
    Write-Host "RESUME" -ForegroundColor Cyan
    Write-Host "===============================================================" -ForegroundColor Cyan
    Write-Host ""
    
    $percentage = [math]::Round(($successCount / $totalCount) * 100)
    
    Write-Host "En-tetes de securite: $successCount/$totalCount ($percentage%)" -ForegroundColor White
    Write-Host "En-tetes masques: $hiddenCount/2" -ForegroundColor White
    Write-Host ""
    
    $globalScore = [math]::Round((($successCount + $hiddenCount) / ($totalCount + 2)) * 100)
    Write-Host "Score global de securite: " -NoNewline
    
    if ($globalScore -ge 90) {
        Write-Host "$globalScore% - A+" -ForegroundColor Green
    } elseif ($globalScore -ge 80) {
        Write-Host "$globalScore% - A" -ForegroundColor Green
    } elseif ($globalScore -ge 70) {
        Write-Host "$globalScore% - B" -ForegroundColor Yellow
    } elseif ($globalScore -ge 60) {
        Write-Host "$globalScore% - C" -ForegroundColor Yellow
    } else {
        Write-Host "$globalScore% - D" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "===============================================================" -ForegroundColor Cyan
    Write-Host ""
    
    if ($globalScore -lt 90) {
        Write-Host "CONSEIL: Consultez SECURITE_HTTP_HEADERS.md pour ameliorer" -ForegroundColor Yellow
        Write-Host ""
    }
    
} catch {
    Write-Host ""
    Write-Host "[ERREUR] Impossible de se connecter a $Url" -ForegroundColor Red
    Write-Host ""
    Write-Host "Details: $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Verifiez que:" -ForegroundColor Yellow
    Write-Host "  - L'URL est correcte" -ForegroundColor Gray
    Write-Host "  - Le serveur est en cours d'execution" -ForegroundColor Gray
    Write-Host "  - Vous avez acces au serveur" -ForegroundColor Gray
    Write-Host ""
    exit 1
}









