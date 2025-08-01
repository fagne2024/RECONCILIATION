# 📁 Système de Sauvegarde de Base de Données

Ce dossier contient tous les scripts nécessaires pour sauvegarder et restaurer la base de données MySQL `top20`.

## 🗂️ Fichiers Disponibles

### Scripts de Sauvegarde
- **`backup-final.ps1`** - Script principal de sauvegarde automatique (RECOMMANDÉ)
- **`dump-database.ps1`** - Script de dump simple
- **`dump-database-simple.ps1`** - Version simplifiée du dump
- **`dump-database-final.ps1`** - Version avancée avec vérifications
- **`dump-simple.ps1`** - Script de base pour dump

### Scripts de Planification
- **`planifier-sauvegarde.ps1`** - Planifier des sauvegardes automatiques avec le Planificateur de tâches Windows

### Scripts de Restauration
- **`restaurer-sauvegarde.ps1`** - Restaurer une sauvegarde avec interface interactive

## 🚀 Utilisation

### 1. Sauvegarde Manuelle
```powershell
# Exécuter une sauvegarde manuelle
.\backup-final.ps1
```

### 2. Planifier des Sauvegardes Automatiques
```powershell
# Planifier une sauvegarde quotidienne à 2h00 du matin
.\planifier-sauvegarde.ps1
```

### 3. Restaurer une Sauvegarde
```powershell
# Restaurer une sauvegarde avec interface interactive
.\restaurer-sauvegarde.ps1
```

## 📊 Fonctionnalités

### Script `backup-final.ps1` (RECOMMANDÉ)
- ✅ Création automatique du dossier `backups`
- ✅ Sauvegarde complète avec timestamp
- ✅ Nettoyage automatique (garde les 10 dernières sauvegardes)
- ✅ Affichage de la liste des sauvegardes
- ✅ Gestion des erreurs
- ✅ Instructions de restauration

### Fonctionnalités Avancées
- 🔄 **Sauvegarde complète** : Structure + données + procédures + triggers
- 🗂️ **Organisation** : Dossier `backups` avec fichiers datés
- 🧹 **Nettoyage automatique** : Supprime les anciennes sauvegardes
- 📋 **Interface claire** : Affichage coloré et informatif
- ⚡ **Performance** : Options optimisées pour MySQL

## 📁 Structure des Sauvegardes

```
PAD/
├── backups/
│   ├── dump_top20_2025-08-01_01-14-26.sql
│   ├── dump_top20_2025-08-01_01-15-30.sql
│   └── ...
├── backup-final.ps1
├── planifier-sauvegarde.ps1
├── restaurer-sauvegarde.ps1
└── README-BACKUP.md
```

## ⚙️ Configuration

### Variables Modifiables (dans `backup-final.ps1`)
```powershell
$DB_NAME = "top20"                    # Nom de la base de données
$DB_USER = "root"                     # Utilisateur MySQL
$MYSQLDUMP_PATH = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
$BACKUP_DIR = ".\backups"             # Dossier de sauvegarde
$MAX_BACKUPS = 10                     # Nombre max de sauvegardes à conserver
```

## 🔧 Planification Automatique

### Créer une Tâche Planifiée
```powershell
# Planifier une sauvegarde quotidienne à 2h00
.\planifier-sauvegarde.ps1
```

### Fréquences Disponibles
- **Quotidienne** : `/sc daily /st 02:00`
- **Hebdomadaire** : `/sc weekly /d MON /st 02:00`
- **Mensuelle** : `/sc monthly /d 1 /st 02:00`

### Gérer les Tâches Planifiées
```powershell
# Voir la tâche
schtasks /query /tn "Sauvegarde_Base_Top20"

# Supprimer la tâche
schtasks /delete /tn "Sauvegarde_Base_Top20" /f

# Exécuter la tâche maintenant
schtasks /run /tn "Sauvegarde_Base_Top20"
```

## 🔄 Restauration

### Restauration Interactive
```powershell
.\restaurer-sauvegarde.ps1
```

### Restauration Manuelle
```powershell
# Restaurer une sauvegarde spécifique
mysql -u root -p top20 < .\backups\dump_top20_2025-08-01_01-14-26.sql
```

## 📋 Contenu des Sauvegardes

Chaque fichier `.sql` contient :
- ✅ Structure complète de la base de données
- ✅ Toutes les tables et leurs données
- ✅ Procédures stockées
- ✅ Triggers et événements
- ✅ Configuration de caractères UTF8MB4
- ✅ Instructions de création/drop

## 🛡️ Sécurité

- 🔐 **Authentification** : Demande le mot de passe MySQL
- ⚠️ **Confirmation** : Demande confirmation avant restauration
- 📝 **Logs** : Affichage détaillé des opérations
- 🧹 **Nettoyage** : Suppression automatique des anciennes sauvegardes

## 🚨 Troubleshooting

### Erreurs Courantes

1. **mysqldump non trouvé**
   - Vérifier l'installation de MySQL
   - Ajuster le chemin dans `$MYSQLDUMP_PATH`

2. **Erreur d'authentification**
   - Vérifier le mot de passe MySQL
   - Vérifier les permissions utilisateur

3. **Espace disque insuffisant**
   - Vérifier l'espace disponible
   - Réduire `$MAX_BACKUPS`

### Commandes de Diagnostic
```powershell
# Vérifier l'installation MySQL
Test-Path "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"

# Lister les sauvegardes
Get-ChildItem .\backups\dump_top20_*.sql | Sort-Object LastWriteTime -Descending

# Vérifier la taille des sauvegardes
Get-ChildItem .\backups\dump_top20_*.sql | ForEach-Object { 
    "$($_.Name) - $([math]::Round($_.Length / 1MB, 2)) MB" 
}
```

## 📞 Support

Pour toute question ou problème :
1. Vérifier les logs d'erreur affichés
2. Consulter la documentation MySQL
3. Vérifier les permissions et l'installation MySQL

---
**Dernière mise à jour** : 1er août 2025  
**Version** : 1.0  
**Auteur** : Assistant IA 