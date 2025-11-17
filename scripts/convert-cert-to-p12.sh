#!/bin/bash

# Script pour convertir un certificat SSL en format PKCS12 pour Spring Boot
# Usage: ./convert-cert-to-p12.sh [chemin-cert] [chemin-key]

set -e

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Chemins par défaut
CERT_DIR="${1:-/etc/ssl/reconciliation-app}"
CERT_FILE="$CERT_DIR/reconciliation-app.crt"
KEY_FILE="$CERT_DIR/reconciliation-app.key"
OUTPUT_FILE="reconciliation-app.p12"

echo -e "${GREEN}=== Conversion en format PKCS12 ===${NC}"

# Vérifier si les fichiers existent
if [ ! -f "$CERT_FILE" ]; then
    echo -e "${RED}Erreur: Fichier certificat non trouvé: $CERT_FILE${NC}"
    exit 1
fi

if [ ! -f "$KEY_FILE" ]; then
    echo -e "${RED}Erreur: Fichier clé non trouvé: $KEY_FILE${NC}"
    exit 1
fi

# Demander le mot de passe
echo -e "${YELLOW}Entrez un mot de passe pour le fichier PKCS12:${NC}"
read -s PASSWORD
echo ""

if [ -z "$PASSWORD" ]; then
    echo -e "${RED}Erreur: Le mot de passe ne peut pas être vide${NC}"
    exit 1
fi

# Convertir
echo -e "${GREEN}Conversion en cours...${NC}"
openssl pkcs12 -export \
    -in "$CERT_FILE" \
    -inkey "$KEY_FILE" \
    -out "$OUTPUT_FILE" \
    -name "reconciliation-app" \
    -password "pass:$PASSWORD"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}=== Conversion réussie ===${NC}"
    echo ""
    echo "Fichier créé: $OUTPUT_FILE"
    echo ""
    echo "Prochaines étapes:"
    echo "1. Copiez $OUTPUT_FILE dans reconciliation-app/backend/src/main/resources/"
    echo "2. Ajoutez dans application.properties:"
    echo "   server.ssl.enabled=true"
    echo "   server.ssl.key-store=classpath:reconciliation-app.p12"
    echo "   server.ssl.key-store-password=$PASSWORD"
    echo "   server.ssl.key-store-type=PKCS12"
    echo "   server.ssl.key-alias=reconciliation-app"
    echo ""
    echo -e "${YELLOW}Important: Changez le mot de passe par défaut en production!${NC}"
else
    echo -e "${RED}Erreur lors de la conversion${NC}"
    exit 1
fi

