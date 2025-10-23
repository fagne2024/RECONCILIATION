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
    }
}
