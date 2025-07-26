import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StatsComponent } from './components/stats/stats.component';
import { AgencySummaryComponent } from './components/stats/agency-summary/agency-summary.component';
import { ReconciliationResultsComponent } from './components/reconciliation-results/reconciliation-results.component';
import { FileUploadComponent } from './components/file-upload/file-upload.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ComptesComponent } from './components/comptes/comptes.component';
import { OperationsComponent } from './components/operations/operations.component';
import { FraisComponent } from './components/frais/frais.component';
import { UsersComponent } from './components/users/users.component';
import { RankingComponent } from './components/ranking/ranking.component';
import { ColumnSelectionComponent } from './components/column-selection/column-selection.component';
import { LoginComponent } from './login/login.component';
import { TraitementComponent } from './components/traitement/traitement.component';
import { ProfilComponent } from './components/profil/profil.component';
import { ModulesComponent } from './components/modules/modules.component';
import { PermissionsComponent } from './components/permissions/permissions.component';
import { EcartSoldeComponent } from './components/ecart-solde/ecart-solde.component';

const routes: Routes = [
  { path: '', redirectTo: '/upload', pathMatch: 'full' },
  { path: 'upload', component: FileUploadComponent },
  { path: 'column-selection', component: ColumnSelectionComponent },
  { path: 'stats', component: StatsComponent },
  { path: 'agency-summary', component: AgencySummaryComponent },
  { path: 'results', component: ReconciliationResultsComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'comptes', component: ComptesComponent },
  { path: 'operations', component: OperationsComponent },
  { path: 'frais', component: FraisComponent },
  { path: 'users', component: UsersComponent },
  { path: 'ranking', component: RankingComponent },
  { path: 'login', component: LoginComponent },
  { path: 'traitement', component: TraitementComponent },
  { path: 'profils', component: ProfilComponent },
  { path: 'modules', component: ModulesComponent },
  { path: 'permissions', component: PermissionsComponent },
  { path: 'ecart-solde', component: EcartSoldeComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { } 