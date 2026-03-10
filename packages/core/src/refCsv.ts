import type { RefGroup, RefOption } from './fileUtils';

export interface RefInstance {
  name: string;
  childreen: RefGroup[];
}

/**
 * Ordonnancement des tests — structure CSV et extraction des groupes
 * -------------------------------------------------------------------
 * Données : instances (ex. Inst01, getlban), chacune avec une liste de groupes.
 * Chaque groupe : name (souvent préfixé #, ex. # Portefeuille), orderModule (OrdreDansInstance), childreen = options.
 * Chaque option : Actif (O/N), Instance, OrdreModule (5 chiffres), ordreOption (3 chiffres), Module, Option, Libellé,
 * Predecesseur (format Instance##OrdreDansInstance##OrdreDansGroupe##Module), Param1…Param10.
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
 * OrdreModule sur 5 chiffres, ordreOption sur 3 chiffres ; Predecesseur au format ci-dessus.
 */
const CSV_SEP = ';';
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
 * Parse le CSV référentiel : lecture séquentielle, lignes Actif = #… = groupe,
 * autres lignes (avec Module/Option/Libelle ou Actif O/N) = options du groupe courant.
 * Puis regroupement par Instance : chaque instance reçoit les mêmes groupes, avec uniquement
 * les options de cette instance, triées par ordreOption.
 */
export function parseRefCsvToFlat(csvText: string): RefInstance[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [{ name: 'Inst01', childreen: [] }];

  const header = lines[0].split(CSV_SEP).map((c) => c.trim());
  const listitem: RefGroup[] = [];
  let currentGroup: RefGroup | null = null;
  let orderModule = 100;
  const instanceSet = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(CSV_SEP);
    const row: Record<string, string> = {};
    header.forEach((h, idx) => {
      row[h] = cells[idx]?.trim() ?? '';
    });

    const actif = getVal(row, 'Actif', 'Active');
    const inst = getVal(row, 'Instance', 'Inst') || 'Inst01';
    instanceSet.add(inst);

    if (actif.startsWith('#') && actif !== '#') {
      if (currentGroup) listitem.push(currentGroup);
      currentGroup = {
        name: actif.trim(),
        orderModule,
        childreen: [],
      };
      orderModule += 100;
    } else {
      const hasData = getVal(row, 'Module') || getVal(row, 'Option') || getVal(row, 'Libelle');
      const isDataRow = hasData || actif === 'O' || actif === 'N' || actif.toUpperCase() === 'O' || actif.toUpperCase() === 'N';
      if (isDataRow) {
        const ordreInstance = parseOrdre(getVal(row, 'OrdreDansInstance', 'OrdreModule', 'Ordre'));
        const ordreGroupe = parseOrdre(getVal(row, 'OrdreDansGroupe', 'ordreOption', 'OrdreGroupe'));
        const module = getVal(row, 'Module');
        const opt: RefOption = {
          Actif: normalizeActif(actif || ''),
          Instance: inst,
          OrdreModule: ordreInstance || (currentGroup?.orderModule ?? 100),
          Type: inferType(module),
          Module: module,
          ordreOption: ordreGroupe || 100,
          Option: getVal(row, 'Option'),
          Libelle: getVal(row, 'Libelle'),
          Predecesseur: getVal(row, 'Predecesseur', 'Predecessor'),
        };
        for (let p = 1; p <= 10; p++) {
          opt[`Param${p}`] = getVal(row, `Param${p}`) || '';
        }
        if (currentGroup) {
          currentGroup.childreen.push(opt);
        } else {
          currentGroup = { name: '# Groupe', orderModule: 100, childreen: [opt] };
          listitem.push(currentGroup);
        }
      }
    }
  }
  if (currentGroup) listitem.push(currentGroup);

  const instances = instanceSet.size > 0 ? Array.from(instanceSet).sort() : ['Inst01'];
  return instances.map((name) => ({
    name,
    childreen: listitem
      .map((g) => ({
        ...g,
        childreen: g.childreen
          .filter((o) => (o.Instance || 'Inst01') === name)
          .sort((a, b) => (a.ordreOption ?? 0) - (b.ordreOption ?? 0)),
      }))
      .filter((g) => g.childreen.length > 0 || g.name.startsWith('#')),
  }));
}

/**
 * Génère le CSV référentiel pour export
 */
export function generateRefCsv(instances: RefInstance[]): string {
  const lines: string[] = [CSV_COLS.join(CSV_SEP)];

  for (const inst of instances) {
    for (const grp of inst.childreen) {
      const chapterCells = [grp.name, '', '', '', '', '', '', '', ...Array(10).fill('')];
      lines.push(chapterCells.slice(0, CSV_COLS.length).join(CSV_SEP));
      const opts = [...grp.childreen].sort((a, b) => (a.ordreOption ?? 0) - (b.ordreOption ?? 0));
      for (const o of opts) {
        const ordreMod = String(o.OrdreModule ?? 0).padStart(5, '0');
        const ordreOpt = String(o.ordreOption ?? 0).padStart(3, '0');
        const params = Array.from({ length: 10 }, (_, i) => (o[`Param${i + 1}`] as string) ?? '');
        lines.push(
          [
            o.Actif ?? 'O',
            o.Instance ?? inst.name,
            ordreMod,
            o.Module ?? '',
            ordreOpt,
            o.Option ?? '',
            o.Libelle ?? '',
            o.Predecesseur ?? '',
            ...params,
          ].join(CSV_SEP)
        );
      }
    }
  }

  return lines.join('\r\n');
}
