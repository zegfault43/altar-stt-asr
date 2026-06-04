const path = require('path');
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { getModelCatalog } = require('./core/models');
const { runAsrModel } = require('./core/asr');
const { benchmarkModel } = require('./core/benchmark');

function createWindow() {
  const window = new BrowserWindow({
    width: 1024,
    height: 760,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  window.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  ipcMain.handle('pick-audio-file', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Audio', extensions: ['wav', 'mp3', 'm4a', 'flac'] }]
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('get-models', async () => Object.values(getModelCatalog()));

  ipcMain.handle('run-transcription', async (_event, payload) => runAsrModel(payload));

  ipcMain.handle('run-benchmark', async (_event, payload) => benchmarkModel(payload));

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
