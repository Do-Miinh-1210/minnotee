const { contextBridge, ipcRenderer } = require('electron');

try {
  contextBridge.exposeInMainWorld('minnoteNative', {
    platform: process.platform,
    version: '0.6.2',
    isElectron: true,
    postMessage: (data) => {
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (_) {}
      }
      if (data && data.type) {
        ipcRenderer.send(data.type, data);
      }
    }
  });

  ipcRenderer.on('MINDMAP_CAPTURED', (event, data) => {
    window.postMessage(data, '*');
  });
} catch (e) {
  console.error('Preload expose error:', e);
}

