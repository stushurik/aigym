import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Deliberately its own plugin list (not vite.config.ts's), skipping the
// TanStack Router codegen and PWA plugins: neither is needed to run
// component/unit tests and both add real build-time cost per test run.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/unit/setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    css: true,
  },
});
