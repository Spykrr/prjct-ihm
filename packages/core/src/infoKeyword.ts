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
  // Spec métier: P = avant le libellé, sinon après
  P: 'avant le libellé',
  A: 'après le libellé',
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

export function getInfoByKeyword(keyword: string, anchorLabel?: string): string {
  if (!keyword || typeof keyword !== 'string') return '';

  const k = keyword.trim().toUpperCase();
  const anchor = (anchorLabel ?? '').trim();
  const anchorSuffix = anchor ? ` '${anchor}'` : '';

  const actionSentenceForChampType = (typeCode: string): string => {
    switch (typeCode) {
      case 'S':
        return "Sélection de la valeur saisie dans la liste (select)";
      case 'I':
        return "Insertion dans la zone de texte";
      case 'R':
        return "Sélection d'un bouton radio";
      case 'C':
        return "Coche / décoche la case";
      default:
        return "Action sur l'élément";
    }
  };

  // Champ (4 caractères)
  if (k.length === 4 && /^[1-9]\d?[IRCS][PA][A-Z]$/.test(k)) {
    const num = k[0];
    const typeCode = k[1];
    const posCode = k[2];
    const elemCode = k[3];

    const pos = CHAMP_POSITIONS[posCode] || posCode;
    const elem = CHAMP_ELEMENTS[elemCode] || elemCode;

    const action = actionSentenceForChampType(typeCode);
    const withEnter = elemCode === 'E' ? ' puis appuie sur Entrée' : '';
    const withDoubleClick = elemCode === 'D' ? ' (double-clic)' : '';

    // Phrase claire + rappel de repérage
    return `${action} ${pos}${anchorSuffix}${withEnter}${withDoubleClick}`;
  }

  // Bouton (2 caractères)
  if (k.length === 2 && /^[1-9]\d?[NF]$/.test(k)) {
    const num = k[0];
    const type = BOUTON_TYPES[k[1]] || k[1];
    return `Clic sur le bouton ${num} (${type})`;
  }

  // GET (VAR_xxx##option)
  if (k.includes('##')) {
    const [varPart, option] = k.split('##');
    if (varPart?.startsWith('VAR_') && option) {
      return `GET: renseigne la variable ${varPart} avec la valeur repérée (option ${option})`;
    }
  }

  return '';
}
