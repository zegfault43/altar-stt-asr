const path = require('path');
const fs = require('fs-extra');
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
      filters: [
        {
          name: 'Audio',
          extensions: ['wav', 'mp3', 'm4a', 'flac', 'webm']
        }
      ]
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('get-models', async () => {
    return Object.values(getModelCatalog());
  });

  ipcMain.handle('run-transcription', async (event, payload) => {
    const progressCallback = (message) => {
      event.sender.send('transcription-progress', message);
    };
    return runAsrModel({ ...payload, progressCallback });
  });

  ipcMain.handle('run-benchmark', async (event, payload) => {
    const progressCallback = (message) => {
      event.sender.send('transcription-progress', message);
    };
    return benchmarkModel({ ...payload, progressCallback });
  });

  ipcMain.handle('save-recording', async (_event, buffer) => {
    const outputDir = path.join(process.cwd(), 'output');
    await fs.ensureDir(outputDir);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `recording-${timestamp}.webm`;
    const filePath = path.join(outputDir, filename);

    await fs.writeFile(filePath, buffer);
    return filePath;
  });

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
