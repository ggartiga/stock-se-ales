import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env.local" });

/**
 * Pruebas end-to-end contra la app en ejecución + Supabase local con el seed.
 * Preparación: `npx supabase db reset && npm run usuarios:prueba && npm run dev`
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "es-CL",
    timezoneId: "America/Santiago",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "android", use: { ...devices["Pixel 7"] } },
    { name: "iphone", use: { ...devices["iPhone 14"] } },
    { name: "escritorio", use: { ...devices["Desktop Chrome"] } },
  ],
});
