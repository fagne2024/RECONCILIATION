#!/bin/bash

# Script pour configurer Let's Encrypt avec Certbot pour l'application de réconciliation
# Usage: ./setup-letsencrypt.sh domaine.com [email]

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Vérifier les arguments
if [ -z "$1" ]; then
    echo -e "${RED}Erreur: Vous devez fournir un domaine${NC}"
    echo "Usage: $0 domaine.com [email]"
    exit 1
fi

DOMAIN="$1"
EMAIL="${2:-admin@$DOMAIN}"

echo -e "${GREEN}=== Configuration Let's Encrypt pour $DOMAIN ===${NC}"
echo "Email: $EMAIL"
echo ""

# Vérifier si on est root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Erreur: Ce script doit être exécuté en tant que root (sudo)${NC}"
    exit 1
fi

# Détecter la distribution
if [ -f /etc/debian_version ]; then
    DISTRO="debian"
elif [ -f /etc/redhat-release ]; then
    DISTRO="redhat"
else
    echo -e "${YELLOW}Distribution non détectée, tentative avec apt...${NC}"
    DISTRO="debian"
fi

# Installer Certbot
echo -e "${GREEN}Installation de Certbot...${NC}"
if [ "$DISTRO" = "debian" ]; then
    apt update
    apt install -y certbot python3-certbot-nginx
elif [ "$DISTRO" = "redhat" ]; then
    yum install -y certbot python3-certbot-nginx
fi

# Vérifier si Nginx est installé et configuré
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}Nginx n'est pas installé. Installation...${NC}"
    if [ "$DISTRO" = "debian" ]; then
        apt install -y nginx
    elif [ "$DISTRO" = "redhat" ]; then
        yum install -y nginx
    fi
fi

# Vérifier si le domaine pointe vers ce serveur
echo -e "${YELLOW}Vérification que le domaine $DOMAIN pointe vers ce serveur...${NC}"
SERVER_IP=$(curl -s ifconfig.me || curl -s icanhazip.com)
DOMAIN_IP=$(dig +short $DOMAIN | tail -n1)

if [ "$SERVER_IP" != "$DOMAIN_IP" ]; then
    echo -e "${RED}Attention: L'IP du serveur ($SERVER_IP) ne correspond pas à l'IP du domaine ($DOMAIN_IP)${NC}"
    read -p "Continuer quand même? (O/N): " CONTINUE
    if [ "$CONTINUE" != "O" ] && [ "$CONTINUE" != "o" ]; then
        exit 1
    fi
fi

# Vérifier que le port 80 est ouvert
echo -e "${YELLOW}Vérification que le port 80 est accessible...${NC}"
if ! netstat -tuln | grep -q ":80 "; then
    echo -e "${YELLOW}Le port 80 n'est pas en écoute. Démarrage de Nginx...${NC}"
    systemctl start nginx
    systemctl enable nginx
fi

# Méthode 1: Avec Nginx (recommandé si Nginx est déjà configuré)
if [ -f "/etc/nginx/sites-available/reconciliation" ] || [ -f "/etc/nginx/conf.d/reconciliation.conf" ]; then
    echo -e "${GREEN}Configuration Nginx détectée. Utilisation de la méthode Nginx...${NC}"
    certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --email "$EMAIL"
    
# Méthode 2: Standalone (si Nginx n'est pas encore configuré)
else
    echo -e "${YELLOW}Configuration Nginx non trouvée. Utilisation de la méthode standalone...${NC}"
    echo -e "${YELLOW}Nginx sera arrêté temporairement...${NC}"
    
    systemctl stop nginx
    
    certbot certonly --standalone \
        -d "$DOMAIN" \
        -d "www.$DOMAIN" \
        --non-interactive \
        --agree-tos \
        --email "$EMAIL"
    
    systemctl start nginx
fi

# Vérifier que les certificats ont été créés
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo -e "${GREEN}=== Certificats créés avec succès ===${NC}"
    echo ""
    echo "Fichiers créés:"
    echo "  - Certificat: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
    echo "  - Clé privée: /etc/letsencrypt/live/$DOMAIN/privkey.pem"
    echo "  - Chaîne: /etc/letsencrypt/live/$DOMAIN/chain.pem"
    echo ""
    
    # Afficher les informations du certificat
    echo -e "${GREEN}Détails du certificat:${NC}"
    openssl x509 -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" -text -noout | grep -A 2 "Subject:"
    echo ""
    echo "Date d'expiration:"
    openssl x509 -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" -noout -enddate
    echo ""
else
    echo -e "${RED}Erreur: Les certificats n'ont pas été créés${NC}"
    exit 1
fi

# Configurer le renouvellement automatique
echo -e "${GREEN}Configuration du renouvellement automatique...${NC}"

# Tester le renouvellement
certbot renew --dry-run

# Vérifier le timer systemd
if systemctl list-units | grep -q "certbot.timer"; then
    systemctl status certbot.timer
    echo -e "${GREEN}Le renouvellement automatique est configuré${NC}"
else
    echo -e "${YELLOW}Le timer certbot n'est pas actif. Activation...${NC}"
    systemctl enable certbot.timer
    systemctl start certbot.timer
fi

# Instructions pour mettre à jour Nginx
echo ""
echo -e "${YELLOW}=== Configuration Nginx ===${NC}"
echo "Mettez à jour votre configuration Nginx avec:"
echo ""
echo "ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;"
echo "ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;"
echo ""
echo "Puis rechargez Nginx:"
echo "  sudo nginx -t"
echo "  sudo systemctl reload nginx"
echo ""

# Vérifier la configuration SSL
echo -e "${GREEN}=== Vérification ===${NC}"
echo "Testez votre configuration SSL avec:"
echo "  curl -I https://$DOMAIN"
echo "  openssl s_client -connect $DOMAIN:443 -servername $DOMAIN"
echo ""
echo "Ou utilisez des outils en ligne:"
echo "  https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
echo ""

echo -e "${GREEN}Terminé!${NC}"

