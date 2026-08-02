const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: () => true,
  getPrinters: () => ipcRenderer.invoke("get-printers"),
  print: (type, payload, printerName) => ipcRenderer.invoke("print-job", { type, payload, printerName }),
  panggilAntreanDim: (duration) => ipcRenderer.invoke("duck-audio", duration),
  panggilAntreanUnduck: () => ipcRenderer.invoke("unduck-audio"),
  getGoogleTTS: (text) => ipcRenderer.invoke("get-google-tts", text),
  toggleMenuBar: () => ipcRenderer.invoke("toggle-menu-bar"),
  getNativeConfig: () => ipcRenderer.invoke("get-native-config"),
  saveNativeConfigKey: (key, value) => ipcRenderer.send("save-native-config-key", { key, value })
});
