package com.reconciliation.controller;

import com.reconciliation.repository.UserRepository;
import com.reconciliation.entity.UserEntity;
import com.reconciliation.entity.ProfilEntity;
import com.reconciliation.entity.ProfilPermissionEntity;
import com.reconciliation.repository.ProfilPermissionRepository;
import com.reconciliation.service.JwtService;
import com.reconciliation.service.TwoFactorAuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.List;
import com.reconciliation.entity.ModuleEntity;
import com.reconciliation.entity.PermissionEntity;
import com.reconciliation.repository.ModuleRepository;
import com.reconciliation.repository.PermissionRepository;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = {"http://localhost:4200", "http://172.214.108.8:4200"})
public class AuthController {
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private ProfilPermissionRepository profilPermissionRepository;
    @Autowired
    private ModuleRepository moduleRepository;
    @Autowired
    private PermissionRepository permissionRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private JwtService jwtService;
    @Autowired
    private TwoFactorAuthService twoFactorAuthService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> payload) {
        String username = payload.get("username");
        String password = payload.get("password");
        if (username == null || password == null) {
            return ResponseEntity.badRequest().body("Champs manquants");
        }
        return userRepository.findByUsername(username)
                .filter(user -> {
                    // Vérifier si le mot de passe est hashé (commence par $2a$ ou $2b$ pour BCrypt)
                    String storedPassword = user.getPassword();
                    if (storedPassword != null && (storedPassword.startsWith("$2a$") || storedPassword.startsWith("$2b$"))) {
                        // Mot de passe hashé avec BCrypt
                        return passwordEncoder.matches(password, storedPassword);
                    } else {
                        // Mot de passe en clair (ancien format) - migration automatique
                        if (password.equals(storedPassword)) {
                            // Hasher le mot de passe et le sauvegarder
                            String hashedPassword = passwordEncoder.encode(password);
                            user.setPassword(hashedPassword);
                            userRepository.save(user);
                            return true;
                        }
                        return false;
                    }
                })
                .map(user -> {
                    Map<String, Object> response = new java.util.HashMap<>();
                    response.put("username", user.getUsername());
                    
                    // Vérifier si le 2FA est activé pour cet utilisateur
                    if (user.getEnabled2FA() && user.getSecret2FA() != null) {
                        // Le 2FA est activé, demander le code
                        response.put("requires2FA", true);
                        response.put("message", "Code d'authentification à deux facteurs requis");
                        
                        // Afficher le QR code uniquement si c'est la première connexion (QR code pas encore scanné)
                        if (!user.getQrCodeScanned()) {
                            String qrCodeBase64 = twoFactorAuthService.generateQRCodeBase64(user.getUsername(), user.getSecret2FA());
                            String otpAuthUrl = twoFactorAuthService.generateOtpAuthUrl(user.getUsername(), user.getSecret2FA());
                            response.put("qrCode", qrCodeBase64);
                            response.put("otpAuthUrl", otpAuthUrl);
                            response.put("secret", user.getSecret2FA());
                            response.put("showQRCode", true);
                        } else {
                            // QR code déjà scanné, ne pas l'afficher
                            response.put("showQRCode", false);
                        }
                        
                        return ResponseEntity.ok().body(response);
                    }
                    
                    // Pas de 2FA, générer le token JWT directement
                    Map<String, Object> extraClaims = new java.util.HashMap<>();
                    if ("admin".equals(user.getUsername())) {
                        extraClaims.put("role", "ADMIN");
                    } else {
                        extraClaims.put("role", "USER");
                    }
                    String token = jwtService.generateToken(user.getUsername(), extraClaims);
                    
                    response.put("token", token);
                    response.put("type", "Bearer");
                    response.put("requires2FA", false);
                    
                    ProfilEntity profil = user.getProfil();
                    String profilNom = profil != null ? profil.getNom() : null;
                    boolean isAdminProfil = profilNom != null && 
                        (profilNom.toUpperCase().equals("ADMIN") || 
                         profilNom.toUpperCase().equals("ADMINISTRATEUR"));
                    
                    if ("admin".equals(user.getUsername()) || isAdminProfil) {
                        // Admin ou profil administrateur : tous les modules et toutes les actions
                        List<ModuleEntity> modules = moduleRepository.findAll();
                        List<PermissionEntity> permissions = permissionRepository.findAll();
                        List<Map<String, String>> droits = new java.util.ArrayList<>();
                        for (ModuleEntity m : modules) {
                            for (PermissionEntity p : permissions) {
                                droits.add(Map.of("module", m.getNom(), "permission", p.getNom()));
                            }
                        }
                        response.put("profil", profilNom != null ? profilNom : "ADMIN");
                        response.put("droits", droits);
                    } else {
                        List<ProfilPermissionEntity> droits = profil != null ? profilPermissionRepository.findAll().stream()
                            .filter(pp -> pp.getProfil().getId().equals(profil.getId()))
                            .toList() : List.of();
                        response.put("profil", profilNom);
                        response.put("droits", droits.stream().map(pp -> Map.of(
                            "module", pp.getModule().getNom(),
                            "permission", pp.getPermission().getNom()
                        )).toList());
                    }
                    return ResponseEntity.ok().body(response);
                })
                .orElse(ResponseEntity.status(401).body(Map.of("error", "Login ou mot de passe incorrect")));
    }

    /**
     * Valide le code 2FA et retourne le token JWT
     */
    @PostMapping("/verify-2fa")
    public ResponseEntity<?> verify2FA(@RequestBody Map<String, String> payload) {
        String username = payload.get("username");
        String code = payload.get("code");
        
        if (username == null || code == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username et code requis"));
        }
        
        try {
            int totpCode = Integer.parseInt(code);
            
            return userRepository.findByUsername(username)
                    .filter(user -> {
                        if (!user.getEnabled2FA() || user.getSecret2FA() == null) {
                            return false;
                        }
                        // Valider le code TOTP
                        return twoFactorAuthService.validateCode(user.getSecret2FA(), totpCode);
                    })
                    .map(user -> {
                        // Code valide, marquer le QR code comme scanné si c'est la première fois
                        if (!user.getQrCodeScanned()) {
                            user.setQrCodeScanned(true);
                            userRepository.save(user);
                        }
                        
                        // Générer le token JWT
                        Map<String, Object> extraClaims = new java.util.HashMap<>();
                        if ("admin".equals(user.getUsername())) {
                            extraClaims.put("role", "ADMIN");
                        } else {
                            extraClaims.put("role", "USER");
                        }
                        String token = jwtService.generateToken(user.getUsername(), extraClaims);
                        
                        Map<String, Object> response = new java.util.HashMap<>();
                        response.put("username", user.getUsername());
                        response.put("token", token);
                        response.put("type", "Bearer");
                        
                        if ("admin".equals(user.getUsername())) {
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
                    .orElse(ResponseEntity.status(401).body(Map.of("error", "Code invalide ou 2FA non activé")));
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Code doit être un nombre à 6 chiffres"));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        return ResponseEntity.ok().body("Déconnecté");
    }
} 