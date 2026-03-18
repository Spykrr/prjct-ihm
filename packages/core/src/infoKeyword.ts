/**
 * Messages d'aide pour champs, boutons et GET
 * Champ: 4 car. (numéro 1-15, type I/R/C/S, position P/A, élément A/B/C/D/E/G...)
 * Bouton: 2 car. (numéro 1-10, N/F)
 * GET: VAR_nomVariable##option (ex: VAR_champ##1IPV)
 */

const CHAMP_TYPES: Record<string, string> = {
  I: 'Input',
  R: 'Radio',
  C: 'Checkbox',
  S: 'Select',
};

const CHAMP_POSITIONS: Record<string, string> = {
  P: 'après libellé',
  A: 'avant libellé',
};

const CHAMP_ELEMENTS: Record<string, string> = {
  A: 'ancre',
  B: 'contenant',
  C: 'checkbox',
  D: 'double-clic',
  E: 'zone + Entrée',
  G: 'autre',
};

const BOUTON_TYPES: Record<string, string> = {
  N: 'obligatoire',
  F: 'facultatif',
};

export function getInfoByKeyword(keyword: string): string {
  if (!keyword || typeof keyword !== 'string') return '';

  const k = keyword.trim().toUpperCase();

  // Codes "legacy" utilisés dans certains référentiels (ex: 1FE1, 1FS1)
  // Format observé : <n><F><action><x> (4 caractères)
  // - FE* : saisie + Entrée
  // - FS* : sélection dans une liste (select)
  if (k.length === 4 && /^[0-9]{1,2}F[A-Z][0-9]$/.test(k)) {
    const action = k[2];
    if (action === 'E') return `Insertion dans la zone de texte puis appuie sur la touche clavier « Entrée »`;
    if (action === 'S') return `Sélection de la valeur saisie dans la liste (select)`;
    if (action === 'R') return `Sélection du bouton radio`;
    if (action === 'C') return `Sélection de la case à cocher (checkbox)`;
    if (action === 'D') return `Double-clic`;
    if (action === 'K') return `Clic`;
    return '';
  }

  // Champ (4 caractères)
  if (k.length === 4 && /^[1-9]\d?[IRCS][PA][A-Z]$/.test(k)) {
    const num = k[0];
    const type = CHAMP_TYPES[k[1]] || k[1];
    const pos = CHAMP_POSITIONS[k[2]] || k[2];
    const elem = CHAMP_ELEMENTS[k[3]] || k[3];
    return `Champ ${num}: ${type}, ${pos}, ${elem}`;
  }

  // Bouton (2 caractères)
  if (k.length === 2 && /^[1-9]\d?[NF]$/.test(k)) {
    const num = k[0];
    const type = BOUTON_TYPES[k[1]] || k[1];
    return `Bouton ${num}: ${type}`;
  }

  // GET (VAR_xxx##option)
  if (k.includes('##')) {
    const [varPart, option] = k.split('##');
    if (varPart?.startsWith('VAR_') && option) {
      return `GET: variable ${varPart}, option ${option}`;
    }
  }

  return '';
}
