package com.reconciliation.controller;

import com.reconciliation.repository.UserRepository;
import com.reconciliation.entity.UserEntity;
import com.reconciliation.entity.ProfilEntity;
import com.reconciliation.entity.ProfilPermissionEntity;
import com.reconciliation.repository.ProfilPermissionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.List;
import com.reconciliation.entity.ModuleEntity;
import com.reconciliation.entity.PermissionEntity;
import com.reconciliation.repository.ModuleRepository;
import com.reconciliation.repository.PermissionRepository;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:4200")
public class AuthController {
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private ProfilPermissionRepository profilPermissionRepository;
    @Autowired
    private ModuleRepository moduleRepository;
    @Autowired
    private PermissionRepository permissionRepository;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> payload) {
        String username = payload.get("username");
        String password = payload.get("password");
        if (username == null || password == null) {
            return ResponseEntity.badRequest().body("Champs manquants");
        }
        return userRepository.findByUsername(username)
                .filter(user -> user.getPassword().equals(password))
                .map(user -> {
                    Map<String, Object> response = new java.util.HashMap<>();
                    response.put("username", user.getUsername());
                    if ("admin".equals(user.getUsername())) {
                        // Admin : tous les modules et toutes les actions
                        List<ModuleEntity> modules = moduleRepository.findAll();
                        List<PermissionEntity> permissions = permissionRepository.findAll();
                        List<Map<String, String>> droits = new java.util.ArrayList<>();
                        for (ModuleEntity m : modules) {
                            for (PermissionEntity p : permissions) {
                                droits.add(Map.of("module", m.getNom(), "permission", p.getNom()));
                            }
                        }
                        response.put("profil", "ADMIN");
                        response.put("droits", droits);
                    } else {
                        ProfilEntity profil = user.getProfil();
                        List<ProfilPermissionEntity> droits = profil != null ? profilPermissionRepository.findAll().stream()
                            .filter(pp -> pp.getProfil().getId().equals(profil.getId()))
                            .toList() : List.of();
                        response.put("profil", profil != null ? profil.getNom() : null);
                        response.put("droits", droits.stream().map(pp -> Map.of(
                            "module", pp.getModule().getNom(),
                            "permission", pp.getPermission().getNom()
                        )).toList());
                    }
                    return ResponseEntity.ok().body(response);
                })
                .orElse(ResponseEntity.status(401).body(Map.of("error", "Login ou mot de passe incorrect")));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        return ResponseEntity.ok().body("Déconnecté");
    }
} 