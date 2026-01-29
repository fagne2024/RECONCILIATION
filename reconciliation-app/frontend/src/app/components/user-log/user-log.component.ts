import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { UserLog, UserLogFilter } from '../../models/user-log.model';
import { UserLogService } from '../../services/user-log.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-user-log',
  templateUrl: './user-log.component.html',
  styleUrls: ['./user-log.component.scss']
})
export class UserLogComponent implements OnInit {
  logs: UserLog[] = [];
  filteredLogs: UserLog[] = [];
  isLoading = false;
  currentPage = 1;
  pageSize = 20;
  totalPages = 1;
  showAllLogs = false; // Indicateur pour savoir si on affiche tous les logs ou seulement le mois
  
  // Filtres
  filterForm: FormGroup;
  usernames: string[] = [];
  modules: string[] = [];
  permissions: string[] = [];
  
  constructor(
    private userLogService: UserLogService,
    private fb: FormBuilder
  ) {
    // Initialiser avec les dates du mois en cours par défaut
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    this.filterForm = this.fb.group({
      username: [''],
      module: [''],
      permission: [''],
      dateDebut: [this.formatDateForInput(firstDayOfMonth)],
      dateFin: [this.formatDateForInput(now)]
    });
  }

  ngOnInit(): void {
    this.loadLogs();

    // Recherche en direct dès que l'utilisateur tape (debounce pour éviter le spam réseau)
    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
      )
      .subscribe((values) => {
        // Mettre à jour showAllLogs selon si les dates sont vides ou non
        if (!values.dateDebut && !values.dateFin) {
          this.showAllLogs = true;
        } else {
          // Vérifier si les dates correspondent au mois en cours
          const now = new Date();
          const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const expectedDateDebut = this.formatDateForInput(firstDayOfMonth);
          const expectedDateFin = this.formatDateForInput(now);
          
          // Si les dates correspondent exactement au mois en cours, on considère qu'on affiche le mois
          if (values.dateDebut === expectedDateDebut && values.dateFin === expectedDateFin) {
            this.showAllLogs = false;
          }
          // Sinon, on considère qu'on affiche une période personnalisée (pas "tous" ni "mois")
          // On garde showAllLogs tel quel dans ce cas
        }
        
        this.currentPage = 1;
        this.loadLogs();
      });
  }

  loadLogs(): void {
    this.isLoading = true;
    
    const filter: UserLogFilter = {};
    if (this.filterForm.value.username) {
      filter.username = this.filterForm.value.username;
    }
    if (this.filterForm.value.module) {
      filter.module = this.filterForm.value.module;
    }
    if (this.filterForm.value.permission) {
      filter.permission = this.filterForm.value.permission;
    }
    if (this.filterForm.value.dateDebut) {
      filter.dateDebut = this.filterForm.value.dateDebut;
    }
    if (this.filterForm.value.dateFin) {
      filter.dateFin = this.filterForm.value.dateFin;
    }
    
    this.userLogService.getLogs(filter).subscribe({
      next: (logs) => {
        this.logs = logs;
        this.filteredLogs = logs;
        this.updatePagination();
        this.extractUniqueValues();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des logs:', error);
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadLogs();
  }

  resetFilters(): void {
    // Réinitialiser avec les dates du mois en cours
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    this.filterForm.reset({
      username: '',
      module: '',
      permission: '',
      dateDebut: this.formatDateForInput(firstDayOfMonth),
      dateFin: this.formatDateForInput(now)
    });
    this.showAllLogs = false;
    this.currentPage = 1;
    this.loadLogs();
  }

  /**
   * Basculer entre l'affichage du mois en cours et tous les logs
   */
  toggleShowAllLogs(): void {
    this.showAllLogs = !this.showAllLogs;
    
    if (this.showAllLogs) {
      // Afficher tous les logs : supprimer les filtres de date
      this.filterForm.patchValue({
        dateDebut: '',
        dateFin: ''
      });
    } else {
      // Afficher seulement le mois en cours
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      this.filterForm.patchValue({
        dateDebut: this.formatDateForInput(firstDayOfMonth),
        dateFin: this.formatDateForInput(now)
      });
    }
    
    this.currentPage = 1;
    this.loadLogs();
  }

  extractUniqueValues(): void {
    this.usernames = [...new Set(this.logs.map(log => log.username))].sort();
    this.modules = [...new Set(this.logs.map(log => log.module))].sort();
    this.permissions = [...new Set(this.logs.map(log => log.permission))].sort();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredLogs.length / this.pageSize);
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
  }

  get pagedLogs(): UserLog[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredLogs.slice(start, end);
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * Formate une date pour l'input datetime-local (format: YYYY-MM-DDTHH:mm)
   */
  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
}

