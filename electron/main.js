import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow = null;
let loadingWindow = null;

const getConfig = () => {
  const configPath = path.join(app.getAppPath(), 'config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  return config;
};

const createLoadingWindow = () => {
  loadingWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
  });
  loadingWindow.loadFile(path.join(app.getAppPath(), 'loading.html'));
  loadingWindow.on('closed', () => { loadingWindow = null; });
};

const createMainWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
  });

  const distPath = path.join(app.getAppPath(), 'packages', 'ui', 'dist', 'index.html');
  const distExists = fs.existsSync(distPath);
  const isDev = process.env.NODE_ENV === 'development' || (!app.isPackaged && !distExists);

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(distPath);
  }

  mainWindow.once('ready-to-show', () => {
    if (loadingWindow) loadingWindow.close();
    mainWindow.show();
  });

  mainWindow.on('closed', () => { mainWindow = null; });
};

app.whenReady().then(() => {
  createLoadingWindow();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC: generate-csv-and-run
ipcMain.handle('generate-csv-and-run', async (event, { nomFichier, feuille, excelBuffer }) => {
  const config = getConfig();
  const testsDir = path.resolve(app.getAppPath(), config.PATH_TO_TESTS_FILES);
  const refLogDir = path.resolve(app.getAppPath(), config.FOLDER_REF_AND_LOG_TEMP);
  const batPath = path.resolve(app.getAppPath(), config.PATH_TO_UPTEST_BAT);

  try {
    if (!fs.existsSync(testsDir)) fs.mkdirSync(testsDir, { recursive: true });
    if (!fs.existsSync(refLogDir)) fs.mkdirSync(refLogDir, { recursive: true });

    const nomSansExtension = nomFichier.replace(/\.[^/.]+$/, '');
    const tempFileName = `${config.SUFFIX_TEST_FILES_TEMP}_${nomFichier}`;
    const excelPath = path.join(testsDir, tempFileName);

    fs.writeFileSync(excelPath, Buffer.from(excelBuffer));

    const timestamp = Date.now();
    const csvPath = path.join(refLogDir, `referentiel_temp_${timestamp}.csv`);
    const header = 'Actif;Instance;OrdreModule;Module;ordreOption;Option;Libelle;Predecesseur;Param1;Param2;Param3;Param4;Param5;Param6;Param7;Param8;Param9;Param10;';
    const line = `O;Inst01;00500;${nomSansExtension};130;${feuille};N;;;;;;;`;
    fs.writeFileSync(csvPath, header + '\n' + line + '\n', 'utf-8');

    const env = { ...process.env, PYTHONIOENCODING: 'utf-8' };
    const child = spawn(batPath, [excelPath], { shell: true, env });

    return new Promise((resolve) => {
      child.on('close', (code) => {
        try {
          const tempFiles = fs.readdirSync(testsDir).filter(f => f.startsWith(config.SUFFIX_TEST_FILES_TEMP));
          tempFiles.forEach(f => fs.unlinkSync(path.join(testsDir, f)));
          if (fs.existsSync(refLogDir)) fs.rmSync(refLogDir, { recursive: true });
        } catch (e) { /* ignore */ }
        resolve({ success: code === 0, code });
      });
    });
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: auto-load-excel (CLI --source-file)
ipcMain.handle('auto-load-excel', async () => {
  const file = process.argv.find(a => a.startsWith('--source-file='));
  if (file) {
    const filePath = file.split('=')[1];
    if (fs.existsSync(filePath)) {
      return { path: filePath, buffer: fs.readFileSync(filePath) };
    }
  }
  return null;
});

// IPC: open-file-dialog
ipcMain.handle('open-file-dialog', async (event, { filters, title }) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: title || 'Ouvrir un fichier',
    filters: filters || [{ name: 'Fichiers', extensions: ['xlsx', 'xls', 'csv', 'json'] }],
    properties: ['openFile'],
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    return { path: filePath, buffer: fs.readFileSync(filePath) };
  }
  return null;
});
