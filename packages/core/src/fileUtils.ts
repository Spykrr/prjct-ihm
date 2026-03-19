import * as XLSX from 'xlsx';

export const COLUMN_KEYS = [
  '*** Test Cases ***',
  '${type}',
  '${id}',
  '${ecran}',
  '${msgKOPrevu}',
  '${get}',
  ...Array.from({ length: 15 }, (_, i) => `\${champ${(i + 1).toString().padStart(2, '0')}}`),
  ...Array.from({ length: 10 }, (_, i) => `\${bouton${(i + 1).toString().padStart(2, '0')}}`),
];

export type RowType = 'INIT' | 'TEST' | 'MODEL' | 'TEST-MODEL';

export interface SheetRow {
  '*** Test Cases ***'?: string;
  '${type}'?: RowType | string;
  '${id}'?: string;
  '${ecran}'?: string;
  '${msgKOPrevu}'?: string;
  '${get}'?: string;
  [key: string]: string | undefined;
}

function getTestCasesId(type: RowType, index: number): string {
  return `${type}-Ligne${index + 1}`;
}

export function generateWorksheetFromData(
  rows: SheetRow[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- conservé pour cohérence API
  sheetName: string
): XLSX.WorkSheet {
  const wsData: (string | undefined)[][] = [COLUMN_KEYS];

  rows.forEach((row, idx) => {
    const type = (row['${type}'] as RowType) || 'TEST';
    const testCasesId = row['*** Test Cases ***'] || getTestCasesId(type, idx);
    const r: (string | undefined)[] = [
      testCasesId,
      row['${type}'],
      row['${id}'],
      row['${ecran}'],
      row['${msgKOPrevu}'],
      row['${get}'],
    ];
    for (let i = 1; i <= 15; i++) {
      r.push(row[`\${champ${i.toString().padStart(2, '0')}}`]);
    }
    for (let i = 1; i <= 10; i++) {
      r.push(row[`\${bouton${i.toString().padStart(2, '0')}}`]);
    }
    wsData.push(r);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = COLUMN_KEYS.map(() => ({ wch: 15 }));
  return ws;
}

export function generateExcel(rows: SheetRow[], sheetName: string): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const ws = generateWorksheetFromData(rows, sheetName);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

export interface RefGroup {
  name: string;
  orderModule: number;
  childreen: RefOption[];
}

export interface RefOption {
  Actif?: string;
  Instance?: string;
  OrdreModule?: number;
  Type?: string;
  Module?: string;
  ordreOption?: number;
  Option?: string;
  Libelle?: string;
  [key: string]: unknown;
}

export function addGrp(
  groups: RefGroup[],
  index: number,
  newgrp: string,
  orderModule?: number
): RefGroup[] {
  const newGroup: RefGroup = {
    name: '# ' + newgrp,
    orderModule: orderModule ?? (groups.length > 0 ? Math.max(...groups.map(g => g.orderModule)) + 100 : 100),
    childreen: [],
  };
  const result = [...groups];
  result.splice(index, 0, newGroup);
  return result;
}

export function addOpt(
  group: RefGroup,
  index: number,
  option: Partial<RefOption>
): RefOption[] {
  const newOpt: RefOption = {
    Actif: 'O',
    Instance: 'Inst01',
    OrdreModule: group.orderModule,
    Type: 'ModuleSAB',
    Module: option.Module ?? '',
    ordreOption: option.ordreOption ?? 100,
    Option: option.Option ?? '',
    Libelle: option.Libelle ?? '',
    ...option,
  };
  const result = [...(group.childreen || [])];
  result.splice(index, 0, newOpt);
  return result;
}

/** Trouve une valeur par motif de clé (insensible à la casse) */
export function findValueByKeyPattern(row: Record<string, unknown>, patterns: string[]): string | undefined {
  const keys = Object.keys(row);
  for (const pattern of patterns) {
    const key = keys.find((k) => k.toLowerCase().includes(pattern.toLowerCase()));
    if (key) {
      const val = row[key];
      return typeof val === 'string' ? val : val != null ? String(val) : undefined;
    }
  }
  return undefined;
}

/** Trouve la clé d'une colonne champ/bouton par numéro (1-15 pour champ, 1-10 pour bouton) */
function findKeyByIndex(row: Record<string, unknown>, prefix: 'champ' | 'bouton', index: number): string | undefined {
  const numStr = index.toString().padStart(2, '0');
  const numStrShort = index.toString();
  const keys = Object.keys(row);
  return keys.find((k) => {
    const lower = k.toLowerCase();
    if (!lower.includes(prefix)) return false;
    const digits = k.replace(/\D/g, '');
    return digits === numStr || digits === numStrShort;
  });
}

/** Normalise une ligne Excel vers les clés standard (COLUMN_KEYS) pour cohérence lecture/écriture */
export function normalizeRowKeys(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const typeVal = findValueByKeyPattern(row, ['${type}', 'type']);
  const idVal = findValueByKeyPattern(row, ['${id}', 'id']);
  const ecranVal = findValueByKeyPattern(row, ['${ecran}', 'ecran']);
  const msgVal = findValueByKeyPattern(row, ['${msgKOPrevu}', 'msgKOPrevu']);
  const getVal = findValueByKeyPattern(row, ['${get}', 'get']);

  const testCasesKey = Object.keys(row).find((k) => /test\s*cases|testcases/i.test(k));
  out['*** Test Cases ***'] = testCasesKey ? row[testCasesKey] : undefined;
  out['${type}'] = typeVal ?? row['${type}'];
  out['${id}'] = idVal ?? row['${id}'];
  out['${ecran}'] = ecranVal ?? row['${ecran}'];
  out['${msgKOPrevu}'] = msgVal ?? row['${msgKOPrevu}'];
  out['${get}'] = getVal ?? row['${get}'];

  for (let i = 1; i <= 15; i++) {
    const key = findKeyByIndex(row, 'champ', i);
    const stdKey = `\${champ${i.toString().padStart(2, '0')}}`;
    out[stdKey] = key ? row[key] : undefined;
  }
  for (let i = 1; i <= 10; i++) {
    const key = findKeyByIndex(row, 'bouton', i);
    const stdKey = `\${bouton${i.toString().padStart(2, '0')}}`;
    out[stdKey] = key ? row[key] : undefined;
  }
  return out;
}

export interface ParsedScreen {
  id: string;
  number: number;
  title: string;
  hasFields: boolean;
  hasButtons: boolean;
  hasGet: boolean;
  hasMsg: boolean;
  rawRow: Record<string, unknown>;
}

export interface ParsedWorkbook {
  fileName: string;
  sheets: Record<string, SheetRow[]>;
  screensBySheet: Record<string, ParsedScreen[]>;
  /** IDs de test uniques par feuille (ex. TEST-INB-001) pour le mode test */
  testIdsBySheet: Record<string, string[]>;
}

export type ExtractMode = 'init' | 'test';

/** Parse un fichier Excel et extrait les écrans.
 * - mode 'init' : lignes INIT (définition)
 * - mode 'test' + testId : lignes TEST où ${id} === testId (ex. TEST-INB-001)
 */
export function parseExcel(
  buffer: ArrayBuffer,
  fileName: string,
  options?: { mode?: ExtractMode; testId?: string }
): ParsedWorkbook {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheets: Record<string, SheetRow[]> = {};
  const screensBySheet: Record<string, ParsedScreen[]> = {};
  const testIdsBySheet: Record<string, string[]> = {};
  const mode = options?.mode ?? 'init';
  const testId = options?.testId ?? '';

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' }) as SheetRow[];

    sheets[sheetName] = rows;

    const idVal = (r: Record<string, unknown>) =>
      findValueByKeyPattern(r, ['${id}', 'id']) ?? r['${id}'];
    const typeVal = (r: Record<string, unknown>) =>
      findValueByKeyPattern(r, ['${type}', 'type']) ?? r['${type}'];

    const testIds = [...new Set(
      rows
        .filter((r) => String(typeVal(r as Record<string, unknown>) || '').toUpperCase() === 'TEST')
        .map((r) => String(idVal(r as Record<string, unknown>) || '').trim())
        .filter(Boolean)
    )].sort();

    testIdsBySheet[sheetName] = testIds;

    const filteredRows =
      mode === 'test' && testId
        ? rows.filter((r) => {
            const r2 = r as Record<string, unknown>;
            return (
              String(typeVal(r2) || '').toUpperCase() === 'TEST' &&
              String(idVal(r2) || '').trim() === testId.trim()
            );
          })
        : rows.filter((r) => {
            const type = typeVal(r as Record<string, unknown>);
            return String(type || '').toUpperCase() === 'INIT';
          });

    const screens: ParsedScreen[] = filteredRows.map((row, idx) => {
      const r = row as Record<string, unknown>;
      const normalized = normalizeRowKeys(r);
      const ecran = findValueByKeyPattern(r, ['${ecran}', 'ecran']) ?? r['${ecran}'] ?? `Écran ${idx + 1}`;
      const title = typeof ecran === 'string' ? ecran : String(ecran || `Écran ${idx + 1}`);

      let hasFields = false;
      let hasButtons = false;
      for (let i = 1; i <= 15; i++) {
        const v = normalized[`\${champ${i.toString().padStart(2, '0')}}`];
        if (v != null && String(v).trim()) {
          hasFields = true;
          break;
        }
      }
      for (let i = 1; i <= 10; i++) {
        const v = normalized[`\${bouton${i.toString().padStart(2, '0')}}`];
        if (v != null && String(v).trim()) {
          hasButtons = true;
          break;
        }
      }
      const getVal = findValueByKeyPattern(r, ['${get}', 'get']) ?? r['${get}'];
      const msgVal = findValueByKeyPattern(r, ['${msgKOPrevu}', 'msgKOPrevu']) ?? r['${msgKOPrevu}'];
      const hasGet = !!(getVal && String(getVal).trim());
      const hasMsg = !!(msgVal && String(msgVal).trim());

      return {
        id: `init-${idx}-${Date.now()}`,
        number: idx + 1,
        title,
        hasFields,
        hasButtons,
        hasGet,
        hasMsg,
        rawRow: normalized,
      };
    });

    screensBySheet[sheetName] = screens;
  }

  return { fileName, sheets, screensBySheet, testIdsBySheet };
}

/** Trouve la première ligne INIT dont ${ecran} === nomEcran (pour labels des champs) */
export function getInitRowByEcran(
  rows: Record<string, unknown>[],
  nomEcran: string,
  findVal: (r: Record<string, unknown>, patterns: string[]) => string | undefined
): Record<string, unknown> | undefined {
  return rows.find((r) => {
    const type = findVal(r, ['${type}', 'type']);
    const ecran = findVal(r, ['${ecran}', 'ecran']);
    return (
      String(type || '').toUpperCase() === 'INIT' &&
      String(ecran || '').trim() === String(nomEcran || '').trim()
    );
  }) as Record<string, unknown> | undefined;
}
