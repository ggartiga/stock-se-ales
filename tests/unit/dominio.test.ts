import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { calcularEstadoStock, resumirEstados, esEstadoStock } from "../../src/lib/dominio/stock";
import {
  validarCantidadRetiro,
  validarCantidadNoNegativa,
  validarCodigoSap,
  validarCodigoCorto,
  validarTexto,
  validarCorreo,
  validarContrasena,
  esUuid,
} from "../../src/lib/dominio/validacion";
import { construirUrlQR, interpretarContenidoQR, codigoCortoQR, PREFIJO_QR } from "../../src/lib/dominio/qr";
import { inicioDelDia, rangoDeFechas, esFechaIso, hoyEnZona, formatearFechaHora } from "../../src/lib/dominio/fechas";
import { mensajeDeError, MENSAJE_GENERICO } from "../../src/lib/dominio/errores";
import { rutaInternaSegura, permisos, esRol } from "../../src/lib/dominio/permisos";
import { MAS_ACCIONES, MENU_PRINCIPAL, accesoOpcion } from "../../src/lib/navegacion";

const ID = "c0000000-0000-4000-8000-0000000000a1";

describe("Estado del stock", () => {
  it("sin stock cuando la cantidad es 0", () => {
    assert.equal(calcularEstadoStock(0, 2), "sin_stock");
    assert.equal(calcularEstadoStock(0, 0), "sin_stock");
  });
  it("stock bajo cuando es igual al mínimo", () => assert.equal(calcularEstadoStock(2, 2), "stock_bajo"));
  it("stock bajo cuando es menor al mínimo", () => assert.equal(calcularEstadoStock(1, 5), "stock_bajo"));
  it("disponible cuando supera el mínimo", () => assert.equal(calcularEstadoStock(5, 2), "disponible"));
  it("resume los estados", () => {
    const r = resumirEstados([{ estado_stock: "disponible" }, { estado_stock: "sin_stock" }, { estado_stock: "sin_stock" }]);
    assert.deepEqual(r, { total: 3, disponible: 1, stock_bajo: 0, sin_stock: 2 });
  });
  it("reconoce estados válidos", () => {
    assert.ok(esEstadoStock("stock_bajo"));
    assert.ok(!esEstadoStock("otro"));
  });
});

describe("Validación de retiro", () => {
  it("acepta una cantidad válida", () => assert.deepEqual(validarCantidadRetiro("3", 5), { ok: true, valor: 3 }));
  it("acepta retirar exactamente todo el stock", () => assert.deepEqual(validarCantidadRetiro(5, 5), { ok: true, valor: 5 }));
  it("rechaza vacío", () => assert.equal(validarCantidadRetiro("", 5).ok, false));
  it("rechaza cero", () => {
    const r = validarCantidadRetiro("0", 5);
    assert.equal(r.ok, false);
    assert.match((r as { error: string }).error, /mayor que cero/);
  });
  it("rechaza negativos", () => assert.equal(validarCantidadRetiro("-1", 5).ok, false));
  it("rechaza decimales y texto", () => {
    assert.equal(validarCantidadRetiro("1.5", 5).ok, false);
    assert.equal(validarCantidadRetiro("abc", 5).ok, false);
    assert.equal(validarCantidadRetiro("1e3", 5000).ok, false);
  });
  it("rechaza stock insuficiente (evita stock negativo)", () => {
    const r = validarCantidadRetiro("6", 5);
    assert.equal(r.ok, false);
    assert.match((r as { error: string }).error, /No puede retirar más de lo disponible \(5 unidades\)/);
  });
  it("rechaza cuando no hay stock", () => assert.match((validarCantidadRetiro("1", 0) as { error: string }).error, /no tiene stock/));
  it("cantidades no negativas", () => {
    assert.deepEqual(validarCantidadNoNegativa("", "Mínimo"), { ok: true, valor: 0 });
    assert.deepEqual(validarCantidadNoNegativa("4", "Mínimo"), { ok: true, valor: 4 });
    assert.equal(validarCantidadNoNegativa("-4", "Mínimo").ok, false);
    assert.equal(validarCantidadNoNegativa("99999999", "Mínimo").ok, false);
  });
});

describe("Validación de catálogo", () => {
  it("código SAP", () => {
    assert.deepEqual(validarCodigoSap(" 10000023262 "), { ok: true, valor: "10000023262" });
    assert.equal(validarCodigoSap("").ok, false);
    assert.equal(validarCodigoSap("con espacio").ok, false);
  });
  it("códigos de almacén/ubicación se normalizan a mayúsculas", () => {
    assert.deepEqual(validarCodigoCorto("a1", "Código"), { ok: true, valor: "A1" });
    assert.equal(validarCodigoCorto("A 1", "Código").ok, false);
  });
  it("textos", () => {
    assert.deepEqual(validarTexto("  ", "Descripción", { max: 10 }), { ok: true, valor: null });
    assert.equal(validarTexto("", "Elemento", { max: 10, obligatorio: true }).ok, false);
    assert.equal(validarTexto("12345678901", "Elemento", { max: 10 }).ok, false);
  });
  it("correo", () => {
    assert.deepEqual(validarCorreo(" Juan@Metro.CL "), { ok: true, valor: "juan@metro.cl" });
    assert.equal(validarCorreo("juan").ok, false);
  });
  it("contraseña", () => {
    assert.equal(validarContrasena("corta1", "corta1").ok, false);
    assert.equal(validarContrasena("sololetras", "sololetras").ok, false);
    assert.equal(validarContrasena("Segura2026", "Distinta2026").ok, false);
    assert.equal(validarContrasena("Segura2026", "Segura2026").ok, true);
  });
  it("uuid", () => {
    assert.ok(esUuid(ID));
    assert.ok(!esUuid("A1"));
  });
});

describe("Códigos QR de ubicación", () => {
  it("construye una URL de la app con el identificador único", () => {
    assert.equal(construirUrlQR("https://app.cl/", ID), `https://app.cl/escanear?u=${ID}`);
  });
  it("interpreta la URL generada", () => assert.equal(interpretarContenidoQR(construirUrlQR("https://app.cl", ID)), ID));
  it("interpreta el formato corto y el uuid solo", () => {
    assert.equal(interpretarContenidoQR(`${PREFIJO_QR}${ID}`), ID);
    assert.equal(interpretarContenidoQR(ID.toUpperCase()), ID);
  });
  it("rechaza contenido ajeno", () => {
    assert.equal(interpretarContenidoQR("A1"), null);
    assert.equal(interpretarContenidoQR("https://otro.cl/promo?u=123"), null);
    assert.equal(interpretarContenidoQR("javascript:alert(1)"), null);
    assert.equal(interpretarContenidoQR(`https://app.cl/escanear?u=no-es-uuid`), null);
    assert.equal(interpretarContenidoQR(""), null);
  });
  it("código corto legible", () => assert.equal(codigoCortoQR(ID), "C0000000"));
});

describe("Fechas en America/Santiago", () => {
  const zona = "America/Santiago";
  const fechaLocal = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: zona }).format(d);

  for (const dia of ["2026-11-12", "2026-06-15", "2026-04-05", "2026-09-06", "2026-01-01"]) {
    it(`inicio del día ${dia} es el primer instante local de ese día`, () => {
      const inicio = inicioDelDia(dia, zona);
      assert.equal(fechaLocal(inicio), dia);
      assert.notEqual(fechaLocal(new Date(inicio.getTime() - 1000)), dia);
    });
  }
  it("en verano (UTC−3) el día comienza a las 03:00 UTC", () => {
    assert.equal(inicioDelDia("2026-11-12", zona).toISOString(), "2026-11-12T03:00:00.000Z");
  });
  it("en invierno (UTC−4) el día comienza a las 04:00 UTC", () => {
    assert.equal(inicioDelDia("2026-06-15", zona).toISOString(), "2026-06-15T04:00:00.000Z");
  });
  it("rango incluye completo el día final", () => {
    const r = rangoDeFechas("2026-11-01", "2026-11-12", zona);
    assert.equal(r.error, null);
    assert.equal(r.desde, "2026-11-01T03:00:00.000Z");
    assert.equal(r.hasta, "2026-11-13T03:00:00.000Z");
  });
  it("rango con un solo extremo", () => {
    assert.deepEqual(rangoDeFechas(null, null, zona), { desde: null, hasta: null, error: null });
    assert.equal(rangoDeFechas("2026-11-12", null, zona).hasta, null);
  });
  it("rango invertido o inválido", () => {
    assert.ok(rangoDeFechas("2026-11-12", "2026-11-01", zona).error);
    assert.ok(rangoDeFechas("2026-02-30", null, zona).error);
  });
  it("valida fechas ISO", () => {
    assert.ok(esFechaIso("2026-02-28"));
    assert.ok(!esFechaIso("2026-02-30"));
    assert.ok(!esFechaIso("12/11/2026"));
  });
  it("hoy en la zona", () => assert.equal(hoyEnZona(zona, new Date("2026-11-13T02:30:00Z")), "2026-11-12"));
  it("formatea en es-CL con la hora local", () => {
    assert.match(formatearFechaHora("2026-11-13T01:40:00Z", zona), /12-11-2026.*22:40:00|12\/11\/2026.*22:40:00/);
  });
});

describe("Mensajes de error", () => {
  it("usa el mensaje de la base de datos para códigos propios", () => {
    assert.equal(
      mensajeDeError({ hint: "STOCK_INSUFICIENTE", message: "Stock insuficiente: hay 1", code: "23514" }),
      "Stock insuficiente: hay 1",
    );
  });
  it("traduce SQLSTATE conocidos", () => {
    assert.match(mensajeDeError({ code: "42501", message: "permission denied for table productos" }), /permisos/);
  });
  it("no expone mensajes técnicos desconocidos", () => {
    assert.equal(mensajeDeError({ code: "XX000", message: "internal: relation x" }), MENSAJE_GENERICO);
  });
  it("detecta errores de red", () => assert.match(mensajeDeError(new Error("Failed to fetch")), /Sin conexión/));
  it("credenciales", () => assert.match(mensajeDeError({ message: "Invalid login credentials" }), /incorrectos/));
});

describe("Permisos y navegación", () => {
  it("redirecciones sólo internas", () => {
    assert.equal(rutaInternaSegura("/historial?desde=2026-11-01"), "/historial?desde=2026-11-01");
    assert.equal(rutaInternaSegura("//malicioso.com"), "/inventario");
    assert.equal(rutaInternaSegura("https://malicioso.com"), "/inventario");
    assert.equal(rutaInternaSegura("/\\malicioso.com"), "/inventario");
    assert.equal(rutaInternaSegura(null), "/inventario");
    assert.equal(rutaInternaSegura("/login"), "/inventario");
  });
  it("roles", () => {
    assert.ok(permisos.administrarInventario("administrador"));
    assert.ok(!permisos.administrarInventario("supervisor"));
    assert.ok(permisos.verHistorialCompleto("supervisor"));
    assert.ok(!permisos.verHistorialCompleto("trabajador"));
    assert.ok(permisos.retirar("trabajador"));
    assert.ok(esRol("supervisor") && !esRol("root"));
  });
  it("el menú principal tiene Inventario, Historial y Más acciones", () => {
    const titulos = MENU_PRINCIPAL.map((o) => o.titulo);
    for (const t of ["Inventario", "Historial de movimientos", "Más acciones"]) assert.ok(titulos.includes(t));
  });
  it("las opciones pendientes no tienen enlace (sin botones ficticios)", () => {
    for (const o of MAS_ACCIONES) {
      if (o.estado === "pendiente") assert.equal(o.href, null, o.titulo);
      else assert.ok(o.href, o.titulo);
    }
  });
  it("las opciones administrativas quedan restringidas para trabajadores", () => {
    const productos = MAS_ACCIONES.find((o) => o.id === "productos")!;
    assert.equal(accesoOpcion(productos, "trabajador"), "restringido");
    assert.equal(accesoOpcion(productos, "administrador"), "permitido");
    const ingreso = MAS_ACCIONES.find((o) => o.id === "ingreso")!;
    assert.equal(accesoOpcion(ingreso, "administrador"), "pendiente");
  });
});
