# Fonctionnalité de Clic sur la Colonne Impact OP

## ✅ Nouvelle fonctionnalité ajoutée

### **Comportement du clic sur Impact OP**
- **Clic sur une ligne** : Navigation vers la page Impact OP avec filtres automatiques
- **Filtres appliqués** : Date et code propriétaire de la ligne cliquée
- **Affichage** : Liste des impacts OP pour la date sélectionnée

## 🔄 Modifications effectuées

### 1. **Template HTML** (`comptes.component.html`)
- **Ajout du clic** : `(click)="navigateToImpactOP(solde)"`
- **Style** : Curseur pointer et soulignement pour indiquer que c'est cliquable
- **Tooltip** : "Cliquer pour voir les impacts OP correspondants"

### 2. **Composant TypeScript** (`comptes.component.ts`)
- **Méthode `navigateToImpactOP()`** : Navigation avec paramètres de requête
- **Paramètres envoyés** :
  - `dateDebut` : Date de la ligne cliquée
  - `dateFin` : Même date (pour filtrer sur une journée)
  - `codeProprietaire` : Code propriétaire du compte sélectionné

### 3. **Composant Impact OP** (`impact-op.component.ts`)
- **Gestion des paramètres** : Lecture des paramètres de requête URL
- **Filtres automatiques** : Application automatique des filtres au chargement
- **Conversion de dates** : Format adapté pour les champs datetime-local

## 📊 Fonctionnement

### **Flux de navigation**
1. **Clic sur Impact OP** dans le relevé de compte
2. **Navigation** vers `/impact-op` avec paramètres de requête
3. **Chargement** de la page Impact OP
4. **Application automatique** des filtres (date et code propriétaire)
5. **Affichage** de la liste filtrée des impacts OP

### **Exemple d'URL générée**
```
/impact-op?dateDebut=2025-01-15&dateFin=2025-01-15&codeProprietaire=CELCM0001
```

### **Filtres appliqués automatiquement**
- **Date de début** : Date de la ligne cliquée
- **Date de fin** : Même date (filtre sur une journée)
- **Code propriétaire** : Code du compte sélectionné

## 🎯 Résultat utilisateur

### **Avant le clic**
- Colonne Impact OP affiche la somme avec signe inversé
- Style visuel indique que c'est cliquable (curseur pointer, soulignement)

### **Après le clic**
- Navigation vers la page Impact OP
- Filtres pré-remplis automatiquement
- Liste des impacts OP pour la date sélectionnée
- Possibilité de modifier les filtres ou d'exporter les données

## 🔧 Détails techniques

### **Paramètres de navigation**
```typescript
this.router.navigate(['/impact-op'], {
  queryParams: {
    dateDebut: solde.date,
    dateFin: solde.date,
    codeProprietaire: this.selectedCompte.numeroCompte
  }
});
```

### **Gestion des paramètres dans Impact OP**
```typescript
this.route.queryParams.subscribe(params => {
  if (params['codeProprietaire'] || params['dateDebut'] || params['dateFin']) {
    // Appliquer les filtres automatiquement
    if (params['codeProprietaire']) {
      this.filterForm.patchValue({ codeProprietaire: params['codeProprietaire'] });
    }
    if (params['dateDebut']) {
      // Conversion de format pour datetime-local
      const dateDebut = new Date(params['dateDebut']);
      const dateDebutString = dateDebut.toISOString().slice(0, 16);
      this.filterForm.patchValue({ dateDebut: dateDebutString });
    }
    // Appliquer les filtres
    this.applyFilters();
  }
});
```

## 🚀 Fonctionnalités

### ✅ **Implémenté**
- [x] Clic sur la colonne Impact OP
- [x] Navigation vers la page Impact OP
- [x] Filtres automatiques par date et code propriétaire
- [x] Application automatique des filtres au chargement
- [x] Conversion de format de dates
- [x] Style visuel indiquant que c'est cliquable

### 🔄 **Comportement**
- **Cohérence** : Même comportement que la colonne TSOP
- **Filtrage** : Filtres appliqués automatiquement
- **Flexibilité** : Possibilité de modifier les filtres après navigation
- **Performance** : Chargement optimisé avec filtres pré-appliqués

## 📝 Notes utilisateur

### **Comment utiliser**
1. **Ouvrir le relevé** d'un compte
2. **Cliquer** sur une valeur dans la colonne "Impact OP"
3. **Navigation automatique** vers la page Impact OP
4. **Voir la liste** des impacts OP pour cette date et ce compte
5. **Modifier les filtres** si nécessaire ou exporter les données

### **Avantages**
- **Navigation rapide** : Accès direct aux détails des impacts OP
- **Filtrage automatique** : Pas besoin de re-saisir les filtres
- **Cohérence** : Même comportement que les autres colonnes cliquables
- **Flexibilité** : Possibilité d'ajuster les filtres après navigation 