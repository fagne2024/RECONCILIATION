import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

interface HelpOption {
  title: string;
  description: string;
  icon: string;
  tag: string;
  tagColor: string;
  route?: string;
}

@Component({
  selector: 'app-aide',
  templateUrl: './aide.component.html',
  styleUrls: ['./aide.component.scss']
})
export class AideComponent implements OnInit {
  helpOptions: HelpOption[] = [
    {
      title: 'SOP OPERATION',
      description: 'Consultez les procédures opérationnelles standard pour les opérations du back office',
      icon: 'fas fa-tasks',
      tag: 'BACK OFFICE',
      tagColor: 'blue',
      route: '/sop-operation'
    },
    {
      title: 'SOP RECONCILIATION TRX',
      description: 'Accédez aux procédures de réconciliation des transactions',
      icon: 'fas fa-sync-alt',
      tag: 'TRANSACTIONS',
      tagColor: 'pink',
      route: '/reconciliation-report'
    },
    {
      title: 'SOP RECONCILIATION BANQUE',
      description: 'Consultez les procédures de réconciliation bancaire et les opérations liées',
      icon: 'fas fa-university',
      tag: 'BANCAIRE',
      tagColor: 'light-blue',
      route: '/user-profile'
    },
    {
      title: 'Messages',
      description: 'Consultez et gérez tous vos messages et communications en un seul endroit',
      icon: 'fas fa-comments',
      tag: '3 nouveaux',
      tagColor: 'green'
    },
    {
      title: 'Équipe',
      description: 'Gérez les membres de votre équipe et collaborez efficacement sur vos projets',
      icon: 'fas fa-users',
      tag: 'Collaboration',
      tagColor: 'pink',
      route: '/users'
    },
    {
      title: 'Guide',
      description: 'Accédez au guide d\'utilisation complet de l\'application',
      icon: 'fas fa-book-open',
      tag: 'Documentation',
      tagColor: 'red',
      route: '/guide-utilisation'
    }
  ];

  constructor(
    private location: Location,
    private router: Router
  ) { }

  ngOnInit(): void {
  }

  onOptionClick(option: HelpOption): void {
    if (option.route) {
      // Navigation sera gérée par le routerLink dans le template
    }
  }

  goBack(): void {
    this.location.back();
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}

