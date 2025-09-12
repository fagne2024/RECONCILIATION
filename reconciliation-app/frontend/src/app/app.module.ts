import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { NgChartsModule } from 'ng2-charts';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';

import { AppComponent } from './app.component';
import { FileUploadComponent } from './components/file-upload/file-upload.component';
import { ReconciliationResultsComponent } from './components/reconciliation-results/reconciliation-results.component';
import { ReconciliationComponent } from './components/reconciliation/reconciliation.component';
import { StatsComponent } from './components/stats/stats.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ColumnSelectionComponent } from './components/column-selection/column-selection.component';
import { AgencySummaryComponent } from './components/stats/agency-summary/agency-summary.component';
import { ComptesComponent } from './components/comptes/comptes.component';
import { OperationsComponent } from './components/operations/operations.component';
import { FraisComponent } from './components/frais/frais.component';
import { AutocompleteInputComponent } from './components/shared/autocomplete-input.component';
import { UsersComponent } from './components/users/users.component';
import { RankingComponent } from './components/ranking/ranking.component';
import { AppRoutingModule } from './app-routing.module';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { ReconciliationService } from './services/reconciliation.service';
import { Observable, of } from 'rxjs';
import { LoginComponent } from './login/login.component';
import { TraitementComponent } from './components/traitement/traitement.component';
import { ProgressPopupComponent } from './components/shared/progress-popup.component';
import { ProfilComponent } from './components/profil/profil.component';
import { SoldesComponent } from './components/soldes/soldes.component';
import { ModulesComponent } from './components/modules/modules.component';
import { PermissionsComponent } from './components/permissions/permissions.component';
import { EcartSoldeComponent } from './components/ecart-solde/ecart-solde.component';
import { EcartSoldeTabComponent } from './components/comptes/ecart-solde-tab.component';
import { ImpactOPComponent } from './components/impact-op/impact-op.component';
import { ImpactOPTabComponent } from './components/comptes/impact-op-tab.component';
import { TrxSfComponent } from './components/trx-sf/trx-sf.component';
import { ServiceBalanceComponent } from './components/service-balance/service-balance.component';
import { ServiceBalanceService } from './services/service-balance.service';


import { AutoProcessingModelsComponent } from './components/auto-processing-models/auto-processing-models.component';
import { BanqueComponent } from './components/banque/banque.component';
import { ExcelAnalysisComponent } from './components/excel-analysis/excel-analysis.component';
import { ReconciliationLauncherComponent } from './components/reconciliation-launcher/reconciliation-launcher.component';
import { ModernPopupComponent } from './components/modern-popup/modern-popup.component';

@NgModule({
    declarations: [
        AppComponent,
        FileUploadComponent,
        ReconciliationResultsComponent,
        ReconciliationComponent,
        StatsComponent,
        DashboardComponent,
        ComptesComponent,
        OperationsComponent,
        FraisComponent,
        SidebarComponent,
        AutocompleteInputComponent,
        UsersComponent,
        RankingComponent,
        LoginComponent,
        TraitementComponent,
        ProgressPopupComponent,
        ProfilComponent,
        SoldesComponent,
        ModulesComponent,
        PermissionsComponent,
                        EcartSoldeComponent,
                EcartSoldeTabComponent,
                ImpactOPComponent,
                ImpactOPTabComponent,
                TrxSfComponent,
                ServiceBalanceComponent,


                AutoProcessingModelsComponent,
                BanqueComponent,
                ExcelAnalysisComponent,
                ModernPopupComponent
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        HttpClientModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatTableModule,
        MatPaginatorModule,
        AppRoutingModule,
        MatAutocompleteModule,
        ReactiveFormsModule,
        MatProgressSpinnerModule,
        NgChartsModule,
        MatSelectModule,
        MatOptionModule,
        NgxMatSelectSearchModule,
        ColumnSelectionComponent,
        AgencySummaryComponent,
        ReconciliationLauncherComponent
    ],
    providers: [ReconciliationService, ServiceBalanceService],
    bootstrap: [AppComponent]
})
export class AppModule { } 