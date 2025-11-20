package com.reconciliation.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;
    
    @Value("${spring.mail.host:}")
    private String mailHost;
    
    @Value("${app.url:http://localhost:4200}")
    private String appUrl;
    
    private static final String LOGIN_URL = "https://reconciliation.intouchgroup.net:4200/login?returnUrl=%2Freconciliation-launcher";

    /**
     * Envoie un email avec le mot de passe généré lors de la création d'un utilisateur
     */
    public void sendPasswordEmail(String to, String username, String password) {
        try {
            if (fromEmail == null || fromEmail.trim().isEmpty()) {
                throw new RuntimeException("La configuration email n'est pas correcte. spring.mail.username est vide.");
            }
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject("Bienvenue - Votre compte a été créé");
            message.setText(String.format(
                "Bonjour %s,\n\n" +
                "Votre compte a été créé avec succès.\n\n" +
                "Voici vos identifiants de connexion :\n" +
                "Nom d'utilisateur : %s\n" +
                "Mot de passe : %s\n\n" +
                "Vous pouvez vous connecter à l'application en suivant ce lien :\n" +
                "%s\n\n" +
                "Nous vous recommandons de changer votre mot de passe après votre première connexion.\n\n" +
                "Cordialement,\n" +
                "L'équipe de réconciliation",
                username, username, password, LOGIN_URL
            ));
            
            mailSender.send(message);
            System.out.println("✅ Email envoyé avec succès à : " + to);
        } catch (Exception e) {
            System.err.println("❌ Erreur lors de l'envoi de l'email à " + to + " : " + e.getMessage());
            throw new RuntimeException("Erreur lors de l'envoi de l'email : " + e.getMessage(), e);
        }
    }

    /**
     * Envoie un email avec le nouveau mot de passe lors de la réinitialisation
     */
    public void sendPasswordResetEmail(String to, String username, String newPassword) {
        try {
            if (fromEmail == null || fromEmail.trim().isEmpty()) {
                throw new RuntimeException("La configuration email n'est pas correcte. spring.mail.username est vide.");
            }
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject("Réinitialisation de votre mot de passe");
            message.setText(String.format(
                "Bonjour %s,\n\n" +
                "Votre mot de passe a été réinitialisé.\n\n" +
                "Voici vos nouveaux identifiants de connexion :\n" +
                "Nom d'utilisateur : %s\n" +
                "Nouveau mot de passe : %s\n\n" +
                "Vous pouvez vous connecter à l'application en suivant ce lien :\n" +
                "%s\n\n" +
                "Nous vous recommandons de changer votre mot de passe après votre prochaine connexion.\n\n" +
                "Cordialement,\n" +
                "L'équipe de réconciliation",
                username, username, newPassword, LOGIN_URL
            ));
            
            mailSender.send(message);
            System.out.println("✅ Email de réinitialisation envoyé avec succès à : " + to);
        } catch (Exception e) {
            System.err.println("❌ Erreur lors de l'envoi de l'email de réinitialisation à " + to + " : " + e.getMessage());
            throw new RuntimeException("Erreur lors de l'envoi de l'email de réinitialisation : " + e.getMessage(), e);
        }
    }
}

