import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';

export interface PopupConfig {
  title?: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'confirm';
  showCancelButton?: boolean;
  cancelText?: string;
  confirmText?: string;
  linesSaved?: number;
}

@Component({
  selector: 'app-modern-popup',
  templateUrl: './modern-popup.component.html',
  styleUrls: ['./modern-popup.component.scss']
})
export class ModernPopupComponent implements OnInit, OnDestroy {
  @Input() config: PopupConfig;
  @Input() isVisible: boolean = false;
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  constructor() { }

  ngOnInit(): void {
    // Empêcher le scroll du body quand le popup est ouvert
    if (this.isVisible) {
      document.body.style.overflow = 'hidden';
    }
  }

  ngOnDestroy(): void {
    // Restaurer le scroll du body
    document.body.style.overflow = 'auto';
  }

  onConfirm(): void {
    this.confirm.emit();
    this.closePopup();
  }

  onCancel(): void {
    this.cancel.emit();
    this.closePopup();
  }

  onClose(): void {
    this.close.emit();
    this.closePopup();
  }

  private closePopup(): void {
    this.isVisible = false;
    document.body.style.overflow = 'auto';
  }

  // Méthode statique pour afficher un popup d'information
  static showInfo(message: string, title: string = 'Information'): Promise<void> {
    return this.showPopup({
      title,
      message,
      type: 'info'
    });
  }

  // Méthode statique pour afficher un popup de succès
  static showSuccess(message: string, title: string = 'Succès'): Promise<void> {
    return this.showPopup({
      title,
      message,
      type: 'success'
    });
  }

  // Méthode statique pour afficher un popup d'avertissement
  static showWarning(message: string, title: string = 'Avertissement'): Promise<void> {
    return this.showPopup({
      title,
      message,
      type: 'warning'
    });
  }

  // Méthode statique pour afficher un popup d'erreur
  static showError(message: string, title: string = 'Erreur'): Promise<void> {
    return this.showPopup({
      title,
      message,
      type: 'error'
    });
  }

  // Méthode statique pour afficher un popup de confirmation
  static showConfirm(message: string, title: string = 'Confirmation'): Promise<boolean> {
    return this.showPopup({
      title,
      message,
      type: 'confirm',
      showCancelButton: true,
      cancelText: 'Annuler',
      confirmText: 'Confirmer'
    });
  }

  // Méthode statique pour afficher un popup de sauvegarde
  static showSaveSuccess(linesSaved: number = 1): Promise<void> {
    return this.showPopup({
      title: 'Sauvegarde',
      message: 'Toutes les sélections ont été sauvegardées.',
      type: 'success',
      linesSaved
    });
  }

  public static showPopup(config: PopupConfig): Promise<any> {
    return new Promise((resolve) => {
      // Créer un élément popup dynamiquement
      const popupElement = document.createElement('div');
      popupElement.className = 'modern-popup-overlay';
      popupElement.innerHTML = `
        <div class="modern-popup">
          <div class="popup-header">
            <h3 class="popup-title">${config.title || 'Notification'}</h3>
            <button class="popup-close">×</button>
          </div>
          <div class="popup-content">
            <p class="popup-message">${config.message}</p>
            ${config.linesSaved ? `<p class="popup-lines-saved">Lignes sauvegardées: ${config.linesSaved}</p>` : ''}
          </div>
          <div class="popup-actions">
            ${config.showCancelButton ? `<button class="popup-btn popup-btn-cancel">${config.cancelText || 'Annuler'}</button>` : ''}
            <button class="popup-btn popup-btn-confirm popup-btn-${config.type || 'info'}">${config.confirmText || 'OK'}</button>
          </div>
        </div>
      `;

      // Ajouter les styles CSS
      const style = document.createElement('style');
      style.textContent = `
        .modern-popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          animation: fadeIn 0.3s ease-out;
        }

        .modern-popup {
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          max-width: 400px;
          width: 90%;
          animation: slideIn 0.3s ease-out;
        }

        .popup-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 20px 0 20px;
        }

        .popup-title {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #333;
        }

        .popup-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #999;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.2s;
        }

        .popup-close:hover {
          background: #f5f5f5;
          color: #666;
        }

        .popup-content {
          padding: 20px;
        }

        .popup-message {
          margin: 0 0 10px 0;
          color: #555;
          line-height: 1.5;
        }

        .popup-lines-saved {
          margin: 0;
          color: #888;
          font-size: 14px;
        }

        .popup-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 0 20px 20px 20px;
        }

        .popup-btn {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
          min-width: 80px;
        }

        .popup-btn-cancel {
          background: #f5f5f5;
          color: #666;
        }

        .popup-btn-cancel:hover {
          background: #e5e5e5;
        }

        .popup-btn-confirm {
          color: white;
        }

        .popup-btn-info {
          background: #007bff;
        }

        .popup-btn-info:hover {
          background: #0056b3;
        }

        .popup-btn-success {
          background: #28a745 !important;
        }

        .popup-btn-success:hover {
          background: #1e7e34 !important;
        }

        .popup-btn-warning {
          background: #ffc107;
          color: #212529;
        }

        .popup-btn-warning:hover {
          background: #e0a800;
        }

        .popup-btn-error {
          background: #dc3545 !important;
        }

        .popup-btn-error:hover {
          background: #c82333 !important;
        }

        .popup-btn-confirm {
          background: #007bff;
        }

        .popup-btn-confirm:hover {
          background: #0056b3;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideIn {
          from { 
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `;

      document.head.appendChild(style);
      document.body.appendChild(popupElement);

      // Empêcher le scroll du body
      document.body.style.overflow = 'hidden';

      // Nettoyer les styles après fermeture
      const cleanup = () => {
        document.body.style.overflow = 'auto';
        if (style.parentNode) {
          style.parentNode.removeChild(style);
        }
      };

      // Ajouter les event listeners pour la fermeture
      popupElement.addEventListener('click', (e) => {
        if (e.target === popupElement) {
          popupElement.remove();
          cleanup();
          resolve(false);
        }
      });

      // Ajouter les event listeners pour les boutons
      const closeButton = popupElement.querySelector('.popup-close');
      if (closeButton) {
        closeButton.addEventListener('click', () => {
          popupElement.remove();
          cleanup();
          document.removeEventListener('keydown', handleEscape);
          resolve(false);
        });
      }

      const cancelButton = popupElement.querySelector('.popup-btn-cancel');
      if (cancelButton) {
        cancelButton.addEventListener('click', () => {
          popupElement.remove();
          cleanup();
          document.removeEventListener('keydown', handleEscape);
          resolve(false);
        });
      }

      const confirmButton = popupElement.querySelector('.popup-btn-confirm');
      if (confirmButton) {
        confirmButton.addEventListener('click', () => {
          popupElement.remove();
          cleanup();
          document.removeEventListener('keydown', handleEscape);
          resolve(true);
        });
      }

      // Gérer la fermeture avec Escape
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          popupElement.remove();
          cleanup();
          document.removeEventListener('keydown', handleEscape);
          resolve(false);
        }
      };
      document.addEventListener('keydown', handleEscape);
    });
  }

  // Popup avec champ texte (input)
  static showTextInput(message: string, title: string = 'Saisie', defaultValue: string = '', placeholder: string = ''): Promise<string | null> {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modern-popup-overlay';
      overlay.innerHTML = `
        <div class="modern-popup">
          <div class="popup-header">
            <h3 class="popup-title">${title}</h3>
            <button class="popup-close">×</button>
          </div>
          <div class="popup-content">
            <p class="popup-message">${message}</p>
            <input type="text" class="popup-input" placeholder="${placeholder || ''}" value="${defaultValue || ''}" />
          </div>
          <div class="popup-actions">
            <button class="popup-btn popup-btn-cancel">Annuler</button>
            <button class="popup-btn popup-btn-confirm popup-btn-info">Valider</button>
          </div>
        </div>
      `;

      const style = document.createElement('style');
      style.textContent = `
        .modern-popup-overlay {
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,.5);
          display: flex; justify-content: center; align-items: center;
          z-index: 9999; animation: fadeIn .3s ease-out;
        }
        .modern-popup { background: #fff; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,.3); max-width: 420px; width: 92%; animation: slideIn .3s ease-out; }
        .popup-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 20px 0 20px; }
        .popup-title { margin: 0; font-size: 18px; font-weight: 600; color: #333; }
        .popup-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #999; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all .2s; }
        .popup-close:hover { background: #f5f5f5; color: #666; }
        .popup-content { padding: 20px; }
        .popup-message { margin: 0 0 10px 0; color: #555; line-height: 1.5; }
        .popup-actions { display: flex; justify-content: flex-end; gap: 10px; padding: 0 20px 20px 20px; }
        .popup-btn { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all .2s; min-width: 80px; }
        .popup-btn-cancel { background: #f5f5f5; color: #666; }
        .popup-btn-cancel:hover { background: #e5e5e5; }
        .popup-btn-info { background: #007bff; color: #fff; }
        .popup-btn-info:hover { background: #0056b3; }
        .popup-input { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box; }
        .popup-input:focus { outline: none; border-color: #3498db; box-shadow: 0 0 0 2px rgba(52,152,219,.2); }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-20px) scale(.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `;

      document.head.appendChild(style);
      document.body.appendChild(overlay);
      document.body.style.overflow = 'hidden';

      const cleanup = () => {
        document.body.style.overflow = 'auto';
        if (style.parentNode) style.parentNode.removeChild(style);
      };

      const close = (result: string | null) => {
        overlay.remove();
        cleanup();
        document.removeEventListener('keydown', onEsc);
        resolve(result);
      };

      const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') close(null); };
      document.addEventListener('keydown', onEsc);

      const input = overlay.querySelector('.popup-input') as HTMLInputElement | null;
      const okBtn = overlay.querySelector('.popup-btn-confirm');
      const cancelBtn = overlay.querySelector('.popup-btn-cancel');
      const closeBtn = overlay.querySelector('.popup-close');

      if (input) setTimeout(() => input.focus(), 0);
      if (okBtn) okBtn.addEventListener('click', () => close(input ? input.value : ''));
      if (cancelBtn) cancelBtn.addEventListener('click', () => close(null));
      if (closeBtn) closeBtn.addEventListener('click', () => close(null));
      if (input) input.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter') close(input!.value); });
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });
    });
  }

  static showDateInput(message: string, title: string = 'Sélectionner une date', defaultValue: string = ''): Promise<string | null> {
    return new Promise((resolve) => {
      const effectiveDefault = (() => {
        const candidate = (defaultValue || '').trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
          return candidate;
        }
        const parsed = new Date(candidate);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString().split('T')[0];
        }
        return new Date().toISOString().split('T')[0];
      })();

      const overlay = document.createElement('div');
      overlay.className = 'modern-popup-overlay';
      overlay.innerHTML = `
        <div class="modern-popup">
          <div class="popup-header">
            <h3 class="popup-title">${title}</h3>
            <button class="popup-close">×</button>
          </div>
          <div class="popup-content">
            <p class="popup-message">${message}</p>
            <input type="date" class="popup-input" value="${effectiveDefault}" />
          </div>
          <div class="popup-actions">
            <button class="popup-btn popup-btn-cancel">Annuler</button>
            <button class="popup-btn popup-btn-confirm popup-btn-info">Valider</button>
          </div>
        </div>
      `;

      const style = document.createElement('style');
      style.textContent = `
        .modern-popup-overlay {
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,.5);
          display: flex; justify-content: center; align-items: center;
          z-index: 9999; animation: fadeIn .3s ease-out;
        }
        .modern-popup { background: #fff; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,.3); max-width: 420px; width: 92%; animation: slideIn .3s ease-out; }
        .popup-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 20px 0 20px; }
        .popup-title { margin: 0; font-size: 18px; font-weight: 600; color: #333; }
        .popup-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #999; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all .2s; }
        .popup-close:hover { background: #f5f5f5; color: #666; }
        .popup-content { padding: 20px; }
        .popup-message { margin: 0 0 10px 0; color: #555; line-height: 1.5; }
        .popup-actions { display: flex; justify-content: flex-end; gap: 10px; padding: 0 20px 20px 20px; }
        .popup-btn { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all .2s; min-width: 80px; }
        .popup-btn-cancel { background: #f5f5f5; color: #666; }
        .popup-btn-cancel:hover { background: #e5e5e5; }
        .popup-btn-info { background: #007bff; color: #fff; }
        .popup-btn-info:hover { background: #0056b3; }
        .popup-input { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box; }
        .popup-input:focus { outline: none; border-color: #3498db; box-shadow: 0 0 0 2px rgba(52,152,219,.2); }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-20px) scale(.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `;

      document.head.appendChild(style);
      document.body.appendChild(overlay);
      document.body.style.overflow = 'hidden';

      const cleanup = () => {
        document.body.style.overflow = 'auto';
        if (style.parentNode) style.parentNode.removeChild(style);
      };

      const close = (result: string | null) => {
        overlay.remove();
        cleanup();
        document.removeEventListener('keydown', onEsc);
        resolve(result);
      };

      const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') close(null); };
      document.addEventListener('keydown', onEsc);

      const input = overlay.querySelector('.popup-input') as HTMLInputElement | null;
      const okBtn = overlay.querySelector('.popup-btn-confirm');
      const cancelBtn = overlay.querySelector('.popup-btn-cancel');
      const closeBtn = overlay.querySelector('.popup-close');

      if (input) setTimeout(() => input.focus(), 0);
      if (okBtn) okBtn.addEventListener('click', () => close(input ? (input.value || '').trim() || effectiveDefault : effectiveDefault));
      if (cancelBtn) cancelBtn.addEventListener('click', () => close(null));
      if (closeBtn) closeBtn.addEventListener('click', () => close(null));
      if (input) input.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter') close((input.value || '').trim() || effectiveDefault); });
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });
    });
  }

  // Popup avec sélection (select)
  static showSelectInput(message: string, title: string = 'Sélection', options: string[] = [], defaultValue: string = ''): Promise<string | null> {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modern-popup-overlay';
      
      const optionsHtml = options.map(option => 
        `<option value="${option}" ${option === defaultValue ? 'selected' : ''}>${option}</option>`
      ).join('');
      
      overlay.innerHTML = `
        <div class="modern-popup">
          <div class="popup-header">
            <h3 class="popup-title">${title}</h3>
            <button class="popup-close">×</button>
          </div>
          <div class="popup-content">
            <p class="popup-message">${message}</p>
            <select class="popup-select">
              ${optionsHtml}
            </select>
          </div>
          <div class="popup-actions">
            <button class="popup-btn popup-btn-cancel">Annuler</button>
            <button class="popup-btn popup-btn-confirm popup-btn-info">Valider</button>
          </div>
        </div>
      `;

      const style = document.createElement('style');
      style.textContent = `
        .modern-popup-overlay {
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,.5);
          display: flex; justify-content: center; align-items: center;
          z-index: 9999; animation: fadeIn .3s ease-out;
        }
        .modern-popup { background: #fff; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,.3); max-width: 420px; width: 92%; animation: slideIn .3s ease-out; }
        .popup-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 20px 0 20px; }
        .popup-title { margin: 0; font-size: 18px; font-weight: 600; color: #333; }
        .popup-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #999; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all .2s; }
        .popup-close:hover { background: #f5f5f5; color: #666; }
        .popup-content { padding: 20px; }
        .popup-message { margin: 0 0 10px 0; color: #555; line-height: 1.5; }
        .popup-actions { display: flex; justify-content: flex-end; gap: 10px; padding: 0 20px 20px 20px; }
        .popup-btn { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all .2s; min-width: 80px; }
        .popup-btn-cancel { background: #f5f5f5; color: #666; }
        .popup-btn-cancel:hover { background: #e5e5e5; }
        .popup-btn-info { background: #007bff; color: #fff; }
        .popup-btn-info:hover { background: #0056b3; }
        .popup-select { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box; background: white; }
        .popup-select:focus { outline: none; border-color: #3498db; box-shadow: 0 0 0 2px rgba(52,152,219,.2); }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-20px) scale(.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `;

      document.head.appendChild(style);
      document.body.appendChild(overlay);
      document.body.style.overflow = 'hidden';

      const cleanup = () => {
        document.body.style.overflow = 'auto';
        if (style.parentNode) style.parentNode.removeChild(style);
      };

      const close = (result: string | null) => {
        overlay.remove();
        cleanup();
        document.removeEventListener('keydown', onEsc);
        resolve(result);
      };

      const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') close(null); };
      document.addEventListener('keydown', onEsc);

      const select = overlay.querySelector('.popup-select') as HTMLSelectElement | null;
      const okBtn = overlay.querySelector('.popup-btn-confirm');
      const cancelBtn = overlay.querySelector('.popup-btn-cancel');
      const closeBtn = overlay.querySelector('.popup-close');

      if (okBtn) okBtn.addEventListener('click', () => close(select ? select.value : ''));
      if (cancelBtn) cancelBtn.addEventListener('click', () => close(null));
      if (closeBtn) closeBtn.addEventListener('click', () => close(null));
      if (select) select.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter') close(select!.value); });
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });
    });
  }
}
