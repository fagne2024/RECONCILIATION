package com.reconciliation.controller;

import com.reconciliation.entity.UserEntity;
import com.reconciliation.repository.UserRepository;
import com.reconciliation.service.TwoFactorAuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

/**
 * Contrôleur pour la gestion de l'authentification à deux facteurs (2FA)
 */
@RestController
@RequestMapping("/api/auth/2fa")
@CrossOrigin(origins = "http://localhost:4200")
public class TwoFactorAuthController {

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private TwoFactorAuthService twoFactorAuthService;

    /**
     * Génère une nouvelle clé secrète et un QR code pour activer le 2FA
     * POST /api/auth/2fa/setup
     */
    @PostMapping("/setup")
    public ResponseEntity<?> setup2FA(@RequestBody Map<String, String> payload) {
        String username = payload.get("username");
        
        if (username == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username requis"));
        }
        
        Optional<UserEntity> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        UserEntity user = userOpt.get();
        
        // Générer une nouvelle clé secrète
        String secret = twoFactorAuthService.generateSecretKey();
        user.setSecret2FA(secret);
        // Ne pas activer le 2FA tant que l'utilisateur n'a pas validé avec un code
        user.setEnabled2FA(false);
        userRepository.save(user);
        
        // Générer le QR code
        String qrCodeBase64 = twoFactorAuthService.generateQRCodeBase64(username, secret);
        String otpAuthUrl = twoFactorAuthService.generateOtpAuthUrl(username, secret);
        
        Map<String, Object> response = Map.of(
            "secret", secret,
            "qrCode", qrCodeBase64,
            "otpAuthUrl", otpAuthUrl,
            "message", "Scannez le QR code avec Google Authenticator et validez avec un code"
        );
        
        return ResponseEntity.ok(response);
    }

    /**
     * Active le 2FA après validation d'un code
     * POST /api/auth/2fa/enable
     */
    @PostMapping("/enable")
    public ResponseEntity<?> enable2FA(@RequestBody Map<String, String> payload) {
        String username = payload.get("username");
        String code = payload.get("code");
        
        if (username == null || code == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username et code requis"));
        }
        
        try {
            int totpCode = Integer.parseInt(code);
            
            Optional<UserEntity> userOpt = userRepository.findByUsername(username);
            if (userOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            
            UserEntity user = userOpt.get();
            
            if (user.getSecret2FA() == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Clé secrète non générée. Utilisez /setup d'abord"));
            }
            
            // Valider le code
            if (!twoFactorAuthService.validateCode(user.getSecret2FA(), totpCode)) {
                return ResponseEntity.status(401).body(Map.of("error", "Code invalide"));
            }
            
            // Activer le 2FA
            user.setEnabled2FA(true);
            userRepository.save(user);
            
            return ResponseEntity.ok(Map.of(
                "message", "Authentification à deux facteurs activée avec succès",
                "enabled", true
            ));
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Code doit être un nombre à 6 chiffres"));
        }
    }

    /**
     * Active le 2FA directement sans validation de code (pour les admins)
     * POST /api/auth/2fa/activate
     */
    @PostMapping("/activate")
    public ResponseEntity<?> activate2FA(@RequestBody Map<String, String> payload) {
        String username = payload.get("username");
        
        if (username == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username requis"));
        }
        
        Optional<UserEntity> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        UserEntity user = userOpt.get();
        
        // Si une clé secrète existe déjà, la réutiliser (pour permettre la réactivation sans rescanner)
        // Sinon, générer une nouvelle clé secrète
        boolean usingExistingSecret = false;
        if (user.getSecret2FA() != null && !user.getSecret2FA().isEmpty()) {
            // Réutiliser la clé existante - l'utilisateur peut continuer avec son compte Google Authenticator actuel
            usingExistingSecret = true;
        } else {
            // Générer une nouvelle clé secrète si elle n'existe pas
            String secret = twoFactorAuthService.generateSecretKey();
            user.setSecret2FA(secret);
        }
        
        // Activer le 2FA directement
        user.setEnabled2FA(true);
        // Si on réutilise une clé existante qui a déjà été scannée, conserver le flag
        // pour que l'utilisateur n'ait pas à rescanner le QR code
        if (usingExistingSecret && user.getQrCodeScanned()) {
            // Garder le flag à true pour ne pas afficher le QR code (l'utilisateur peut utiliser son code existant)
            // Ne rien faire - le flag reste à true
        } else {
            // Nouvelle clé ou clé jamais scannée - afficher le QR code
            user.setQrCodeScanned(false);
        }
        userRepository.save(user);
        
        // Générer le QR code pour affichage (toujours retourner pour permettre de le revoir si nécessaire)
        String qrCodeBase64 = twoFactorAuthService.generateQRCodeBase64(username, user.getSecret2FA());
        String otpAuthUrl = twoFactorAuthService.generateOtpAuthUrl(username, user.getSecret2FA());
        
        String message = usingExistingSecret 
            ? "Authentification à deux facteurs réactivée avec succès. Vous pouvez utiliser le même compte Google Authenticator que précédemment."
            : "Authentification à deux facteurs activée avec succès. L'utilisateur devra scanner le QR code à la prochaine connexion.";
        
        return ResponseEntity.ok(Map.of(
            "message", message,
            "enabled", true,
            "qrCode", qrCodeBase64,
            "otpAuthUrl", otpAuthUrl,
            "secret", user.getSecret2FA(),
            "usingExistingSecret", usingExistingSecret
        ));
    }

    /**
     * Désactive le 2FA pour un utilisateur
     * POST /api/auth/2fa/disable
     */
    @PostMapping("/disable")
    public ResponseEntity<?> disable2FA(@RequestBody Map<String, String> payload) {
        String username = payload.get("username");
        
        if (username == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username requis"));
        }
        
        Optional<UserEntity> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        UserEntity user = userOpt.get();
        user.setEnabled2FA(false);
        // NE PAS supprimer la clé secrète pour permettre la réactivation avec le même code
        // La clé secrète est conservée pour que l'utilisateur puisse continuer à utiliser
        // le même compte dans Google Authenticator après réactivation
        // user.setSecret2FA(null); // Supprimé pour conserver la clé
        // Réinitialiser le flag de scan pour afficher le QR code à nouveau si nécessaire
        user.setQrCodeScanned(false);
        userRepository.save(user);
        
        return ResponseEntity.ok(Map.of(
            "message", "Authentification à deux facteurs désactivée. La clé secrète est conservée pour permettre une réactivation avec le même compte Google Authenticator.",
            "enabled", false
        ));
    }

    /**
     * Vérifie si le 2FA est activé pour un utilisateur
     * GET /api/auth/2fa/status?username=xxx
     */
    @GetMapping("/status")
    public ResponseEntity<?> get2FAStatus(@RequestParam String username) {
        Optional<UserEntity> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        UserEntity user = userOpt.get();
        boolean enabled = user.getEnabled2FA() != null && user.getEnabled2FA();
        boolean hasSecret = user.getSecret2FA() != null && !user.getSecret2FA().isEmpty();
        
        return ResponseEntity.ok(Map.of(
            "enabled", enabled,
            "hasSecret", hasSecret
        ));
    }
}

