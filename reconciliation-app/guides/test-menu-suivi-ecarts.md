# Modification du Menu - Suivi des écarts

## Changements effectués

### 1. Modification du composant sidebar (TypeScript)
- Ajout de la propriété `showSuiviEcartsSubmenu = false`
- Ajout de la méthode `toggleSuiviEcartsSubmenu()` pour basculer l'état du sous-menu

### 2. Modification du template HTML
- Remplacement des menus TSOP et Impact OP individuels par un menu "Suivi des écarts"
- Utilisation de la même structure que le menu "Paramètre" avec des sous-menus
- Condition d'affichage : `*ngIf="isMenuAllowed('TSOP') || isMenuAllowed('Impact OP')"`

### 3. Ajout des styles CSS
- Ajout de la classe `.menu-icon.suivi-ecarts` avec la couleur `#ff6b6b`

## Structure du nouveau menu

```
Suivi des écarts ▼
├── TSOP
└── Impact OP
```

## Fonctionnalités
- Le menu "Suivi des écarts" s'affiche si l'utilisateur a accès à TSOP OU Impact OP
- Les sous-menus s'affichent uniquement si l'utilisateur a les permissions correspondantes
- Même comportement que le menu "Paramètre" avec flèche pour indiquer l'état ouvert/fermé
- Conservation des icônes et couleurs originales pour chaque sous-menu

## Routes conservées
- `/ecart-solde` pour TSOP
- `/impact-op` pour Impact OP

## Test
1. Démarrer le frontend : `npm start`
2. Démarrer le backend : `npm start`
3. Se connecter à l'application
4. Vérifier que le menu "Suivi des écarts" apparaît dans la sidebar
5. Cliquer sur le menu pour ouvrir/fermer les sous-menus
6. Vérifier que les liens vers TSOP et Impact OP fonctionnent correctement 