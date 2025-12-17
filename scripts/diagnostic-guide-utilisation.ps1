# Script de diagnostic pour le Guide d'Utilisation
# Ce script vérifie l'état de l'application et de la base de données

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DIAGNOSTIC - GUIDE D'UTILISATION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$backendUrl = "https://reconciliation.intouchgroup.net:8443"
$frontendUrl = "https://reconciliation.intouchgroup.net:4200"
$apiEndpoint = "$backendUrl/api/guide-nodes"

# Fonction pour afficher un résultat
function Show-Result {
    param(
        [string]$Test,
        [bool]$Success,
        [string]$Message = ""
    )
    
    $icon = if ($Success) { "✅" } else { "❌" }
    $color = if ($Success) { "Green" } else { "Red" }
    
    Write-Host "$icon $Test" -ForegroundColor $color
    if ($Message) {
        Write-Host "   └─ $Message" -ForegroundColor Gray
    }
}

# Test 1 : Vérifier si le backend est accessible
Write-Host "`n[1/5] Vérification de l'accessibilité du backend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$backendUrl/health" -Method Get -TimeoutSec 5 -SkipCertificateCheck -ErrorAction Stop
    Show-Result "Backend accessible" $true "Port 8443 répond correctement"
} catch {
    Show-Result "Backend accessible" $false "Impossible de joindre le backend sur le port 8443"
    Write-Host "   └─ Vérifiez que l'application Spring Boot est démarrée" -ForegroundColor Yellow
}

# Test 2 : Vérifier l'endpoint de diagnostic
Write-Host "`n[2/5] Vérification de l'endpoint de diagnostic..." -ForegroundColor Yellow
try {
    $diagnosticResponse = Invoke-RestMethod -Uri "$apiEndpoint/diagnostic" -Method Get -SkipCertificateCheck -ErrorAction Stop
    
    if ($diagnosticResponse.success) {
        Show-Result "Endpoint de diagnostic" $true "API répond correctement"
        
        $diag = $diagnosticResponse.diagnostic
        Write-Host ""
        Write-Host "   📊 RÉSULTATS DU DIAGNOSTIC :" -ForegroundColor Cyan
        Write-Host "   ├─ Nœud racine existe : $($diag.rootExists)" -ForegroundColor White
        Write-Host "   ├─ Nombre total de nœuds : $($diag.totalNodes)" -ForegroundColor White
        Write-Host "   ├─ Nœuds orphelins : $($diag.orphansCount)" -ForegroundColor White
        
        if ($diag.totalNodes -eq 0) {
            Write-Host "   └─ ⚠️  La base de données est VIDE" -ForegroundColor Yellow
        } elseif ($diag.totalNodes -eq 1 -and $diag.rootExists) {
            Write-Host "   └─ ⚠️  Seul le nœud racine existe, aucun guide créé" -ForegroundColor Yellow
        } else {
            Write-Host "   └─ ✅ La base contient des guides" -ForegroundColor Green
        }
        
        if ($diag.nodes -and $diag.nodes.Count -gt 0) {
            Write-Host ""
            Write-Host "   📝 LISTE DES GUIDES :" -ForegroundColor Cyan
            foreach ($node in $diag.nodes) {
                $indent = if ($node.parentNodeId) { "      " } else { "   " }
                Write-Host "$indent├─ [$($node.nodeId)] $($node.label)" -ForegroundColor White
            }
        }
    } else {
        Show-Result "Endpoint de diagnostic" $false $diagnosticResponse.error
    }
} catch {
    Show-Result "Endpoint de diagnostic" $false "Erreur lors de l'appel à l'API : $($_.Exception.Message)"
}

# Test 3 : Vérifier la structure des guides
Write-Host "`n[3/5] Vérification de la structure des guides..." -ForegroundColor Yellow
try {
    $structureResponse = Invoke-RestMethod -Uri "$apiEndpoint/structure" -Method Get -SkipCertificateCheck -ErrorAction Stop
    
    if ($structureResponse.success) {
        $childrenCount = 0
        if ($structureResponse.structure.children) {
            $childrenCount = $structureResponse.structure.children.Count
        }
        
        if ($childrenCount -gt 0) {
            Show-Result "Structure des guides" $true "$childrenCount guide(s) trouvé(s)"
        } else {
            Show-Result "Structure des guides" $false "Aucun guide dans la structure"
        }
    } else {
        Show-Result "Structure des guides" $false $structureResponse.error
    }
} catch {
    Show-Result "Structure des guides" $false "Erreur lors de la récupération : $($_.Exception.Message)"
}

# Test 4 : Vérifier la base de données MySQL
Write-Host "`n[4/5] Vérification de la connexion MySQL..." -ForegroundColor Yellow
$mysqlPath = "mysql"
$mysqlAvailable = $false

try {
    $null = Get-Command mysql -ErrorAction Stop
    $mysqlAvailable = $true
    Show-Result "MySQL CLI disponible" $true "Client MySQL détecté"
} catch {
    Show-Result "MySQL CLI disponible" $false "Client MySQL non trouvé dans le PATH"
}

if ($mysqlAvailable) {
    Write-Host "   └─ Vous pouvez exécuter le script SQL de diagnostic :" -ForegroundColor Gray
    Write-Host "      mysql -u root -p top20 < scripts\check-guide-database.sql" -ForegroundColor Cyan
}

# Test 5 : Vérifier le frontend
Write-Host "`n[5/5] Vérification de l'accessibilité du frontend..." -ForegroundColor Yellow
try {
    $null = Invoke-WebRequest -Uri $frontendUrl -Method Get -TimeoutSec 5 -SkipCertificateCheck -ErrorAction Stop
    Show-Result "Frontend accessible" $true "$frontendUrl est accessible"
} catch {
    Show-Result "Frontend accessible" $false "Impossible de joindre le frontend"
}

# Résumé et recommandations
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RÉSUMÉ ET RECOMMANDATIONS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($diagnosticResponse -and $diagnosticResponse.diagnostic) {
    $totalNodes = $diagnosticResponse.diagnostic.totalNodes
    
    if ($totalNodes -eq 0) {
        Write-Host "⚠️  PROBLÈME DÉTECTÉ : Base de données vide" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Solutions possibles :" -ForegroundColor White
        Write-Host "1. Initialiser via l'API :" -ForegroundColor White
        Write-Host "   Invoke-RestMethod -Uri '$apiEndpoint/initialize' -Method Post -SkipCertificateCheck" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "2. Redémarrer le backend (initialisation automatique)" -ForegroundColor White
        Write-Host ""
        Write-Host "3. Utiliser l'interface web pour créer des guides" -ForegroundColor White
        Write-Host "   Ouvrez : $frontendUrl/guide-utilisation" -ForegroundColor Cyan
        Write-Host "   Cliquez sur 'Ajouter un nouveau guide'" -ForegroundColor Cyan
        
    } elseif ($totalNodes -eq 1) {
        Write-Host "ℹ️  Base de données initialisée mais vide" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "La base contient uniquement le nœud racine." -ForegroundColor White
        Write-Host "Pour créer des guides, ouvrez l'interface web :" -ForegroundColor White
        Write-Host "   $frontendUrl/guide-utilisation" -ForegroundColor Cyan
        
    } else {
        Write-Host "✅ TOUT SEMBLE FONCTIONNER CORRECTEMENT" -ForegroundColor Green
        Write-Host ""
        Write-Host "La base de données contient $totalNodes nœud(s)." -ForegroundColor White
        Write-Host "Les guides devraient s'afficher sur :" -ForegroundColor White
        Write-Host "   $frontendUrl/guide-utilisation" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Si les guides ne s'affichent pas :" -ForegroundColor Yellow
        Write-Host "1. Vérifiez la console du navigateur (F12)" -ForegroundColor White
        Write-Host "2. Actualisez la page (Ctrl+F5)" -ForegroundColor White
        Write-Host "3. Vérifiez les logs du backend" -ForegroundColor White
    }
} else {
    Write-Host "❌ PROBLÈME DE CONNEXION" -ForegroundColor Red
    Write-Host ""
    Write-Host "Impossible de se connecter au backend." -ForegroundColor White
    Write-Host "Vérifications à faire :" -ForegroundColor White
    Write-Host "1. Le backend Spring Boot est-il démarré ?" -ForegroundColor White
    Write-Host "2. Le port 8443 est-il accessible ?" -ForegroundColor White
    Write-Host "3. Le certificat SSL est-il valide ?" -ForegroundColor White
    Write-Host "4. La configuration CORS est-elle correcte ?" -ForegroundColor White
}

Write-Host ""
Write-Host "📚 Pour plus d'informations, consultez :" -ForegroundColor Cyan
Write-Host "   GUIDE_UTILISATION_DIAGNOSTIC.md" -ForegroundColor White
Write-Host ""

# Proposer d'initialiser automatiquement
if ($diagnosticResponse -and $diagnosticResponse.diagnostic.totalNodes -eq 0) {
    Write-Host ""
    $response = Read-Host "Voulez-vous initialiser la base de données maintenant ? (O/N)"
    
    if ($response -eq "O" -or $response -eq "o") {
        Write-Host ""
        Write-Host "Initialisation en cours..." -ForegroundColor Yellow
        try {
            $initResponse = Invoke-RestMethod -Uri "$apiEndpoint/initialize" -Method Post -SkipCertificateCheck
            
            if ($initResponse.success) {
                Write-Host "✅ Initialisation réussie !" -ForegroundColor Green
                Write-Host "   $($initResponse.message)" -ForegroundColor White
                Write-Host ""
                Write-Host "Vous pouvez maintenant ouvrir l'interface :" -ForegroundColor White
                Write-Host "   $frontendUrl/guide-utilisation" -ForegroundColor Cyan
            } else {
                Write-Host "❌ Échec de l'initialisation" -ForegroundColor Red
                Write-Host "   $($initResponse.error)" -ForegroundColor White
            }
        } catch {
            Write-Host "❌ Erreur lors de l'initialisation : $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host ""
