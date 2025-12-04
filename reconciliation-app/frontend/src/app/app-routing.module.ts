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


import { AutoProcessingModelsComponent } from './components/auto-processing-models/auto-processing-models.component';
import { BanqueComponent } from './components/banque/banque.component';
import { ReconciliationLauncherComponent } from './components/reconciliation-launcher/reconciliation-launcher.component';
import { ReconciliationComponent } from './components/reconciliation/reconciliation.component';
import { ReconciliationReportComponent } from './components/reconciliation-report/reconciliation-report.component';
import { ReportDashboardComponent } from './components/report-dashboard/report-dashboard.component';
import { DashboardReconciliationComponent } from './components/dashboard-reconciliation/dashboard-reconciliation.component';
import { BanqueDashboardComponent } from './components/banque-dashboard/banque-dashboard.component';
import { TwoFactorAuthComponent } from './components/two-factor-auth/two-factor-auth.component';
import { UserProfileComponent } from './components/user-profile/user-profile.component';
import { AideComponent } from './components/aide/aide.component';
import { SopOperationComponent } from './components/sop-operation/sop-operation.component';
import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';

const routes: Routes = [
  // Route de login accessible sans authentification
  { path: 'login', component: LoginComponent },
  
  // Toutes les autres routes nécessitent une authentification
  // Note: La route de redirection n'a pas besoin de canActivate car la route de destination est protégée
  { path: '', redirectTo: '/reconciliation-launcher', pathMatch: 'full' },
  { path: 'reconciliation-launcher', component: ReconciliationLauncherComponent, canActivate: [AuthGuard] },
  { path: 'reconciliation', component: ReconciliationComponent, canActivate: [AuthGuard] },
  { path: 'upload', component: FileUploadComponent, canActivate: [AuthGuard] },
  { path: 'column-selection', component: ColumnSelectionComponent, canActivate: [AuthGuard] },
  { path: 'stats', component: StatsComponent, canActivate: [AuthGuard] },
  { path: 'agency-summary', component: AgencySummaryComponent, canActivate: [AuthGuard] },
  { path: 'results', component: ReconciliationResultsComponent, canActivate: [AuthGuard] },
  { path: 'matches', component: MatchesTableComponent, canActivate: [AuthGuard] },
  { path: 'ecart-bo', component: EcartBoTableComponent, canActivate: [AuthGuard] },
  { path: 'ecart-partner', component: EcartPartnerTableComponent, canActivate: [AuthGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'comptes', component: ComptesComponent, canActivate: [AuthGuard] },
  { path: 'operations', component: OperationsComponent, canActivate: [AuthGuard] },
  { path: 'frais', component: FraisComponent, canActivate: [AuthGuard] },
  { path: 'commission', component: CommissionComponent, canActivate: [AuthGuard] },
  { path: 'users', component: UsersComponent, canActivate: [AuthGuard, AdminGuard] },
  { path: 'ranking', component: RankingComponent, canActivate: [AuthGuard] },
  { path: 'traitement', component: TraitementComponent, canActivate: [AuthGuard] },
  { path: 'profils', component: ProfilComponent, canActivate: [AuthGuard, AdminGuard] },
  { path: 'modules', component: ModulesComponent, canActivate: [AuthGuard, AdminGuard] },
  { path: 'permissions', component: PermissionsComponent, canActivate: [AuthGuard, AdminGuard] },
  { path: 'ecart-solde', component: EcartSoldeComponent, canActivate: [AuthGuard] },
  { path: 'trx-sf', component: TrxSfComponent, canActivate: [AuthGuard] },
  { path: 'impact-op', component: ImpactOPComponent, canActivate: [AuthGuard] },
  { path: 'service-balance', component: ServiceBalanceComponent, canActivate: [AuthGuard] },
  { path: 'service-references', component: ServiceReferencesComponent, canActivate: [AuthGuard] },
  { path: 'auto-processing-models', component: AutoProcessingModelsComponent, canActivate: [AuthGuard] },
  { path: 'banque', component: BanqueComponent, canActivate: [AuthGuard] },
  { path: 'comptabilite', component: ComptabiliteComponent, canActivate: [AuthGuard] },
  { path: 'reconciliation-report', component: ReconciliationReportComponent, canActivate: [AuthGuard] },
  { path: 'report-dashboard', component: ReportDashboardComponent, canActivate: [AuthGuard] },
  { path: 'reconciliation-dashboard', component: DashboardReconciliationComponent, canActivate: [AuthGuard] },
  { path: 'banque-dashboard', component: BanqueDashboardComponent, canActivate: [AuthGuard] },
  { path: 'log-utilisateur', component: UserLogComponent, canActivate: [AuthGuard, AdminGuard] },
  { path: 'predictions', component: PredictionsNewComponent, canActivate: [AuthGuard] },
  { path: 'predictions-old', component: PredictionsComponent, canActivate: [AuthGuard] }, // Ancien système gardé pour référence
  { path: 'two-factor-auth', component: TwoFactorAuthComponent, canActivate: [AuthGuard, AdminGuard] },
  { path: 'user-profile', component: UserProfileComponent, canActivate: [AuthGuard] },
  { path: 'aide', component: AideComponent, canActivate: [AuthGuard] },
  { path: 'sop-operation', component: SopOperationComponent, canActivate: [AuthGuard] },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { } 