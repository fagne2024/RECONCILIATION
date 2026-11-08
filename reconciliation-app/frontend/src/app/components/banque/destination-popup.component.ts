import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type DestinationChoice = 'operation' | 'releve' | null;

@Component({
  selector: 'app-destination-popup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './destination-popup.component.html',
  styleUrls: ['./destination-popup.component.scss']
})
export class DestinationPopupComponent {
  @Input() show = false;
  @Output() choice = new EventEmitter<DestinationChoice>();
  @Output() close = new EventEmitter<void>();

  select(dest: DestinationChoice) {
    this.choice.emit(dest);
  }

  closePopup() {
    this.close.emit();
  }
}
