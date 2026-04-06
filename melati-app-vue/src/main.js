import { createApp } from "vue";
import { createPinia } from "pinia";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "bootstrap";
import App from "./App.vue";
import router from "./router";
import "./assets/css/main.css";

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);
app.use(router);

app.mount("#app");
