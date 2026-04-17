import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

type HelpSectionKey = 'procedures' | 'collaboration';

interface HelpOption {
  id: string;
  section: HelpSectionKey;
  name: string;
  title: string;
  description: string;
  icon: string;
  tag: string;
  accent: string;
  accentLight: string;
  actionLabel: string;
  route?: string;
  badge?: string;
  keywords?: string[];
}

interface HelpSection {
  key: HelpSectionKey;
  label: string;
}

@Component({
  selector: 'app-aide',
  templateUrl: './aide.component.html',
  styleUrls: ['./aide.component.scss']
})
export class AideComponent implements OnInit {
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  searchQuery = '';
  shortcutHint = 'Ctrl K';

  readonly sections: HelpSection[] = [
    { key: 'procedures', label: 'Procédures & opérations' },
    { key: 'collaboration', label: 'Collaboration & documentation' }
  ];

  helpOptions: HelpOption[] = [
    {
      id: 'sop-operation',
      section: 'procedures',
      name: 'Procédure opérationnelle',
      title: 'SOP Opération',
      description: 'Consultez les procédures opérationnelles standard pour le back office et les workflows associés.',
      icon: 'fas fa-tasks',
      tag: 'Back Office',
      accent: 'var(--blue)',
      accentLight: 'var(--blue-l)',
      actionLabel: 'Accéder',
      route: '/sop-operation',
      keywords: ['sop', 'opération', 'back office', 'procédure']
    },
    {
      id: 'sop-reconciliation-trx',
      section: 'procedures',
      name: 'Procédure réconciliation',
      title: 'SOP Réconciliation TRX',
      description: 'Accédez aux procédures de réconciliation des transactions et aux guides de traitement des écarts.',
      icon: 'fas fa-sync-alt',
      tag: 'Transactions',
      accent: 'var(--teal)',
      accentLight: 'var(--teal-l)',
      actionLabel: 'Accéder',
      route: '/sop-reconciliation-trx',
      keywords: ['trx', 'transaction', 'réconciliation', 'écart']
    },
    {
      id: 'reconciliation-banque',
      section: 'procedures',
      name: 'Procédure bancaire',
      title: 'SOP Réconciliation Banque',
      description: 'Consultez les procédures bancaires liées aux relevés, soldes et traitements de réconciliation.',
      icon: 'fas fa-university',
      tag: 'Bancaire',
      accent: 'var(--violet)',
      accentLight: 'var(--violet-l)',
      actionLabel: 'Accéder',
      route: '/banque',
      keywords: ['banque', 'relevé', 'solde', 'rapprochement']
    },
    {
      id: 'messages',
      section: 'collaboration',
      name: 'Communications',
      title: 'Messages',
      description: 'Regroupez les communications utilisateur et les notifications de suivi dans un espace dédié.',
      icon: 'fas fa-comments',
      tag: '3 non lus',
      accent: 'var(--rose)',
      accentLight: 'var(--rose-l)',
      actionLabel: 'Bientôt',
      badge: '3 nouveaux',
      keywords: ['message', 'communication', 'notification', 'support']
    },
    {
      id: 'equipe',
      section: 'collaboration',
      name: 'Gestion équipe',
      title: 'Équipe',
      description: 'Gérez les membres de votre équipe, les rôles et les espaces de collaboration de l’application.',
      icon: 'fas fa-users',
      tag: 'Collaboration',
      accent: 'var(--green)',
      accentLight: 'var(--green-l)',
      actionLabel: 'Accéder',
      route: '/users',
      keywords: ['équipe', 'utilisateur', 'rôle', 'admin']
    },
    {
      id: 'guide',
      section: 'collaboration',
      name: 'Documentation',
      title: 'Guide complet',
      description: 'Accédez au guide d’utilisation complet de l’application avec les fonctionnalités détaillées.',
      icon: 'fas fa-book-open',
      tag: 'Documentation',
      accent: 'var(--amber)',
      accentLight: 'var(--amber-l)',
      actionLabel: 'Lire',
      route: '/guide-utilisation',
      keywords: ['guide', 'documentation', 'manuel', 'aide']
    }
  ];

  constructor(
    private location: Location,
    private router: Router
  ) {
    if (typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)) {
      this.shortcutHint = '⌘ K';
    }
  }

  ngOnInit(): void {
  }

  get filteredSections(): Array<HelpSection & { options: HelpOption[] }> {
    return this.sections
      .map((section) => ({
        ...section,
        options: this.helpOptions.filter((option) =>
          option.section === section.key && this.matchesSearch(option)
        )
      }))
      .filter((section) => section.options.length > 0);
  }

  get hasResults(): boolean {
    return this.filteredSections.length > 0;
  }

  openOption(option: HelpOption): void {
    if (!option.route) {
      return;
    }

    this.router.navigateByUrl(option.route);
  }

  focusSearch(): void {
    this.searchInput?.nativeElement.focus();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.focusSearch();
  }

  goToGuide(): void {
    this.router.navigate(['/guide-utilisation']);
  }

  trackByOption(_: number, option: HelpOption): string {
    return option.id;
  }

  @HostListener('window:keydown', ['$event'])
  handleSearchShortcut(event: KeyboardEvent): void {
    const isSearchShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';

    if (!isSearchShortcut) {
      return;
    }

    event.preventDefault();
    this.focusSearch();
  }

  private matchesSearch(option: HelpOption): boolean {
    const query = this.searchQuery.trim().toLowerCase();

    if (!query) {
      return true;
    }

    const searchableText = [
      option.name,
      option.title,
      option.description,
      option.tag,
      ...(option.keywords ?? [])
    ]
      .join(' ')
      .toLowerCase();

    return searchableText.includes(query);
  }

  goBack(): void {
    this.location.back();
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}

