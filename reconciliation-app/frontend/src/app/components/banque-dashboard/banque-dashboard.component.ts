import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { OperationService, OperationServiceApi } from '../../services/operation.service';
import { OperationBancaireService } from '../../services/operation-bancaire.service';
import { ReleveBancaireService } from '../../services/releve-bancaire.service';
import { Operation } from '../../models/operation.model';
import { OperationBancaire } from '../../models/operation-bancaire.model';
import { ReleveBancaireRow } from '../../models/releve-bancaire.model';
import { CompteService } from '../../services/compte.service';

interface CountryMetrics {
  country: string;
  bo: { matches: number; boOnly: number; rate: number };
  bank: { matches: number; partnerOnly: number; rate: number };
}

@Component({
  selector: 'app-banque-dashboard',
  templateUrl: './banque-dashboard.component.html',
  styleUrls: ['./banque-dashboard.component.scss']
})
export class BanqueDashboardComponent implements OnInit {
  loading = true;
  error: string | null = null;
  metrics: CountryMetrics[] = [];
  filtered: CountryMetrics[] = [];
  selectedCountry = '';
  startDate: string = '';
  endDate: string = '';
  totalOperations = 0;
  totalReleves = 0;

  // Gestion drapeaux
  private flagLoadError: { [code: string]: boolean } = {};

  private okBaseKeys = new Set<string>();
  private statusByBaseKey: Record<string, 'OK' | 'KO'> = {};

  constructor(
    private operationService: OperationService,
    private operationApi: OperationServiceApi,
    private releveService: ReleveBancaireService,
    private compteService: CompteService,
    private operationBancaireService: OperationBancaireService,
    private location: Location,
  ) {}

  ngOnInit(): void {
    this.loadRealData();
  }

  // === FLAGS ===
  getCountryFlag(code: string): string {
    const flagMap: Record<string, string> = {
      'BF': '🇧🇫','BJ': '🇧🇯','CI': '🇨🇮','CM': '🇨🇲','GA': '🇬🇦','GN': '🇬🇳','KE': '🇰🇪','ML': '🇲🇱','MZ': '🇲🇿','NG': '🇳🇬','SN': '🇸🇳','TG': '🇹🇬'
    };
    return flagMap[(code || '').toUpperCase()] || '🌍';
  }

  getCountryFlagUrl(code: string): string | null {
    const c = (code || '').toLowerCase();
    if (!c) return null;
    if (this.flagLoadError[c]) return null;
    return `assets/flags/${c}.svg`;
  }

  onFlagError(e: Event, code: string) { this.flagLoadError[(code||'').toLowerCase()] = true; }

  getCountryName(code: string): string {
    const names: Record<string, string> = {
      'BF':'Burkina Faso','BJ':'Bénin','CI':'Côte d\'Ivoire','CM':'Cameroun','GA':'Gabon','GN':'Guinée','KE':'Kenya','ML':'Mali','MZ':'Mozambique','NG':'Nigeria','SN':'Sénégal','TG':'Togo'
    };
    return names[(code||'').toUpperCase()] || code;
  }

  private loadRealData() {
    this.loading = true;
    this.error = null;

    // Charger d'abord les statuts persistés et les OK définitifs
    Promise.all([
      this.operationApi.listReconStatus().toPromise(),
      this.operationApi.getOkKeys().toPromise(),
      this.operationBancaireService.getAllOperationsBancaires().toPromise(),
      this.releveService.list().toPromise(),
      this.compteService.getAllComptes().toPromise(),
    ]).then(([statusMap, okKeys, operationsBancaires, releves, comptes]) => {
      console.log('[BANQUE-DASH] Début loadRealData');
      this.statusByBaseKey = {};
      // Normaliser les clés en "base" (retirer l'index de fin)
      Object.entries(statusMap || {}).forEach(([key, status]) => {
        const base = this.toBaseReconKey(String(key));
        this.statusByBaseKey[base] = (String(status).toUpperCase() === 'OK') ? 'OK' : 'KO';
      });
      this.okBaseKeys = new Set((okKeys || []).map(k => this.toBaseReconKey(String(k))));
      console.log('[BANQUE-DASH] statusByBaseKey size =', Object.keys(this.statusByBaseKey).length, ' okBaseKeys size =', this.okBaseKeys.size);

      let opsBanc = (operationsBancaires || []) as OperationBancaire[];
      let rvs = (releves || []) as ReleveBancaireRow[];
      const comptesList = (comptes || []) as Array<any>;
      // Filtrage par dates si fourni
      const start = this.startDate ? new Date(this.startDate) : null;
      const end = this.endDate ? new Date(this.endDate) : null;
      if (start || end) {
        const inRangeOp = (d: any) => {
          const dt = new Date(d);
          if (isNaN(dt.getTime())) return false;
          if (start && dt < start) return false;
          if (end) {
            // inclure la fin de journée
            const endDay = new Date(end);
            endDay.setHours(23,59,59,999);
            if (dt > endDay) return false;
          }
          return true;
        };
        opsBanc = opsBanc.filter(o => inRangeOp(o.dateOperation));
        const inRangeRv = (d: any) => inRangeOp(d);
        rvs = rvs.filter(r => inRangeRv(r.dateValeur || r.dateComptable));
      }
      this.totalOperations = opsBanc.length;
      this.totalReleves = rvs.length;
      console.log('[BANQUE-DASH] opsBanc total =', opsBanc.length, ' rvs total =', rvs.length);
      if (opsBanc.length > 0) {
        const sampleOps = opsBanc.slice(0, 3).map(o => ({ id: o.id, pays: o.pays, codePays: o.codePays, statut: o.statut, reconStatus: (o as any).reconStatus }));
        console.log('[BANQUE-DASH] sample opsBanc =', sampleOps);
      }
      if (rvs.length > 0) {
        const sampleRvs = rvs.slice(0, 3).map(r => ({ numeroCompte: r.numeroCompte, paysCode: this.codeFromNumeroCompte(r.numeroCompte), dateValeur: r.dateValeur, debit: r.debit, credit: r.credit }));
        console.log('[BANQUE-DASH] sample releves =', sampleRvs);
      }

      // Agrégations par pays
      const boByCountry: Record<string, { matches: number; boOnly: number; total: number }> = {};
      const bankByCountry: Record<string, { matches: number; partnerOnly: number; total: number }> = {};

      // Parcours BO (operation8bancaire) – Total = toutes les lignes, OK = colonne Statut Réconciliation
      opsBanc.forEach(op => {
        const code = (op.codePays && op.codePays.trim().length > 0)
          ? op.codePays.trim().toUpperCase()
          : this.nameToCode((op.pays || '').trim());
        if (code === 'NA') return;
        if (!boByCountry[code]) boByCountry[code] = { matches: 0, boOnly: 0, total: 0 };
        boByCountry[code].total += 1;
        const recon = this.extractReconStatusFromOperationBancaire(op);
        const isOk = this.isOkRecon(recon);
        if (code === 'CM') {
          console.log('[BANQUE-DASH] BO CM ligne => id=', (op as any).id, ' pays=', op.pays, ' codePays=', op.codePays, ' statut raw=', recon, ' isOk=', isOk);
        }
        if (isOk) boByCountry[code].matches += 1;
      });

      // Logs détaillés BO
      const boEntries = Object.entries(boByCountry).map(([c, v]) => ({ country: c, total: v.total, ok: v.matches, rate: v.total > 0 ? (v.matches * 100) / v.total : 0 }));
      console.log('[BANQUE-DASH] BO breakdown =', boEntries);
      if (boByCountry['CM']) {
        const cm = boByCountry['CM'];
        console.log('[BANQUE-DASH] BO CM => OK/Total =', cm.matches, '/', cm.total, ' rate =', cm.total > 0 ? (cm.matches * 100) / cm.total : 0);
      }

      // Parcours Banque (releve8bancaire) – Total = toutes les lignes, OK = colonne Statut Réconciliation du relevé
      // Mapping numeroCompte -> code pays (ou nom pays) à partir des comptes
      const numeroToPays: Record<string, string> = {};
      (comptesList || []).forEach(c => {
        if (c && c.numeroCompte) {
          const code = (c.codePays && String(c.codePays).trim().length > 0) ? String(c.codePays).trim().toUpperCase() : this.nameToCode(c.pays || '');
          if (code && code !== 'NA') numeroToPays[String(c.numeroCompte)] = code;
        }
      });

      rvs.forEach((r, idx) => {
        let pays = this.codeFromNumeroCompte(r.numeroCompte);
        if (pays === 'NA' && r.numeroCompte && numeroToPays[String(r.numeroCompte)]) {
          pays = numeroToPays[String(r.numeroCompte)];
        }
        if (pays === 'NA' && r.banque) {
          const b = String(r.banque).toUpperCase().replace(/[^A-Z]/g, '');
          if (/^[A-Z]{2}$/.test(b)) pays = b;
        }
        if (idx < 10) {
          console.log('[BANQUE-DASH] Releve ligne => numeroCompte=', r.numeroCompte, ' pays=', pays, ' banque=', r.banque);
        }
        if (pays === 'NA') return;
        if (!bankByCountry[pays]) bankByCountry[pays] = { matches: 0, partnerOnly: 0, total: 0 };
        bankByCountry[pays].total += 1;
        // 1) Essayer le statut directement sur la ligne
        let recon = this.extractReconStatusFromReleve(r as any);
        let isOk = this.isOkRecon(recon);
        // 2) Si pas de statut explicite, retomber sur le statut persisté par clé
        if (!isOk && (!recon || recon.trim() === '')) {
          const key = this.buildBaseReconKeyForReleve(r);
          const status = this.statusByBaseKey[key] || 'KO';
          isOk = status === 'OK' || this.okBaseKeys.has(key);
        }
        if (idx < 10) {
          console.log('[BANQUE-DASH] Releve statut => statut raw=', recon, ' isOk=', isOk);
        }
        if (isOk) bankByCountry[pays].matches += 1;
      });

      // Logs détaillés Banque
      const bkEntries = Object.entries(bankByCountry).map(([c, v]) => ({ country: c, total: v.total, ok: v.matches, rate: v.total > 0 ? (v.matches * 100) / v.total : 0 }));
      console.log('[BANQUE-DASH] Banque breakdown =', bkEntries);

      const countries = Array.from(new Set([...Object.keys(boByCountry), ...Object.keys(bankByCountry)])).sort();
      const list: CountryMetrics[] = countries.map(country => {
        const bo = boByCountry[country] || { matches: 0, boOnly: 0, total: 0 };
        const bk = bankByCountry[country] || { matches: 0, partnerOnly: 0, total: 0 };
        return {
          country,
          // matches = nombre d'OK, boOnly/partnerOnly = total - OK (pour compat avec template)
          bo: { matches: bo.matches, boOnly: Math.max(bo.total - bo.matches, 0), rate: bo.total > 0 ? (bo.matches * 100) / bo.total : 0 },
          bank: { matches: bk.matches, partnerOnly: Math.max(bk.total - bk.matches, 0), rate: bk.total > 0 ? (bk.matches * 100) / bk.total : 0 },
        };
      });

      this.metrics = list;
      this.applyFilters();
      this.loading = false;
    }).catch(() => {
      this.error = 'Erreur de chargement des données réelles';
      this.loading = false;
    });
  }

  getCountries(): string[] {
    return Array.from(new Set(this.metrics.map(m => m.country))).sort();
  }

  applyFilters() {
    let rows = this.metrics;
    if (this.selectedCountry) rows = rows.filter(m => m.country === this.selectedCountry);
    this.filtered = rows;
  }

  onDatesChanged() {
    this.loadRealData();
  }

  resetDates() {
    this.startDate = '';
    this.endDate = '';
    this.loadRealData();
  }

  goBack() {
    this.location.back();
  }

  // ==== Helpers de clé de réconciliation (simplifiés) ====
  private toBaseReconKey(key: string): string {
    const m = key.match(/(debit|credit)\d+$/i);
    if (!m) return key;
    return key.replace(/(debit|credit)\d+$/i, (s) => s.replace(/\d+$/, ''));
  }

  private normalizeDateToYmd(d: any): string {
    if (!d) return '';
    const date = (typeof d === 'string') ? new Date(d) : d as Date;
    if (isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  private determineOperationSens(op: Operation): 'debit' | 'credit' {
    const type = (op.typeOperation || '').toLowerCase();
    if (type.includes('compense') || type.includes('compensation')) return 'debit';
    if (type.includes('appro') || type.includes('nivellement') || type.includes('total_cashin') || type.includes('total_paiement')) return 'credit';
    return 'credit';
  }

  private buildBaseReconKeyForOperation(op: Operation): string {
    const date = this.normalizeDateToYmd(op.dateOperation);
    const montantAbs = Math.abs(op.montant || 0);
    const banque = ((op.banque || '').trim() || '').toUpperCase().replace(/[\s-]/g, '');
    const sens = this.determineOperationSens(op);
    const dateNoDash = (date || '').replace(/-/g, '');
    const montantDigits = String(montantAbs).replace(/\D/g, '');
    return `${dateNoDash}${montantDigits}${banque}${sens}`;
  }

  private buildBaseReconKeyForReleve(r: ReleveBancaireRow): string {
    const dateRaw: any = r.dateValeur || r.dateComptable || '';
    const date = this.normalizeDateToYmd(dateRaw as any);
    const debit = (r.debit || 0) > 0 ? Math.abs(r.debit as number) : 0;
    const credit = (r.credit || 0) > 0 ? Math.abs(r.credit as number) : 0;
    const amount = debit > 0 ? debit : (credit > 0 ? credit : 0);
    const banque = ((r.banque || '').trim() || '').toUpperCase().replace(/[\s-]/g, '');
    const sens: 'debit' | 'credit' = (r.debit && r.debit > 0) ? 'debit' : 'credit';
    const dateNoDash = (date || '').replace(/-/g, '');
    const montantDigits = String(amount).replace(/\D/g, '');
    return `${dateNoDash}${montantDigits}${banque}${sens}`;
  }

  // === Helpers pays ===
  private normalize(str: string): string {
    return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  private nameToCode(name: string): string {
    const n = this.normalize(name);
    const map: Record<string, string> = {
      "senegal": "SN",
      "sn": "SN",
      "cote d'ivoire": "CI",
      "cote divoire": "CI",
      "ci": "CI",
      "benin": "BJ",
      "bj": "BJ",
      "burkina faso": "BF",
      "burkina": "BF",
      "bf": "BF",
      "mali": "ML",
      "ml": "ML",
      "togo": "TG",
      "tg": "TG",
      "gabon": "GA",
      "ga": "GA",
      "guinee": "GN",
      "guinee conakry": "GN",
      "gn": "GN",
      "cameroun": "CM",
      "cm": "CM",
      "mozambique": "MZ",
      "mz": "MZ",
      "nigeria": "NG",
      "ng": "NG",
      "kenya": "KE",
      "ke": "KE",
    };
    return map[n] || (name && name.length === 2 ? name.toUpperCase() : 'NA');
  }

  private codeFromNumeroCompte(numero?: string): string {
    if (!numero) return 'NA';
    // enlever tout ce qui n'est pas lettre puis prendre les 2 dernières lettres
    const lettersOnly = String(numero).toUpperCase().replace(/[^A-Z]/g, '');
    const m = lettersOnly.match(/([A-Z]{2})$/);
    return m ? m[1] : 'NA';
  }

  // === Helpers statut réconciliation ===
  private extractReconStatusFromOperationBancaire(op: any): string {
    // Essayer plusieurs champs possibles pour la colonne "Statut Réconciliation"
    const candidates: any[] = [
      op?.reconStatus,
      op?.statutReconciliation,
      op?.statut,
      op?.['statutReconciliation'],
      op?.['Statut Réconciliation'],
      op?.['statut_reconciliation'],
    ];
    for (const c of candidates) {
      if (c !== undefined && c !== null && String(c).trim() !== '') return String(c);
    }
    return '';
  }

  private isOkRecon(value: string): boolean {
    const v = (value || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '').trim();
    // accepte: ok, oki, okdefinitif, okreconcilie, etc., mais pas ko
    if (!v) return false;
    if (v === 'ok') return true;
    if (v.startsWith('ok')) return true; // couvre okdefinitif, okreconcilie
    // accepter aussi les statuts validés
    if (v === 'valide' || v === 'valider' || v === 'validee') return true;
    if (v.startsWith('vali')) return true; // couvre "validée", "validé"
    if (v === 'ko') return false;
    return false;
  }

  private extractReconStatusFromReleve(r: any): string {
    const candidates: any[] = [
      r?.reconStatus,
      r?.statutReconciliation,
      r?.statut,
      r?.['Statut Réconciliation'],
      r?.['statut_reconciliation'],
      r?.commentaire, // parfois le statut est noté dans un champ commentaire
    ];
    for (const c of candidates) {
      if (c !== undefined && c !== null && String(c).trim() !== '') return String(c);
    }
    return '';
  }
}


