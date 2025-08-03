import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-banque',
  templateUrl: './banque.component.html',
  styleUrls: ['./banque.component.scss']
})
export class BanqueComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
    console.log('Composant BANQUE initialisé');
  }

} 