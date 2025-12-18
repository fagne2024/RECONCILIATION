#!/bin/bash

# Script Bash pour vérifier les en-têtes de sécurité HTTP
# Usage: ./test-security-headers.sh [URL]

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# URL à tester (par défaut: localhost)
URL="${1:-http://localhost:80}"

# Mode verbose
VERBOSE="${2:-false}"

echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Vérification des En-têtes de Sécurité HTTP                  ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}URL testée: ${URL}${NC}"
echo ""

# Vérifier que curl est installé
if ! command -v curl &> /dev/null; then
    echo -e "${RED}❌ ERREUR: curl n'est pas installé${NC}"
    echo ""
    echo -e "${YELLOW}Installation:${NC}"
    echo -e "${GRAY}  Ubuntu/Debian: sudo apt-get install curl${NC}"
    echo -e "${GRAY}  CentOS/RHEL: sudo yum install curl${NC}"
    echo -e "${GRAY}  macOS: brew install curl${NC}"
    echo ""
    exit 1
fi

# Effectuer la requête et récupérer les en-têtes
echo -e "${CYAN}Récupération des en-têtes...${NC}"
echo ""

HEADERS=$(curl -s -I "$URL" 2>&1)

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ ERREUR lors de la connexion à ${URL}${NC}"
    echo ""
    echo -e "${YELLOW}Détails de l'erreur:${NC}"
    echo -e "${GRAY}${HEADERS}${NC}"
    echo ""
    echo -e "${YELLOW}Vérifiez que:${NC}"
    echo -e "${GRAY}  - L'URL est correcte${NC}"
    echo -e "${GRAY}  - Le serveur est en cours d'exécution${NC}"
    echo -e "${GRAY}  - Vous avez accès au serveur${NC}"
    echo ""
    exit 1
fi

# Fonction pour vérifier un en-tête
check_security_header() {
    local header_name="$1"
    local expected_pattern="$2"
    local description="$3"
    local critical="$4"
    
    # Rechercher l'en-tête (insensible à la casse)
    local header_value=$(echo "$HEADERS" | grep -i "^${header_name}:" | cut -d' ' -f2- | tr -d '\r\n')
    
    if [ -n "$header_value" ]; then
        if echo "$header_value" | grep -qiE "$expected_pattern"; then
            echo -e "${GREEN}✅ OK${NC} ${WHITE}${header_name}${NC}"
            echo -e "${GRAY}    ${description}${NC}"
            if [ "$VERBOSE" = "true" ]; then
                echo -e "${GRAY}    Valeur: ${header_value}${NC}"
            fi
            echo ""
            return 0
        else
            echo -e "${YELLOW}⚠️  PRÉSENT (valeur incorrecte)${NC} ${WHITE}${header_name}${NC}"
            echo -e "${GRAY}    ${description}${NC}"
            if [ "$VERBOSE" = "true" ]; then
                echo -e "${GRAY}    Valeur: ${header_value}${NC}"
            fi
            echo ""
            return 1
        fi
    else
        if [ "$critical" = "true" ]; then
            echo -e "${RED}❌ ABSENT${NC} ${WHITE}${header_name}${NC}"
        else
            echo -e "${YELLOW}⚠️  ABSENT (recommandé)${NC} ${WHITE}${header_name}${NC}"
        fi
        echo -e "${GRAY}    ${description}${NC}"
        echo ""
        return 1
    fi
}

# Fonction pour vérifier les en-têtes non désirés
check_unwanted_header() {
    local header_name="$1"
    
    local header_value=$(echo "$HEADERS" | grep -i "^${header_name}:" | cut -d' ' -f2- | tr -d '\r\n')
    
    if [ -n "$header_value" ]; then
        echo -e "${RED}❌ PRÉSENT${NC} ${WHITE}${header_name}${NC}"
        echo -e "${GRAY}    Divulgation d'informations sur le serveur${NC}"
        if [ "$VERBOSE" = "true" ]; then
            echo -e "${GRAY}    Valeur: ${header_value}${NC}"
        fi
        echo ""
        return 1
    else
        echo -e "${GREEN}✅ MASQUÉ${NC} ${WHITE}${header_name}${NC}"
        echo -e "${GRAY}    En-tête correctement masqué${NC}"
        echo ""
        return 0
    fi
}

# Tester les en-têtes de sécurité
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}EN-TÊTES DE SÉCURITÉ ATTENDUS${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

SUCCESS_COUNT=0
TOTAL_COUNT=7

check_security_header "X-Frame-Options" "DENY|SAMEORIGIN" "Protection contre le clickjacking" "true" && ((SUCCESS_COUNT++))
check_security_header "X-Content-Type-Options" "nosniff" "Protection contre le MIME type sniffing" "true" && ((SUCCESS_COUNT++))
check_security_header "X-XSS-Protection" "1; mode=block|1;mode=block" "Protection XSS" "true" && ((SUCCESS_COUNT++))
check_security_header "Strict-Transport-Security" "max-age=" "Force l'utilisation de HTTPS (HSTS)" "false" && ((SUCCESS_COUNT++))
check_security_header "Referrer-Policy" "strict-origin-when-cross-origin|no-referrer|same-origin" "Contrôle des informations de référent" "true" && ((SUCCESS_COUNT++))
check_security_header "Permissions-Policy" "geolocation=" "Contrôle des fonctionnalités du navigateur" "true" && ((SUCCESS_COUNT++))
check_security_header "Content-Security-Policy" "default-src" "Politique de sécurité du contenu (CSP)" "true" && ((SUCCESS_COUNT++))

# Tester les en-têtes non désirés
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}EN-TÊTES À MASQUER (Divulgation d'informations)${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

HIDDEN_COUNT=0
UNWANTED_COUNT=2

check_unwanted_header "X-Powered-By" && ((HIDDEN_COUNT++))
check_unwanted_header "Server" && ((HIDDEN_COUNT++))

# Résumé
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}RÉSUMÉ${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

PERCENTAGE=$((SUCCESS_COUNT * 100 / TOTAL_COUNT))
HIDDEN_PERCENTAGE=$((HIDDEN_COUNT * 100 / UNWANTED_COUNT))

echo -n "En-têtes de sécurité: "
if [ $PERCENTAGE -ge 90 ]; then
    echo -e "${GREEN}${SUCCESS_COUNT}/${TOTAL_COUNT} (${PERCENTAGE}%) ✅ EXCELLENT${NC}"
elif [ $PERCENTAGE -ge 70 ]; then
    echo -e "${YELLOW}${SUCCESS_COUNT}/${TOTAL_COUNT} (${PERCENTAGE}%) ⚠️  BON${NC}"
else
    echo -e "${RED}${SUCCESS_COUNT}/${TOTAL_COUNT} (${PERCENTAGE}%) ❌ INSUFFISANT${NC}"
fi

echo -n "En-têtes masqués: "
if [ $HIDDEN_PERCENTAGE -eq 100 ]; then
    echo -e "${GREEN}${HIDDEN_COUNT}/${UNWANTED_COUNT} (${HIDDEN_PERCENTAGE}%) ✅ PARFAIT${NC}"
else
    echo -e "${YELLOW}${HIDDEN_COUNT}/${UNWANTED_COUNT} (${HIDDEN_PERCENTAGE}%) ⚠️  À AMÉLIORER${NC}"
fi

echo ""

# Score global
GLOBAL_SCORE=$(((SUCCESS_COUNT + HIDDEN_COUNT) * 100 / (TOTAL_COUNT + UNWANTED_COUNT)))
echo -n "Score global de sécurité: "

if [ $GLOBAL_SCORE -ge 90 ]; then
    echo -e "${GREEN}${GLOBAL_SCORE}% - 🏆 A+${NC}"
elif [ $GLOBAL_SCORE -ge 80 ]; then
    echo -e "${GREEN}${GLOBAL_SCORE}% - ✅ A${NC}"
elif [ $GLOBAL_SCORE -ge 70 ]; then
    echo -e "${YELLOW}${GLOBAL_SCORE}% - ⚠️  B${NC}"
elif [ $GLOBAL_SCORE -ge 60 ]; then
    echo -e "${YELLOW}${GLOBAL_SCORE}% - ⚠️  C${NC}"
else
    echo -e "${RED}${GLOBAL_SCORE}% - ❌ D${NC}"
fi

echo ""

# Recommandations
if [ $GLOBAL_SCORE -lt 90 ]; then
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}RECOMMANDATIONS${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    
    if [ $SUCCESS_COUNT -lt $TOTAL_COUNT ]; then
        echo -e "${YELLOW}📝 Consultez le fichier SECURITE_HTTP_HEADERS.md pour:${NC}"
        echo -e "${GRAY}   - Configurer les en-têtes manquants${NC}"
        echo -e "${GRAY}   - Améliorer les en-têtes existants${NC}"
        echo ""
    fi
    
    if [ $HIDDEN_COUNT -lt $UNWANTED_COUNT ]; then
        echo -e "${YELLOW}🔒 Masquez les en-têtes divulguant des informations:${NC}"
        echo -e "${GRAY}   - Nginx: server_tokens off; proxy_hide_header X-Powered-By;${NC}"
        echo -e "${GRAY}   - Apache: Header always unset X-Powered-By; ServerTokens Prod;${NC}"
        echo ""
    fi
    
    if ! echo "$HEADERS" | grep -qi "^Strict-Transport-Security:" && echo "$URL" | grep -q "^https://"; then
        echo -e "${YELLOW}⚠️  HSTS non configuré alors que vous utilisez HTTPS${NC}"
        echo -e "${GRAY}   Ajoutez: Strict-Transport-Security: max-age=31536000; includeSubDomains${NC}"
        echo ""
    fi
fi

# Afficher tous les en-têtes si mode verbose
if [ "$VERBOSE" = "true" ]; then
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}TOUS LES EN-TÊTES DE RÉPONSE${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "$HEADERS"
    echo ""
fi

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}💡 Conseil: Ajoutez 'verbose' comme 2e paramètre pour voir tous les en-têtes${NC}"
echo -e "${GRAY}   Exemple: ./test-security-headers.sh '${URL}' verbose${NC}"
echo ""

# Code de sortie basé sur le score
if [ $GLOBAL_SCORE -ge 80 ]; then
    exit 0
else
    exit 1
fi



