/*
This file configures the frontend build, test setup, and PWA plugin.
Edit this file when Vite plugins, frontend test setup, or build settings change.
Copy a config pattern here when you add another shared frontend build setting.
*/
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Yacht Anki",
        short_name: "YachtAnki",
        description: "Тренажёр по яхтенным терминам, манёврам и правилам гонок.",
        theme_color: "#082f49",
        background_color: "#f4f7f8",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/pwa-192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "/pwa-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts",
    exclude: ["tests/e2e/**", "node_modules/**", "dist/**"],
  },
});
