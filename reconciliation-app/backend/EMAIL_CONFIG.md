# Configuration Email - Guide de Configuration

Ce document explique comment configurer l'envoi d'emails dans l'application de réconciliation.

## Variables d'environnement requises

Pour que l'envoi d'emails fonctionne, vous devez configurer les variables d'environnement suivantes :

### Windows (PowerShell ou Invite de commandes)

```powershell
set MAIL_HOST=smtp.gmail.com
set MAIL_PORT=587
set MAIL_USERNAME=votre_email@gmail.com
set MAIL_PASSWORD=votre_mot_de_passe_application
```

### Windows (PowerShell - Permanent pour la session)

```powershell
$env:MAIL_HOST="smtp.gmail.com"
$env:MAIL_PORT="587"
$env:MAIL_USERNAME="votre_email@gmail.com"
$env:MAIL_PASSWORD="votre_mot_de_passe_application"
```

### Linux/Mac (Terminal)

```bash
export MAIL_HOST=smtp.gmail.com
export MAIL_PORT=587
export MAIL_USERNAME=votre_email@gmail.com
export MAIL_PASSWORD=votre_mot_de_passe_application
```

### Linux/Mac (Permanent - ajouter au fichier ~/.bashrc ou ~/.zshrc)

```bash
echo 'export MAIL_HOST=smtp.gmail.com' >> ~/.bashrc
echo 'export MAIL_PORT=587' >> ~/.bashrc
echo 'export MAIL_USERNAME=votre_email@gmail.com' >> ~/.bashrc
echo 'export MAIL_PASSWORD=votre_mot_de_passe_application' >> ~/.bashrc
source ~/.bashrc
```

## Configuration Gmail - Créer un mot de passe d'application

**IMPORTANT**: Pour Gmail, vous DEVEZ utiliser un "Mot de passe d'application" et NON votre mot de passe principal.

### Étapes pour créer un mot de passe d'application Gmail :

1. **Accédez à votre compte Google**
   - Allez sur https://myaccount.google.com/security

2. **Activez la vérification en deux étapes** (si ce n'est pas déjà fait)
   - C'est obligatoire pour utiliser les mots de passe d'application
   - Allez dans "Validation en deux étapes" et suivez les instructions

3. **Créez un mot de passe d'application**
   - Dans la section "Validation en deux étapes", trouvez "Mots de passe des applications"
   - Cliquez sur "Mots de passe des applications"
   - Sélectionnez "Autre (nom personnalisé)" dans le menu déroulant
   - Entrez un nom comme "Reconciliation App" ou "Application Réconciliation"
   - Cliquez sur "Générer"

4. **Copiez le mot de passe généré**
   - Google générera un mot de passe de 16 caractères
   - **Copiez ce mot de passe immédiatement** car vous ne pourrez plus le voir ensuite
   - Utilisez ce mot de passe de 16 caractères pour la variable `MAIL_PASSWORD`

## Configuration pour d'autres fournisseurs email

### Outlook/Hotmail
```
MAIL_HOST=smtp-mail.outlook.com
MAIL_PORT=587
MAIL_USERNAME=votre_email@outlook.com
MAIL_PASSWORD=votre_mot_de_passe
```

### Yahoo Mail
```
MAIL_HOST=smtp.mail.yahoo.com
MAIL_PORT=587
MAIL_USERNAME=votre_email@yahoo.com
MAIL_PASSWORD=votre_mot_de_passe_application
```

### Serveur SMTP personnalisé
```
MAIL_HOST=votre_serveur_smtp.com
MAIL_PORT=587 (ou 465 pour SSL)
MAIL_USERNAME=votre_utilisateur
MAIL_PASSWORD=votre_mot_de_passe
```

## Vérification de la configuration

Après avoir configuré les variables d'environnement :

1. **Redémarrez l'application** pour que les nouvelles variables soient prises en compte

2. **Créez un utilisateur de test** avec une adresse email valide

3. **Vérifiez les logs** de l'application pour voir si l'email a été envoyé avec succès :
   ```
   ✅ Email envoyé avec succès à : email@exemple.com
   ```

4. **Vérifiez la boîte de réception** de l'email spécifié lors de la création de l'utilisateur

## Dépannage

### L'email n'est pas envoyé

1. **Vérifiez que les variables d'environnement sont définies**
   - Windows: `echo %MAIL_USERNAME%`
   - Linux/Mac: `echo $MAIL_USERNAME`

2. **Vérifiez les logs de l'application** pour les erreurs

3. **Vérifiez que vous utilisez un mot de passe d'application Gmail** (pas votre mot de passe principal)

4. **Vérifiez que la vérification en deux étapes est activée** sur votre compte Gmail

### Erreur d'authentification

- Assurez-vous d'utiliser un mot de passe d'application Gmail (16 caractères)
- Vérifiez que `MAIL_USERNAME` correspond exactement à votre adresse email
- Vérifiez que `MAIL_PASSWORD` ne contient pas d'espaces avant/après

### Timeout de connexion

- Vérifiez votre connexion internet
- Vérifiez que le pare-feu autorise les connexions sortantes sur le port 587
- Essayez d'augmenter les timeouts dans `application.properties`

## Notes de sécurité

- **NE JAMAIS** commiter les mots de passe dans le code source
- **TOUJOURS** utiliser des variables d'environnement pour les informations sensibles
- Utilisez des mots de passe d'application spécifiques pour chaque application
- Régénérez les mots de passe d'application si vous pensez qu'ils ont été compromis

