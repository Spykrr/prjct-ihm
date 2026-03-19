import type { RefGroup, RefOption } from './fileUtils';
import { findValueByKeyPattern } from './fileUtils';

export interface RefInstance {
  name: string;
  childreen: RefGroup[];
}

/**
 * Ordonnancement des tests — structure CSV et extraction des groupes
 * -------------------------------------------------------------------
 * Données : instances (ex. Inst01, getlban), chacune avec une liste de groupes.
 * Chaque groupe : name (souvent préfixé #, ex. # Portefeuille), orderModule (OrdreDansInstance), childreen = options.
 * Chaque option : Actif (O/N), Instance, OrdreModule (5 chiffres), ordreOption (5 chiffres), Module, Option, Libellé,
 * Predecesseur (format Instance##OrdreDansInstance##OrdreDansGroupe##Module, ordres sur 5 chiffres), Param1…Param10.
 *
 * Format CSV à l'import :
 * - Ligne de groupe : colonne Actif commence par # (sauf le seul caractère #) → ouvre un nouveau groupe (nom = cette valeur).
 * - Lignes suivantes jusqu'à la prochaine ligne « Actif = #… » = options du groupe courant.
 * - Colonnes option : Actif, Instance, OrdreDansInstance (ou OrdreModule), OrdreDansGroupe (ou ordreOption),
 *   Module, Option, Libelle, Predecesseur, Param1…Param10. Param à vide si absent.
 *
 * Extraction : lecture séquentielle ; chaque ligne Actif = #… ferme le groupe précédent (s'il a des options) et en ouvre un nouveau ;
 * les autres lignes sont ajoutées comme options du groupe courant (normalisation Actif, ordres, Predecesseur).
 * Puis regroupement par Instance : pour chaque instance, liste des groupes ayant au moins une option de cette instance,
 * chaque groupe ne conservant que les options de l'instance, triées par ordreOption.
 *
 * Export : une ligne Actif = nom du groupe (#…) avant chaque bloc d'options, puis une ligne par option avec toutes les colonnes ;
 * OrdreModule et OrdreDansGroupe sur 5 chiffres (leading zeros) ; Predecesseur normalisé 5+5 chiffres.
 */
const CSV_SEP = ';';
const PAD_5 = (n: number) => String(n).padStart(5, '0');

/** Normalise un Predecesseur pour l'export : Instance##OrdreMod(5)##OrdreOpt(5)##Module */
function normalizePredecesseurForExport(val: string): string {
  const s = (val ?? '').trim();
  if (!s) return s;
  const parts = s.split('##').map((p) => p.trim());
  if (parts.length < 4) return s;
  const [inst, mod, opt, modName] = parts;
  const modNum = /^\d+$/.test(mod) ? PAD_5(parseInt(mod, 10)) : mod;
  const optNum = /^\d+$/.test(opt) ? PAD_5(parseInt(opt, 10)) : opt;
  return [inst, modNum, optNum, modName].join('##');
}
const CSV_COLS = [
  'Actif',
  'Instance',
  'OrdreDansInstance',
  'Module',
  'OrdreDansGroupe',
  'Option',
  'Libelle',
  'Predecesseur',
  ...Array.from({ length: 10 }, (_, i) => `Param${i + 1}`),
];

function getVal(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

/** Valeur du champ Actif : priorité aux colonnes exactement "Actif" ou "Active", sinon motif actif/active. */
function getActifValue(row: Record<string, string>): string | undefined {
  const exactKey = Object.keys(row).find(
    (k) => k.trim().toLowerCase() === 'actif' || k.trim().toLowerCase() === 'active'
  );
  let val: string | undefined = exactKey != null ? row[exactKey] : undefined;
  if (val == null || String(val).trim() === '') {
    val = findValueByKeyPattern(row as Record<string, unknown>, ['actif', 'active']);
  }
  if (val == null) return undefined;
  const s = String(val).trim();
  return s === '' ? undefined : s;
}

/** Valeur normalisée pour Instance (Instance, Inst ou clé contenant "instance"). */
function getInstance(row: Record<string, string>): string {
  const v = findValueByKeyPattern(row as Record<string, unknown>, ['instance']);
  return (v != null && String(v).trim() !== '') ? String(v).trim() : '';
}

/** Valeur numérique pour ordre dans l'instance (OrdreDansInstance, OrdreModule, Ordre, « Ordre Instance », etc.). */
function getOrdreDansInstance(row: Record<string, string>): number {
  const v = findValueByKeyPattern(row as Record<string, unknown>, [
    'ordredansinstance', 'ordremodule', 'ordre instance',
  ]);
  if (v == null || String(v).trim() === '') {
    const ordreVal = getVal(row, 'Ordre');
    if (ordreVal) return parseOrdre(ordreVal);
    return 0;
  }
  const n = parseInt(String(v).trim(), 10);
  return isNaN(n) ? 0 : n;
}

/** Valeur numérique pour ordre dans le groupe (OrdreDansGroupe, OrdreGroupe, ordreOption, etc.). */
function getOrdreDansGroupe(row: Record<string, string>): number {
  const v = findValueByKeyPattern(row as Record<string, unknown>, [
    'ordredansgroupe', 'ordregroupe', 'ordreoption',
  ]);
  if (v == null || String(v).trim() === '') return 0;
  const n = parseInt(String(v).trim(), 10);
  return isNaN(n) ? 0 : n;
}

/** Normalise une chaîne pour recherche sans accents (ex. "Prédécesseur" → "predecesseur"). */
function normalizeNoAccents(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** Valeur pour Predecesseur (Predecesseur, Predecessor, Prédécesseur ou clé contenant predecesseur). */
function getPredecesseur(row: Record<string, string>): string {
  let v = findValueByKeyPattern(row as Record<string, unknown>, ['predecesseur', 'predecessor']);
  if (v == null || String(v).trim() === '') {
    const key = Object.keys(row).find((k) => normalizeNoAccents(k).includes('predecesseur'));
    if (key) v = row[key];
  }
  return (v != null && String(v).trim() !== '') ? String(v).trim() : '';
}

function parseOrdre(val: string): number {
  const n = parseInt(val, 10);
  return isNaN(n) ? 0 : n;
}

function inferType(module: string): string {
  if (!module) return 'ModuleSAB';
  return module.toUpperCase().startsWith('UP') ? 'TraitementUpTest' : 'ModuleSAB';
}

/** Normalise la valeur Actif du CSV vers 'O' (actif) ou 'N' (inactif) pour la case à cocher. */
function normalizeActif(raw: string): 'O' | 'N' {
  const v = raw.trim().toUpperCase();
  if (v === 'O' || v === '1' || v === 'Y' || v === 'OUI' || v === 'YES' || v === 'TRUE' || v === 'X') return 'O';
  return 'N';
}

/**
 * Parse un fichier CSV référentiel (séparateur ;).
 * Délègue à parseRefCsvToFlat qui applique la logique d'extraction des groupes par instance.
 */
export function parseRefCsv(csvText: string): RefInstance[] {
  return parseRefCsvToFlat(csvText);
}

/**
 * Parse le CSV référentiel : lecture séquentielle.
 * - Ligne prise en compte seulement si la ligne possède une colonne Actif (clé exacte Actif/Active ou clé contenant "actif"/"active").
 * - Ligne de groupe : valeur Actif non nulle, commence par # et ≠ "#" → ferme le groupe courant (s'il a des options), ouvre un nouveau groupe.
 * - Ligne de données : valeur Actif non nulle et ≠ "#" → option du groupe courant (normalisation Instance, OrdreModule, ordreOption, Predecesseur par motif de clé).
 * - En fin de parcours, dernier groupe ajouté à listitem. Tri par orderModule. Regroupement par Instance avec filtre et tri par ordreOption.
 */
export function parseRefCsvToFlat(csvText: string): RefInstance[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [{ name: 'Inst01', childreen: [] }];

  // Trouver la vraie ligne d'en-tête : première ligne dont une cellule est exactement "Actif" ou "Active" (insensible à la casse)
  let headerRowIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const cells = lines[i].split(CSV_SEP).map((c) => c.trim().replace(/^\uFEFF/, ''));
    const hasActif = cells.some((c) => c.toLowerCase() === 'actif' || c.toLowerCase() === 'active');
    if (hasActif) {
      headerRowIndex = i;
      break;
    }
  }
  if (headerRowIndex < 0) return [{ name: 'Inst01', childreen: [] }];

  const header = lines[headerRowIndex].split(CSV_SEP).map((c) => c.trim().replace(/^\uFEFF/, ''));
  const listitem: RefGroup[] = [];
  let currentGroup: RefGroup | null = null;

  for (let i = headerRowIndex + 1; i < lines.length; i++) {
    const cells = lines[i].split(CSV_SEP).map((c) => c.trim());
    const firstCell = cells[0] ?? '';

    // Détection par première cellule : lignes de doc (un seul # ou ## seul) ou titres de groupe (## + texte)
    if (firstCell.startsWith('#')) {
      // Exactement "##" seul ou un seul "#" (avec ou sans texte) = doc, jamais de groupe
      if (firstCell === '#' || firstCell === '##') {
        continue;
      }
      // "# Actif : ...", "# Instance : ..." etc. = une seule # = ligne de doc, ignorer
      if (firstCell.startsWith('# ') || (firstCell.startsWith('#') && !firstCell.startsWith('##'))) {
        continue;
      }
      // "## Titre" (deux dièses + espace + texte) = groupe uniquement si pas une ligne de doc
      if (firstCell.startsWith('##') && firstCell.length > 2) {
        const groupTitle = firstCell.replace(/^##\s*/, '').trim();
        const isDocLine = groupTitle.includes('=>') || /^(Actif|Instance|ordreDans|Module|Libelle|Option|Predecess|Param)\s*[:\.]/i.test(groupTitle);
        if (!isDocLine) {
          if (currentGroup) {
            listitem.push(currentGroup);
          }
          currentGroup = {
            name: groupTitle || firstCell,
            orderModule: 0,
            childreen: [],
          };
        }
      }
      continue;
    }

    const row: Record<string, string> = {};
    header.forEach((h, idx) => {
      row[h] = cells[idx]?.trim() ?? '';
    });

    const actifVal = getActifValue(row);
    if (actifVal === undefined) continue;
    const actifTrim = actifVal.trim();
    if (!actifTrim) continue;

    // Si la colonne Actif contient "## Titre" (ligne de groupe), traiter comme groupe même si première colonne différente
    if (actifTrim.startsWith('##') && actifTrim.length > 2) {
      const groupTitle = actifTrim.replace(/^##\s*/, '').trim();
      const isDocLine = groupTitle.includes('=>') || /^(Actif|Instance|ordreDans|Module|Libelle|Option|Predecess|Param)\s*[:\.]/i.test(groupTitle);
      if (!isDocLine) {
        if (currentGroup) {
          listitem.push(currentGroup);
        }
        currentGroup = {
          name: groupTitle || actifTrim,
          orderModule: 0,
          childreen: [],
        };
      }
      continue;
    }

    // Ligne de données (option) : nécessite un groupe courant
    if (!currentGroup) {
      // Pas de groupe ouvert → on ignore ces lignes orphelines
      continue;
    }

    const inst = getInstance(row) || 'Inst01';
    const ordreInstance = getOrdreDansInstance(row);
    const ordreGroupe = getOrdreDansGroupe(row);
    const module = getVal(row, 'Module');
    const predRaw = getPredecesseur(row);

    const opt: RefOption = {
      Actif: normalizeActif(actifTrim),
      Instance: inst,
      OrdreModule: ordreInstance || (currentGroup.orderModule || 100),
      Type: inferType(module),
      Module: module,
      ordreOption: ordreGroupe || 100,
      Option: getVal(row, 'Option'),
      Libelle: getVal(row, 'Libelle'),
      Predecesseur: predRaw ? normalizePredecesseurForExport(predRaw) : '',
    };
    for (let p = 1; p <= 10; p++) {
      opt[`Param${p}`] = getVal(row, `Param${p}`) || '';
    }

    // Met à jour l'ordre du module du groupe à partir de la ligne
    if (ordreInstance > 0) {
      currentGroup.orderModule = ordreInstance;
    } else if (!currentGroup.orderModule) {
      currentGroup.orderModule = opt.OrdreModule ?? 100;
    }

    currentGroup.childreen.push(opt);
  }

  // Ajoute le dernier groupe, même vide (comme décrit dans la doc)
  if (currentGroup) {
    listitem.push(currentGroup);
  }

  // Garder l'ordre des groupes tel qu'il apparaît dans le fichier CSV (pas de tri)

  // Construit la liste des instances à partir des options réellement présentes
  const allOptions = listitem.flatMap((g) => g.childreen);
  const instanceNames = Array.from(
    new Set(
      allOptions
        .map((o) => (o.Instance && String(o.Instance).trim()) || 'Inst01')
        .filter((name) => name && name.trim() !== '')
    )
  );

  if (instanceNames.length === 0) {
    return [{ name: 'Inst01', childreen: [] }];
  }

  return instanceNames.map((name) => ({
    name,
    childreen: listitem.map((g) => ({
      name: g.name,
      orderModule: g.orderModule,
      childreen: g.childreen
        .filter((o) => ((o.Instance as string) || 'Inst01') === name)
        .sort((a, b) => (a.ordreOption ?? 0) - (b.ordreOption ?? 0)),
    })),
  }));
}

/**
 * Génère le CSV référentiel pour export
 */
export function generateRefCsv(instances: RefInstance[]): string {
  const lines: string[] = [CSV_COLS.join(CSV_SEP)];

  for (const inst of instances) {
    for (const grp of inst.childreen) {
      const groupActifValue = grp.name.startsWith('#') ? grp.name : `## ${grp.name}`;
      const chapterCells = [groupActifValue, '', '', '', '', '', '', '', ...Array(10).fill('')];
      lines.push(chapterCells.slice(0, CSV_COLS.length).join(CSV_SEP));
      const opts = [...grp.childreen].sort((a, b) => (a.ordreOption ?? 0) - (b.ordreOption ?? 0));
      for (const o of opts) {
        const ordreMod = PAD_5(Number(o.OrdreModule ?? 0));
        const ordreOpt = PAD_5(Number(o.ordreOption ?? 0));
        const params = Array.from({ length: 10 }, (_, i) => (o[`Param${i + 1}`] as string) ?? '');
        const predecesseur = normalizePredecesseurForExport((o.Predecesseur as string) ?? '');
        lines.push(
          [
            o.Actif ?? 'O',
            o.Instance ?? inst.name,
            ordreMod,
            o.Module ?? '',
            ordreOpt,
            o.Option ?? '',
            o.Libelle ?? '',
            predecesseur,
            ...params,
          ].join(CSV_SEP)
        );
      }
    }
  }

  return lines.join('\r\n');
}
