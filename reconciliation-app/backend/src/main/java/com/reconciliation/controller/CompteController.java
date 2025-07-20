package com.reconciliation.controller;

import com.reconciliation.model.Compte;
import com.reconciliation.service.CompteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/comptes")
@CrossOrigin(origins = "http://localhost:4200")
public class CompteController {
    
    @Autowired
    private CompteService compteService;
    
    @GetMapping
    public ResponseEntity<List<Compte>> getAllComptes() {
        List<Compte> comptes = compteService.getAllComptes();
        return ResponseEntity.ok(comptes);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Compte> getCompteById(@PathVariable Long id) {
        Optional<Compte> compte = compteService.getCompteById(id);
        return compte.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping("/numero/{numeroCompte}")
    public ResponseEntity<Compte> getCompteByNumero(@PathVariable String numeroCompte) {
        Optional<Compte> compte = compteService.getCompteByNumero(numeroCompte);
        return compte.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping("/pays/{pays}")
    public ResponseEntity<List<Compte>> getComptesByPays(@PathVariable String pays) {
        List<Compte> comptes = compteService.getComptesByPays(pays);
        return ResponseEntity.ok(comptes);
    }
    
    @GetMapping("/code-proprietaire/{codeProprietaire}")
    public ResponseEntity<List<Compte>> getComptesByCodeProprietaire(@PathVariable String codeProprietaire) {
        List<Compte> comptes = compteService.getComptesByCodeProprietaire(codeProprietaire);
        return ResponseEntity.ok(comptes);
    }
    
    @GetMapping("/agency/{agency}")
    public ResponseEntity<List<Compte>> getComptesByAgency(@PathVariable String agency) {
        List<Compte> comptes = compteService.getComptesByAgency(agency);
        return ResponseEntity.ok(comptes);
    }
    
    @GetMapping("/service/{service}")
    public ResponseEntity<Compte> getCompteByService(@PathVariable String service) {
        Optional<Compte> compte = compteService.getCompteByService(service);
        return compte.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping("/agency/{agency}/service/{service}")
    public ResponseEntity<Compte> getCompteByAgencyAndService(@PathVariable String agency, @PathVariable String service) {
        Optional<Compte> compte = compteService.getCompteByAgencyAndService(agency, service);
        return compte.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping("/solde/{soldeMin}")
    public ResponseEntity<List<Compte>> getComptesBySoldeSuperieurA(@PathVariable Double soldeMin) {
        List<Compte> comptes = compteService.getComptesBySoldeSuperieurA(soldeMin);
        return ResponseEntity.ok(comptes);
    }
    
    @PostMapping
    public ResponseEntity<Compte> createCompte(@RequestBody Compte compte) {
        if (compteService.compteExists(compte.getNumeroCompte())) {
            return ResponseEntity.badRequest().build();
        }
        Compte savedCompte = compteService.saveCompte(compte);
        return ResponseEntity.ok(savedCompte);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<Compte> updateCompte(@PathVariable Long id, @RequestBody Compte compteUpdate) {
        Optional<Compte> existingCompte = compteService.getCompteById(id);
        if (existingCompte.isPresent()) {
            Compte existing = existingCompte.get();
            
            // Mise à jour partielle : ne mettre à jour que les champs non-null
            if (compteUpdate.getNumeroCompte() != null) {
                existing.setNumeroCompte(compteUpdate.getNumeroCompte());
            }
            if (compteUpdate.getSolde() != null) {
                existing.setSolde(compteUpdate.getSolde());
            }
            if (compteUpdate.getPays() != null) {
                existing.setPays(compteUpdate.getPays());
            }
            if (compteUpdate.getCodeProprietaire() != null) {
                existing.setCodeProprietaire(compteUpdate.getCodeProprietaire());
            }
            if (compteUpdate.getAgence() != null) {
                existing.setAgence(compteUpdate.getAgence());
            }
            if (compteUpdate.getType() != null) {
                existing.setType(compteUpdate.getType());
            }
            
            // Mettre à jour la date de dernière modification
            existing.setDateDerniereMaj(java.time.LocalDateTime.now());
            
            Compte updatedCompte = compteService.saveCompte(existing);
            return ResponseEntity.ok(updatedCompte);
        }
        return ResponseEntity.notFound().build();
    }
    
    @PutMapping("/{id}/solde")
    public ResponseEntity<Boolean> updateSolde(@PathVariable Long id, @RequestBody Double nouveauSolde) {
        boolean updated = compteService.updateSolde(id, nouveauSolde);
        return updated ? ResponseEntity.ok(true) : ResponseEntity.notFound().build();
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Boolean> deleteCompte(@PathVariable Long id) {
        boolean deleted = compteService.deleteCompte(id);
        return deleted ? ResponseEntity.ok(true) : ResponseEntity.notFound().build();
    }
    
    @GetMapping("/exists/{numeroCompte}")
    public ResponseEntity<Boolean> checkCompteExists(@PathVariable String numeroCompte) {
        boolean exists = compteService.compteExists(numeroCompte);
        return ResponseEntity.ok(exists);
    }
    
    @GetMapping("/pays/list")
    public ResponseEntity<List<String>> getDistinctPays() {
        List<String> pays = compteService.getDistinctPays();
        return ResponseEntity.ok(pays);
    }
    
    @GetMapping("/code-proprietaire/list")
    public ResponseEntity<List<String>> getDistinctCodeProprietaire() {
        List<String> codes = compteService.getDistinctCodeProprietaire();
        return ResponseEntity.ok(codes);
    }
    
    @GetMapping("/agency/list")
    public ResponseEntity<List<String>> getDistinctAgencies() {
        List<String> agencies = compteService.getDistinctAgencies();
        return ResponseEntity.ok(agencies);
    }
    
    @GetMapping("/service/list")
    public ResponseEntity<List<String>> getDistinctServices() {
        List<String> services = compteService.getDistinctServices();
        return ResponseEntity.ok(services);
    }
    
    @GetMapping("/filter")
    public ResponseEntity<List<Compte>> filterComptes(
            @RequestParam(required = false) List<String> pays,
            @RequestParam(required = false) Double soldeMin,
            @RequestParam(required = false) String dateDebut,
            @RequestParam(required = false) String dateFin,
            @RequestParam(required = false) List<String> codeProprietaire) {
        
        System.out.println("=== FILTRE COMPTES (DEBUG) ===");
        System.out.println("Pays (reçu): " + pays);
        System.out.println("CodeProprietaire (reçu): " + codeProprietaire);
        
        List<Compte> comptes = compteService.filterComptes(pays, soldeMin, dateDebut, dateFin, codeProprietaire);
        System.out.println("Résultats: " + comptes.size() + " comptes trouvés");
        
        return ResponseEntity.ok(comptes);
    }
    
    @GetMapping("/test")
    public ResponseEntity<String> testEndpoint() {
        List<Compte> allComptes = compteService.getAllComptes();
        List<String> pays = compteService.getDistinctPays();
        List<String> codes = compteService.getDistinctCodeProprietaire();
        
        StringBuilder response = new StringBuilder();
        response.append("=== TEST ENDPOINT ===\n");
        response.append("Total comptes: ").append(allComptes.size()).append("\n");
        response.append("Pays disponibles: ").append(pays).append("\n");
        response.append("Codes propriétaires disponibles: ").append(codes).append("\n");
        
        if (!allComptes.isEmpty()) {
            response.append("Premier compte: ").append(allComptes.get(0)).append("\n");
        }
        
        return ResponseEntity.ok(response.toString());
    }
} 