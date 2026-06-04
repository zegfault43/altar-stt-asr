const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('asrApi', {
  pickAudioFile: () => ipcRenderer.invoke('pick-audio-file'),
  getModels: () => ipcRenderer.invoke('get-models'),
  transcribe: (payload) => ipcRenderer.invoke('run-transcription', payload),
  benchmark: (payload) => ipcRenderer.invoke('run-benchmark', payload)
});
