import { Component, OnInit } from '@angular/core';
import { AgencySummaryService } from '../../../services/agency-summary.service';
import * as XLSX from 'xlsx';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-agency-summary',
  templateUrl: './agency-summary.component.html',
  styleUrls: ['./agency-summary.component.scss'],
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule]
})
export class AgencySummaryComponent implements OnInit {
  loading = false;

  constructor(private agencySummaryService: AgencySummaryService) { }

  ngOnInit(): void {
  }

  exportToExcel(): void {
    this.loading = true;
    this.agencySummaryService.exportAllSummaries('Statistiques').subscribe({
      next: (response) => {
        if (response.success) {
          const data = response.data;
          const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
          const workbook: XLSX.WorkBook = { Sheets: { 'Résumé par Agence': worksheet }, SheetNames: ['Résumé par Agence'] };
          XLSX.writeFile(workbook, `resume_agence_${new Date().toISOString().split('T')[0]}.xlsx`);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors de l\'export:', error);
        this.loading = false;
      }
    });
  }
} 