import type { RefGroup, RefOption } from './fileUtils';
import { findValueByKeyPattern } from './fileUtils';
import * as XLSX from 'xlsx-js-style';

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
  // Ordre basé sur la séquence d'apparition des lignes "groupe" dans le CSV.
  // On utilise des pas de 100 pour rester compatible avec les valeurs manipulées en UI.
  let groupSeq = 0;
  const allocGroupOrderModule = () => {
    groupSeq += 1;
    return groupSeq * 100;
  };

  for (let i = headerRowIndex + 1; i < lines.length; i++) {
    const cells = lines[i].split(CSV_SEP).map((c) => c.trim());
    const firstCell = cells[0] ?? '';

    // Détection par première cellule : lignes de doc ou titres de groupe.
    // Ex: "# Portefeuille" => groupe ; "# Actif : ..." => doc (ignoré).
    if (firstCell.startsWith('#')) {
      // Exactement "#" / "##" seul = doc
      if (firstCell === '#' || firstCell === '##') continue;

      const groupTitle = firstCell.replace(/^#+\s*/, '').trim();
      const isDocLine =
        groupTitle.includes('=>') ||
        /^(Actif|Instance|ordreDans|Module|Libelle|Option|Predecess|Param)\s*[:\.]/i.test(groupTitle);

      // Ligne groupe uniquement si ce n'est pas une ligne doc et si le titre est plausible
      if (!isDocLine && groupTitle && firstCell.length > 1) {
        if (currentGroup && currentGroup.childreen.length > 0) {
          listitem.push(currentGroup);
        }
        currentGroup = {
          name: groupTitle || firstCell,
          orderModule: allocGroupOrderModule(),
          childreen: [],
        };
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

    // Ligne de groupe (chapitre) : Actif commence par '#' (et ≠ '#') ; Module doit être vide.
    // Support de variantes: "# Titre" ou "## Titre".
    const moduleVal = getVal(row, 'Module');
    const isGroupLineCandidate =
      actifTrim.startsWith('#') &&
      actifTrim.length > 1 &&
      !moduleVal.trim();

    if (isGroupLineCandidate) {
      const groupTitle = actifTrim.replace(/^#+\s*/, '').trim();
      const isDocLine =
        groupTitle.includes('=>') ||
        /^(Actif|Instance|ordreDans|Module|Libelle|Option|Predecess|Param)\s*[:\.]/i.test(groupTitle);

      if (!isDocLine) {
        if (currentGroup && currentGroup.childreen.length > 0) {
          listitem.push(currentGroup);
        }
        currentGroup = {
          name: groupTitle || actifTrim,
          orderModule: allocGroupOrderModule(),
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

    // Règle validation simple : une ligne "option" doit avoir un Module renseigné
    if (!module.trim()) continue;

    const opt: RefOption = {
      Actif: normalizeActif(actifTrim),
      Instance: inst,
      // OrdreDansInstance (souvent l'"instance" numérique) : on le garde tel quel,
      // même s'il vaut 0 (sinon on perd la valeur exacte du CSV).
      OrdreModule: ordreInstance,
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
    // On ne remplace pas l'ordre basé sur le CSV si déjà défini.
    if ((!currentGroup.orderModule || currentGroup.orderModule === 0) && ordreInstance > 0) {
      currentGroup.orderModule = ordreInstance;
    } else if ((!currentGroup.orderModule || currentGroup.orderModule === 0) && !ordreInstance) {
      currentGroup.orderModule = opt.OrdreModule ?? 100;
    }

    currentGroup.childreen.push(opt);
  }

  // Ajoute le dernier groupe uniquement s'il contient des options
  if (currentGroup && currentGroup.childreen.length > 0) {
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

  // Tri des instances par ordre de groupe (minimum) pour respecter l'ordre attendu
  const instanceOrder = new Map<string, number>();
  for (const name of instanceNames) {
    const orders = listitem
      .filter((g) => g.childreen.some((o) => String(o.Instance ?? 'Inst01').trim() === name))
      .map((g) => Number(g.orderModule ?? 0));
    instanceOrder.set(name, orders.length ? Math.min(...orders) : 0);
  }
  const sortedInstances = [...instanceNames].sort((a, b) => (instanceOrder.get(a) ?? 0) - (instanceOrder.get(b) ?? 0));

  return sortedInstances.map((name) => {
    const groupsForInst = listitem
      .filter((g) => g.childreen.some((o) => String(o.Instance ?? 'Inst01').trim() === name))
      .sort((a, b) => (a.orderModule ?? 0) - (b.orderModule ?? 0));

    return {
      name,
      childreen: groupsForInst.map((g) => ({
        name: g.name,
        orderModule: g.orderModule,
        childreen: g.childreen
          .filter((o) => String(o.Instance ?? 'Inst01').trim() === name)
          .sort((a, b) => (a.ordreOption ?? 0) - (b.ordreOption ?? 0)),
      })),
    };
  });
}

/**
 * Génère le CSV référentiel pour export
 */
export function generateRefCsv(instances: RefInstance[]): string {
  const lines: string[] = [CSV_COLS.join(CSV_SEP)];

  for (const inst of instances) {
    const groupsSorted = [...inst.childreen].sort((a, b) => (a.orderModule ?? 0) - (b.orderModule ?? 0));
    for (const grp of groupsSorted) {
      // Ne pas exporter les groupes vides
      if (!grp.childreen || grp.childreen.length === 0) continue;

      const groupName = grp.name.startsWith('#') ? grp.name.replace(/^#+\s*/, '') : grp.name;
      const groupActifValue = `# ${groupName}`;
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

type ExportRowKind = 'header' | 'group' | 'option';

function buildExportRows(instances: RefInstance[]): { rows: string[][]; kinds: ExportRowKind[] } {
  const rows: string[][] = [];
  const kinds: ExportRowKind[] = [];

  rows.push([...CSV_COLS]);
  kinds.push('header');

  for (const inst of instances) {
    const groupsSorted = [...(inst.childreen ?? [])].sort((a, b) => (a.orderModule ?? 0) - (b.orderModule ?? 0));
    for (const grp of groupsSorted) {
      if (!grp.childreen || grp.childreen.length === 0) continue;

      const groupName = grp.name.startsWith('#') ? grp.name.replace(/^#+\s*/, '') : grp.name;
      const groupActifValue = `# ${groupName}`;
      const chapterCells = [groupActifValue, '', '', '', '', '', '', '', ...Array(10).fill('')].slice(0, CSV_COLS.length);
      rows.push(chapterCells);
      kinds.push('group');

      const opts = [...grp.childreen].sort((a, b) => (a.ordreOption ?? 0) - (b.ordreOption ?? 0));
      for (const o of opts) {
        const ordreMod = PAD_5(Number(o.OrdreModule ?? 0));
        const ordreOpt = PAD_5(Number(o.ordreOption ?? 0));
        const params = Array.from({ length: 10 }, (_, i) => (o[`Param${i + 1}`] as string) ?? '');
        const predecesseur = normalizePredecesseurForExport((o.Predecesseur as string) ?? '');
        rows.push(
          [
            o.Actif ?? 'O',
            (o.Instance as string) ?? inst.name,
            ordreMod,
            (o.Module as string) ?? '',
            ordreOpt,
            (o.Option as string) ?? '',
            (o.Libelle as string) ?? '',
            predecesseur,
            ...params,
          ].slice(0, CSV_COLS.length)
        );
        kinds.push('option');
      }
    }
  }

  return { rows, kinds };
}

/**
 * Génère un fichier Excel (.xlsx) équivalent au CSV référentiel,
 * avec mise en forme (en-tête, séparateurs de groupe, bordures, alignements, largeurs).
 */
export function generateRefXlsx(instances: RefInstance[], sheetName = 'Referentiel'): ArrayBuffer {
  const { rows, kinds } = buildExportRows(instances);
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Largeurs de colonnes proches d'un rendu IHM
  ws['!cols'] = CSV_COLS.map((col) => {
    if (col === 'Actif') return { wch: 16 };
    if (col === 'Instance') return { wch: 12 };
    if (col === 'OrdreDansInstance' || col === 'OrdreDansGroupe') return { wch: 18 };
    if (col === 'Module' || col === 'Option') return { wch: 18 };
    if (col === 'Libelle') return { wch: 44 };
    if (col === 'Predecesseur') return { wch: 46 };
    if (col.startsWith('Param')) return { wch: 16 };
    return { wch: 16 };
  });

  const border = {
    top: { style: 'thin', color: { rgb: 'E5E7EB' } },
    bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
    left: { style: 'thin', color: { rgb: 'E5E7EB' } },
    right: { style: 'thin', color: { rgb: 'E5E7EB' } },
  } as const;

  const headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { patternType: 'solid', fgColor: { rgb: '111111' } },
    alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
    border,
  } as const;

  const groupStyle = {
    font: { bold: true, color: { rgb: '111827' } },
    fill: { patternType: 'solid', fgColor: { rgb: 'F7F7F7' } },
    alignment: { vertical: 'center', horizontal: 'left' },
    border,
  } as const;

  const cellStyle = {
    font: { color: { rgb: '111827' } },
    alignment: { vertical: 'center', horizontal: 'left', wrapText: true },
    border,
  } as const;

  const orderStyle = {
    font: { color: { rgb: '111827' } },
    alignment: { vertical: 'center', horizontal: 'center' },
    border,
  } as const;

  // Applique styles ligne par ligne (kinds aligné sur rows)
  const range = XLSX.utils.decode_range(ws['!ref'] ?? `A1:A${rows.length}`);
  for (let r = range.s.r; r <= range.e.r; r++) {
    const kind = kinds[r] ?? 'option';
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];
      if (!cell) continue;

      if (kind === 'header') {
        cell.s = headerStyle;
        continue;
      }
      if (kind === 'group') {
        cell.s = c === 0 ? groupStyle : { ...groupStyle, font: { ...groupStyle.font, bold: false } };
        continue;
      }

      const colName = CSV_COLS[c] ?? '';
      if (colName === 'OrdreDansInstance' || colName === 'OrdreDansGroupe') {
        cell.s = orderStyle;
      } else {
        cell.s = cellStyle;
      }
    }
  }

  // Hauteur ligne header
  (ws as XLSX.WorkSheet & { ['!rows']?: { hpt?: number }[] })['!rows'] = [{ hpt: 20 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}
