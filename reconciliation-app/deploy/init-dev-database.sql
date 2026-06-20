-- Base de données DEV (tests utilisateurs, isolée de la production top20)
CREATE DATABASE IF NOT EXISTS top20_dev
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Accorder l'accès si l'utilisateur applicatif existe déjà
-- (ignorer l'erreur si l'utilisateur n'existe pas encore sur cette instance)
GRANT ALL PRIVILEGES ON top20_dev.* TO 'reconciliation_user'@'localhost';
FLUSH PRIVILEGES;
