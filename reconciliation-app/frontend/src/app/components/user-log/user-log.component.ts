import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { UserLog, UserLogFilter } from '../../models/user-log.model';
import { UserLogService } from '../../services/user-log.service';

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
  
  // Filtres
  filterForm: FormGroup;
  usernames: string[] = [];
  modules: string[] = [];
  permissions: string[] = [];
  
  constructor(
    private userLogService: UserLogService,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      username: [''],
      module: [''],
      permission: [''],
      dateDebut: [''],
      dateFin: ['']
    });
  }

  ngOnInit(): void {
    this.loadLogs();
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
    this.filterForm.reset();
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
}

