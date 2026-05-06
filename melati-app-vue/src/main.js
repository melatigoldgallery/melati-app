import { createApp } from "vue";
import { createPinia } from "pinia";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "bootstrap";
import App from "./App.vue";
import router from "./router";
import "./assets/css/main.css";

async function bootstrap() {
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
