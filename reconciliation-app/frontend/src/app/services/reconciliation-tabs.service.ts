import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Match } from '../models/reconciliation-response.model';

@Injectable({
    providedIn: 'root'
})
export class ReconciliationTabsService {
    // Données filtrées des onglets
    private filteredMatchesSubject = new BehaviorSubject<Match[]>([]);
    private filteredBoOnlySubject = new BehaviorSubject<Record<string, string>[]>([]);
    private filteredPartnerOnlySubject = new BehaviorSubject<Record<string, string>[]>([]);
    private filteredMismatchesSubject = new BehaviorSubject<Record<string, string>[]>([]);

    // Observables
    public filteredMatches$ = this.filteredMatchesSubject.asObservable();
    public filteredBoOnly$ = this.filteredBoOnlySubject.asObservable();
    public filteredPartnerOnly$ = this.filteredPartnerOnlySubject.asObservable();
    public filteredMismatches$ = this.filteredMismatchesSubject.asObservable();

    // Méthodes pour mettre à jour les données filtrées
    setFilteredMatches(matches: Match[]) {
        console.log('📊 ReconciliationTabsService - Mise à jour des correspondances filtrées:', matches.length);
        this.filteredMatchesSubject.next(matches);
    }

    setFilteredBoOnly(boOnly: Record<string, string>[]) {
        console.log('📊 ReconciliationTabsService - Mise à jour des écarts BO filtrés:', boOnly.length);
        this.filteredBoOnlySubject.next(boOnly);
    }

    setFilteredPartnerOnly(partnerOnly: Record<string, string>[]) {
        console.log('📊 ReconciliationTabsService - Mise à jour des écarts Partenaire filtrés:', partnerOnly.length);
        this.filteredPartnerOnlySubject.next(partnerOnly);
    }

    setFilteredMismatches(mismatches: Record<string, string>[]) {
        console.log('📊 ReconciliationTabsService - Mise à jour des incohérences filtrées:', mismatches.length);
        this.filteredMismatchesSubject.next(mismatches);
    }

    // Méthodes pour récupérer les données actuelles
    getFilteredMatches(): Match[] {
        return this.filteredMatchesSubject.value;
    }

    getFilteredBoOnly(): Record<string, string>[] {
        return this.filteredBoOnlySubject.value;
    }

    getFilteredPartnerOnly(): Record<string, string>[] {
        return this.filteredPartnerOnlySubject.value;
    }

    getFilteredMismatches(): Record<string, string>[] {
        return this.filteredMismatchesSubject.value;
    }

    // Méthode pour vider toutes les données
    clearAllData() {
        this.filteredMatchesSubject.next([]);
        this.filteredBoOnlySubject.next([]);
        this.filteredPartnerOnlySubject.next([]);
        this.filteredMismatchesSubject.next([]);
    }
}

