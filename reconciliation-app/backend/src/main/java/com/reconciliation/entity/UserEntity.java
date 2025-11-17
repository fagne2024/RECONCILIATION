package com.reconciliation.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "user")
public class UserEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false)
    private String password;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "profil_id")
    private ProfilEntity profil;

    // Authentification à deux facteurs (2FA)
    @Column(name = "enabled_2fa", nullable = false)
    private Boolean enabled2FA = false;

    @Column(name = "secret_2fa", length = 32)
    private String secret2FA;

    @Column(name = "qr_code_scanned", nullable = false)
    private Boolean qrCodeScanned = false;

    @Column(name = "email")
    private String email;

    // Getters et setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public ProfilEntity getProfil() { return profil; }
    public void setProfil(ProfilEntity profil) { this.profil = profil; }
    public Boolean getEnabled2FA() { return enabled2FA != null && enabled2FA; }
    public void setEnabled2FA(Boolean enabled2FA) { this.enabled2FA = enabled2FA != null ? enabled2FA : false; }
    public String getSecret2FA() { return secret2FA; }
    public void setSecret2FA(String secret2FA) { this.secret2FA = secret2FA; }
    public Boolean getQrCodeScanned() { return qrCodeScanned != null && qrCodeScanned; }
    public void setQrCodeScanned(Boolean qrCodeScanned) { this.qrCodeScanned = qrCodeScanned != null ? qrCodeScanned : false; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
} 