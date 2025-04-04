import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "eslint-linter-browserify": ["eslint-linter-browserify"],
          prettier: [
            "prettier",
            "prettier/plugins/babel",
            "prettier/plugins/estree",
          ],
        },
      },
    },
  },
  plugins: [react(), tailwindcss(), VitePWA({ registerType: "autoUpdate" })],
});
