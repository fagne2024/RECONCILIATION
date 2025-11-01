package com.reconciliation.entity;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "profil_pays", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"profil_id", "pays_id"})
})
public class ProfilPaysEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "profil_id", nullable = false)
    @JsonIgnoreProperties({"profilPays"})
    private ProfilEntity profil;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "pays_id", nullable = false)
    @JsonIgnoreProperties({"profilPays"})
    private PaysEntity pays;
    
    // Constructeurs
    public ProfilPaysEntity() {}
    
    public ProfilPaysEntity(ProfilEntity profil, PaysEntity pays) {
        this.profil = profil;
        this.pays = pays;
    }
    
    // Getters et Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public ProfilEntity getProfil() {
        return profil;
    }
    
    public void setProfil(ProfilEntity profil) {
        this.profil = profil;
    }
    
    public PaysEntity getPays() {
        return pays;
    }
    
    public void setPays(PaysEntity pays) {
        this.pays = pays;
    }
}

