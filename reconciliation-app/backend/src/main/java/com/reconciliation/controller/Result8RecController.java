package com.reconciliation.controller;

import com.reconciliation.entity.Result8RecEntity;
import com.reconciliation.repository.Result8RecRepository;
import com.reconciliation.service.PaysFilterService;
import com.reconciliation.util.RequestContextUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/result8rec")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
@Slf4j
public class Result8RecController {

    private final Result8RecRepository repository;
    private final JdbcTemplate jdbcTemplate;
    private final PaysFilterService paysFilterService;

    /**
     * Détermine le traitement par défaut selon la présence d'écarts
     * - Si écarts > 0 (au moins un écart) : "Niveau Support"
     * - Si pas d'écarts (tous à 0) : "Niveau Group"
     */
    private String determineDefaultTraitement(Result8RecEntity entity) {
        // Calculer le total des écarts (boOnly + partnerOnly + mismatches)
        // Les types primitifs int ne peuvent pas être null, donc on utilise directement les valeurs
        int totalEcarts = entity.getBoOnly() + entity.getPartnerOnly() + entity.getMismatches();
        
        // Seulement "Niveau Support" si on a AU MOINS un écart
        return totalEcarts > 0 ? "Niveau Support" : "Niveau Group";
    }

    @PostMapping
    public ResponseEntity<?> save(@RequestBody Result8RecEntity body) {
        if (repository.existsByDateAndAgencyAndServiceAndCountry(body.getDate(), body.getAgency(), body.getService(), body.getCountry())) {
            Result8RecEntity existing = repository.findFirstByDateAndAgencyAndServiceAndCountryOrderByIdDesc(
                    body.getDate(), body.getAgency(), body.getService(), body.getCountry()
            );
            log.info("❌ Doublon détecté result8rec {}/{}/{}/{}", body.getDate(), body.getAgency(), body.getService(), body.getCountry());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(existing);
        }
        
        // Définir le traitement par défaut si non spécifié
        if (body.getTraitement() == null || body.getTraitement().trim().isEmpty()) {
            body.setTraitement(determineDefaultTraitement(body));
            log.info("🔄 Traitement par défaut défini: {}", body.getTraitement());
        }
        
        body.setCreatedAt(Instant.now().toString());
        Result8RecEntity saved = repository.save(body);
        log.info("✅ result8rec sauvegardé id={}", saved.getId());
        return ResponseEntity.ok(saved);
    }

    @GetMapping
    public ResponseEntity<List<Result8RecEntity>> list() {
        // Récupérer le username pour le filtrage par pays
        String username = RequestContextUtil.getUsernameFromRequest();
        
        // Récupérer les pays autorisés pour l'utilisateur
        List<String> allowedCountriesTemp = null;
        if (username != null && !username.isEmpty()) {
            allowedCountriesTemp = paysFilterService.getAllowedPaysCodes(username);
            // null signifie tous les pays (GNL ou admin)
        }
        
        // Variable finale pour utilisation dans lambda
        final List<String> allowedCountries = allowedCountriesTemp;
        
        List<Result8RecEntity> all = repository.findAll();
        
        // Filtrer par pays autorisés si nécessaire
        if (allowedCountries == null) {
            // GNL ou admin : tous les pays
            log.info("🌍 Cloisonnement Result8Rec: Admin/GNL détecté, retour de {} enregistrements", all.size());
            return ResponseEntity.ok(all);
        } else if (allowedCountries.isEmpty()) {
            // Aucun pays autorisé
            log.info("🌍 Cloisonnement Result8Rec: Aucun pays autorisé pour l'utilisateur {}", username);
            return ResponseEntity.ok(new ArrayList<>());
        } else {
            // Filtrer par pays autorisés
            log.info("🌍 Cloisonnement Result8Rec: Filtrage pour utilisateur {} - Pays autorisés: {}", username, allowedCountries);
            log.info("🌍 Cloisonnement Result8Rec: Total enregistrements avant filtrage: {}", all.size());
            
            List<Result8RecEntity> filtered = all.stream()
                .filter(entity -> {
                    if (entity.getCountry() == null) {
                        log.warn("⚠️ Enregistrement Result8Rec sans pays: {}/{}/{}", entity.getAgency(), entity.getService(), entity.getDate());
                        return false;
                    }
                    // Convertir le nom du pays en code pays si nécessaire
                    String countryCode = getCountryCode(entity.getCountry());
                    boolean included = allowedCountries.contains(countryCode);
                    if (!included) {
                        log.debug("🚫 Enregistrement Result8Rec exclu: {} (code: {}) - Pays autorisés: {}", 
                            entity.getCountry(), countryCode, allowedCountries);
                    }
                    return included;
                })
                .collect(Collectors.toList());
            
            log.info("🌍 Cloisonnement Result8Rec: Total enregistrements après filtrage: {}", filtered.size());
            return ResponseEntity.ok(filtered);
        }
    }
    
    /**
     * Convertit un nom de pays en code pays pour le filtrage
     */
    private String getCountryCode(String countryName) {
        if (countryName == null || countryName.trim().isEmpty()) {
            return "";
        }
        
        String normalizedName = countryName.trim().toUpperCase();
        
        // Gérer les variantes spéciales comme "CITCH" qui signifie "CI" (Côte d'Ivoire)
        if (normalizedName.equals("CITCH") || normalizedName.startsWith("CITCH")) {
            return "CI";
        }
        
        // Mapping des noms de pays vers leurs codes
        java.util.Map<String, String> countryMap = new java.util.HashMap<>();
        countryMap.put("CAMEROUN", "CM");
        countryMap.put("CAMEROON", "CM");
        countryMap.put("CÔTE D'IVOIRE", "CI");
        countryMap.put("COTE D'IVOIRE", "CI");
        countryMap.put("COTE DIVOIRE", "CI");
        countryMap.put("CÔTE DIVOIRE", "CI");
        countryMap.put("SÉNÉGAL", "SN");
        countryMap.put("SENEGAL", "SN");
        countryMap.put("BURKINA FASO", "BF");
        countryMap.put("BURKINA", "BF");
        countryMap.put("MALI", "ML");
        countryMap.put("BÉNIN", "BJ");
        countryMap.put("BENIN", "BJ");
        countryMap.put("NIGER", "NE");
        countryMap.put("TCHAD", "TD");
        countryMap.put("TOGO", "TG");
        
        // Chercher par nom exact (insensible à la casse)
        for (java.util.Map.Entry<String, String> entry : countryMap.entrySet()) {
            if (entry.getKey().equalsIgnoreCase(normalizedName)) {
                return entry.getValue();
            }
        }
        
        // Chercher par contenu (pour gérer les cas comme "Côte d'Ivoire" dans "Côte d'Ivoire - Abidjan")
        if (normalizedName.contains("COTE") || normalizedName.contains("CÔTE") || normalizedName.contains("IVOIRE")) {
            return "CI";
        }
        if (normalizedName.contains("SENEGAL") || normalizedName.contains("SÉNÉGAL")) {
            return "SN";
        }
        if (normalizedName.contains("CAMEROUN") || normalizedName.contains("CAMEROON")) {
            return "CM";
        }
        if (normalizedName.contains("BURKINA")) {
            return "BF";
        }
        if (normalizedName.contains("MALI")) {
            return "ML";
        }
        if (normalizedName.contains("BENIN") || normalizedName.contains("BÉNIN")) {
            return "BJ";
        }
        if (normalizedName.contains("NIGER")) {
            return "NE";
        }
        if (normalizedName.contains("TCHAD")) {
            return "TD";
        }
        if (normalizedName.contains("TOGO")) {
            return "TG";
        }
        
        // Si c'est déjà un code (2 lettres), le retourner tel quel
        if (normalizedName.length() == 2) {
            return normalizedName;
        }
        
        // Si c'est un code de 4-5 lettres qui commence par un code pays connu, extraire les 2 premières lettres
        if (normalizedName.length() >= 4) {
            String firstTwo = normalizedName.substring(0, 2);
            // Vérifier si c'est un code pays valide
            List<String> validCodes = java.util.Arrays.asList("CM", "CI", "SN", "BF", "ML", "BJ", "NE", "TD", "TG");
            if (validCodes.contains(firstTwo)) {
                return firstTwo;
            }
        }
        
        // Sinon, retourner le nom tel quel pour comparaison (normalisé en majuscules)
        return normalizedName;
    }

    @PostMapping("/bulk")
    public ResponseEntity<?> saveBulk(@RequestBody List<Result8RecEntity> rows) {
        int duplicates = 0;
        for (Result8RecEntity r : rows) {
            if (repository.existsByDateAndAgencyAndServiceAndCountry(r.getDate(), r.getAgency(), r.getService(), r.getCountry())) {
                duplicates++;
                continue;
            }
            
            // Définir le traitement par défaut si non spécifié
            if (r.getTraitement() == null || r.getTraitement().trim().isEmpty()) {
                r.setTraitement(determineDefaultTraitement(r));
            }
            
            r.setCreatedAt(Instant.now().toString());
            repository.save(r);
        }
        log.info("✅ bulk result8rec: {} lignes, {} doublons", rows.size(), duplicates);
        return ResponseEntity.ok().body("Saved=" + (rows.size() - duplicates) + ", Duplicates=" + duplicates);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!repository.existsById(id)) return ResponseEntity.notFound().build();
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Result8RecEntity body) {
        return repository.findById(id)
                .map(existing -> {
                    // Mettre à jour tous les champs modifiables
                    if (body.getDate() != null) existing.setDate(body.getDate());
                    if (body.getAgency() != null) existing.setAgency(body.getAgency());
                    if (body.getService() != null) existing.setService(body.getService());
                    if (body.getCountry() != null) existing.setCountry(body.getCountry());
                    
                    existing.setTotalTransactions(body.getTotalTransactions());
                    existing.setTotalVolume(body.getTotalVolume());
                    
                    // Mettre à jour les champs de réconciliation
                    existing.setMatches(body.getMatches());
                    existing.setBoOnly(body.getBoOnly());
                    existing.setPartnerOnly(body.getPartnerOnly());
                    existing.setMismatches(body.getMismatches());
                    existing.setMatchRate(body.getMatchRate());
                    
                    if (body.getStatus() != null) existing.setStatus(body.getStatus());
                    if (body.getComment() != null) existing.setComment(body.getComment());
                    
                    // Définir le traitement par défaut si non spécifié lors de la mise à jour
                    if (body.getTraitement() != null && !body.getTraitement().trim().isEmpty()) {
                        existing.setTraitement(body.getTraitement());
                    } else if (existing.getTraitement() == null || existing.getTraitement().trim().isEmpty()) {
                        // Si le traitement n'est pas fourni et qu'il n'existe pas encore, définir la valeur par défaut
                        existing.setTraitement(determineDefaultTraitement(existing));
                    }
                    
                    if (body.getGlpiId() != null) existing.setGlpiId(body.getGlpiId());
                    
                    Result8RecEntity saved = repository.save(existing);
                    log.info("✅ result8rec mis à jour id={} - Date: {}, Agency: {}, Service: {}, Country: {}, Transactions: {}, Volume: {}, Matches: {}, BoOnly: {}, PartnerOnly: {}, Mismatches: {}, MatchRate: {}", 
                            saved.getId(), saved.getDate(), saved.getAgency(), saved.getService(), 
                            saved.getCountry(), saved.getTotalTransactions(), saved.getTotalVolume(),
                            saved.getMatches(), saved.getBoOnly(), saved.getPartnerOnly(), saved.getMismatches(), saved.getMatchRate());
                    return ResponseEntity.ok(saved);
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/migrate/add-traitement-column")
    public ResponseEntity<?> addTraitementColumn() {
        try {
            // Vérifier si la colonne existe déjà
            String checkQuery = "SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS " +
                    "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'result8rec' AND COLUMN_NAME = 'traitement'";
            
            Integer count = jdbcTemplate.queryForObject(checkQuery, Integer.class);
            
            if (count == null || count == 0) {
                log.info("🔄 Ajout de la colonne traitement à la table result8rec...");
                
                // Ajouter la colonne traitement après comment
                String alterTableQuery = "ALTER TABLE result8rec ADD COLUMN traitement VARCHAR(255) NULL AFTER comment";
                jdbcTemplate.execute(alterTableQuery);
                
                log.info("✅ Colonne traitement ajoutée avec succès!");
                return ResponseEntity.ok().body("Colonne traitement ajoutée avec succès à la table result8rec");
            } else {
                log.info("✅ Colonne traitement déjà présente dans la table result8rec");
                return ResponseEntity.ok().body("La colonne traitement existe déjà dans la table result8rec");
            }
            
        } catch (Exception e) {
            log.error("❌ Erreur lors de l'ajout de la colonne traitement: " + e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erreur: " + e.getMessage());
        }
    }
}


