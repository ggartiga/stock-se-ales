import { expect, type Page } from "@playwright/test";

export const TRABAJADOR = {
  correo: process.env.E2E_TRABAJADOR_CORREO ?? "trabajador.prueba@stock-senales.test",
  clave: process.env.E2E_TRABAJADOR_CLAVE ?? "Prueba#2026",
  nombre: "Tomás Trabajador (PRUEBA)",
};
export const ADMIN = {
  correo: process.env.E2E_ADMIN_CORREO ?? "admin.prueba@stock-senales.test",
  clave: process.env.E2E_ADMIN_CLAVE ?? "Prueba#2026",
};

/** Identificadores QR fijos del seed (supabase/seed.sql) */
export const QR = {
  LF_A1: "c0000000-0000-4000-8000-0000000000a1",
  LF_A2: "c0000000-0000-4000-8000-0000000000a2",
  SEAT_A1: "c0000000-0000-4000-8000-0000000002a1",
};

export async function ingresar(page: Page, usuario: { correo: string; clave: string }) {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(usuario.correo);
  await page.getByLabel("Contraseña").fill(usuario.clave);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/inventario/);
}

/** Número mostrado como "Stock actual" en la tarjeta de un elemento. */
export async function stockEnTarjeta(page: Page, elemento: string) {
  const tarjeta = page.getByRole("article").filter({ has: page.getByRole("heading", { name: elemento, exact: true }) }).first();
  const texto = await tarjeta.locator("dt:has-text('Stock actual') + dd").innerText();
  return Number(texto.trim());
}
