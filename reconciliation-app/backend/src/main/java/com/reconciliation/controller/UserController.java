package com.reconciliation.controller;

import com.reconciliation.entity.UserEntity;
import com.reconciliation.repository.UserRepository;
import com.reconciliation.entity.ProfilEntity;
import com.reconciliation.repository.ProfilRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "http://localhost:4200")
public class UserController {

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private ProfilRepository profilRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;

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
    public ResponseEntity<UserEntity> createUser(@RequestBody UserEntity user) {
        try {
            // Vérifier si l'username existe déjà
            if (userRepository.findByUsername(user.getUsername()).isPresent()) {
                return ResponseEntity.badRequest().build();
            }
            // Hasher le mot de passe avant de sauvegarder
            if (user.getPassword() != null && !user.getPassword().isEmpty()) {
                String hashedPassword = passwordEncoder.encode(user.getPassword());
                user.setPassword(hashedPassword);
            }
            // Associer le profil si fourni
            if (user.getProfil() != null && user.getProfil().getId() != null) {
                ProfilEntity profil = profilRepository.findById(user.getProfil().getId()).orElse(null);
                user.setProfil(profil);
            }
            UserEntity savedUser = userRepository.save(user);
            // Ne pas renvoyer le mot de passe hashé dans la réponse
            savedUser.setPassword(null);
            return ResponseEntity.ok(savedUser);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserEntity> updateUser(@PathVariable Long id, @RequestBody UserEntity user) {
        try {
            Optional<UserEntity> existingUser = userRepository.findById(id);
            if (existingUser.isPresent()) {
                user.setId(id);
                // Si un nouveau mot de passe est fourni, le hasher
                if (user.getPassword() != null && !user.getPassword().isEmpty()) {
                    String hashedPassword = passwordEncoder.encode(user.getPassword());
                    user.setPassword(hashedPassword);
                } else {
                    // Conserver l'ancien mot de passe si aucun nouveau n'est fourni
                    user.setPassword(existingUser.get().getPassword());
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
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
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
} 