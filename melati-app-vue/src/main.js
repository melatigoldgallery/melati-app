import { createApp } from "vue";
import { createPinia } from "pinia";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "bootstrap";
import App from "./App.vue";
import router from "./router";
import "./assets/css/main.css";

// Hydrate & Dual-Sync localStorage dengan Native Electron Config Store jika berjalan di Electron
async function initElectronStorage() {
  if (typeof window !== "undefined" && window.electronAPI?.getNativeConfig) {
    try {
      const nativeConfig = await window.electronAPI.getNativeConfig();
      if (nativeConfig && typeof nativeConfig === "object") {
        Object.keys(nativeConfig).forEach((key) => {
          if (nativeConfig[key] !== null && nativeConfig[key] !== undefined) {
            localStorage.setItem(key, String(nativeConfig[key]));
          }
        });
      }
    } catch (err) {
      console.warn("Gagal melakukan hydration native config:", err);
    }

    // Intercept localStorage.setItem & localStorage.removeItem untuk backup otomatis ke user-config.json
    const originalSetItem = localStorage.setItem.bind(localStorage);
    const originalRemoveItem = localStorage.removeItem.bind(localStorage);

    localStorage.setItem = function (key, value) {
      originalSetItem(key, value);
      try {
        window.electronAPI.saveNativeConfigKey(key, value);
      } catch (_) {}
    };

    localStorage.removeItem = function (key) {
      originalRemoveItem(key);
      try {
        window.electronAPI.saveNativeConfigKey(key, null);
      } catch (_) {}
    };
  }
}

async function bootstrap() {
  await initElectronStorage();

  const pinia = createPinia();
  const app = createApp(App);

  app.use(pinia);
  app.use(router);

  // Tunggu resolusi navigasi awal agar layout tidak sempat menampilkan sidebar sebelum guard redirect.
  // Theme loading dipindahkan ke DefaultLayout.vue (setelah user login + floor dipilih)
  await router.isReady();
  app.mount("#app");
}

bootstrap();
