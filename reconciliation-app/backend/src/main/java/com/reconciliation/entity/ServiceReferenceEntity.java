package com.reconciliation.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "service_reference")
public class ServiceReferenceEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "pays", nullable = false, length = 10)
    private String pays;

    @Column(name = "code_service", nullable = false, length = 150)
    private String codeService;

    @Column(name = "service_label", nullable = false, length = 150)
    private String serviceLabel;

    @Column(name = "code_reco", nullable = false, length = 150, unique = true)
    private String codeReco;

    @Column(name = "service_type", length = 100)
    private String serviceType;

    @Column(name = "operateur", length = 100)
    private String operateur;

    @Column(name = "reseau", length = 50)
    private String reseau;

    @Column(name = "reconciliable", nullable = false)
    private Boolean reconciliable = Boolean.TRUE;

    @Column(name = "motif", length = 255)
    private String motif;

    @Column(name = "retenu_operateur", length = 255)
    private String retenuOperateur;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "ACTIF";

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.status == null || this.status.isBlank()) {
            this.status = "ACTIF";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
        if (this.status == null || this.status.isBlank()) {
            this.status = "ACTIF";
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getPays() {
        return pays;
    }

    public void setPays(String pays) {
        this.pays = pays;
    }

    public String getCodeService() {
        return codeService;
    }

    public void setCodeService(String codeService) {
        this.codeService = codeService;
    }

    public String getServiceLabel() {
        return serviceLabel;
    }

    public void setServiceLabel(String serviceLabel) {
        this.serviceLabel = serviceLabel;
    }

    public String getCodeReco() {
        return codeReco;
    }

    public void setCodeReco(String codeReco) {
        this.codeReco = codeReco;
    }

    public String getServiceType() {
        return serviceType;
    }

    public void setServiceType(String serviceType) {
        this.serviceType = serviceType;
    }

    public String getOperateur() {
        return operateur;
    }

    public void setOperateur(String operateur) {
        this.operateur = operateur;
    }

    public String getReseau() {
        return reseau;
    }

    public void setReseau(String reseau) {
        this.reseau = reseau;
    }

    public Boolean getReconciliable() {
        return reconciliable;
    }

    public void setReconciliable(Boolean reconciliable) {
        this.reconciliable = reconciliable;
    }

    public String getMotif() {
        return motif;
    }

    public void setMotif(String motif) {
        this.motif = motif;
    }

    public String getRetenuOperateur() {
        return retenuOperateur;
    }

    public void setRetenuOperateur(String retenuOperateur) {
        this.retenuOperateur = retenuOperateur;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}

