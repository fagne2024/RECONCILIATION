# Guide de Dépannage - Bouton "Enregistrer" Impact OP

## Problème
Le bouton "Enregistrer" n'est pas visible sur la page "Impact OP" malgré qu'il soit correctement implémenté dans le code.

## Solutions à essayer

### 1. Vider le cache du navigateur
- **Chrome/Edge** : `Ctrl + Shift + R` (rechargement forcé)
- **Firefox** : `Ctrl + F5`
- Ou vider complètement le cache dans les paramètres du navigateur

### 2. Redémarrer le frontend
```bash
# Arrêter le processus Node.js en cours
taskkill /F /IM node.exe

# Redémarrer le frontend
cd frontend
npm start
```

### 3. Vérifier la compilation
```bash
cd frontend
npm run build
```

### 4. Vérifier les erreurs dans la console du navigateur
1. Ouvrir les outils de développement (`F12`)
2. Aller dans l'onglet "Console"
3. Vérifier s'il y a des erreurs JavaScript

### 5. Vérifier que le composant est bien déclaré
Le fichier `app.module.ts` doit contenir :
```typescript
import { ImpactOPComponent } from './components/impact-op/impact-op.component';

@NgModule({
  declarations: [
    // ... autres composants
    ImpactOPComponent
  ],
  // ...
})
```

### 6. Vérifier la route
Le fichier `app-routing.module.ts` doit contenir :
```typescript
{
  path: 'impact-op',
  component: ImpactOPComponent
}
```

### 7. Vérifier les styles CSS
Le fichier `impact-op.component.scss` doit contenir les styles pour `.action-buttons`.

### 8. Test manuel
1. Ouvrir la page Impact OP
2. Ouvrir les outils de développement (`F12`)
3. Dans l'onglet "Elements", chercher `action-buttons`
4. Vérifier si l'élément existe et s'il a les bonnes classes CSS

### 9. Vérifier la méthode saveImpactOP
Dans `impact-op.component.ts`, la méthode doit être définie :
```typescript
saveImpactOP(impactOP: ImpactOP) {
  // ... logique de sauvegarde
}
```

### 10. Test avec un navigateur différent
Essayer d'ouvrir la page dans un autre navigateur pour éliminer un problème de cache.

## Structure attendue du bouton
Le bouton doit apparaître dans le tableau avec cette structure HTML :
```html
<div class="action-buttons">
  <button class="btn btn-sm btn-success" (click)="saveImpactOP(impact)" title="Enregistrer">
    <i class="fas fa-save"></i>
  </button>
  <button class="btn btn-sm btn-danger" (click)="deleteImpactOP(impact.id!)" title="Supprimer">
    <i class="fas fa-trash"></i>
  </button>
</div>
```

## Contact
Si le problème persiste après avoir essayé toutes ces solutions, vérifiez :
1. Les logs du serveur backend
2. Les erreurs dans la console du navigateur
3. La version d'Angular et des dépendances 