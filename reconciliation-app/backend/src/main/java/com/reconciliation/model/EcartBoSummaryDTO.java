package com.reconciliation.model;

import java.util.List;

public class EcartBoSummaryDTO {
    private String service;
    private String pays;
    private Double montant;
    private String date;
    private String statut;
    private Integer nombreTransactions;

    // Constructeurs
    public EcartBoSummaryDTO() {}

    public EcartBoSummaryDTO(String service, String pays, Double montant, String date, String statut, Integer nombreTransactions) {
        this.service = service;
        this.pays = pays;
        this.montant = montant;
        this.date = date;
        this.statut = statut;
        this.nombreTransactions = nombreTransactions;
    }

    // Getters et Setters
    public String getService() {
        return service;
    }

    public void setService(String service) {
        this.service = service;
    }

    public String getPays() {
        return pays;
    }

    public void setPays(String pays) {
        this.pays = pays;
    }

    public Double getMontant() {
        return montant;
    }

    public void setMontant(Double montant) {
        this.montant = montant;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public String getStatut() {
        return statut;
    }

    public void setStatut(String statut) {
        this.statut = statut;
    }

    public Integer getNombreTransactions() {
        return nombreTransactions;
    }

    public void setNombreTransactions(Integer nombreTransactions) {
        this.nombreTransactions = nombreTransactions;
    }
}

