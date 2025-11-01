package com.reconciliation.entity;

import jakarta.persistence.*;
import java.util.List;

@Entity
@Table(name = "pays")
public class PaysEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "code", nullable = false, unique = true, length = 10)
    private String code;
    
    @Column(name = "nom", nullable = false, length = 100)
    private String nom;
    
    @OneToMany(mappedBy = "pays", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProfilPaysEntity> profilPays;
    
    // Constructeurs
    public PaysEntity() {}
    
    public PaysEntity(String code, String nom) {
        this.code = code;
        this.nom = nom;
    }
    
    // Getters et Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getCode() {
        return code;
    }
    
    public void setCode(String code) {
        this.code = code;
    }
    
    public String getNom() {
        return nom;
    }
    
    public void setNom(String nom) {
        this.nom = nom;
    }
    
    public List<ProfilPaysEntity> getProfilPays() {
        return profilPays;
    }
    
    public void setProfilPays(List<ProfilPaysEntity> profilPays) {
        this.profilPays = profilPays;
    }
}

