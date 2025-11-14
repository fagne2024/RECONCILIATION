import { Injectable } from '@angular/core';
import { ModernPopupComponent } from '../components/modern-popup/modern-popup.component';

@Injectable({
  providedIn: 'root'
})
export class PopupService {

  constructor() { }

  /**
   * Affiche un popup d'information
   */
  showInfo(message: string, title: string = 'Information'): Promise<void> {
    return ModernPopupComponent.showInfo(message, title);
  }

  /**
   * Affiche un popup de succès
   */
  showSuccess(message: string, title: string = 'Succès'): Promise<void> {
    return ModernPopupComponent.showSuccess(message, title);
  }

  /**
   * Affiche un popup d'avertissement
   */
  showWarning(message: string, title: string = 'Avertissement'): Promise<void> {
    return ModernPopupComponent.showWarning(message, title);
  }

  /**
   * Affiche un popup d'erreur
   */
  showError(message: string, title: string = 'Erreur'): Promise<void> {
    return ModernPopupComponent.showError(message, title);
  }

  /**
   * Affiche un popup de confirmation
   */
  showConfirm(message: string, title: string = 'Confirmation'): Promise<boolean> {
    return ModernPopupComponent.showConfirm(message, title);
  }

  /**
   * Affiche un popup de sauvegarde avec le nombre de lignes sauvegardées
   */
  showSaveSuccess(linesSaved: number = 1): Promise<void> {
    return ModernPopupComponent.showSaveSuccess(linesSaved);
  }

  /**
   * Remplace les anciens alert() par des popups modernes
   */
  showAlert(message: string, type: 'success' | 'danger' | 'warning' | 'info' = 'info'): Promise<void> {
    const title = this.getTitleForType(type);
    const popupType = this.mapType(type);
    
    return ModernPopupComponent.showPopup({
      title,
      message,
      type: popupType
    });
  }

  /**
   * Remplace les anciens confirm() par des popups modernes
   */
  showConfirmDialog(message: string, title: string = 'Confirmation'): Promise<boolean> {
    return ModernPopupComponent.showConfirm(message, title);
  }

  /**
   * Affiche un popup avec un champ texte et retourne la saisie (ou null si annulé)
   */
  showTextInput(message: string, title: string = 'Saisie', defaultValue: string = '', placeholder: string = ''): Promise<string | null> {
    return ModernPopupComponent.showTextInput(message, title, defaultValue, placeholder);
  }

  showDateInput(message: string, title: string = 'Sélectionner une date', defaultValue: string = ''): Promise<string | null> {
    return ModernPopupComponent.showDateInput(message, title, defaultValue);
  }

  showSelectInput(message: string, title: string = 'Sélection', options: string[] = [], defaultValue: string = ''): Promise<string | null> {
    return ModernPopupComponent.showSelectInput(message, title, options, defaultValue);
  }

  private getTitleForType(type: string): string {
    switch (type) {
      case 'success': return 'Succès';
      case 'danger': return 'Erreur';
      case 'warning': return 'Avertissement';
      case 'info': 
      default: return 'Information';
    }
  }

  private mapType(type: string): 'info' | 'success' | 'warning' | 'error' | 'confirm' {
    switch (type) {
      case 'success': return 'success';
      case 'danger': return 'error';
      case 'warning': return 'warning';
      case 'info': 
      default: return 'info';
    }
  }
}
