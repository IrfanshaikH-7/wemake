const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getSources: () => ipcRenderer.invoke('get-sources'),
  moveMouse: (x, y) => ipcRenderer.invoke('move-mouse', x, y),
  mouseClick: () => ipcRenderer.invoke('mouse-click'),
  mouseRightClick: () => ipcRenderer.invoke('mouse-right-click'),
  mouseDoubleClick: () => ipcRenderer.invoke('mouse-double-click'),
  typeKey: (key) => ipcRenderer.invoke('type-key', key),
  pressKeyCombo: (keys) => ipcRenderer.invoke('press-key-combo', keys)
}); 