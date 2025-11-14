# 🛠️ Guide d'Installation des Outils de Test de Sécurité

Ce guide vous permet d'installer tous les outils nécessaires pour effectuer les tests de sécurité de l'application.

---

## 📋 Prérequis

- Système d'exploitation : Linux (Ubuntu/Debian), macOS, ou Windows (WSL)
- Accès root/sudo (pour certaines installations)
- Connexion Internet

---

## 🐧 Installation sur Linux (Ubuntu/Debian)

### 1. Mise à jour du système

```bash
sudo apt-get update
sudo apt-get upgrade -y
```

### 2. Installation des outils de base

```bash
# Outils réseau et sécurité de base
sudo apt-get install -y \
    curl \
    wget \
    git \
    nmap \
    hydra \
    nikto \
    sqlmap \
    docker.io \
    docker-compose \
    jq \
    openssl \
    netcat

# Activer Docker
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER
# Se déconnecter/reconnecter pour que les permissions prennent effet
```

### 3. Installation de Node.js et npm

```bash
# Installation via NodeSource (Node.js 20 LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Vérifier l'installation
node -v
npm -v

# Installation d'outils npm globaux
sudo npm install -g \
    eslint \
    eslint-plugin-security \
    snyk \
    npm-audit-html
```

### 4. Installation de Maven (pour Java)

```bash
sudo apt-get install -y maven

# Vérifier l'installation
mvn -v
```

### 5. Installation des outils Python

```bash
# Installer Python et pip
sudo apt-get install -y python3 python3-pip

# Outils de sécurité Python
sudo pip3 install \
    sqlmap \
    semgrep \
    truffleHog \
    bandit

# Vérifier l'installation
sqlmap --version
semgrep --version
```

### 6. Installation d'OWASP ZAP via Docker

```bash
# OWASP ZAP est disponible via Docker
docker pull owasp/zap2docker-stable

# Vérifier
docker images | grep zap
```

### 7. Installation de Trivy (Scanner de vulnérabilités Docker)

```bash
# Méthode 1: Via repository
sudo apt-get install wget apt-transport-https gnupg lsb-release
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee -a /etc/apt/sources.list.d/trivy.list
sudo apt-get update
sudo apt-get install trivy

# Vérifier
trivy --version
```

### 8. Installation d'OWASP Dependency-Check

```bash
# Méthode 1: Via Docker (recommandé)
docker pull owasp/dependency-check

# Méthode 2: Téléchargement direct
cd /opt
sudo wget https://github.com/jeremylong/DependencyCheck/releases/download/v10.0.4/dependency-check-10.0.4-release.zip
sudo unzip dependency-check-10.0.4-release.zip
sudo mv dependency-check /opt/
sudo ln -s /opt/dependency-check/bin/dependency-check.sh /usr/local/bin/dependency-check
```

### 9. Installation de testssl.sh (Tests SSL/TLS)

```bash
cd /opt
sudo git clone https://github.com/drwetter/testssl.sh.git
sudo chmod +x /opt/testssl.sh/testssl.sh
sudo ln -s /opt/testssl.sh/testssl.sh /usr/local/bin/testssl.sh

# Vérifier
testssl.sh --version
```

### 10. Installation de SonarQube (Analyse statique du code)

```bash
# SonarQube via Docker (plus simple)
docker pull sonarqube:community

# Démarrer SonarQube
docker run -d --name sonarqube \
    -p 9000:9000 \
    -v sonarqube_data:/opt/sonarqube/data \
    -v sonarqube_extensions:/opt/sonarqube/extensions \
    -v sonarqube_logs:/opt/sonarqube/logs \
    sonarqube:community

# SonarQube Scanner
cd /opt
sudo wget https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-5.0.1.3006-linux.zip
sudo unzip sonar-scanner-cli-*.zip
sudo mv sonar-scanner-* sonar-scanner
sudo ln -s /opt/sonar-scanner/bin/sonar-scanner /usr/local/bin/sonar-scanner
```

---

## 🍎 Installation sur macOS

### 1. Installation via Homebrew

```bash
# Installer Homebrew si nécessaire
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Outils de base
brew install \
    curl \
    wget \
    git \
    nmap \
    hydra \
    docker \
    jq \
    openssl \
    netcat

# Node.js
brew install node

# Maven
brew install maven

# Python et outils
brew install python3
pip3 install sqlmap semgrep truffleHog bandit
```

### 2. Installation d'outils spécifiques

```bash
# Trivy
brew install aquasecurity/trivy/trivy

# testssl.sh
brew install testssl

# OWASP ZAP (via Homebrew Cask ou Docker)
brew install --cask owasp-zap
# OU via Docker
docker pull owasp/zap2docker-stable

# SonarQube (via Docker)
docker pull sonarqube:community
```

---

## 🪟 Installation sur Windows

### Option 1: Utiliser WSL (Windows Subsystem for Linux)

**Recommandé** - Suivre les instructions Linux ci-dessus dans WSL.

```powershell
# Installer WSL (PowerShell en tant qu'administrateur)
wsl --install

# Après redémarrage, suivre les instructions Ubuntu
```

### Option 2: Installation native Windows

#### 1. Outils avec installateurs

- **Burp Suite Community** : https://portswigger.net/burp/communitydownload
- **OWASP ZAP** : https://www.zaproxy.org/download/
- **Node.js** : https://nodejs.org/ (installer npm aussi)
- **Maven** : https://maven.apache.org/download.cgi
- **Docker Desktop** : https://www.docker.com/products/docker-desktop/

#### 2. Outils via Chocolatey

```powershell
# Installer Chocolatey (PowerShell en tant qu'administrateur)
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Installer les outils
choco install -y git curl wget nmap sqlmap docker-desktop nodejs maven python

# Outils Python
pip install sqlmap semgrep truffleHog
```

#### 3. Outils via Scoop

```powershell
# Installer Scoop
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Installer les outils
scoop install git curl wget nmap sqlmap docker nodejs maven python
```

---

## 🐳 Installation via Docker (Universel)

Tous les outils peuvent être exécutés via Docker sans installation locale :

### Script d'aliases Docker

Créez un fichier `docker-aliases.sh` :

```bash
#!/bin/bash

# OWASP ZAP
alias zap='docker run --rm -it -v $(pwd):/zap/wrk/:rw owasp/zap2docker-stable'

# OWASP Dependency-Check
alias dependency-check='docker run --rm -v $(pwd):/src -v $(pwd)/reports:/report owasp/dependency-check'

# SQLMap
alias sqlmap='docker run --rm -it -v $(pwd):/data paoloo/sqlmap'

# Trivy
alias trivy='docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v $(pwd):/workspace aquasec/trivy'

# SonarQube
alias sonar-scanner='docker run --rm -v $(pwd):/usr/src sonarsource/sonar-scanner-cli'
```

Ajoutez au `.bashrc` ou `.zshrc` :

```bash
source /path/to/docker-aliases.sh
```

---

## ✅ Vérification de l'Installation

Exécutez ce script pour vérifier que tous les outils sont installés :

```bash
#!/bin/bash
echo "🔍 Vérification des outils de sécurité..."

check_tool() {
    if command -v "$1" &> /dev/null || docker images | grep -q "$1"; then
        echo "✅ $1"
        return 0
    else
        echo "❌ $1"
        return 1
    fi
}

echo ""
echo "Outils de base:"
check_tool "curl"
check_tool "git"
check_tool "docker"

echo ""
echo "Outils réseau:"
check_tool "nmap"
check_tool "hydra"
check_tool "nikto"

echo ""
echo "Outils d'injection:"
check_tool "sqlmap"

echo ""
echo "Outils de scan web:"
check_tool "zap" || check_tool "owasp/zap2docker-stable"

echo ""
echo "Outils de dépendances:"
check_tool "npm"
check_tool "mvn"
check_tool "trivy" || check_tool "aquasec/trivy"
check_tool "dependency-check" || check_tool "owasp/dependency-check"

echo ""
echo "Outils Python:"
check_tool "python3"
check_tool "semgrep"
check_tool "truffleHog"

echo ""
echo "Outils SSL/TLS:"
check_tool "testssl.sh"

echo ""
echo "Outils d'analyse statique:"
check_tool "sonar-scanner" || check_tool "sonarqube"
```

---

## 📦 Installation Rapide (Script Automatisé)

Créer un script `install-security-tools.sh` :

```bash
#!/bin/bash
set -e

echo "🛠️ Installation des outils de sécurité..."

# Détection du système
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    sudo apt-get update
    sudo apt-get install -y curl wget git docker.io docker-compose
    
    # Node.js
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    # Python tools
    sudo apt-get install -y python3 python3-pip
    sudo pip3 install semgrep truffleHog sqlmap
    
    # Trivy
    sudo apt-get install wget apt-transport-https gnupg lsb-release
    wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
    echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee -a /etc/apt/sources.list.d/trivy.list
    sudo apt-get update
    sudo apt-get install -y trivy
    
elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    brew install curl wget git docker node maven python3
    pip3 install semgrep truffleHog sqlmap
    brew install aquasecurity/trivy/trivy
fi

# Images Docker
docker pull owasp/zap2docker-stable
docker pull owasp/dependency-check
docker pull sonarqube:community
docker pull aquasec/trivy

echo "✅ Installation terminée!"
```

---

## 🚀 Démarrage Rapide

1. **Installer les outils** (choisir selon votre OS)
2. **Rendre le script exécutable** :
   ```bash
   chmod +x security-test-automation.sh
   ```
3. **Exécuter les tests** :
   ```bash
   ./security-test-automation.sh
   ```

---

## 📚 Ressources

- **OWASP ZAP** : https://www.zaproxy.org/docs/
- **Burp Suite** : https://portswigger.net/burp/documentation
- **SQLMap** : https://sqlmap.org/
- **Trivy** : https://aquasecurity.github.io/trivy/
- **SonarQube** : https://docs.sonarqube.org/

---

**Note** : Pour les tests manuels approfondis, téléchargez également :
- **Burp Suite Community** (gratuit) ou **Professional** (payant)
- **Postman** (pour les tests API) : https://www.postman.com/downloads/

