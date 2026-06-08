// S9 — Preload mínimo y seguro. Es el ÚNICO puente entre el renderer (app://) y
// el proceso principal, y solo expone la API de ACTUALIZACIONES (electron-updater
// vive en main). Mantiene contextIsolation + sandbox: nada de Node llega al
// renderer; solo las funciones declaradas aquí, vía contextBridge.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('updater', {
  // Busca updates. `autoDownload` indica si main debe descargar al encontrar una.
  check: (autoDownload) => ipcRenderer.invoke('updater:check', { autoDownload: autoDownload === true }),
  // Descarga manual (tras un evento 'available' cuando autoDownload estaba apagado).
  download: () => ipcRenderer.invoke('updater:download'),
  // Cierra la app e instala la versión ya descargada (decisión EXPLÍCITA del usuario).
  install: () => ipcRenderer.invoke('updater:install'),
  // Suscribe a los eventos del updater. Devuelve una función para desuscribirse.
  onEvent: (cb) => {
    const listener = (_e, payload) => cb(payload);
    ipcRenderer.on('updater:event', listener);
    return () => ipcRenderer.removeListener('updater:event', listener);
  },
});
