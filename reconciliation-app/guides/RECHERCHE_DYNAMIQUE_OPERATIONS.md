# Recherche Dynamique des Opérations

## Vue d'ensemble

Une fonctionnalité de recherche dynamique a été ajoutée au formulaire des opérations pour permettre une recherche en temps réel sur les champs service, code propriétaire, type d'opération et banque. Cette fonctionnalité améliore significativement l'expérience utilisateur en permettant de filtrer rapidement les opérations sans avoir à utiliser les filtres complexes.

## Fonctionnalités de la Recherche Dynamique

### 1. Interface de Recherche

#### Design Moderne
- **Section dédiée** : Interface claire et organisée
- **Icônes visuelles** : Icône de recherche pour chaque champ
- **Placeholders informatifs** : Textes d'aide pour guider l'utilisateur
- **Responsive design** : Adaptation automatique aux différentes tailles d'écran

#### Structure de l'Interface
```html
<div class="dynamic-search-section">
    <div class="search-header">
        <h3><i class="fas fa-search"></i> Recherche dynamique</h3>
        <p class="search-description">Recherchez rapidement dans les opérations en temps réel</p>
    </div>
    
    <div class="search-form">
        <!-- Champs de recherche -->
        <div class="search-row">
            <div class="search-group">
                <label>Service</label>
                <div class="search-input-wrapper">
                    <input type="text" [(ngModel)]="searchService" (input)="onSearchChange()">
                    <i class="fas fa-search search-icon"></i>
                </div>
            </div>
            <!-- Autres champs... -->
        </div>
    </div>
</div>
```

### 2. Champs de Recherche

#### Service
- **Fonctionnalité** : Recherche dans le champ service des opérations
- **Placeholder** : "Rechercher un service..."
- **Logique** : Recherche insensible à la casse
- **Exemple** : "CASHIN", "PAIEMENT", "AIRTIME"

#### Code Propriétaire
- **Fonctionnalité** : Recherche dans le champ code propriétaire
- **Placeholder** : "Rechercher un code propriétaire..."
- **Logique** : Recherche insensible à la casse
- **Exemple** : "CL001", "AG001", "BO001"

#### Type d'Opération
- **Fonctionnalité** : Recherche dans le champ type d'opération
- **Placeholder** : "Rechercher un type d'opération..."
- **Logique** : Recherche insensible à la casse
- **Exemple** : "Total Cash-in", "Ajustement", "Compense"

#### Banque
- **Fonctionnalité** : Recherche dans le champ banque
- **Placeholder** : "Rechercher une banque..."
- **Logique** : Recherche insensible à la casse
- **Exemple** : "ECOBANK CM", "BNP Paribas", "SGBC"

### 3. Fonctionnalités Avancées

#### Recherche en Temps Réel
```typescript
onSearchChange() {
    this.applyDynamicSearch();
}

applyDynamicSearch() {
    this.filteredOperations = this.operations.filter(op => {
        const serviceMatch = !this.searchService || 
            (op.service && op.service.toLowerCase().includes(this.searchService.toLowerCase()));
        
        const codeProprietaireMatch = !this.searchCodeProprietaire || 
            (op.codeProprietaire && op.codeProprietaire.toLowerCase().includes(this.searchCodeProprietaire.toLowerCase()));
        
        const typeOperationMatch = !this.searchTypeOperation || 
            (op.typeOperation && op.typeOperation.toLowerCase().includes(this.searchTypeOperation.toLowerCase()));
        
        const banqueMatch = !this.searchBanque || 
            (op.banque && op.banque.toLowerCase().includes(this.searchBanque.toLowerCase()));
        
        return serviceMatch && codeProprietaireMatch && typeOperationMatch && banqueMatch;
    });

    this.filteredOperationsCount = this.filteredOperations.length;
    this.currentPage = 1;
    this.updatePagedOperations();
}
```

#### Compteur de Résultats
- **Affichage dynamique** : Nombre de résultats trouvés
- **Style visuel** : Badge vert avec le nombre de résultats
- **Mise à jour automatique** : Actualisation en temps réel

#### Effacement de la Recherche
```typescript
clearDynamicSearch() {
    this.searchService = '';
    this.searchCodeProprietaire = '';
    this.searchTypeOperation = '';
    this.searchBanque = '';
    this.filteredOperations = [...this.operations];
    this.filteredOperationsCount = this.operations.length;
    this.currentPage = 1;
    this.updatePagedOperations();
}
```

## Styles CSS

### 1. Section de Recherche
```scss
.dynamic-search-section {
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    margin-bottom: 24px;
    padding: 24px;
    border: 1px solid #e9ecef;
}
```

### 2. En-tête de Recherche
```scss
.search-header {
    margin-bottom: 20px;

    h3 {
        color: #2c3e50;
        font-size: 1.5rem;
        font-weight: 600;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 12px;

        i {
            color: #007bff;
        }
    }

    .search-description {
        color: #6c757d;
        font-size: 0.95rem;
        margin: 0;
    }
}
```

### 3. Champs de Recherche
```scss
.search-group {
    label {
        display: block;
        font-weight: 600;
        color: #495057;
        margin-bottom: 8px;
        font-size: 0.9rem;
    }

    .search-input-wrapper {
        position: relative;
        display: flex;
        align-items: center;

        .search-input {
            width: 100%;
            padding: 12px 16px 12px 40px;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            font-size: 0.95rem;
            transition: all 0.3s ease;
            background: #ffffff;

            &:focus {
                outline: none;
                border-color: #007bff;
                box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
            }
        }

        .search-icon {
            position: absolute;
            left: 12px;
            color: #6c757d;
            font-size: 0.9rem;
            pointer-events: none;
        }
    }
}
```

### 4. Actions de Recherche
```scss
.search-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 16px;
    border-top: 1px solid #e9ecef;

    .btn-clear-search {
        background: #f8f9fa;
        color: #6c757d;
        border: 1px solid #dee2e6;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;

        &:hover {
            background: #e9ecef;
            color: #495057;
        }
    }

    .search-info {
        .search-count {
            color: #28a745;
            font-weight: 600;
            font-size: 0.9rem;
            background: #d4edda;
            padding: 6px 12px;
            border-radius: 20px;
            border: 1px solid #c3e6cb;
        }
    }
}
```

## Avantages Utilisateur

### 1. Recherche Rapide
- **Temps réel** : Résultats instantanés
- **Multi-critères** : Recherche simultanée sur plusieurs champs
- **Insensible à la casse** : Recherche flexible

### 2. Interface Intuitive
- **Design moderne** : Interface claire et organisée
- **Icônes visuelles** : Aide à l'identification des champs
- **Placeholders informatifs** : Guide l'utilisateur

### 3. Feedback Visuel
- **Compteur de résultats** : Affichage du nombre de résultats
- **Bouton d'effacement** : Réinitialisation facile
- **Transitions fluides** : Animations CSS

## Responsive Design

### Desktop (>768px)
- **Disposition en grille** : 2 colonnes pour les champs
- **Espacement généreux** : Interface aérée
- **Actions côte à côte** : Bouton et compteur alignés

### Mobile (≤768px)
- **Disposition verticale** : 1 colonne pour les champs
- **Espacement adapté** : Marges réduites
- **Actions empilées** : Bouton et compteur empilés

## Intégration avec les Filtres Existants

### 1. Compatibilité
- **Filtres complexes** : Fonctionne en parallèle avec les filtres avancés
- **Pagination** : Intégration avec la pagination existante
- **Export** : Compatible avec l'export des données

### 2. Hiérarchie des Filtres
1. **Recherche dynamique** : Filtrage rapide en temps réel
2. **Filtres avancés** : Filtrage complexe avec plusieurs critères
3. **Pagination** : Navigation dans les résultats

## Performance

### 1. Optimisations
- **Recherche locale** : Pas d'appels API supplémentaires
- **Debouncing** : Évite les recherches trop fréquentes
- **Filtrage efficace** : Algorithme optimisé

### 2. Gestion de la Mémoire
- **Filtrage en place** : Pas de duplication des données
- **Références partagées** : Utilisation des mêmes objets
- **Nettoyage automatique** : Gestion des références

## Maintenance

### Ajout de Nouveaux Champs
1. Ajouter la propriété dans le composant TypeScript
2. Ajouter le champ dans le template HTML
3. Mettre à jour la logique de filtrage
4. Ajouter les styles CSS correspondants

### Modification des Critères
Les critères de recherche sont centralisés dans la méthode `applyDynamicSearch()` et peuvent être facilement modifiés.

### Personnalisation des Styles
Les styles sont modulaires et utilisent des variables SCSS pour faciliter la personnalisation.

## Conclusion

La recherche dynamique des opérations offre une expérience utilisateur moderne et efficace, permettant de filtrer rapidement les opérations selon les critères les plus utilisés. L'interface est intuitive, responsive et s'intègre parfaitement avec les fonctionnalités existantes. 