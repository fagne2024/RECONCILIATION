package com.reconciliation.controller;

import com.reconciliation.entity.UserEntity;
import com.reconciliation.repository.UserRepository;
import com.reconciliation.entity.ProfilEntity;
import com.reconciliation.repository.ProfilRepository;
import com.reconciliation.service.JwtService;
import com.reconciliation.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.security.SecureRandom;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = {"http://localhost:4200", "http://172.214.108.8:4200"})
public class UserController {

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private ProfilRepository profilRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private JwtService jwtService;
    @Autowired
    private EmailService emailService;

    @GetMapping
    public ResponseEntity<List<UserEntity>> getAllUsers() {
        List<UserEntity> users = userRepository.findAll();
        // Ne pas renvoyer les mots de passe dans la réponse
        users.forEach(user -> user.setPassword(null));
        return ResponseEntity.ok(users);
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserEntity> getUserById(@PathVariable Long id) {
        Optional<UserEntity> user = userRepository.findById(id);
        if (user.isPresent()) {
            // Ne pas renvoyer le mot de passe dans la réponse
            user.get().setPassword(null);
            return ResponseEntity.ok(user.get());
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody UserEntity user) {
        try {
            // Vérifier si l'username existe déjà
            if (userRepository.findByUsername(user.getUsername()).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Ce nom d'utilisateur existe déjà"));
            }
            
            // Vérifier que l'email est fourni
            if (user.getEmail() == null || user.getEmail().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "L'adresse email est requise"));
            }
            
            // Vérifier si l'email existe déjà
            if (userRepository.findByEmail(user.getEmail().trim()).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Cette adresse email est déjà utilisée"));
            }
            
            // Générer un mot de passe automatiquement
            String generatedPassword = generateSecurePassword();
            String hashedPassword = passwordEncoder.encode(generatedPassword);
            user.setPassword(hashedPassword);
            
            // Associer le profil si fourni
            if (user.getProfil() != null && user.getProfil().getId() != null) {
                ProfilEntity profil = profilRepository.findById(user.getProfil().getId()).orElse(null);
                user.setProfil(profil);
            }
            
            // Sauvegarder l'utilisateur
            UserEntity savedUser = userRepository.save(user);
            
            // Envoyer le mot de passe par email
            try {
                emailService.sendPasswordEmail(user.getEmail(), user.getUsername(), generatedPassword);
            } catch (Exception e) {
                // Si l'envoi d'email échoue, on supprime l'utilisateur créé et on retourne une erreur
                userRepository.deleteById(savedUser.getId());
                return ResponseEntity.status(500).body(Map.of("error", "Erreur lors de l'envoi de l'email. L'utilisateur n'a pas été créé : " + e.getMessage()));
            }
            
            // Ne pas renvoyer le mot de passe hashé dans la réponse
            savedUser.setPassword(null);
            return ResponseEntity.ok(savedUser);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Erreur lors de la création de l'utilisateur : " + e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody UserEntity user) {
        try {
            Optional<UserEntity> existingUserOpt = userRepository.findById(id);
            if (existingUserOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            
            UserEntity existingUser = existingUserOpt.get();
            user.setId(id);
            
            // Vérifier si l'username a changé et si le nouveau username existe déjà
            if (!existingUser.getUsername().equals(user.getUsername()) && 
                userRepository.findByUsername(user.getUsername()).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Ce nom d'utilisateur existe déjà"));
            }
            
            // Vérifier si l'email a changé et si le nouveau email existe déjà
            if (user.getEmail() != null && !user.getEmail().trim().isEmpty()) {
                String newEmail = user.getEmail().trim();
                Optional<UserEntity> userWithEmail = userRepository.findByEmail(newEmail);
                if (userWithEmail.isPresent() && !userWithEmail.get().getId().equals(id)) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Cette adresse email est déjà utilisée"));
                }
            }
            
            // Si un nouveau mot de passe est fourni, le hasher
            if (user.getPassword() != null && !user.getPassword().isEmpty()) {
                String hashedPassword = passwordEncoder.encode(user.getPassword());
                user.setPassword(hashedPassword);
            } else {
                // Conserver l'ancien mot de passe si aucun nouveau n'est fourni
                user.setPassword(existingUser.getPassword());
            }
            
            // Associer le profil si fourni
            if (user.getProfil() != null && user.getProfil().getId() != null) {
                ProfilEntity profil = profilRepository.findById(user.getProfil().getId()).orElse(null);
                user.setProfil(profil);
            }
            
            UserEntity updatedUser = userRepository.save(user);
            // Ne pas renvoyer le mot de passe hashé dans la réponse
            updatedUser.setPassword(null);
            return ResponseEntity.ok(updatedUser);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Erreur lors de la mise à jour de l'utilisateur : " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Boolean> deleteUser(@PathVariable Long id) {
        try {
            Optional<UserEntity> user = userRepository.findById(id);
            if (user.isPresent()) {
                // Empêcher la suppression de l'utilisateur admin par défaut
                if ("admin".equals(user.get().getUsername())) {
                    return ResponseEntity.badRequest().body(false);
                }
                userRepository.deleteById(id);
                return ResponseEntity.ok(true);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(false);
        }
    }

    @GetMapping("/check-admin")
    public ResponseEntity<Boolean> checkAdminExists() {
        Optional<UserEntity> adminUser = userRepository.findByUsername("admin");
        return ResponseEntity.ok(adminUser.isPresent());
    }

    /**
     * Récupère les informations de l'utilisateur connecté
     */
    @GetMapping("/me")
    public ResponseEntity<UserEntity> getCurrentUser(HttpServletRequest request) {
        try {
            String username = extractUsernameFromRequest(request);
            if (username == null) {
                return ResponseEntity.status(401).build();
            }
            
            Optional<UserEntity> user = userRepository.findByUsername(username);
            if (user.isPresent()) {
                UserEntity userEntity = user.get();
                // Ne pas renvoyer le mot de passe
                userEntity.setPassword(null);
                return ResponseEntity.ok(userEntity);
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * Change le mot de passe de l'utilisateur connecté
     */
    @PutMapping("/me/password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> requestBody, HttpServletRequest request) {
        try {
            String username = extractUsernameFromRequest(request);
            if (username == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Non authentifié"));
            }
            
            String currentPassword = requestBody.get("currentPassword");
            String newPassword = requestBody.get("newPassword");
            
            if (currentPassword == null || newPassword == null || newPassword.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Le mot de passe actuel et le nouveau mot de passe sont requis"));
            }
            
            Optional<UserEntity> userOpt = userRepository.findByUsername(username);
            if (userOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            
            UserEntity user = userOpt.get();
            
            // Vérifier le mot de passe actuel
            String storedPassword = user.getPassword();
            boolean passwordMatches = false;
            if (storedPassword != null && (storedPassword.startsWith("$2a$") || storedPassword.startsWith("$2b$"))) {
                // Mot de passe hashé avec BCrypt
                passwordMatches = passwordEncoder.matches(currentPassword, storedPassword);
            } else {
                // Mot de passe en clair (ancien format)
                passwordMatches = currentPassword.equals(storedPassword);
            }
            
            if (!passwordMatches) {
                return ResponseEntity.status(401).body(Map.of("error", "Mot de passe actuel incorrect"));
            }
            
            // Hasher et sauvegarder le nouveau mot de passe
            String hashedPassword = passwordEncoder.encode(newPassword);
            user.setPassword(hashedPassword);
            userRepository.save(user);
            
            return ResponseEntity.ok(Map.of("message", "Mot de passe modifié avec succès"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Erreur lors de la modification du mot de passe"));
        }
    }

    /**
     * Réinitialise le mot de passe d'un utilisateur par email (mot de passe oublié)
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            if (email == null || email.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "L'adresse email est requise"));
            }
            
            String emailTrimmed = email.trim();
            System.out.println("🔐 [FORGOT-PASSWORD] Tentative de réinitialisation pour email: " + emailTrimmed);
            
            // Chercher l'utilisateur par email
            Optional<UserEntity> userOpt = userRepository.findByEmail(emailTrimmed);
            if (userOpt.isEmpty()) {
                System.out.println("⚠️ [FORGOT-PASSWORD] Aucun utilisateur trouvé pour email: " + emailTrimmed);
                // Pour des raisons de sécurité, on ne révèle pas si l'email existe ou non
                // On retourne toujours un message de succès pour éviter l'énumération des emails
                return ResponseEntity.ok(Map.of("message", "Si cette adresse email est associée à un compte, un nouveau mot de passe sera envoyé par email."));
            }
            
            UserEntity user = userOpt.get();
            System.out.println("✅ [FORGOT-PASSWORD] Utilisateur trouvé: " + user.getUsername());
            
            // Vérifier que l'utilisateur a une adresse email
            if (user.getEmail() == null || user.getEmail().trim().isEmpty()) {
                System.out.println("⚠️ [FORGOT-PASSWORD] L'utilisateur n'a pas d'email configuré");
                return ResponseEntity.ok(Map.of("message", "Si cette adresse email est associée à un compte, un nouveau mot de passe sera envoyé par email."));
            }
            
            // Générer un nouveau mot de passe
            String newPassword = generateSecurePassword();
            String hashedPassword = passwordEncoder.encode(newPassword);
            user.setPassword(hashedPassword);
            
            try {
                userRepository.save(user);
                System.out.println("✅ [FORGOT-PASSWORD] Mot de passe mis à jour pour utilisateur: " + user.getUsername());
            } catch (Exception e) {
                System.err.println("❌ [FORGOT-PASSWORD] Erreur lors de la sauvegarde: " + e.getMessage());
                e.printStackTrace();
                return ResponseEntity.status(500).body(Map.of("error", "Une erreur est survenue lors de la réinitialisation. Veuillez réessayer plus tard."));
            }
            
            // Envoyer le nouveau mot de passe par email
            try {
                emailService.sendPasswordResetEmail(user.getEmail(), user.getUsername(), newPassword);
                System.out.println("✅ [FORGOT-PASSWORD] Email envoyé avec succès à: " + user.getEmail());
                return ResponseEntity.ok(Map.of("message", "Si cette adresse email est associée à un compte, un nouveau mot de passe sera envoyé par email."));
            } catch (Exception e) {
                System.err.println("❌ [FORGOT-PASSWORD] Erreur lors de l'envoi de l'email: " + e.getMessage());
                e.printStackTrace();
                // En cas d'erreur d'envoi, on ne révèle pas l'erreur à l'utilisateur
                // pour éviter de divulguer des informations sur l'existence du compte
                // Mais le mot de passe a déjà été réinitialisé, donc on retourne un succès
                return ResponseEntity.ok(Map.of("message", "Si cette adresse email est associée à un compte, un nouveau mot de passe sera envoyé par email."));
            }
        } catch (Exception e) {
            System.err.println("❌ [FORGOT-PASSWORD] Erreur générale: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Une erreur est survenue. Veuillez réessayer plus tard."));
        }
    }

    /**
     * Réinitialise le mot de passe d'un utilisateur et l'envoie par email
     */
    @PostMapping("/{id}/reset-password")
    public ResponseEntity<?> resetPassword(@PathVariable Long id) {
        try {
            Optional<UserEntity> userOpt = userRepository.findById(id);
            if (userOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            
            UserEntity user = userOpt.get();
            
            // Vérifier que l'utilisateur a une adresse email
            if (user.getEmail() == null || user.getEmail().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Cet utilisateur n'a pas d'adresse email configurée"));
            }
            
            // Générer un nouveau mot de passe
            String newPassword = generateSecurePassword();
            String hashedPassword = passwordEncoder.encode(newPassword);
            user.setPassword(hashedPassword);
            userRepository.save(user);
            
            // Envoyer le nouveau mot de passe par email
            try {
                emailService.sendPasswordResetEmail(user.getEmail(), user.getUsername(), newPassword);
            } catch (Exception e) {
                return ResponseEntity.status(500).body(Map.of("error", "Le mot de passe a été réinitialisé mais l'email n'a pas pu être envoyé : " + e.getMessage()));
            }
            
            return ResponseEntity.ok(Map.of("message", "Mot de passe réinitialisé et envoyé par email avec succès"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Erreur lors de la réinitialisation du mot de passe : " + e.getMessage()));
        }
    }

    /**
     * Génère un mot de passe sécurisé aléatoire
     */
    private String generateSecurePassword() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
        SecureRandom random = new SecureRandom();
        StringBuilder password = new StringBuilder(12);
        
        for (int i = 0; i < 12; i++) {
            password.append(chars.charAt(random.nextInt(chars.length())));
        }
        
        return password.toString();
    }

    /**
     * Extrait le username depuis le token JWT dans la requête
     */
    private String extractUsernameFromRequest(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            try {
                String token = authHeader.substring(7);
                return jwtService.extractUsername(token);
            } catch (Exception e) {
                return null;
            }
        }
        return null;
    }
} 