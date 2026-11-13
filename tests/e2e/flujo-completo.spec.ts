import { test, expect } from "@playwright/test";
import { ADMIN, QR, TRABAJADOR, ingresar, stockEnTarjeta } from "./ayudantes";

test.describe("Autenticación", () => {
  test("sin sesión redirige al login", async ({ page }) => {
    await page.goto("/historial");
    await expect(page).toHaveURL(/\/login\?siguiente=%2Fhistorial/);
  });

  test("credenciales incorrectas muestran un error claro", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Correo electrónico").fill(TRABAJADOR.correo);
    await page.getByLabel("Contraseña").fill("incorrecta123");
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page.getByText("Correo o contraseña incorrectos.")).toBeVisible();
  });

  test("ingreso correcto lleva al inventario", async ({ page }) => {
    await ingresar(page, TRABAJADOR);
    await expect(page.getByRole("heading", { name: "STOCK SEÑALES" })).toBeVisible();
  });
});

test.describe("Inventario", () => {
  test.beforeEach(async ({ page }) => ingresar(page, TRABAJADOR));

  test("muestra tarjetas con estado, stock y botón RETIRAR", async ({ page }) => {
    const tarjeta = page.getByRole("article").filter({ hasText: "Lámpara LED de señal" });
    await expect(tarjeta.getByText("Stock bajo")).toBeVisible();
    await expect(tarjeta.getByRole("button", { name: "RETIRAR" })).toBeEnabled();
    const sinStock = page.getByRole("article").filter({ hasText: "Soporte de acero" });
    await expect(sinStock.getByRole("button", { name: "SIN STOCK" })).toBeDisabled();
  });

  test("búsqueda por código SAP", async ({ page }) => {
    await page.getByRole("radio", { name: "Código SAP" }).click();
    await page.getByLabel("Buscar", { exact: true }).fill("10000023262");
    await expect(page).toHaveURL(/q=10000023262/);
    await expect(page.getByRole("article")).toHaveCount(2);
  });

  test("búsqueda por elemento y por descripción", async ({ page }) => {
    await page.getByLabel("Buscar", { exact: true }).fill("embrague");
    await expect(page.getByRole("article")).toHaveCount(1);
    await page.getByRole("radio", { name: "Descripción" }).click();
    await page.getByLabel("Buscar", { exact: true }).fill("galvanizado");
    await expect(page.getByRole("article").filter({ hasText: "Soporte de acero" })).toBeVisible();
  });

  test("filtro por estado desde el panel de indicadores", async ({ page }) => {
    await page.getByRole("link", { name: /Sin stock/ }).click();
    await expect(page).toHaveURL(/estado=sin_stock/);
    await expect(page.getByRole("article")).toHaveCount(1);
  });
});

test.describe("QR por rack", () => {
  test.beforeEach(async ({ page }) => ingresar(page, TRABAJADOR));

  test("QR A1 muestra sólo sus productos y A2 reemplaza el filtro", async ({ page }) => {
    await page.goto(`/escanear?u=${QR.LF_A1}`);
    await expect(page.getByRole("heading", { name: /Ubicación A1/ })).toBeVisible();
    const nombres = await page.getByRole("article").getByRole("heading").allInnerTexts();
    expect(nombres.sort()).toEqual(["Controlador VCC", "Embrague", "Soporte de acero"]);

    await page.goto(`/escanear?u=${QR.LF_A2}`);
    const nombresA2 = await page.getByRole("article").getByRole("heading").allInnerTexts();
    expect(nombresA2.sort()).toEqual(["Lámpara LED de señal", "Relé de vía"]);
  });

  test("A1 de otro almacén no se confunde", async ({ page }) => {
    await page.goto(`/escanear?u=${QR.SEAT_A1}`);
    await expect(page.getByText(/Almacén SEAT/)).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(1);
  });

  test("QR desconocido muestra un error y vuelve a ofrecer el lector", async ({ page }) => {
    await page.goto("/escanear?u=00000000-0000-4000-8000-000000000000");
    await expect(page.getByText(/no corresponde a ninguna ubicación/)).toBeVisible();
  });
});

test.describe("Retiro y trazabilidad", () => {
  test.beforeEach(async ({ page }) => ingresar(page, TRABAJADOR));

  test("valida cantidad, confirma, descuenta y registra en el historial", async ({ page }) => {
    await page.goto(`/escanear?u=${QR.LF_A2}`);
    const antes = await stockEnTarjeta(page, "Relé de vía");

    const tarjeta = page.getByRole("article").filter({ hasText: "Relé de vía" });
    await tarjeta.getByRole("button", { name: "RETIRAR" }).click();
    const dialogo = page.getByRole("dialog");

    // Más de lo disponible
    await dialogo.getByLabel("Cantidad a retirar").fill(String(antes + 1));
    await dialogo.getByRole("button", { name: "Continuar" }).click();
    await expect(dialogo.getByText(/No puede retirar más de lo disponible/)).toBeVisible();

    // Cero
    await dialogo.getByLabel("Cantidad a retirar").fill("0");
    await dialogo.getByRole("button", { name: "Continuar" }).click();
    await expect(dialogo.getByText(/mayor que cero/)).toBeVisible();

    // Válido + confirmación (doble clic no debe duplicar)
    await dialogo.getByLabel("Cantidad a retirar").fill("1");
    await dialogo.getByRole("button", { name: "Continuar" }).click();
    await expect(dialogo.getByText("¿Confirma el retiro?")).toBeVisible();
    await dialogo.getByRole("button", { name: "CONFIRMAR RETIRO" }).dblclick();
    await expect(dialogo.getByText(`Stock anterior ${antes}`)).toBeVisible();
    await dialogo.getByRole("button", { name: "Volver al inventario" }).click();

    await expect.poll(() => stockEnTarjeta(page, "Relé de vía")).toBe(antes - 1);

    await page.goto("/historial");
    const primero = page.getByText("Relé de vía").first();
    await expect(primero).toBeVisible();
    await expect(page.getByText(TRABAJADOR.nombre).first()).toBeVisible();
    await expect(page.getByText(TRABAJADOR.correo).first()).toBeVisible();
  });
});

test.describe("Permisos", () => {
  test("un trabajador no accede a la administración", async ({ page }) => {
    await ingresar(page, TRABAJADOR);
    await page.goto("/admin/productos");
    await expect(page).toHaveURL(/aviso=sin-permiso/);
    await page.goto("/mas-acciones");
    await expect(page.getByText("Restringido").first()).toBeVisible();
    await expect(page.getByText("Próximamente").first()).toBeVisible();
  });

  test("un administrador crea y elimina un producto", async ({ page }) => {
    await ingresar(page, ADMIN);
    await page.goto("/admin/productos/nuevo");
    const sap = `PRB-E2E-${Date.now()}`;
    await page.getByLabel("Código SAP").fill(sap);
    await page.getByLabel("Elemento").fill("Producto e2e");
    await page.getByLabel("Almacén").selectOption({ label: "Almacén LF [PRUEBA]" });
    await page.getByLabel("Ubicación").selectOption({ label: "A3 — Rack A, nivel 3" });
    await page.getByLabel("Stock inicial").fill("4");
    await page.getByRole("button", { name: "Crear producto" }).click();
    await expect(page.getByText("Producto creado correctamente.")).toBeVisible();

    await page.getByRole("button", { name: "Eliminar producto" }).click();
    await page.getByLabel(/Escriba ELIMINAR/).fill("ELIMINAR");
    await page.getByRole("dialog").getByRole("button", { name: "Eliminar" }).click();
    // Tenía stock inicial (movimiento INGRESO) => se archiva, no se pierde el historial
    await expect(page.getByText(/se archivó para conservar el historial/)).toBeVisible();
  });
});
