import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FileWatcherService, ProcessingSpecification, WatcherStatus } from '../../services/file-watcher.service';

@Component({
  selector: 'app-file-watcher',
  templateUrl: './file-watcher.component.html',
  styleUrls: ['./file-watcher.component.scss']
})
export class FileWatcherComponent implements OnInit, OnDestroy {
  status: WatcherStatus | null = null;
  specifications: ProcessingSpecification[] = [];
  examples: any[] = [];
  showCreateForm = false;
  editingSpec: ProcessingSpecification | null = null;
  specificationForm: FormGroup;
  loading = false;
  errorMessage = '';

  constructor(
    private fileWatcherService: FileWatcherService,
    private fb: FormBuilder
  ) {
    this.specificationForm = this.fb.group({
      name: ['', Validators.required],
      filePattern: ['', Validators.required],
      processingType: ['csv', Validators.required],
      delimiter: [';'],
      encoding: ['utf8'],
      outputFormat: ['json'],
      autoProcess: [true]
    });
  }

  ngOnInit(): void {
    this.loadStatus();
    this.loadSpecifications();
    this.loadExamples();
  }

  ngOnDestroy(): void {
    // Cleanup si nécessaire
  }

  loadStatus(): void {
    this.loading = true;
    this.fileWatcherService.getStatus().subscribe({
      next: (response: any) => {
        if (response.success) {
          this.status = {
            watchPath: response.watchPath,
            isProcessing: response.isProcessing,
            queueLength: response.queueLength
          };
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement du statut:', error);
        this.errorMessage = 'Erreur de connexion au serveur';
        this.loading = false;
      }
    });
  }

  loadSpecifications(): void {
    this.fileWatcherService.getSpecifications().subscribe({
      next: (response: any) => {
        if (response.success) {
          this.specifications = response.specifications;
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement des spécifications:', error);
      }
    });
  }

  loadExamples(): void {
    this.fileWatcherService.getExamples().subscribe({
      next: (response: any) => {
        if (response.success) {
          this.examples = response.examples;
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement des exemples:', error);
      }
    });
  }

  startWatching(): void {
    this.loading = true;
    this.fileWatcherService.startWatching().subscribe({
      next: (response: any) => {
        if (response.success) {
          this.loadStatus();
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors du démarrage de la surveillance:', error);
        this.errorMessage = 'Erreur lors du démarrage de la surveillance';
        this.loading = false;
      }
    });
  }

  stopWatching(): void {
    this.loading = true;
    this.fileWatcherService.stopWatching().subscribe({
      next: (response: any) => {
        if (response.success) {
          this.loadStatus();
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors de l\'arrêt de la surveillance:', error);
        this.errorMessage = 'Erreur lors de l\'arrêt de la surveillance';
        this.loading = false;
      }
    });
  }

  editSpecification(spec: ProcessingSpecification): void {
    this.editingSpec = spec;
    this.specificationForm.patchValue({
      name: spec.name,
      filePattern: spec.filePattern,
      processingType: spec.processingType,
      delimiter: spec.delimiter || ';',
      encoding: spec.encoding || 'utf8',
      outputFormat: spec.outputFormat || 'json',
      autoProcess: spec.autoProcess
    });
    this.showCreateForm = true;
  }

  saveSpecification(): void {
    if (this.specificationForm.valid) {
      this.loading = true;
      const specData = this.specificationForm.value;
      
      if (this.editingSpec) {
        // Mise à jour
        this.fileWatcherService.updateSpecification(this.editingSpec.id, specData).subscribe({
          next: (response: any) => {
            if (response.success) {
              this.loadSpecifications();
              this.closeForm();
            }
            this.loading = false;
          },
          error: (error) => {
            console.error('Erreur lors de la mise à jour:', error);
            this.errorMessage = 'Erreur lors de la mise à jour';
            this.loading = false;
          }
        });
      } else {
        // Création
        this.fileWatcherService.createSpecification(specData).subscribe({
          next: (response: any) => {
            if (response.success) {
              this.loadSpecifications();
              this.closeForm();
            }
            this.loading = false;
          },
          error: (error) => {
            console.error('Erreur lors de la création:', error);
            this.errorMessage = 'Erreur lors de la création';
            this.loading = false;
          }
        });
      }
    }
  }

  deleteSpecification(id: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette spécification ?')) {
      this.loading = true;
      this.fileWatcherService.deleteSpecification(id).subscribe({
        next: (response: any) => {
          if (response.success) {
            this.loadSpecifications();
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Erreur lors de la suppression:', error);
          this.errorMessage = 'Erreur lors de la suppression';
          this.loading = false;
        }
      });
    }
  }

  loadExample(example: any): void {
    this.specificationForm.patchValue({
      name: example.name,
      filePattern: example.filePattern,
      processingType: example.processingType,
      delimiter: example.delimiter || ';',
      encoding: example.encoding || 'utf8',
      outputFormat: example.outputFormat || 'json',
      autoProcess: example.autoProcess
    });
    this.showCreateForm = true;
  }

  closeForm(): void {
    this.showCreateForm = false;
    this.editingSpec = null;
    this.specificationForm.reset({
      processingType: 'csv',
      delimiter: ';',
      encoding: 'utf8',
      outputFormat: 'json',
      autoProcess: true
    });
  }

  clearError(): void {
    this.errorMessage = '';
  }
} 