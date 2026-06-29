const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: () => true,
  getPrinters: () => ipcRenderer.invoke("get-printers"),
  print: (type, payload, printerName) => ipcRenderer.invoke("print-job", { type, payload, printerName }),
  panggilAntreanDim: (duration) => ipcRenderer.invoke("duck-audio", duration),
  panggilAntreanUnduck: () => ipcRenderer.invoke("unduck-audio")
});
