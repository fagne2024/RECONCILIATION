# 🚀 Démarrage Rapide - Guide d'Utilisation

## ⚡ Solution Rapide (3 minutes)

### 1. Exécuter le Diagnostic Automatique

```powershell
cd C:\reconciliation
.\scripts\diagnostic-guide-utilisation.ps1
```

Le script va :
- ✅ Analyser automatiquement votre système
- ✅ Identifier les problèmes
- ✅ Proposer des solutions
- ✅ Initialiser la base si nécessaire

### 2. Ouvrir l'Application

Ouvrez votre navigateur : `https://reconciliation.intouchgroup.net:4200/guide-utilisation`

### 3. Créer Votre Premier Guide

1. Cliquez sur **"Ajouter un nouveau guide"**
2. Entrez le nom du guide
3. Cliquez sur OK
4. Votre guide apparaît immédiatement ! 🎉

---

## 📚 Documentation Complète

Pour plus de détails, consultez :

- **[SOLUTION_AFFICHAGE_GUIDES.md](./SOLUTION_AFFICHAGE_GUIDES.md)** - Documentation complète des solutions
- **[GUIDE_UTILISATION_DIAGNOSTIC.md](./GUIDE_UTILISATION_DIAGNOSTIC.md)** - Guide de diagnostic détaillé

---

## 🔧 Commandes Utiles

### Diagnostic Backend
```powershell
# Vérifier l'état du backend
Invoke-RestMethod -Uri "https://reconciliation.intouchgroup.net:8443/health" -SkipCertificateCheck

# Diagnostic complet
Invoke-RestMethod -Uri "https://reconciliation.intouchgroup.net:8443/api/guide-nodes/diagnostic" -SkipCertificateCheck
```

### Diagnostic Base de Données
```bash
# Vérifier la table guide_node
mysql -u root -p top20 < scripts/check-guide-database.sql
```

### Initialisation
```powershell
# Initialiser la structure
Invoke-RestMethod -Uri "https://reconciliation.intouchgroup.net:8443/api/guide-nodes/initialize" -Method Post -SkipCertificateCheck
```

---

## ❓ Problèmes Courants

### "Aucun guide disponible"
➡️ **Solution :** Cliquez sur "Ajouter un nouveau guide" dans l'interface

### "Impossible de charger les guides"
➡️ **Solution :** Vérifiez que le backend est démarré :
```powershell
netstat -an | findstr "8443"
```

### Erreur de certificat SSL
➡️ **Solution :** Dans le navigateur, cliquez sur "Avancé" puis "Continuer vers le site"

---

## 📞 Besoin d'Aide ?

1. Consultez la [documentation complète](./SOLUTION_AFFICHAGE_GUIDES.md)
2. Exécutez le [script de diagnostic](./scripts/diagnostic-guide-utilisation.ps1)
3. Vérifiez les logs dans la console du navigateur (F12)

---

**Dernière mise à jour :** 17 décembre 2025
