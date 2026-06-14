/** Classes CSS et libellés métier pour le traitement result8rec (rapports réconciliation). */

export type TraitementKind = 'support' | 'cdo' | 'group' | 'termine' | 'none';

const LEGACY_TRAITEMENT_GROUP = 'Niveau Group';

export function normalizeTraitementStoredValue(traitement?: string | null): string {
  const value = (traitement || '').trim();
  if (value === LEGACY_TRAITEMENT_GROUP) {
    return 'Niveau GROUP';
  }
  return value;
}

export function resolveTraitementKind(traitement?: string | null): TraitementKind {
  const normalized = normalizeTraitementStoredValue(traitement);
  if (!normalized || normalized === '—') {
    return 'none';
  }

  const t = normalized
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');

  if (t.includes('termine') || t === 'terminé') {
    return 'termine';
  }
  if (t.includes('validation')) {
    return 'cdo';
  }
  if (t.includes('cloture') || t.includes('clôture')) {
    return 'group';
  }
  if (t.includes('support')) {
    return 'support';
  }
  if (t.includes('traitement') && !t.includes('validation') && !t.includes('cloture') && !t.includes('clôture')) {
    return 'support';
  }
  if (t.includes('group')) {
    return 'group';
  }
  if (t.includes('cdo') || t.includes('responsable')) {
    return 'cdo';
  }

  return 'none';
}

/** Libellé affiché dans la colonne Traitement. */
export function traitementDisplayLabel(traitement?: string | null): string {
  switch (resolveTraitementKind(traitement)) {
    case 'support':
      return 'En cours de traitement';
    case 'cdo':
      return 'En cours de validation';
    case 'group':
      return 'En cours de clôture';
    case 'termine':
      return 'Terminé';
    default:
      return normalizeTraitementStoredValue(traitement) || '—';
  }
}

/** Libellé affiché dans la colonne Statut (dérivé du traitement). */
export function statutFromTraitementDisplayLabel(traitement?: string | null): string {
  if (resolveTraitementKind(traitement) === 'termine') {
    return 'Validé & clôturé';
  }
  return traitementDisplayLabel(traitement);
}

export function auditSnapshotTraitementClass(value?: string | null): string {
  const s = (value || '').trim();
  if (!s || s === '—') {
    return 'audit-pill-label audit-pill--muted';
  }
  const low = s.toLowerCase();
  if (low.includes('support') || low.includes('traitement')) {
    return 'audit-pill-label audit-pill--traitement-support';
  }
  if (low.includes('cdo') || low.includes('responsable') || low.includes('validation')) {
    return 'audit-pill-label audit-pill--traitement-cdo';
  }
  if (low.includes('group') || low.includes('cloture') || low.includes('clôture')) {
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
