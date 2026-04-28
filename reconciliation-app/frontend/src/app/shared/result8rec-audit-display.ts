/** Classes CSS pour les pastilles d’historique audit result8rec (niveau / statut snapshot). */

export function auditSnapshotTraitementClass(value?: string | null): string {
  const s = (value || '').trim();
  if (!s || s === '—') {
    return 'audit-pill-label audit-pill--muted';
  }
  const low = s.toLowerCase();
  if (low.includes('support')) {
    return 'audit-pill-label audit-pill--traitement-support';
  }
  if (low.includes('group')) {
    return 'audit-pill-label audit-pill--traitement-group';
  }
  if (low.includes('termin')) {
    return 'audit-pill-label audit-pill--traitement-termine';
  }
  return 'audit-pill-label audit-pill--traitement-default';
}

export function auditSnapshotStatutClass(value?: string | null): string {
  const s = (value || '').trim();
  if (!s || s === '—') {
    return 'audit-pill-label audit-pill--muted';
  }
  const up = s.toUpperCase();
  if (up === 'OK') {
    return 'audit-pill-label audit-pill--statut-ok';
  }
  if (up.includes('COURS')) {
    return 'audit-pill-label audit-pill--statut-encours';
  }
  if (up.includes('KO') || up.includes('NOK') || up.includes('ERREUR')) {
    return 'audit-pill-label audit-pill--statut-ko';
  }
  return 'audit-pill-label audit-pill--statut-default';
}
