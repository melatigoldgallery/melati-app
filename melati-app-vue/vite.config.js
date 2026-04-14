import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [vue(), basicSsl()],
  server: {
    https: true, // Enables HTTPS on localhost — required for reliable camera (getUserMedia) access.
    // Chrome blocks camera on a per-origin basis. Switching from http://localhost:5173
    // to https://localhost:5173 creates a fresh origin and prompts for permission correctly.
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  optimizeDeps: {
    include: ["firebase/app", "firebase/firestore", "firebase/database", "firebase/storage", "firebase/auth"],
  },
});
