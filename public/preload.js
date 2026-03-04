const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    selectFolder: () => ipcRenderer.invoke('select-dirs'),
    saveBackup: (folder, data) => ipcRenderer.invoke('save-backup', folder, data)
});
