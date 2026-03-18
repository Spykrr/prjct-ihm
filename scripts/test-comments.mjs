import * as XLSX from 'xlsx';
import { generateExcel } from '../packages/core/dist/fileUtils.js';

const rows = [
  {
    '*** Test Cases ***': 'INIT-Ligne1',
    '${type}': 'INIT',
    '${ecran}': 'X',
    '${champ01}': 'User',
    __comments: { '${champ01}': 'Hello comment' },
  },
];

const buf = generateExcel(rows, 'Sheet1');
const wb = XLSX.read(buf, { type: 'array', cellComments: true });
const ws = wb.Sheets.Sheet1;

console.log('G2', ws.G2);
console.log('G2.c', ws.G2?.c);

