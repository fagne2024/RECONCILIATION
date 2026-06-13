import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StatsComponent } from './components/stats/stats.component';
import { AgencySummaryComponent } from './components/stats/agency-summary/agency-summary.component';
import { ReconciliationResultsComponent } from './components/reconciliation-results/reconciliation-results.component';
import { MatchesTableComponent } from './components/matches-table/matches-table.component';
import { EcartBoTableComponent } from './components/ecart-bo-table/ecart-bo-table.component';
import { EcartPartnerTableComponent } from './components/ecart-partner-table/ecart-partner-table.component';
import { FileUploadComponent } from './components/file-upload/file-upload.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ComptesComponent } from './components/comptes/comptes.component';
import { OperationsComponent } from './components/operations/operations.component';
import { FraisComponent } from './components/frais/frais.component';
import { CommissionComponent } from './components/commission/commission.component';
import { UsersComponent } from './components/users/users.component';
import { RankingComponent } from './components/ranking/ranking.component';
import { ColumnSelectionComponent } from './components/column-selection/column-selection.component';
import { LoginComponent } from './login/login.component';
import { TraitementComponent } from './components/traitement/traitement.component';
import { ProfilComponent } from './components/profil/profil.component';
import { ModulesComponent } from './components/modules/modules.component';
import { PermissionsComponent } from './components/permissions/permissions.component';
import { EcartSoldeComponent } from './components/ecart-solde/ecart-solde.component';
import { ImpactOPComponent } from './components/impact-op/impact-op.component';
import { TrxSfComponent } from './components/trx-sf/trx-sf.component';
import { ServiceBalanceComponent } from './components/service-balance/service-balance.component';
import { ServiceReferencesComponent } from './components/service-references/service-references.component';
import { ComptabiliteComponent } from './components/comptabilite/comptabilite.component';
import { UserLogComponent } from './components/user-log/user-log.component';
import { PredictionsComponent } from './components/predictions/predictions.component';
import { PredictionsNewComponent } from './components/predictions/predictions-new.component';
import { StatsReportComponent } from './components/stats-report/stats-report.component';
import { StatsReportGraphComponent } from './components/stats-report-graph/stats-report-graph.component';


import { AutoProcessingModelsComponent } from './components/auto-processing-models/auto-processing-models.component';
import { BanqueComponent } from './components/banque/banque.component';
import { ReconciliationLauncherComponent } from './components/reconciliation-launcher/reconciliation-launcher.component';
import { ReconciliationComponent } from './components/reconciliation/reconciliation.component';
import { ReconciliationReportComponent } from './components/reconciliation-report/reconciliation-report.component';
import { ReportDashboardComponent } from './components/report-dashboard/report-dashboard.component';
import { DashboardReconciliationComponent } from './components/dashboard-reconciliation/dashboard-reconciliation.component';
import { ReconciliationGlobalPreviewComponent } from './components/reconciliation-global-preview/reconciliation-global-preview.component';
import { BanqueDashboardComponent } from './components/banque-dashboard/banque-dashboard.component';
import { TwoFactorAuthComponent } from './components/two-factor-auth/two-factor-auth.component';
import { UserProfileComponent } from './components/user-profile/user-profile.component';
import { AideComponent } from './components/aide/aide.component';
import { SopOperationComponent } from './components/sop-operation/sop-operation.component';
import { SopReconciliationTrxComponent } from './components/sop-reconciliation-trx/sop-reconciliation-trx.component';
import { GuideUtilisationComponent } from './components/guide-utilisation/guide-utilisation.component';
import { SuiviDesEcartsComponent } from './components/suivi-des-ecarts/suivi-des-ecarts.component';
import { RapportReconciliationBoPartenaireComponent } from './components/rapport-reconciliation-bo-partenaire/rapport-reconciliation-bo-partenaire.component';
import { EcartBoSummaryComponent } from './components/ecart-bo-summary/ecart-bo-summary.component';
import { RedevanceLoterieComponent } from './components/redevance-loterie/redevance-loterie.component';
import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { ModuleAccessGuard } from './guards/module-access.guard';

const routes: Routes = [
  // Route de login accessible sans authentification
  { path: 'login', component: LoginComponent },
  
  // Toutes les autres routes nécessitent une authentification
  // Note: La route de redirection n'a pas besoin de canActivate car la route de destination est protégée
  { path: '', redirectTo: '/reconciliation-launcher', pathMatch: 'full' },
  {
    path: 'reconciliation-launcher',
    component: ReconciliationLauncherComponent,
    canActivate: [AuthGuard, ModuleAccessGuard],
    data: { module: 'Réconciliation', permissions: ['consulter'] }
  },
  {
    path: 'reconciliation',
    component: ReconciliationComponent,
    canActivate: [AuthGuard, ModuleAccessGuard],
    data: { module: 'Réconciliation', permissions: ['consulter'] }
  },
  {
    path: 'upload',
    component: FileUploadComponent,
    canActivate: [AuthGuard, ModuleAccessGuard],
    data: { module: 'Réconciliation', permissions: ['consulter'] }
  },
  {
    path: 'upload-assisted',
    component: FileUploadComponent,
    canActivate: [AuthGuard, ModuleAccessGuard],
    data: { module: 'Réconciliation', permissions: ['consulter'], assistedOnly: true }
  },
  {
    path: 'column-selection',
    component: ColumnSelectionComponent,
    canActivate: [AuthGuard, ModuleAccessGuard],
    data: { module: 'Réconciliation', permissions: ['consulter'] }
  },
  {
    path: 'stats',
    component: StatsComponent,
    canActivate: [AuthGuard, ModuleAccessGuard],
    data: { module: 'Statistiques', permissions: ['consulter'] }
  },
  {
    path: 'stats-report',
    component: StatsReportComponent,
    canActivate: [AuthGuard, ModuleAccessGuard],
    data: { module: 'Statistiques', permissions: ['consulter'] }
  },
  {
    path: 'stats-report-graph',
    component: StatsReportGraphComponent,
    canActivate: [AuthGuard, ModuleAccessGuard],
    data: { module: 'Statistiques', permissions: ['consulter'] }
  },
  {
    path: 'agency-summary',
    component: AgencySummaryComponent,
    canActivate: [AuthGuard, ModuleAccessGuard],
    data: { module: 'Statistiques', permissions: ['consulter'] }
  },
  {
    path: 'results',
    component: ReconciliationResultsComponent,
    canActivate: [AuthGuard, ModuleAccessGuard],
    data: { module: 'Résultats', permissions: ['consulter'] }
  },
  {
    path: 'matches',
    component: MatchesTableComponent,
    canActivate: [AuthGuard, ModuleAccessGuard],
    data: { module: 'Résultats', permissions: ['consulter'] }
  },
  {
    path: 'ecart-bo',
    component: EcartBoTableComponent,
    canActivate: [AuthGuard, ModuleAccessGuard],
    data: { module: 'Résultats', permissions: ['consulter'] }
  },
  {
    path: 'ecart-partner',
    component: EcartPartnerTableComponent,
    canActivate: [AuthGuard, ModuleAccessGuard],
    data: { module: 'Résultats', permissions: ['consulter'] }
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard, ModuleAccessGuard],
    data: { module: 'Dashboard', permissions: ['consulter', 'filtrer'] }
  },
  {
    path: 'comptes',
    component: ComptesComponent,
    canActivate: [AuthGuard, ModuleAccessGuard],
    data: { module: 'Comptes', permissions: ['consulter'] }
  },
  {
    path: 'redevance-loterie',
    component: RedevanceLoterieComponent,
    canActivate: [AuthGuard, ModuleAccessGuard],
    data: { module: 'Comptes', permissions: ['consulter'] }
  },
  {
    path: 'operations',
    component: OperationsComponent,
    canActivate: [AuthGuard, ModuleAccessGuard],
    data: { module: 'Opérations', permissions: ['consulter'] }
  },
  {
    path: 'frais',
    component: FraisComponent,
    canActivate: [AuthGuard, ModuleAccessGuard],
    data: { module: 'Frais', permissions: ['consulter'] }
  },
  { path: 'commission', component: CommissionComponent, canActivate: [AuthGuard] },
  { path: 'users', component: UsersComponent, canActivate: [AuthGuard, AdminGuard] },
  {
    path: 'ranking',
    component: RankingComponent,
    canActivate: [AuthGuard, ModuleAccessGuard],
    data: { module: 'Classements', permissions: ['consulter'] }
  },
  {
    path: 'traitement',
    component: TraitementComponent,
    canActivate: [AuthGuard, ModuleAccessGuard],
    data: { module: 'Traitement', permissions: ['consulter'] }
  },
  { path: 'profils', component: ProfilComponent, canActivate: [AuthGuard, AdminGuard] },
  { path: 'modules', component: ModulesComponent, canActivate: [AuthGuard, AdminGuard] },
  { path: 'permissions', component: PermissionsComponent, canActivate: [AuthGuard, AdminGuard] },
  {
    path: 'ecart-solde',
    component: EcartSoldeComponent,
    canActivate: [AuthGuard, ModuleAccessGuard],
    data: { module: 'TSOP', permissions: ['consulter'] }
  },
  {
    path: 'trx-sf',
    component: TrxSfComponent,
    canActivate: [AuthGuard, ModuleAccessGuard],
    data: { module: 'TRX SF', permissions: ['consulter'] }
  },
  {
    path: 'impact-op',
    component: ImpactOPComponent,
    canActivate: [AuthGuard, ModuleAccessGuard],
    data: { module: 'Impact OP', permissions: ['consulter'] }
  },
  {
    path: 'service-balance',
    component: ServiceBalanceComponent,
    canActivate: [AuthGuard, ModuleAccessGuard],
    data: { module: 'Comptes', permissions: ['consulter'] }
  },
  {
    path: 'service-references',
    component: ServiceReferencesComponent,
    canActivate: [AuthGuard, ModuleAccessGuard],
    data: { module: 'Dashboard', permissions: ['consulter'] }
  },
  {
    path: 'auto-processing-models',
    component: AutoProcessingModelsComponent,
    canActivate: [AuthGuard, ModuleAccessGuard],
    data: { module: 'Modèles', permissions: ['consulter'] }
  },
  {
    path: 'banque',
    component: BanqueComponent,
    canActivate: [AuthGuard, ModuleAccessGuard],
    data: { module: 'BANQUE', permissions: ['consulter'] }
  },
  {
    path: 'comptabilite',
    component: ComptabiliteComponent,
    canActivate: [AuthGuard, ModuleAccessGuard],
    data: { module: 'Comptabilité', permissions: ['consulter'] }
  },
  {
    path: 'reconciliation-report',
    component: ReconciliationReportComponent,
    canActivate: [AuthGuard, ModuleAccessGuard],
    data: { module: 'Résultats', permissions: ['consulter'] }
  },
  {
    path: 'rapport-reconciliation-bo-partenaire',
    component: RapportReconciliationBoPartenaireComponent,
    canActivate: [AuthGuard, ModuleAccessGuard],
    data: { module: 'Résultats', permissions: ['consulter'] }
  },
  {
    path: 'report-dashboard',
    component: ReportDashboardComponent,
    canActivate: [AuthGuard, ModuleAccessGuard],
    data: { module: 'Report Dashboard', permissions: ['consulter'] }
  },
  {
    path: 'reconciliation-dashboard',
    component: DashboardReconciliationComponent,
    canActivate: [AuthGuard, ModuleAccessGuard],
    data: { module: 'Résultats', permissions: ['consulter'] }
  },
  {
    path: 'reconciliation-global-preview',
    component: ReconciliationGlobalPreviewComponent,
    canActivate: [AuthGuard, ModuleAccessGuard],
    data: { module: 'Résultats', permissions: ['consulter'] }
  },
  {
    path: 'banque-dashboard',
    component: BanqueDashboardComponent,
    canActivate: [AuthGuard, ModuleAccessGuard],
    data: { module: 'BANQUE', permissions: ['consulter'] }
  },
  { path: 'log-utilisateur', component: UserLogComponent, canActivate: [AuthGuard, AdminGuard] },
  {
    path: 'predictions',
    component: PredictionsNewComponent,
    canActivate: [AuthGuard, ModuleAccessGuard],
    data: { module: 'Comptes', permissions: ['consulter'] }
  },
  {
    path: 'predictions-old',
    component: PredictionsComponent,
    canActivate: [AuthGuard, ModuleAccessGuard],
    data: { module: 'Comptes', permissions: ['consulter'] }
  }, // Ancien système gardé pour référence
  { path: 'two-factor-auth', component: TwoFactorAuthComponent, canActivate: [AuthGuard, AdminGuard] },
  { path: 'user-profile', component: UserProfileComponent, canActivate: [AuthGuard] },
  { path: 'aide', component: AideComponent, canActivate: [AuthGuard] },
  { path: 'sop-operation', component: SopOperationComponent, canActivate: [AuthGuard] },
  { path: 'sop-reconciliation-trx', component: SopReconciliationTrxComponent, canActivate: [AuthGuard] },
  { path: 'guide-utilisation', component: GuideUtilisationComponent, canActivate: [AuthGuard] },
  { path: 'suivi-des-ecarts', component: SuiviDesEcartsComponent, canActivate: [AuthGuard] },
  {
    path: 'ecart-bo-summary',
    component: EcartBoSummaryComponent,
    canActivate: [AuthGuard, ModuleAccessGuard],
    data: { module: 'Résultats', permissions: ['consulter'] }
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { } 