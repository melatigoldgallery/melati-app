import { createApp } from "vue";
import { createPinia } from "pinia";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "bootstrap";
import App from "./App.vue";
import router from "./router";
import "./assets/css/main.css";
import {
  applyThemeAppearanceToDocument,
  ensureThemeAppearanceSettings,
  fetchThemeAppearanceSettings,
  subscribeThemeAppearanceSettings,
} from "@/services/theme-settings-service";

async function initThemeAppearance() {
  try {
    const settings = await fetchThemeAppearanceSettings();
    applyThemeAppearanceToDocument(settings);
  } catch (error) {
    console.warn("Theme appearance settings not loaded, using default CSS variables.", error);
  }

  subscribeThemeAppearanceSettings(
    (settings) => {
      applyThemeAppearanceToDocument(settings);
    },
    (error) => {
      console.warn("Theme appearance live update failed.", error);
    },
  );

  ensureThemeAppearanceSettings().catch((error) => {
    console.warn("Theme appearance defaults cannot be ensured.", error);
  });
}

async function bootstrap() {
  const pinia = createPinia();
  const app = createApp(App);

  app.use(pinia);
  app.use(router);

  initThemeAppearance();

  // Tunggu resolusi navigasi awal agar layout tidak sempat menampilkan sidebar sebelum guard redirect.
  await router.isReady();
  app.mount("#app");
}

bootstrap();
