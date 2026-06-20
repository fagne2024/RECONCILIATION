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

  private static escapeHtml(text: string | undefined | null): string {
    if (text == null || text === '') {
      return '';
    }
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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

  /** Laisse le navigateur fermer le popup avant de reprendre le traitement lourd. */
  private static scheduleAfterPopupClose<T>(value: T, resolve: (v: T) => void): void {
    requestAnimationFrame(() => setTimeout(() => resolve(value), 0));
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
      const title = ModernPopupComponent.escapeHtml(config.title || 'Notification');
      const message = ModernPopupComponent.escapeHtml(config.message);
      const cancelLabel = ModernPopupComponent.escapeHtml(config.cancelText || 'Annuler');
      const confirmLabel = ModernPopupComponent.escapeHtml(config.confirmText || 'OK');

      // Créer un élément popup dynamiquement
      const popupElement = document.createElement('div');
      popupElement.className = 'modern-popup-overlay';
      popupElement.innerHTML = `
        <div class="modern-popup">
          <div class="popup-accent"></div>
          <div class="popup-header">
            <h3 class="popup-title">${title}</h3>
            <button type="button" class="popup-close" aria-label="Fermer">×</button>
          </div>
          <div class="popup-content">
            <p class="popup-message">${message}</p>
            ${config.linesSaved ? `<p class="popup-lines-saved">Lignes sauvegardées : ${config.linesSaved}</p>` : ''}
          </div>
          <div class="popup-actions">
            ${config.showCancelButton ? `<button type="button" class="popup-btn popup-btn-cancel">${cancelLabel}</button>` : ''}
            <button type="button" class="popup-btn popup-btn-primary popup-btn-${config.type || 'info'}">${confirmLabel}</button>
          </div>
        </div>
      `;

      // Styles alignés ReconciliApp / référentiel services (Sora, navy, tons chauds)
      const style = document.createElement('style');
      style.textContent = `
        .modern-popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(26, 37, 53, 0.42);
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10000;
          animation: mp-fadeIn 0.25s ease-out;
          font-family: 'Sora', 'Segoe UI', system-ui, sans-serif;
        }

        .modern-popup {
          background: #FAFAF8;
          border-radius: 18px;
          border: 1px solid #E4E0D8;
          box-shadow: 0 8px 40px rgba(26, 23, 20, 0.14), 0 2px 16px rgba(26, 23, 20, 0.08);
          max-width: 440px;
          width: 92%;
          animation: mp-slideIn 0.28s cubic-bezier(0.22, 1, 0.36, 1);
          overflow: hidden;
        }

        .popup-accent {
          height: 3px;
          background: linear-gradient(90deg, #1A2535 0%, #2E6B47 55%, #5A9E74 100%);
        }

        .popup-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          padding: 18px 22px 0 22px;
        }

        .popup-title {
          margin: 0;
          font-size: 1.15rem;
          font-weight: 600;
          color: #1A2535;
          letter-spacing: -0.02em;
          line-height: 1.35;
        }

        .popup-close {
          flex-shrink: 0;
          background: rgba(26, 23, 20, 0.06);
          border: none;
          font-size: 1.35rem;
          line-height: 1;
          cursor: pointer;
          color: #5C5650;
          padding: 0;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          transition: background 0.2s, color 0.2s;
        }

        .popup-close:hover {
          background: rgba(139, 38, 53, 0.1);
          color: #8B2635;
        }

        .popup-content {
          padding: 14px 22px 8px 22px;
        }

        .popup-message {
          margin: 0;
          color: #5C5650;
          line-height: 1.55;
          font-size: 0.95rem;
        }

        .popup-lines-saved {
          margin: 12px 0 0 0;
          color: #9B9489;
          font-size: 0.875rem;
        }

        .popup-actions {
          display: flex;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: 10px;
          padding: 16px 22px 22px 22px;
        }

        .popup-btn {
          padding: 10px 20px;
          border: none;
          border-radius: 11px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.9rem;
          transition: transform 0.15s, box-shadow 0.2s, background 0.2s;
          min-width: 88px;
          font-family: inherit;
        }

        .popup-btn:active {
          transform: scale(0.98);
        }

        .popup-btn-cancel {
          background: #F2F0EB;
          color: #5C5650;
          border: 1px solid #E4E0D8;
        }

        .popup-btn-cancel:hover {
          background: #E4E0D8;
          color: #1A1714;
        }

        .popup-btn-primary {
          color: #fff;
          box-shadow: 0 2px 8px rgba(26, 37, 53, 0.2);
        }

        .popup-btn-primary.popup-btn-info {
          background: linear-gradient(180deg, #243044 0%, #1A2535 100%);
        }

        .popup-btn-primary.popup-btn-info:hover {
          box-shadow: 0 4px 14px rgba(26, 37, 53, 0.28);
        }

        .popup-btn-primary.popup-btn-success {
          background: linear-gradient(180deg, #5A9E74 0%, #2E6B47 100%);
        }

        .popup-btn-primary.popup-btn-success:hover {
          box-shadow: 0 4px 14px rgba(46, 107, 71, 0.35);
        }

        .popup-btn-primary.popup-btn-warning {
          background: linear-gradient(180deg, #D4915A 0%, #A85F1E 100%);
          color: #fff;
        }

        .popup-btn-primary.popup-btn-warning:hover {
          box-shadow: 0 4px 14px rgba(168, 95, 30, 0.35);
        }

        .popup-btn-primary.popup-btn-error {
          background: linear-gradient(180deg, #C4566A 0%, #8B2635 100%);
        }

        .popup-btn-primary.popup-btn-error:hover {
          box-shadow: 0 4px 14px rgba(139, 38, 53, 0.35);
        }

        .popup-btn-primary.popup-btn-confirm {
          background: linear-gradient(180deg, #243044 0%, #1A2535 100%);
        }

        .popup-btn-primary.popup-btn-confirm:hover {
          box-shadow: 0 4px 14px rgba(26, 37, 53, 0.28);
        }

        @keyframes mp-fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes mp-slideIn {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.97);
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

      const confirmButton = popupElement.querySelector('.popup-btn-primary');
      if (confirmButton) {
        confirmButton.addEventListener('click', () => {
          popupElement.remove();
          cleanup();
          document.removeEventListener('keydown', handleEscape);
          ModernPopupComponent.scheduleAfterPopupClose(true, resolve);
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

      if (okBtn) okBtn.addEventListener('click', () => {
        const value = select ? select.value : '';
        overlay.remove();
        cleanup();
        document.removeEventListener('keydown', onEsc);
        ModernPopupComponent.scheduleAfterPopupClose(value, resolve);
      });
      if (cancelBtn) cancelBtn.addEventListener('click', () => close(null));
      if (closeBtn) closeBtn.addEventListener('click', () => close(null));
      if (select) select.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter') close(select!.value); });
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });
    });
  }

  // Popup avec autocomplétion (input avec suggestions)
  static showAutocompleteInput(message: string, title: string = 'Sélection', options: string[] = [], defaultValue: string = ''): Promise<string | null> {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modern-popup-overlay';
      
      overlay.innerHTML = `
        <div class="modern-popup autocomplete-popup">
          <div class="popup-header">
            <h3 class="popup-title">${title}</h3>
            <button class="popup-close">×</button>
          </div>
          <div class="popup-content">
            <p class="popup-message">${message}</p>
            <div class="autocomplete-wrapper">
              <input type="text" class="popup-input autocomplete-input" placeholder="Tapez pour rechercher..." value="${defaultValue || ''}" autocomplete="off" />
              <ul class="autocomplete-list"></ul>
            </div>
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
        .autocomplete-popup { overflow: visible; }
        .popup-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 20px 0 20px; }
        .popup-title { margin: 0; font-size: 18px; font-weight: 600; color: #333; }
        .popup-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #999; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all .2s; }
        .popup-close:hover { background: #f5f5f5; color: #666; }
        .popup-content { padding: 20px; overflow: visible; }
        .popup-message { margin: 0 0 10px 0; color: #555; line-height: 1.5; }
        .popup-actions { display: flex; justify-content: flex-end; gap: 10px; padding: 0 20px 20px 20px; }
        .popup-btn { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all .2s; min-width: 80px; }
        .popup-btn-cancel { background: #f5f5f5; color: #666; }
        .popup-btn-cancel:hover { background: #e5e5e5; }
        .popup-btn-info { background: #007bff; color: #fff; }
        .popup-btn-info:hover { background: #0056b3; }
        .autocomplete-wrapper { position: relative; }
        .autocomplete-input { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box; }
        .autocomplete-input:focus { outline: none; border-color: #3498db; box-shadow: 0 0 0 2px rgba(52,152,219,.2); }
        .autocomplete-list { position: relative; margin: 6px 0 0 0; background: white; border: 1px solid #ddd; border-radius: 6px; max-height: 200px; overflow-y: auto; z-index: 2; padding: 0; list-style: none; box-shadow: 0 4px 6px rgba(0,0,0,.1); }
        .autocomplete-list li { padding: 10px 12px; cursor: pointer; border-bottom: 1px solid #f0f0f0; }
        .autocomplete-list li:hover { background: #f5f5f5; }
        .autocomplete-list li.selected { background: #e3f2fd; }
        .autocomplete-list li:last-child { border-bottom: none; }
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

      const input = overlay.querySelector('.autocomplete-input') as HTMLInputElement | null;
      const list = overlay.querySelector('.autocomplete-list') as HTMLUListElement | null;
      const okBtn = overlay.querySelector('.popup-btn-confirm');
      const cancelBtn = overlay.querySelector('.popup-btn-cancel');
      const closeBtn = overlay.querySelector('.popup-close');
      
      let selectedIndex = -1;
      let filteredOptions: string[] = [...options];

      const updateList = () => {
        if (!list || !input) return;
        const searchTerm = (input.value || '').toLowerCase().trim();
        filteredOptions = options.filter(opt => 
          opt.toLowerCase().includes(searchTerm)
        );
        
        list.innerHTML = '';
        if (filteredOptions.length === 0 && searchTerm) {
          list.innerHTML = '<li style="color: #999; cursor: default;">Aucun résultat</li>';
        } else {
          filteredOptions.forEach((option, index) => {
            const li = document.createElement('li');
            li.textContent = option;
            li.addEventListener('click', () => {
              input.value = option;
              list.innerHTML = '';
              input.focus();
            });
            list.appendChild(li);
          });
        }
        selectedIndex = -1;
      };

      const selectItem = (index: number) => {
        if (index >= 0 && index < filteredOptions.length) {
          if (input) {
            input.value = filteredOptions[index];
            list.innerHTML = '';
            input.focus();
          }
        }
      };

      if (input) {
        input.addEventListener('input', updateList);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (input.value.trim()) {
              close(input.value.trim());
            }
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, filteredOptions.length - 1);
            const items = list?.querySelectorAll('li');
            items?.forEach((li, idx) => {
              li.classList.toggle('selected', idx === selectedIndex);
            });
            if (selectedIndex >= 0 && filteredOptions[selectedIndex]) {
              input.value = filteredOptions[selectedIndex];
            }
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, -1);
            const items = list?.querySelectorAll('li');
            items?.forEach((li, idx) => {
              li.classList.toggle('selected', idx === selectedIndex);
            });
            if (selectedIndex >= 0 && filteredOptions[selectedIndex]) {
              input.value = filteredOptions[selectedIndex];
            } else if (selectedIndex < 0) {
              input.value = '';
            }
          }
        });
        input.addEventListener('focus', updateList);
        setTimeout(() => input.focus(), 0);
      }

      if (okBtn) okBtn.addEventListener('click', () => {
        const value = input ? input.value.trim() : '';
        if (value) close(value);
      });
      if (cancelBtn) cancelBtn.addEventListener('click', () => close(null));
      if (closeBtn) closeBtn.addEventListener('click', () => close(null));
      overlay.addEventListener('click', (e) => { 
        if (e.target === overlay) close(null);
      });
      
      // Fermer la liste si on clique ailleurs
      document.addEventListener('click', (e) => {
        if (!overlay.contains(e.target as Node) && list) {
          list.innerHTML = '';
        }
      }, true);
    });
  }
}
