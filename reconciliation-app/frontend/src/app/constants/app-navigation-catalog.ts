/**
 * Catalogue des menus / sous-menus de l'application (aligné sur la sidebar).
 * Chaque entrée pointe vers le nom du module métier utilisé pour les droits.
 */
export interface AppNavigationSubmenu {
  key: string;
  label: string;
  route: string;
  moduleName: string;
  icon?: string;
}

export interface AppNavigationGroup {
  key: string;
  label: string;
  icon?: string;
  /** Menu sans sous-menu : module et route directs. */
  moduleName?: string;
  route?: string;
  children?: AppNavigationSubmenu[];
  adminOnly?: boolean;
}

export const APP_NAVIGATION_CATALOG: AppNavigationGroup[] = [
  {
    key: 'dashboard',
    label: 'Tableau de bord',
    icon: 'fa-tachometer-alt',
    moduleName: 'Dashboard',
    route: '/dashboard'
  },
  {
    key: 'traitement',
    label: 'Traitement',
    icon: 'fa-tools',
    moduleName: 'Traitement',
    route: '/traitement'
  },
  {
    key: 'reconciliation',
    label: 'Réconciliation',
    icon: 'fa-file-upload',
    children: [
      { key: 'reco-launcher', label: 'Lanceur', route: '/reconciliation-launcher', moduleName: 'Réconciliation', icon: 'fa-play-circle' },
      { key: 'reco-manual', label: 'Mode Manuel', route: '/upload', moduleName: 'Réconciliation', icon: 'fa-upload' },
      { key: 'reco-assisted', label: 'Mode assisté', route: '/upload-assisted', moduleName: 'Réconciliation', icon: 'fa-magic' },
      { key: 'reco-certif', label: 'Certification de solde', route: '/certification-solde', moduleName: 'Réconciliation', icon: 'fa-balance-scale' }
    ]
  },
  {
    key: 'resultats',
    label: 'Résultats',
    icon: 'fa-poll',
    children: [
      { key: 'res-overview', label: "Vue d'ensemble", route: '/results', moduleName: 'Résultats', icon: 'fa-poll' },
      { key: 'res-matches', label: 'Correspondances', route: '/matches', moduleName: 'Résultats', icon: 'fa-check-double' },
      { key: 'res-ecart-bo', label: 'Écarts BO', route: '/ecart-bo', moduleName: 'Résultats', icon: 'fa-exclamation-circle' },
      { key: 'res-ecart-part', label: 'Écarts Partenaire', route: '/ecart-partner', moduleName: 'Résultats', icon: 'fa-exclamation-triangle' },
      { key: 'res-ecart-summary', label: 'Suivi des écarts J-1 & J+1', route: '/ecart-bo-summary', moduleName: 'Résultats', icon: 'fa-list-alt' },
      { key: 'res-report', label: 'Rapport réconciliation', route: '/reconciliation-report', moduleName: 'Résultats', icon: 'fa-file-alt' },
      { key: 'res-bo-part', label: 'Rapport BO vs Partenaire', route: '/rapport-reconciliation-bo-partenaire', moduleName: 'Résultats', icon: 'fa-file-contract' },
      { key: 'res-controle-interne', label: 'Contrôle interne BO vs Partenaire', route: '/controle-interne-bo-partenaire', moduleName: 'Résultats', icon: 'fa-clipboard-check' }
    ]
  },
  {
    key: 'statistiques',
    label: 'Statistiques',
    icon: 'fa-chart-bar',
    children: [
      { key: 'stats-main', label: 'Statistiques', route: '/stats', moduleName: 'Statistiques', icon: 'fa-chart-bar' },
      { key: 'stats-report', label: 'Rapport statistiques', route: '/stats-report', moduleName: 'Statistiques', icon: 'fa-file-chart-line' },
      { key: 'stats-graph', label: 'Graphiques', route: '/stats-report-graph', moduleName: 'Statistiques', icon: 'fa-chart-line' },
      { key: 'stats-agency', label: 'Résumé agences', route: '/agency-summary', moduleName: 'Statistiques', icon: 'fa-building' }
    ]
  },
  {
    key: 'classements',
    label: 'Classements',
    icon: 'fa-trophy',
    moduleName: 'Classements',
    route: '/ranking'
  },
  {
    key: 'comptes',
    label: 'Comptes',
    icon: 'fa-wallet',
    children: [
      { key: 'comptes-main', label: 'Comptes', route: '/comptes', moduleName: 'Comptes', icon: 'fa-wallet' },
      { key: 'comptes-redevance', label: 'Redevance loterie', route: '/redevance-loterie', moduleName: 'Comptes', icon: 'fa-ticket-alt' },
      { key: 'comptes-balance', label: 'Service balance', route: '/service-balance', moduleName: 'Comptes', icon: 'fa-balance-scale' },
      { key: 'comptes-predictions', label: 'Prédictions', route: '/predictions', moduleName: 'Comptes', icon: 'fa-brain' }
    ]
  },
  {
    key: 'operations',
    label: 'Opérations',
    icon: 'fa-exchange-alt',
    moduleName: 'Opérations',
    route: '/operations'
  },
  {
    key: 'frais-commissions',
    label: 'Frais & Commissions',
    icon: 'fa-money-bill-wave',
    children: [
      { key: 'frais', label: 'Frais', route: '/frais', moduleName: 'Frais', icon: 'fa-money-bill-wave' },
      { key: 'commission', label: 'Commission', route: '/commission', moduleName: 'Commission', icon: 'fa-hand-holding-usd' },
      { key: 'charge', label: 'Charge', route: '/charge', moduleName: 'Charge', icon: 'fa-file-invoice-dollar' }
    ]
  },
  {
    key: 'suivi-ecarts',
    label: 'Suivi des écarts',
    icon: 'fa-chart-line',
    children: [
      { key: 'suivi-overview', label: "Vue d'ensemble", route: '/suivi-des-ecarts', moduleName: 'TSOP', icon: 'fa-clipboard-list' },
      { key: 'suivi-tsop', label: 'Écart de solde', route: '/ecart-solde', moduleName: 'TSOP', icon: 'fa-exclamation-triangle' },
      { key: 'suivi-impact', label: 'Écart régularisé', route: '/impact-op', moduleName: 'Impact OP', icon: 'fa-chart-line' },
      { key: 'suivi-trx-sf', label: 'TRX SF', route: '/trx-sf', moduleName: 'TRX SF', icon: 'fa-exchange-alt' }
    ]
  },
  {
    key: 'banque',
    label: 'BANQUE',
    icon: 'fa-university',
    children: [
      { key: 'banque-main', label: 'Banque', route: '/banque', moduleName: 'BANQUE', icon: 'fa-university' },
      { key: 'banque-dashboard', label: 'Dashboard banque', route: '/banque-dashboard', moduleName: 'BANQUE', icon: 'fa-chart-bar' }
    ]
  },
  {
    key: 'comptabilite',
    label: 'Comptabilité',
    icon: 'fa-book',
    moduleName: 'Comptabilité',
    route: '/comptabilite'
  },
  {
    key: 'modeles',
    label: 'Modèles de Traitement',
    icon: 'fa-cogs',
    moduleName: 'Modèles',
    route: '/auto-processing-models'
  },
  {
    key: 'aide',
    label: 'AIDE',
    icon: 'fa-question-circle',
    children: [
      { key: 'aide-main', label: 'Aide', route: '/aide', moduleName: 'AIDE', icon: 'fa-question-circle' },
      { key: 'aide-guide', label: 'Guide utilisation', route: '/guide-utilisation', moduleName: 'AIDE', icon: 'fa-book-open' },
      { key: 'aide-sop-op', label: 'SOP Opérations', route: '/sop-operation', moduleName: 'AIDE', icon: 'fa-tasks' },
      { key: 'aide-sop-reco', label: 'SOP Réconciliation TRX', route: '/sop-reconciliation-trx', moduleName: 'AIDE', icon: 'fa-file-invoice' }
    ]
  },
  {
    key: 'parametre',
    label: 'Paramètre',
    icon: 'fa-cog',
    adminOnly: true,
    children: [
      { key: 'param-users', label: 'Utilisateur', route: '/users', moduleName: 'Utilisateur', icon: 'fa-user' },
      { key: 'param-profils', label: 'Profil', route: '/profils', moduleName: 'Profil', icon: 'fa-id-badge' },
      { key: 'param-modules', label: 'Module', route: '/modules', moduleName: 'Module', icon: 'fa-cube' },
      { key: 'param-permissions', label: 'Permission', route: '/permissions', moduleName: 'Permission', icon: 'fa-key' },
      { key: 'param-logs', label: 'Log utilisateur', route: '/log-utilisateur', moduleName: 'Log utilisateur', icon: 'fa-history' }
    ]
  }
];

/** Modules distincts référencés dans le catalogue (pour préchargement des permissions). */
export function getNavigationCatalogModuleNames(): string[] {
  const names = new Set<string>();
  for (const group of APP_NAVIGATION_CATALOG) {
    if (group.moduleName) {
      names.add(group.moduleName);
    }
    group.children?.forEach(child => names.add(child.moduleName));
  }
  return [...names].sort((a, b) => a.localeCompare(b, 'fr'));
}
