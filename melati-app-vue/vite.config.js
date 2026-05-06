import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [vue(), basicSsl()],
  server: {
    https: process.env.VITE_DEV_HTTPS !== "false", // Default HTTPS; set VITE_DEV_HTTPS=false for browser tool access.
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
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ["firebase/app", "firebase/firestore", "firebase/auth", "firebase/storage"],
          vendor: ["vue", "vue-router", "pinia"],
        },
      },
    },
    chunkSizeWarningLimit: 1500,
    reportCompressedSize: false,
  },
});
