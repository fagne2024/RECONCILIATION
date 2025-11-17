#!/bin/bash

# Script pour générer un certificat SSL auto-signé pour l'application de réconciliation
# Usage: ./generate-self-signed-cert.sh [domaine]

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration par défaut
DOMAIN="${1:-reconciliation-app.local}"
CERT_DIR="/etc/ssl/reconciliation-app"
DAYS=365
KEY_SIZE=2048

echo -e "${GREEN}=== Génération de certificat SSL auto-signé ===${NC}"
echo "Domaine: $DOMAIN"
echo "Répertoire: $CERT_DIR"
echo "Durée de validité: $DAYS jours"
echo ""

# Vérifier si OpenSSL est installé
if ! command -v openssl &> /dev/null; then
    echo -e "${RED}Erreur: OpenSSL n'est pas installé.${NC}"
    echo "Installez OpenSSL avec: sudo apt-get install openssl (Ubuntu/Debian)"
    exit 1
fi

# Créer le répertoire si nécessaire
if [ ! -d "$CERT_DIR" ]; then
    echo "Création du répertoire $CERT_DIR..."
    sudo mkdir -p "$CERT_DIR"
    sudo chmod 700 "$CERT_DIR"
fi

cd "$CERT_DIR"

# Demander les informations pour le certificat
echo -e "${YELLOW}Informations pour le certificat:${NC}"
read -p "Pays (code à 2 lettres, ex: CI): " COUNTRY
COUNTRY=${COUNTRY:-CI}

read -p "État/Région (ex: Abidjan): " STATE
STATE=${STATE:-Abidjan}

read -p "Ville (ex: Abidjan): " CITY
CITY=${CITY:-Abidjan}

read -p "Organisation (ex: Intouchgroup): " ORG
ORG=${ORG:-Intouchgroup}

read -p "Unité organisationnelle (ex: IT): " OU
OU=${OU:-IT}

# Générer la clé privée
echo ""
echo -e "${GREEN}Génération de la clé privée...${NC}"
sudo openssl genrsa -out reconciliation-app.key $KEY_SIZE
sudo chmod 600 reconciliation-app.key

# Générer le certificat
echo -e "${GREEN}Génération du certificat...${NC}"
sudo openssl req -new -x509 \
    -key reconciliation-app.key \
    -out reconciliation-app.crt \
    -days $DAYS \
    -subj "/C=$COUNTRY/ST=$STATE/L=$CITY/O=$ORG/OU=$OU/CN=$DOMAIN"

# Créer le fullchain
echo -e "${GREEN}Création du fichier fullchain...${NC}"
sudo cp reconciliation-app.crt reconciliation-app.fullchain.pem
sudo chmod 644 reconciliation-app.crt reconciliation-app.fullchain.pem

# Afficher les informations du certificat
echo ""
echo -e "${GREEN}=== Certificat généré avec succès ===${NC}"
echo ""
echo "Fichiers créés:"
echo "  - Clé privée: $CERT_DIR/reconciliation-app.key"
echo "  - Certificat: $CERT_DIR/reconciliation-app.crt"
echo "  - Fullchain: $CERT_DIR/reconciliation-app.fullchain.pem"
echo ""

# Afficher les détails du certificat
echo -e "${GREEN}Détails du certificat:${NC}"
sudo openssl x509 -in reconciliation-app.crt -text -noout | grep -A 2 "Subject:"

# Instructions pour Nginx
echo ""
echo -e "${YELLOW}=== Configuration Nginx ===${NC}"
echo "Ajoutez ces lignes dans votre configuration Nginx:"
echo ""
echo "ssl_certificate $CERT_DIR/reconciliation-app.fullchain.pem;"
echo "ssl_certificate_key $CERT_DIR/reconciliation-app.key;"
echo ""

# Instructions pour Spring Boot (optionnel)
echo -e "${YELLOW}=== Configuration Spring Boot (optionnel) ===${NC}"
echo "Pour utiliser HTTPS directement dans Spring Boot:"
echo ""
echo "1. Convertir en format PKCS12:"
echo "   openssl pkcs12 -export -in $CERT_DIR/reconciliation-app.crt \\"
echo "     -inkey $CERT_DIR/reconciliation-app.key \\"
echo "     -out reconciliation-app.p12 \\"
echo "     -name reconciliation-app \\"
echo "     -password pass:VOTRE_MOT_DE_PASSE"
echo ""
echo "2. Copier reconciliation-app.p12 dans src/main/resources/"
echo "3. Configurer application.properties avec:"
echo "   server.ssl.enabled=true"
echo "   server.ssl.key-store=classpath:reconciliation-app.p12"
echo "   server.ssl.key-store-password=VOTRE_MOT_DE_PASSE"
echo ""

echo -e "${GREEN}Terminé!${NC}"

