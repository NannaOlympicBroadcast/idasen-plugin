const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('idasen', {
  getSavedConfig: () => ipcRenderer.invoke('idasen:get-saved-config'),
  scan: () => ipcRenderer.invoke('idasen:scan'),
  connect: (deskId) => ipcRenderer.invoke('idasen:connect', deskId),
  getStatus: () => ipcRenderer.invoke('idasen:status'),
  moveTo: (heightCm) => ipcRenderer.invoke('idasen:move-to', heightCm),
  moveUp: () => ipcRenderer.invoke('idasen:move-up'),
  moveDown: () => ipcRenderer.invoke('idasen:move-down'),
  stop: () => ipcRenderer.invoke('idasen:stop'),
  addPreset: (name, heightCm) => ipcRenderer.invoke('idasen:preset-add', { name, heightCm }),
  removePreset: (name) => ipcRenderer.invoke('idasen:preset-remove', name),
  gotoPreset: (name) => ipcRenderer.invoke('idasen:preset-goto', name)
});
