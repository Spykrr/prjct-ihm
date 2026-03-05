const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  generateCsvAndRun: (data) => ipcRenderer.invoke('generate-csv-and-run', data),
  autoLoadExcel: () => ipcRenderer.invoke('auto-load-excel'),
  openFileDialog: (options) => ipcRenderer.invoke('open-file-dialog', options),
});
