package com.reconciliation.util;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseMigration implements CommandLineRunner {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        try {
            // Vérifier si la colonne commentaire existe
            String checkColumnQuery = "PRAGMA table_info(releve_bancaire)";
            var columns = jdbcTemplate.queryForList(checkColumnQuery);
            
            boolean commentaireExists = columns.stream()
                .anyMatch(column -> "commentaire".equals(column.get("name")));
            
            if (!commentaireExists) {
                System.out.println("🔄 Ajout de la colonne commentaire à la table releve_bancaire...");
                
                // Ajouter la colonne commentaire
                String alterTableQuery = "ALTER TABLE releve_bancaire ADD COLUMN commentaire VARCHAR(1000)";
                jdbcTemplate.execute(alterTableQuery);
                
                System.out.println("✅ Colonne commentaire ajoutée avec succès!");
            } else {
                System.out.println("✅ Colonne commentaire déjà présente dans la table releve_bancaire");
            }
            
        } catch (Exception e) {
            System.err.println("❌ Erreur lors de l'ajout de la colonne commentaire: " + e.getMessage());
        }
        
        // Migration pour ajouter la colonne traitement à result8rec (MySQL)
        try {
            String checkTraitementQuery = "SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS " +
                    "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'result8rec' AND COLUMN_NAME = 'traitement'";
            
            Integer count = jdbcTemplate.queryForObject(checkTraitementQuery, Integer.class);
            
            if (count == null || count == 0) {
                System.out.println("🔄 Ajout de la colonne traitement à la table result8rec...");
                
                // Ajouter la colonne traitement après comment
                String alterTableQuery = "ALTER TABLE result8rec ADD COLUMN traitement VARCHAR(255) NULL AFTER comment";
                jdbcTemplate.execute(alterTableQuery);
                
                System.out.println("✅ Colonne traitement ajoutée avec succès à la table result8rec!");
            } else {
                System.out.println("✅ Colonne traitement déjà présente dans la table result8rec");
            }
            
        } catch (Exception e) {
            System.err.println("❌ Erreur lors de l'ajout de la colonne traitement: " + e.getMessage());
            e.printStackTrace();
        }
        
        // Migration pour ajouter la colonne traitement à operation_bancaire (MySQL)
        try {
            String checkTraitementOpQuery = "SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS " +
                    "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'operation_bancaire' AND COLUMN_NAME = 'traitement'";
            
            Integer countOp = jdbcTemplate.queryForObject(checkTraitementOpQuery, Integer.class);
            
            if (countOp == null || countOp == 0) {
                System.out.println("🔄 Ajout de la colonne traitement à la table operation_bancaire...");
                
                // Ajouter la colonne traitement après statut
                String alterTableOpQuery = "ALTER TABLE operation_bancaire ADD COLUMN traitement VARCHAR(255) NULL AFTER statut";
                jdbcTemplate.execute(alterTableOpQuery);
                
                System.out.println("✅ Colonne traitement ajoutée avec succès à la table operation_bancaire!");
            } else {
                System.out.println("✅ Colonne traitement déjà présente dans la table operation_bancaire");
            }
            
        } catch (Exception e) {
            System.err.println("❌ Erreur lors de l'ajout de la colonne traitement à operation_bancaire: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
