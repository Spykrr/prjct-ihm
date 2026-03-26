/**
 * Utilitaire pour importer un fichier CSV.
 */
function toArrayBufferFromIpcPayload(payload: unknown): ArrayBuffer | null {
  if (payload == null) return null;
  if (payload instanceof ArrayBuffer) return payload;

  if (ArrayBuffer.isView(payload)) {
    const view = payload as ArrayBufferView;
    // Copie explicite vers un ArrayBuffer "pur" (evite le cas SharedArrayBuffer en typings TS).
    const copied = new Uint8Array(view.byteLength);
    copied.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
    return copied.buffer;
  }

  if (typeof payload === 'object') {
    const maybeBufferLike = payload as { type?: unknown; data?: unknown; buffer?: unknown; byteOffset?: unknown; byteLength?: unknown };

    if (
      maybeBufferLike.type === 'Buffer' &&
      Array.isArray(maybeBufferLike.data) &&
      maybeBufferLike.data.every((n) => typeof n === 'number')
    ) {
      const u8 = Uint8Array.from(maybeBufferLike.data as number[]);
      return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
    }

    if (maybeBufferLike.buffer instanceof ArrayBuffer) {
      const byteOffset = typeof maybeBufferLike.byteOffset === 'number' ? maybeBufferLike.byteOffset : 0;
      const byteLength = typeof maybeBufferLike.byteLength === 'number'
        ? maybeBufferLike.byteLength
        : maybeBufferLike.buffer.byteLength - byteOffset;
      return maybeBufferLike.buffer.slice(byteOffset, byteOffset + byteLength);
    }
  }

  return null;
}

function decodeTextFromIpcPayload(payload: unknown): string {
  if (typeof payload === 'string') return payload;
  const ab = toArrayBufferFromIpcPayload(payload);
  if (ab) return new TextDecoder('utf-8').decode(ab);
  return String(payload ?? '');
}

export async function openCsvFile(): Promise<{ text: string; fileName: string } | null> {
  const win = typeof window !== 'undefined' ? window : null;
  const electronAPI = win && (win as unknown as { electronAPI?: { openFileDialog: (opts?: unknown) => Promise<{ path: string; buffer: Buffer } | null> } }).electronAPI;

  if (electronAPI?.openFileDialog) {
    const result = await electronAPI.openFileDialog({
      filters: [{ name: 'CSV', extensions: ['csv'] }],
      title: 'Importer un fichier CSV référentiel',
    });
    if (result?.buffer) {
      const text = decodeTextFromIpcPayload(result.buffer);
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
      const buffer = toArrayBufferFromIpcPayload(result.buffer);
      if (!buffer) return null;
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
