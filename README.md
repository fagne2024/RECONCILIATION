# Application de Réconciliation

Une application complète de réconciliation  développée avec Angular (frontend) et Spring Boot (backend).

## 🚀 Description

Cette application permet de gérer et réconcilier les transactions , les comptes, les opérations et les frais. Elle offre une interface utilisateur moderne pour visualiser et traiter les données de réconciliation.

## 🛠️ Technologies Utilisées

### Frontend
- **Angular 14** - Framework frontend
- **TypeScript** - Langage de programmation
- **SCSS** - Préprocesseur CSS
- **ng2-charts** - Bibliothèque de graphiques
- **Angular Material** - Composants UI

### Backend
- **Spring Boot** - Framework Java
- **Java 11+** - Langage de programmation
- **MySQL** - Base de données
- **JPA/Hibernate** - ORM
- **Maven** - Gestionnaire de dépendances

## 📁 Structure du Projet

```
PAD/
├── reconciliation-app/
│   ├── backend/                 # Application Spring Boot
│   │   ├── src/main/java/
│   │   │   └── com/reconciliation/
│   │   │       ├── controller/  # Contrôleurs REST
│   │   │       ├── service/     # Logique métier
│   │   │       ├── repository/  # Accès aux données
│   │   │       ├── entity/      # Entités JPA
│   │   │       └── dto/         # Objets de transfert
│   │   └── src/main/resources/
│   │       └── db/migration/    # Scripts de migration
│   └── frontend/                # Application Angular
│       ├── src/app/
│       │   ├── components/      # Composants Angular
│       │   ├── services/        # Services Angular
│       │   ├── models/          # Modèles TypeScript
│       │   └── pipes/           # Pipes personnalisés
│       └── src/environments/    # Configuration par environnement
└── package.json                 # Dépendances Node.js
```

## 🚀 Installation et Démarrage

### Prérequis
- Java 11 ou supérieur
- Node.js 14 ou supérieur
- MySQL 8.0 ou supérieur
- Maven 3.6+

### Backend (Spring Boot)

1. **Configuration de la base de données**
   ```sql
   CREATE DATABASE reconciliation_db;
   ```

2. **Configuration de l'application**
   - Modifier `reconciliation-app/backend/src/main/resources/application.properties`
   - Ajuster les paramètres de connexion à la base de données

3. **Démarrage du backend**
   ```bash
   cd reconciliation-app/backend
   mvn spring-boot:run
   ```
   Le serveur sera accessible sur `http://localhost:8080`

### Frontend (Angular)

1. **Installation des dépendances**
   ```bash
   cd reconciliation-app/frontend
   npm install
   ```

2. **Démarrage du serveur de développement**
   ```bash
   ng serve
   ```
   L'application sera accessible sur `http://localhost:4200`

## 📊 Fonctionnalités Principales

### 🔐 Authentification
- Système de connexion sécurisé
- Gestion des utilisateurs et des rôles

### 💰 Gestion des Comptes
- Création et modification de comptes
- Visualisation des soldes
- Historique des transactions

### 📈 Opérations
- Import de fichiers CSV
- Traitement automatique des transactions
- Réconciliation manuelle et automatique
- Calcul des frais

### 📊 Tableaux de Bord
- Statistiques en temps réel
- Graphiques interactifs
- Filtres dynamiques
- Export de données

### 🏆 Classements
- Classement des agences
- Métriques de performance
- Analyses comparatives

## 🔧 Configuration

### Variables d'Environnement

#### Backend
```properties
# Base de données
spring.datasource.url=jdbc:mysql://localhost:3306/reconciliation_db
spring.datasource.username=your_username
spring.datasource.password=your_password

# JPA/Hibernate
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true

# Serveur
server.port=8080
```

#### Frontend
```typescript
// environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api'
};
```

## 📝 API Endpoints

### Authentification
- `POST /api/auth/login` - Connexion utilisateur
- `POST /api/auth/logout` - Déconnexion

### Comptes
- `GET /api/comptes` - Liste des comptes
- `POST /api/comptes` - Créer un compte
- `PUT /api/comptes/{id}` - Modifier un compte
- `DELETE /api/comptes/{id}` - Supprimer un compte

### Opérations
- `GET /api/operations` - Liste des opérations
- `POST /api/operations` - Créer une opération
- `PUT /api/operations/{id}` - Modifier une opération
- `POST /api/operations/upload` - Importer des opérations

### Réconciliation
- `POST /api/reconciliation/process` - Traiter la réconciliation
- `GET /api/reconciliation/results` - Résultats de réconciliation

### Statistiques
- `GET /api/stats/dashboard` - Statistiques du tableau de bord
- `GET /api/stats/rankings` - Classements

## 🧪 Tests

### Backend
```bash
cd reconciliation-app/backend
mvn test
```

### Frontend
```bash
cd reconciliation-app/frontend
ng test
```

## 📦 Déploiement

### Production Backend
```bash
cd reconciliation-app/backend
mvn clean package
java -jar target/reconciliation-backend.jar
```

### Production Frontend
```bash
cd reconciliation-app/frontend
ng build --prod
```

## 🤝 Contribution

1. Fork le projet
2. Créer une branche pour votre fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. Commiter vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Pousser vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 👥 Auteurs

- **Yamar NDAO** - *Développement initial* - [yamar-ndao](https://github.com/yamar-ndao)

## 🙏 Remerciements

- Équipe de développement Intouch Group
- Contributeurs open source
- Communauté Angular et Spring Boot

## 📞 Support

Pour toute question ou problème :
- Ouvrir une issue sur GitHub
- Contacter l'équipe de développement

---

**Version :** 1.0.0  
**Dernière mise à jour :** Juillet 2025 