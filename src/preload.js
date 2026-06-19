const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('asrApi', {
  pickAudioFile: () => ipcRenderer.invoke('pick-audio-file'),
  getModels: () => ipcRenderer.invoke('get-models'),
  transcribe: (payload) => ipcRenderer.invoke('run-transcription', payload),
  benchmark: (payload) => ipcRenderer.invoke('run-benchmark', payload),
  saveRecording: (buffer) => ipcRenderer.invoke('save-recording', buffer),
  onProgress: (callback) => {
    ipcRenderer.on('transcription-progress', (_event, message) => {
      callback(message);
    });
  }
});
