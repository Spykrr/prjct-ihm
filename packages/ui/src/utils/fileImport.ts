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
