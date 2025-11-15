#!/bin/bash
# Script d'automatisation des tests de sécurité
# Application de Réconciliation

set -e

# Couleurs pour l'output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="${BACKEND_URL:-http://localhost:8080}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:4200}"
BACKEND_DIR="reconciliation-app/backend"
FRONTEND_DIR="reconciliation-app/frontend"
REPORTS_DIR="security-reports/$(date +%Y%m%d_%H%M%S)"
TEST_USER="${TEST_USER:-admin}"
TEST_PASS="${TEST_PASS:-admin}"

echo -e "${BLUE}🔒 Démarrage des tests de sécurité${NC}"
echo "=================================="
echo "Backend URL: $BACKEND_URL"
echo "Frontend URL: $FRONTEND_URL"
echo "Rapports: $REPORTS_DIR"
echo ""

# Créer le répertoire de rapports
mkdir -p "$REPORTS_DIR"

# Fonction pour afficher les résultats
print_section() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 1. Vérification des outils
print_section "1. Vérification des outils installés"

check_tool() {
    if command -v "$1" &> /dev/null; then
        print_success "$1 est installé"
        return 0
    else
        print_error "$1 n'est pas installé"
        return 1
    fi
}

TOOLS_INSTALLED=0
TOOLS_MISSING=0

check_tool "docker" && ((TOOLS_INSTALLED++)) || ((TOOLS_MISSING++))
check_tool "npm" && ((TOOLS_INSTALLED++)) || ((TOOLS_MISSING++))
check_tool "mvn" && ((TOOLS_INSTALLED++)) || ((TOOLS_MISSING++))
check_tool "curl" && ((TOOLS_INSTALLED++)) || ((TOOLS_MISSING++))
check_tool "git" && ((TOOLS_INSTALLED++)) || ((TOOLS_MISSING++))

echo ""
echo "Outils installés: $TOOLS_INSTALLED"
echo "Outils manquants: $TOOLS_MISSING"

if [ $TOOLS_MISSING -gt 0 ]; then
    print_warning "Certains outils sont manquants. Les tests peuvent être incomplets."
fi

# 2. Scan des dépendances
print_section "2. Scan des vulnérabilités des dépendances"

if [ -d "$BACKEND_DIR" ]; then
    echo "Scan des dépendances Java..."
    if [ -f "$BACKEND_DIR/pom.xml" ]; then
        cd "$BACKEND_DIR"
        if check_tool "mvn"; then
            mvn org.owasp:dependency-check-maven:check -DskipTests \
                -Dformat=HTML -Dformat=JSON \
                -DoutputDirectory="../../$REPORTS_DIR/dependency-check-backend" 2>&1 | \
                tee "../../$REPORTS_DIR/dependency-check-backend.log" || \
                print_warning "Dependency-Check a échoué (plugin peut-être non configuré)"
        fi
        cd - > /dev/null
    fi
fi

if [ -d "$FRONTEND_DIR" ]; then
    echo "Scan des dépendances Node.js..."
    if [ -f "$FRONTEND_DIR/package.json" ]; then
        cd "$FRONTEND_DIR"
        if check_tool "npm"; then
            npm audit --json > "../$REPORTS_DIR/npm-audit.json" 2>&1 || true
            npm audit > "../$REPORTS_DIR/npm-audit.txt" 2>&1 || true
            print_success "Scan npm audit terminé"
        fi
        cd - > /dev/null
    fi
fi

# 3. Recherche de secrets dans le code
print_section "3. Recherche de secrets dans le code"

if command -v "truffleHog" &> /dev/null; then
    echo "Recherche de secrets avec TruffleHog..."
    truffleHog --regex --entropy=False --json . 2>&1 | \
        tee "$REPORTS_DIR/secrets-trufflehog.json" > /dev/null || true
    truffleHog --regex --entropy=False . 2>&1 | \
        tee "$REPORTS_DIR/secrets-trufflehog.txt" > /dev/null || true
    print_success "Recherche de secrets terminée"
else
    echo "Recherche basique de secrets avec grep..."
    echo "Recherche de mots de passe en clair..." > "$REPORTS_DIR/secrets-grep.txt"
    grep -r -i "password.*=" "$BACKEND_DIR/src/main/resources" 2>/dev/null | \
        tee -a "$REPORTS_DIR/secrets-grep.txt" || true
    grep -r -i "secret.*=" . --include="*.properties" --include="*.yml" --include="*.yaml" 2>/dev/null | \
        tee -a "$REPORTS_DIR/secrets-grep.txt" || true
    print_warning "TruffleHog non installé, recherche basique effectuée"
fi

# 4. Tests d'endpoints API
print_section "4. Tests d'accessibilité des endpoints"

echo "Test de connectivité backend..."
if curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/health" | grep -q "200"; then
    print_success "Backend accessible"
else
    print_error "Backend non accessible à $BACKEND_URL"
fi

# Test des endpoints sans authentification
echo "Test des endpoints sans authentification..."
ENDPOINTS=(
    "/api/users"
    "/api/operations"
    "/api/accounts"
    "/api/rankings"
    "/api/auth/login"
)

for endpoint in "${ENDPOINTS[@]}"; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL$endpoint" || echo "000")
    if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
        print_success "$endpoint protégé (HTTP $HTTP_CODE)"
    elif [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
        print_warning "$endpoint accessible sans authentification (HTTP $HTTP_CODE)"
        echo "$endpoint: HTTP $HTTP_CODE" >> "$REPORTS_DIR/endpoints-unprotected.txt"
    else
        print_warning "$endpoint réponse inattendue (HTTP $HTTP_CODE)"
    fi
done

# 5. Tests CORS
print_section "5. Tests de configuration CORS"

echo "Test CORS avec origine non autorisée..."
CORS_TEST=$(curl -s -H "Origin: https://evil.com" \
    -H "Access-Control-Request-Method: POST" \
    -X OPTIONS "$BACKEND_URL/api/users" \
    -w "\nHTTP_CODE:%{http_code}" || echo "FAILED")

if echo "$CORS_TEST" | grep -q "Access-Control-Allow-Origin.*\*"; then
    print_error "CORS ouvert (*) détecté - vulnérabilité"
    echo "$CORS_TEST" >> "$REPORTS_DIR/cors-vulnerable.txt"
elif echo "$CORS_TEST" | grep -q "Access-Control-Allow-Origin"; then
    CORS_ORIGIN=$(echo "$CORS_TEST" | grep -i "access-control-allow-origin" | head -1)
    print_warning "CORS configuré: $CORS_ORIGIN"
    echo "$CORS_TEST" >> "$REPORTS_DIR/cors-config.txt"
else
    print_success "CORS strict (pas de header CORS pour origine non autorisée)"
fi

# 6. Tests SSL/TLS (si HTTPS)
print_section "6. Tests SSL/TLS"

if echo "$BACKEND_URL" | grep -q "https"; then
    if command -v "testssl.sh" &> /dev/null; then
        echo "Test SSL/TLS avec testssl.sh..."
        DOMAIN=$(echo "$BACKEND_URL" | sed -e 's|^[^/]*//||' -e 's|/.*$||')
        ./testssl.sh "$DOMAIN" > "$REPORTS_DIR/testssl.txt" 2>&1 || \
            print_warning "testssl.sh a échoué"
    else
        print_warning "testssl.sh non installé, tests SSL ignorés"
    fi
else
    print_warning "Backend non HTTPS, tests SSL ignorés"
fi

# 7. Scan OWASP ZAP (si Docker disponible)
print_section "7. Scan OWASP ZAP"

if command -v "docker" &> /dev/null; then
    echo "Démarrage du scan OWASP ZAP..."
    if docker ps &> /dev/null; then
        docker run --rm -v "$(pwd)/$REPORTS_DIR:/zap/wrk/:rw" \
            -t owasp/zap2docker-stable zap-baseline.py \
            -t "$BACKEND_URL" \
            -g gen.conf \
            -r zap-report.html \
            -J zap-report.json 2>&1 | \
            tee "$REPORTS_DIR/zap-scan.log" || \
            print_warning "Scan ZAP terminé avec des erreurs (peut être normal)"
        
        # Déplacer les rapports
        if [ -f "$REPORTS_DIR/zap-report.html" ]; then
            print_success "Rapport ZAP généré"
        fi
    else
        print_warning "Docker n'est pas accessible (permissions?)"
    fi
else
    print_warning "Docker non installé, scan ZAP ignoré"
fi

# 8. Tests de headers de sécurité
print_section "8. Vérification des headers de sécurité"

SECURITY_HEADERS=(
    "X-Content-Type-Options"
    "X-Frame-Options"
    "X-XSS-Protection"
    "Strict-Transport-Security"
    "Content-Security-Policy"
)

echo "Vérification des headers de sécurité..." > "$REPORTS_DIR/security-headers.txt"
for header in "${SECURITY_HEADERS[@]}"; do
    HEADER_VALUE=$(curl -s -I "$BACKEND_URL/api/auth/login" | grep -i "$header" || echo "")
    if [ -z "$HEADER_VALUE" ]; then
        print_warning "Header manquant: $header"
        echo "❌ $header: MANQUANT" >> "$REPORTS_DIR/security-headers.txt"
    else
        print_success "Header présent: $header"
        echo "✅ $header_VALUE" >> "$REPORTS_DIR/security-headers.txt"
    fi
done

# 9. Scan Trivy (images Docker)
print_section "9. Scan des images Docker"

if command -v "docker" &> /dev/null && command -v "trivy" &> /dev/null; then
    echo "Scan des images Docker avec Trivy..."
    if docker images | grep -q "reconciliation"; then
        IMAGES=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep "reconciliation")
        for image in $IMAGES; do
            echo "Scan de $image..."
            IMAGE_NAME=$(echo "$image" | tr '/:' '_')
            trivy image --format json --output "$REPORTS_DIR/trivy-$IMAGE_NAME.json" "$image" 2>&1 | \
                tee "$REPORTS_DIR/trivy-$IMAGE_NAME.log" || true
            trivy image "$image" 2>&1 | \
                tee "$REPORTS_DIR/trivy-$IMAGE_NAME.txt" || true
        done
        print_success "Scan Trivy terminé"
    else
        print_warning "Aucune image Docker 'reconciliation' trouvée"
    fi
else
    print_warning "Trivy ou Docker non installé, scan Docker ignoré"
fi

# 10. Résumé
print_section "10. Résumé des tests"

echo -e "${BLUE}Rapports générés dans: $REPORTS_DIR${NC}"
echo ""
echo "Fichiers générés:"
ls -lh "$REPORTS_DIR" 2>/dev/null | tail -n +2 | awk '{print "  - " $9 " (" $5 ")"}'
echo ""

# Compter les vulnérabilités
VULN_COUNT=0
if [ -f "$REPORTS_DIR/npm-audit.json" ]; then
    VULNS=$(cat "$REPORTS_DIR/npm-audit.json" | grep -c "vulnerabilities" || echo "0")
    if [ "$VULNS" -gt 0 ]; then
        print_warning "Vulnérabilités npm trouvées: $VULNS"
        ((VULN_COUNT+=$VULNS))
    fi
fi

print_success "Tests de sécurité terminés!"
echo ""
echo "Prochaines étapes:"
echo "1. Examiner les rapports dans $REPORTS_DIR"
echo "2. Corriger les vulnérabilités critiques"
echo "3. Réexécuter les tests après correction"
echo ""
echo -e "${YELLOW}Note: Ce script effectue des tests automatisés basiques.${NC}"
echo -e "${YELLOW}Des tests manuels approfondis sont recommandés avec Burp Suite ou OWASP ZAP.${NC}"

