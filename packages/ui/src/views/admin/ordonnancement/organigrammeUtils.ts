import type { RefInstance, RefOption } from '@uptest/core';

/** Test élémentaire normalisé pour l'organigramme */
export interface OrganigrammeTestLine {
  id: string;
  inst: string;
  moduleNum: string;
  optionNum: string;
  moduleName: string;
  libelle: string;
  predecesseur: string;
}

/** Hiérarchie : instance -> moduleNum -> liste de tests */
export type OrganigrammeHierarchie = Record<string, Record<string, { id: string; label: string; predecesseur: string }[]>>;

export interface BuildOrganigrammeResult {
  hierarchie: OrganigrammeHierarchie;
  allIds: string[];
  idMap: Record<string, string>;
}

/** Padding à 5 chiffres (leading zeros) pour ordre module et ordre option dans l'organigramme */
const PAD_5 = (n: number) => String(n).padStart(5, '0');

function getVal(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function findKeyIgnoreCase(obj: Record<string, unknown>, pattern: RegExp): string | undefined {
  for (const k of Object.keys(obj)) {
    if (pattern.test(k)) return k;
  }
  return undefined;
}

function isTestActif(opt: RefOption): boolean {
  const v = (opt.Actif ?? '').toString().trim().toUpperCase();
  return v === 'O' || v === '1' || v === 'Y' || v === 'OUI' || v === 'YES' || v === 'TRUE' || v === 'X';
}

/** Normalise un id (prédécesseur) pour le rapprocher du format canonique */
export function normalizeId(raw: string, idMap: Record<string, string>): string | undefined {
  const s = raw.trim();
  if (!s) return undefined;
  if (idMap[s]) return idMap[s];
  const parts = s.split('##').map((p) => p.trim());
  if (parts.length >= 4) {
    const [inst, mod, opt, modName] = parts;
    const modNum = /^\d+$/.test(mod) ? PAD_5(parseInt(mod, 10)) : mod;
    const optNum = /^\d+$/.test(opt) ? PAD_5(parseInt(opt, 10)) : opt;
    const candidate = `${inst}##${modNum}##${optNum}##${modName}`;
    if (idMap[candidate]) return idMap[candidate];
    for (const id of Object.keys(idMap)) {
      if (id.startsWith(inst + '##') && id.includes(modName)) return id;
    }
  }
  return undefined;
}

/**
 * Construit la hiérarchie organigramme à partir des instances du référentiel (onglet 2).
 * - Filtre optionnel sur les tests actifs (Actif = O/1/Y/...).
 * - Normalise OrdreModule et ordreOption sur 5 chiffres (leading zeros).
 * - Déduplique par id = inst##moduleNum##optionNum##moduleName.
 */
export function buildOrganigrammeHierarchy(
  instances: RefInstance[],
  actifsOnly: boolean
): BuildOrganigrammeResult {
  const seenIds = new Set<string>();
  const allIds: string[] = [];
  const idMap: Record<string, string> = {};
  const lines: OrganigrammeTestLine[] = [];

  for (const instanceItem of instances) {
    const instName = instanceItem.name ?? '';

    for (const group of instanceItem.childreen ?? []) {
      const groupName = group.name ?? '';
      const orderModule = group.orderModule ?? 100;

      for (const test of group.childreen ?? []) {
        if (actifsOnly && !isTestActif(test)) continue;

        const inst = getVal(test as Record<string, unknown>, 'Instance', 'instance') || instName;
        const moduleNumRaw =
          test.OrdreModule ??
          (test as Record<string, unknown>)['OrdreDansInstance'] ??
          (test as Record<string, unknown>)['Ordre'] ??
          (test as Record<string, unknown>)['orderModule'] ??
          orderModule;
        const moduleNum = PAD_5(typeof moduleNumRaw === 'number' ? moduleNumRaw : parseInt(String(moduleNumRaw), 10) || 0);

        const optionNumRaw =
          test.ordreOption ??
          (test as Record<string, unknown>)['OrdreDansGroupe'] ??
          (test as Record<string, unknown>)['OrdreGroupe'] ??
          (test as Record<string, unknown>)['OrdreOption'] ??
          100;
        const optionNum = PAD_5(typeof optionNumRaw === 'number' ? optionNumRaw : parseInt(String(optionNumRaw), 10) || 0);

        const moduleName =
          getVal(test as Record<string, unknown>, 'Module', 'module') ||
          groupName.replace(/^#+\s*/, '') ||
          '';
        const libelleKey = findKeyIgnoreCase(test as Record<string, unknown>, /libelle/i) ?? 'Libelle';
        const libelle = String((test as Record<string, unknown>)[libelleKey] ?? '').trim();
        const predKey = findKeyIgnoreCase(test as Record<string, unknown>, /predecesseur|predecessor/i);
        const predecesseur = predKey ? String((test as Record<string, unknown>)[predKey] ?? '').trim() : '';

        const id = `${inst}##${moduleNum}##${optionNum}##${moduleName}`;
        if (seenIds.has(id)) continue;
        seenIds.add(id);
        allIds.push(id);
        idMap[id] = id;

        lines.push({
          id,
          inst,
          moduleNum,
          optionNum,
          moduleName,
          libelle,
          predecesseur,
        });
      }
    }
  }

  lines.sort((a, b) => {
    if (a.inst !== b.inst) return a.inst.localeCompare(b.inst);
    if (a.moduleNum !== b.moduleNum) return a.moduleNum.localeCompare(b.moduleNum);
    return a.optionNum.localeCompare(b.optionNum);
  });

  const hierarchie: OrganigrammeHierarchie = {};

  for (const line of lines) {
    if (!hierarchie[line.inst]) hierarchie[line.inst] = {};
    if (!hierarchie[line.inst][line.moduleNum]) hierarchie[line.inst][line.moduleNum] = [];
    const label = `${line.inst}/${line.moduleName}/${line.optionNum}/${line.moduleName}${line.libelle ? '/' + line.libelle : ''}`;
    hierarchie[line.inst][line.moduleNum].push({
      id: line.id,
      label,
      predecesseur: line.predecesseur,
    });
  }

  return { hierarchie, allIds, idMap };
}
