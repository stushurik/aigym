import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts",
    }),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/pwa-icon.svg"],
      manifest: {
        name: "AIGYM",
        short_name: "AIGYM",
        description: "AI-assisted workout builder and tracker",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "icons/pwa-icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: {
        // App-shell precache; per-route/API runtime caching is layered on top
        // in src/lib/offlineCache.ts (research.md §2) once workout data needs
        // to survive a fully offline cold start.
        globPatterns: ["**/*.{js,css,html,svg}"],
      },
    }),
  ],
});
