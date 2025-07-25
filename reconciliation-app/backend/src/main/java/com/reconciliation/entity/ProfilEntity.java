package com.reconciliation.entity;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.Set;
import com.reconciliation.entity.ProfilPermissionEntity;

@Entity
@Table(name = "profil")
public class ProfilEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String nom;

    @Column(columnDefinition = "TEXT")
    private String description;

    @OneToMany(mappedBy = "profil")
    private Set<ProfilPermissionEntity> permissions;

    // Getters et setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    @JsonIgnore
    public Set<ProfilPermissionEntity> getPermissions() { return permissions; }
    public void setPermissions(Set<ProfilPermissionEntity> permissions) { this.permissions = permissions; }
} 