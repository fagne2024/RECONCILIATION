# Script PowerShell pour vérifier la sécurité du code JavaScript/TypeScript
# Usage: .\check-javascript-security.ps1 [-Path "src/app"] [-Strict]

param(
    [Parameter(Mandatory=$false)]
    [string]$Path = "reconciliation-app\frontend\src\app",
    
    [Parameter(Mandatory=$false)]
    [switch]$Strict,
    
    [Parameter(Mandatory=$false)]
    [switch]$FixConsole
)

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Vérification de Sécurité JavaScript/TypeScript             ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "Répertoire analysé: $Path" -ForegroundColor Yellow
Write-Host ""

$issues = @{
    consoleLogs = @()
    hardcodedSecrets = @()
    sensitiveTodos = @()
    errorExposure = @()
}

$warningCount = 0
$errorCount = 0

# Fonction pour analyser un fichier
function Test-FileSecurityissues {
    param([string]$FilePath)
    
    $content = Get-Content $FilePath -Raw
    $lines = Get-Content $FilePath
    
    $fileIssues = @()
    
    # 1. Chercher console.log (WARNING)
    $consoleMatches = Select-String -Path $FilePath -Pattern "console\.(log|error|warn|debug|info)" -AllMatches
    if ($consoleMatches) {
        foreach ($match in $consoleMatches) {
            # Ignorer si c'est dans un commentaire ou utilise logger.service
            $line = $lines[$match.LineNumber - 1]
            if ($line -notmatch "^\s*//|^\s*\*" -and $line -notmatch "this\.logger") {
                $fileIssues += @{
                    Type = "WARNING"
                    Line = $match.LineNumber
                    Issue = "console.$($match.Matches[0].Groups[1].Value) utilisé"
                    Severity = "Low"
                }
            }
        }
    }
    
    # 2. Chercher des credentials hardcodés (ERROR)
    $secretPatterns = @(
        "password\s*[:=]\s*['\"][^'\""]+['""]",
        "secret\s*[:=]\s*['\"][^'\""]+['""]",
        "api[-_]?key\s*[:=]\s*['\"][^'\""]+['""]",
        "token\s*[:=]\s*['\"]sk_live_[^'\""]+['""]",
        "private[-_]?key\s*[:=]\s*['\"][^'\""]+['""]"
    )
    
    foreach ($pattern in $secretPatterns) {
        $secretMatches = Select-String -Path $FilePath -Pattern $pattern -AllMatches
        if ($secretMatches) {
            foreach ($match in $secretMatches) {
                $line = $lines[$match.LineNumber - 1]
                # Ignorer les interfaces, types, et commentaires
                if ($line -notmatch "^\s*//|^\s*\*|interface|type\s+" -and 
                    $line -notmatch "TODO|FIXME|Example") {
                    $fileIssues += @{
                        Type = "ERROR"
                        Line = $match.LineNumber
                        Issue = "Possible credential hardcodé détecté"
                        Severity = "High"
                    }
                }
            }
        }
    }
    
    # 3. Chercher des TODO/FIXME sensibles (WARNING)
    $sensitiveTodoPatterns = @(
        "TODO.*(?:security|vuln|hack|bypass|password)",
        "FIXME.*(?:security|vuln|hack|bypass|password)",
        "HACK.*(?:security|auth|bypass)",
        "XXX.*(?:security|dangerous|unsafe)"
    )
    
    foreach ($pattern in $sensitiveTodoPatterns) {
        $todoMatches = Select-String -Path $FilePath -Pattern $pattern -AllMatches
        if ($todoMatches) {
            foreach ($match in $todoMatches) {
                $fileIssues += @{
                    Type = "WARNING"
                    Line = $match.LineNumber
                    Issue = "TODO/FIXME sensible trouvé"
                    Severity = "Medium"
                }
            }
        }
    }
    
    # 4. Chercher exposition d'erreurs détaillées (WARNING)
    $errorPatterns = @(
        "alert\s*\(\s*.*error",
        "console\.error\s*\(.*stack",
        "JSON\.stringify\s*\(\s*error\s*\)"
    )
    
    foreach ($pattern in $errorPatterns) {
        $errorMatches = Select-String -Path $FilePath -Pattern $pattern -AllMatches
        if ($errorMatches) {
            foreach ($match in $errorMatches) {
                $fileIssues += @{
                    Type = "WARNING"
                    Line = $match.LineNumber
                    Issue = "Exposition potentielle de détails d'erreur"
                    Severity = "Medium"
                }
            }
        }
    }
    
    return $fileIssues
}

# Analyser tous les fichiers TypeScript
Write-Host "Analyse des fichiers TypeScript..." -ForegroundColor Cyan
Write-Host ""

$files = Get-ChildItem -Path $Path -Filter "*.ts" -Recurse | Where-Object { 
    $_.FullName -notmatch "node_modules" -and 
    $_.FullName -notmatch "dist" -and
    $_.FullName -notmatch "\.spec\.ts$"
}

$totalFiles = $files.Count
$currentFile = 0

foreach ($file in $files) {
    $currentFile++
    $percentComplete = [math]::Round(($currentFile / $totalFiles) * 100)
    Write-Progress -Activity "Analyse des fichiers" -Status "$currentFile/$totalFiles fichiers" -PercentComplete $percentComplete
    
    $fileIssues = Test-FileSecurityIssues -FilePath $file.FullName
    
    if ($fileIssues.Count -gt 0) {
        foreach ($issue in $fileIssues) {
            $relativePath = $file.FullName.Replace((Get-Location).Path + "\", "")
            
            if ($issue.Type -eq "ERROR") {
                $errorCount++
                $color = "Red"
                $icon = "❌"
            } else {
                $warningCount++
                $color = "Yellow"
                $icon = "⚠️"
            }
            
            Write-Host "$icon [$($issue.Type)]" -ForegroundColor $color -NoNewline
            Write-Host " $relativePath" -ForegroundColor White
            Write-Host "    Ligne $($issue.Line): $($issue.Issue)" -ForegroundColor Gray
            Write-Host "    Sévérité: $($issue.Severity)" -ForegroundColor Gray
            Write-Host ""
            
            # Stocker pour le rapport
            $issues.($issue.Severity.ToLower() + "s") += @{
                File = $relativePath
                Line = $issue.Line
                Issue = $issue.Issue
            }
        }
    }
}

Write-Progress -Activity "Analyse des fichiers" -Completed

# Rapport final
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "RÉSUMÉ" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "Fichiers analysés: $totalFiles" -ForegroundColor White
Write-Host "Erreurs (High): " -NoNewline
if ($errorCount -gt 0) {
    Write-Host "$errorCount ❌" -ForegroundColor Red
} else {
    Write-Host "$errorCount ✅" -ForegroundColor Green
}

Write-Host "Avertissements (Low/Medium): " -NoNewline
if ($warningCount -gt 0) {
    Write-Host "$warningCount ⚠️" -ForegroundColor Yellow
} else {
    Write-Host "$warningCount ✅" -ForegroundColor Green
}

Write-Host ""

# Évaluation
if ($errorCount -eq 0 -and $warningCount -eq 0) {
    Write-Host "🏆 Aucun problème de sécurité détecté !" -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ Votre code est sécurisé." -ForegroundColor Green
    $score = "A+"
} elseif ($errorCount -eq 0 -and $warningCount -lt 10) {
    Write-Host "✅ Code globalement sécurisé" -ForegroundColor Green
    Write-Host "⚠️  Quelques avertissements mineurs à corriger" -ForegroundColor Yellow
    $score = "A"
} elseif ($errorCount -eq 0) {
    Write-Host "⚠️  Plusieurs avertissements détectés" -ForegroundColor Yellow
    Write-Host "Recommandation: Corriger les console.log et TODO sensibles" -ForegroundColor Yellow
    $score = "B"
} else {
    Write-Host "❌ Problèmes de sécurité CRITIQUES détectés !" -ForegroundColor Red
    Write-Host "ACTION REQUISE: Corriger les credentials hardcodés" -ForegroundColor Red
    $score = "C"
}

Write-Host ""
Write-Host "Score de sécurité: $score" -ForegroundColor $(if ($score -match "A") { "Green" } elseif ($score -eq "B") { "Yellow" } else { "Red" })
Write-Host ""

# Recommandations
if ($warningCount -gt 0 -or $errorCount -gt 0) {
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "RECOMMANDATIONS" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    if ($errorCount -gt 0) {
        Write-Host "🚨 URGENT - Credentials hardcodés:" -ForegroundColor Red
        Write-Host "   1. Supprimer IMMÉDIATEMENT les credentials du code" -ForegroundColor Gray
        Write-Host "   2. Utiliser des variables d'environnement" -ForegroundColor Gray
        Write-Host "   3. Ne JAMAIS committer de secrets dans le code" -ForegroundColor Gray
        Write-Host ""
    }
    
    if ($warningCount -gt 0) {
        Write-Host "💡 console.log détectés (non bloquant):" -ForegroundColor Yellow
        Write-Host "   - En production, ils sont automatiquement supprimés par l'obfuscation" -ForegroundColor Gray
        Write-Host "   - Optionnel: Utiliser LoggerService pour plus de contrôle" -ForegroundColor Gray
        Write-Host "   - Build de production: ng build --configuration=production" -ForegroundColor Gray
        Write-Host ""
        
        Write-Host "📝 Pour migrer vers LoggerService:" -ForegroundColor Yellow
        Write-Host "   1. Importer: import { LoggerService } from '@/services/logger.service';" -ForegroundColor Gray
        Write-Host "   2. Injecter: constructor(private logger: LoggerService) {}" -ForegroundColor Gray
        Write-Host "   3. Utiliser: this.logger.log('message') au lieu de console.log()" -ForegroundColor Gray
        Write-Host ""
    }
}

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Info: Pour plus de détails, consultez SECURITE_JAVASCRIPT_GUIDE.md" -ForegroundColor Cyan
Write-Host ""

# Code de sortie
if ($Strict) {
    exit ($errorCount + $warningCount)
} else {
    exit $errorCount
}






