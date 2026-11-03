import test from "node:test";
import assert from "node:assert/strict";

import {
  aPares,
  diaDe,
  formatearPorcentaje,
  resumenDecisiones,
  resumenIncidencias,
  resumenLogs,
  resumenPedidos,
  resumenProductos,
  seriePorDia,
  tasaConversion,
  tiempoMedioResolucion,
} from "../metricas.js";

test("resumenPedidos suma importes y agrupa por estado y dÃ­a", () => {
  const resumen = resumenPedidos([
    { total: 100, estado: "pagado", fecha: "2026-11-01T10:00:00Z" },
    { total: "50.5", estado: "pagado", fecha: "2026-11-01T18:00:00Z" },
    { total: null, estado: "cancelado", fecha: "2026-11-02" },
    { total: 20, estado: "", fecha: "no es una fecha" },
  ]);

  assert.equal(resumen.total, 4);
  assert.equal(resumen.importe, 170.5);
  assert.deepEqual({ ...resumen.porEstado }, {
    pagado: 2,
    cancelado: 1,
    sin_estado: 1,
  });
  assert.deepEqual({ ...resumen.porDia }, { "2026-11-01": 2, "2026-11-02": 1 });
});

test("resumenPedidos tolera listas que no son listas", () => {
  assert.deepEqual(resumenPedidos(null), {
  total: 0, importe: 0,
  porEstado: Object.create(null),
  porDia: Object.create(null),
});
});

test("resumenIncidencias cuenta como abiertas las que no estÃ¡n cerradas", () => {
  const resumen = resumenIncidencias([
    { estado: "abierta", prioridad: "alta" },
    { estado: "en_revision", prioridad: "alta" },
    { estado: "cerrada", prioridad: "media" },
    { estado: "resuelta", prioridad: null },
  ]);

  assert.equal(resumen.total, 4);
  assert.equal(resumen.abiertas, 2);
  assert.deepEqual({ ...resumen.porPrioridad }, {
    alta: 2,
    media: 1,
    sin_prioridad: 1,
  });
});

test("resumenLogs calcula tasa de Ã©xito, duplicados y latencia", () => {
  const resumen = resumenLogs([
    { resultado: "correcto", detalle: "ok", duracion_ms: 100 },
    { resultado: "correcto", detalle: "duplicado ignorado", duracion_ms: 50 },
    { resultado: "error", detalle: "sin email", codigo_error: "CAMPO" },
    { resultado: "error", detalle: "timeout", codigo_error: "CAMPO" },
    { resultado: "error", detalle: "sin respuesta", codigo_error: "TIMEOUT" },
    { resultado: null, detalle: null, duracion_ms: null },
  ]);

  assert.equal(resumen.total, 6);
  assert.equal(resumen.correctos, 2);
  assert.equal(resumen.fallidos, 3);
  assert.equal(resumen.tasaExito, (2 / 5) * 100);
  assert.equal(resumen.duplicados, 1);
  assert.deepEqual({ ...resumen.erroresPorTipo }, { CAMPO: 2, TIMEOUT: 1 });
  assert.equal(resumen.latenciaMedia, 75);
  assert.equal(resumen.conDuracion, 2);
});

test("la latencia es null si ningÃºn evento la registra", () => {
  const resumen = resumenLogs([
    { resultado: "correcto", duracion_ms: null },
    { resultado: "correcto" },
  ]);

  assert.equal(resumen.latenciaMedia, null);
  assert.equal(resumen.conDuracion, 0);
});

test("resumenDecisiones separa aprobadas, rechazadas y pendientes", () => {
  const resumen = resumenDecisiones([
    { estado: "aprobado", prioridad: "alta" },
    { estado: "aprobado", prioridad: "media" },
    { estado: "rechazado", prioridad: "baja" },
    { estado: "pendiente", prioridad: "alta" },
  ]);

  assert.equal(resumen.total, 4);
  assert.equal(resumen.aprobadas, 2);
  assert.equal(resumen.rechazadas, 1);
  assert.equal(resumen.pendientes, 1);
  assert.equal(resumen.tasaAprobacion, (2 / 3) * 100);
});

test("la tasa de aprobaciÃ³n es null si no hay decisiones revisadas", () => {
  const resumen = resumenDecisiones([{ estado: "pendiente" }]);
  assert.equal(resumen.tasaAprobacion, null);
});

test("seriePorDia rellena con ceros los dÃ­as sin pedidos", () => {
  const hoy = new Date().toISOString().slice(0, 10);
  const serie = seriePorDia({ [hoy]: 3 }, 5);

  assert.equal(serie.length, 5);
  assert.equal(serie.at(-1).dia, hoy);
  assert.equal(serie.at(-1).valor, 3);
  assert.equal(serie[0].valor, 0);
});

test("aPares ordena de mayor a menor", () => {
  assert.deepEqual(aPares({ b: 2, a: 5, c: 1 }), [
    { clave: "a", valor: 5 },
    { clave: "b", valor: 2 },
    { clave: "c", valor: 1 },
  ]);
});

test("diaDe acepta ISO y rechaza basura", () => {
  assert.equal(diaDe("2026-11-03T10:00:00Z"), "2026-11-03");
  assert.equal(diaDe("2026-11-03"), "2026-11-03");
  assert.equal(diaDe("03/11/2026"), null);
  assert.equal(diaDe(null), null);
});

test("formatearPorcentaje distingue cero de sin datos", () => {
  assert.equal(formatearPorcentaje(0), "0,0 %");
  assert.equal(formatearPorcentaje(null), "—");
});
test("resumenProductos agrega y ordena por unidades", () => {
  const resumen = resumenProductos([
    { producto: "Camiseta Eren", unidades: 4, pedidos: 2 },
    { producto: "Figura Naruto", unidades: "10", pedidos: 3 },
    { producto: "  ", unidades: null, pedidos: 0 },
  ]);

  assert.deepEqual(resumen, [
    { producto: "Figura Naruto", unidades: 10, pedidos: 3 },
    { producto: "Camiseta Eren", unidades: 4, pedidos: 2 },
    { producto: "sin_nombre", unidades: 0, pedidos: 0 },
  ]);
});

test("resumenProductos tolera listas que no son listas", () => {
  assert.deepEqual(resumenProductos(null), []);
  assert.deepEqual(resumenProductos(undefined), []);
});

test("tiempoMedioResolucion devuelve ms o null", () => {
  assert.equal(tiempoMedioResolucion({ media_ms: 120000, cerradas: 3 }), 120000);
  assert.equal(tiempoMedioResolucion({ media_ms: null, cerradas: 0 }), null);
  assert.equal(tiempoMedioResolucion({}), null);
  assert.equal(tiempoMedioResolucion(null), null);
});

test("tasaConversion calcula pedidos creados entre checkouts", () => {
  const logs = [
    { evento: "checkout.started", resultado: "correcto" },
    { evento: "checkout.started", resultado: "correcto" },
    { evento: "order.created", resultado: "correcto", pedido_id: "P1" },
    { evento: "order.created", resultado: "error", pedido_id: "P2" },
  ];

  assert.equal(tasaConversion(logs, []), (1 / 2) * 100);
});

test("tasaConversion es null sin checkouts", () => {
  assert.equal(
    tasaConversion([{ evento: "order.created", pedido_id: "P1" }], []),
    null,
  );
  assert.equal(tasaConversion(null, null), null);
});
