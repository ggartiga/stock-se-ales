import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parsearFiltrosInventario,
  serializarFiltros,
  hayFiltrosActivos,
  parsearFiltrosHistorial,
  serializarFiltrosHistorial,
  textoSeguroParaIlike,
} from "../../src/lib/filtros";

const UUID = "a0000000-0000-4000-8000-000000000001";

describe("Filtros de inventario (URL)", () => {
  it("valores por defecto", () => {
    assert.deepEqual(parsearFiltrosInventario({}), { q: "", campo: "todo", almacen: null, ubicacion: null, estado: null });
  });
  it("acepta filtros válidos", () => {
    const f = parsearFiltrosInventario({ q: " embrague ", campo: "elemento", almacen: UUID, ubicacion: UUID, estado: "stock_bajo" });
    assert.deepEqual(f, { q: "embrague", campo: "elemento", almacen: UUID, ubicacion: UUID, estado: "stock_bajo" });
  });
  it("descarta valores manipulados", () => {
    const f = parsearFiltrosInventario({ campo: "drop table", almacen: "1 or 1=1", estado: "todo", q: "x".repeat(500) });
    assert.equal(f.campo, "todo");
    assert.equal(f.almacen, null);
    assert.equal(f.estado, null);
    assert.equal(f.q.length, 100);
  });
  it("toma el primer valor si se repite el parámetro", () => {
    assert.equal(parsearFiltrosInventario({ q: ["uno", "dos"] }).q, "uno");
  });
  it("serializa omitiendo valores por defecto", () => {
    assert.equal(serializarFiltros({ q: "", campo: "todo" }), "");
    assert.equal(serializarFiltros({ q: "vcc", campo: "sap", estado: "sin_stock" }), "?q=vcc&campo=sap&estado=sin_stock");
  });
  it("detecta filtros activos", () => {
    assert.ok(!hayFiltrosActivos(parsearFiltrosInventario({})));
    assert.ok(hayFiltrosActivos(parsearFiltrosInventario({ estado: "sin_stock" })));
  });
});

describe("Filtros de historial (URL)", () => {
  it("fechas, tipo y página", () => {
    const f = parsearFiltrosHistorial({ desde: "2026-11-01", hasta: "2026-11-12", tipo: "RETIRO", pagina: "3" });
    assert.deepEqual(f, { desde: "2026-11-01", hasta: "2026-11-12", tipo: "RETIRO", q: "", pagina: 3 });
  });
  it("descarta valores inválidos", () => {
    const f = parsearFiltrosHistorial({ desde: "ayer", tipo: "BORRAR", pagina: "-5" });
    assert.deepEqual(f, { desde: null, hasta: null, tipo: null, q: "", pagina: 1 });
  });
  it("serializa", () => {
    assert.equal(serializarFiltrosHistorial({ desde: "2026-11-01", pagina: 1 }), "?desde=2026-11-01");
    assert.equal(serializarFiltrosHistorial({ tipo: "RETIRO", pagina: 2 }), "?tipo=RETIRO&pagina=2");
  });
});

describe("Texto seguro para filtros PostgREST", () => {
  it("elimina caracteres sintácticos que podrían alterar el filtro or()", () => {
    assert.equal(textoSeguroParaIlike("vcc,codigo_sap.eq.1"), "vcc codigo\\_sap.eq.1");
    assert.equal(textoSeguroParaIlike("a(b)c"), "a b c");
    assert.equal(textoSeguroParaIlike("\"x\""), "x");
  });
  it("escapa comodines", () => {
    assert.equal(textoSeguroParaIlike("50%"), "50\\%");
    assert.equal(textoSeguroParaIlike("*"), "");
  });
});
