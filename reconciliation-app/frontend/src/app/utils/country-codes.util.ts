/** Noms pays alignés sur la table `pays` (init-pays.sql). */
const COUNTRY_CODE_TO_NAME: Record<string, string> = {
  CM: 'Cameroun',
  CI: "Côte d'Ivoire",
  SN: 'Sénégal',
  BF: 'Burkina Faso',
  ML: 'Mali',
  BJ: 'Bénin',
  NE: 'Niger',
  TD: 'Tchad',
  TG: 'Togo',
  GA: 'Gabon',
  GN: 'Guinée',
  KE: 'Kenya',
  MZ: 'Mozambique',
  NG: 'Nigeria',
  CF: 'Centrafrique',
  CG: 'Congo',
  CD: 'RD Congo',
  GQ: 'Guinée équatoriale',
  ST: 'São Tomé-et-Príncipe',
  AO: 'Angola',
  GW: 'Guinée-Bissau',
  SL: 'Sierra Leone',
  LR: 'Liberia',
  GH: 'Ghana',
  MR: 'Mauritanie',
  GM: 'Gambie',
  CV: 'Cap-Vert'
};

export function countryNameFromCode(code: string | null | undefined): string | null {
  if (!code) {
    return null;
  }
  const upper = code.trim().toUpperCase();
  return COUNTRY_CODE_TO_NAME[upper] ?? null;
}

/** Libellé pays affiché : code ISO → nom complet, sinon valeur telle quelle. */
export function countryDisplayLabel(country: string | null | undefined): string {
  if (!country) {
    return '';
  }
  const trimmed = country.trim();
  if (!trimmed) {
    return '';
  }
  return countryNameFromCode(trimmed) || trimmed;
}

export function countryNamesFromCodes(codes: string[] | null | undefined): string[] {
  if (!codes?.length) {
    return [];
  }
  const names: string[] = [];
  const seen = new Set<string>();
  for (const code of codes) {
    const name = countryNameFromCode(code);
    if (name && !seen.has(name)) {
      seen.add(name);
      names.push(name);
    }
  }
  return names;
}

/** Compare deux libellés pays (code ISO, nom complet ou variante). */
export function countriesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const ka = countryMatchKey(a);
  const kb = countryMatchKey(b);
  if (!ka || !kb) {
    return !ka && !kb;
  }
  return ka === kb;
}

function countryMatchKey(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const fromCode = countryNameFromCode(trimmed);
  if (fromCode) {
    return fromCode.toLowerCase();
  }
  const upper = trimmed.toUpperCase();
  for (const [code, name] of Object.entries(COUNTRY_CODE_TO_NAME)) {
    if (code === upper || name.toLowerCase() === trimmed.toLowerCase()) {
      return name.toLowerCase();
    }
  }
  return trimmed.toLowerCase();
}
