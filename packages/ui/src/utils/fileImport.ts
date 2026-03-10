/**
 * Utilitaire pour importer un fichier CSV.
 */
export async function openCsvFile(): Promise<{ text: string; fileName: string } | null> {
  const win = typeof window !== 'undefined' ? window : null;
  const electronAPI = win && (win as unknown as { electronAPI?: { openFileDialog: (opts?: unknown) => Promise<{ path: string; buffer: Buffer } | null> } }).electronAPI;

  if (electronAPI?.openFileDialog) {
    const result = await electronAPI.openFileDialog({
      filters: [{ name: 'CSV', extensions: ['csv'] }],
      title: 'Importer un fichier CSV référentiel',
    });
    if (result?.buffer) {
      const buf = result.buffer;
      let text: string;
      if (typeof buf === 'string') {
        text = buf;
      } else if (typeof (buf as { toString?: (enc?: string) => string }).toString === 'function') {
        text = (buf as { toString: (enc?: string) => string }).toString('utf-8');
      } else if (buf instanceof ArrayBuffer) {
        text = new TextDecoder('utf-8').decode(buf);
      } else {
        const arr = buf as Uint8Array | { buffer: ArrayBuffer };
        const ab = arr instanceof Uint8Array ? arr.buffer : (arr as { buffer: ArrayBuffer }).buffer;
        text = new TextDecoder('utf-8').decode(ab);
      }
      const fileName = result.path?.split(/[/\\]/).pop() ?? 'referentiel.csv';
      return { text, fileName };
    }
    return null;
  }

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        resolve(text ? { text, fileName: file.name } : null);
      };
      reader.readAsText(file, 'UTF-8');
    };
    input.click();
  });
}

/**
 * Utilitaire pour importer un fichier Excel.
 * Utilise Electron IPC si disponible, sinon input file pour le navigateur.
 */
export async function openExcelFile(): Promise<{ buffer: ArrayBuffer; fileName: string } | null> {
  const win = typeof window !== 'undefined' ? window : null;
  const electronAPI = win && (win as unknown as { electronAPI?: { openFileDialog: (opts?: unknown) => Promise<{ path: string; buffer: Buffer } | null> } }).electronAPI;

  if (electronAPI?.openFileDialog) {
    const result = await electronAPI.openFileDialog({
      filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
      title: 'Importer un fichier Excel',
    });
    if (result?.buffer) {
      const buf = result.buffer;
      const buffer: ArrayBuffer =
        buf instanceof ArrayBuffer
          ? buf
          : (buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
      const fileName = result.path?.split(/[/\\]/).pop() ?? 'import.xlsx';
      return { buffer, fileName };
    }
    return null;
  }

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const buffer = reader.result as ArrayBuffer;
        resolve(buffer ? { buffer, fileName: file.name } : null);
      };
      reader.readAsArrayBuffer(file);
    };
    input.click();
  });
}
