/**
 * Tests del workflow de integración.
 *
 * No necesitan n8n ni red: leen `workflow-integracion.json`, extraen el código
 * de los nodos Code y lo ejecutan con un `$input`/`$execution` simulados. Así
 * se comprueba la lógica que de verdad se va a importar, no una copia.
 *
 * Ejecutar:
 *   cd n8n && npm test
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const workflow = JSON.parse(
  readFileSync(new URL("../workflow-integracion.json", import.meta.url), "utf8"),
);

function nodo(nombre) {
  const encontrado = workflow.nodes.find((n) => n.name === nombre);
  assert.ok(encontrado, "Falta el nodo: " + nombre);
  return encontrado;
}

/**
 * Ejecuta el `jsCode` de un nodo Code con los mocks mínimos de n8n.
 * `contexto` permite simular `$('Nombre del nodo').item.json`.
 */
function ejecutar(
  nombre,
  { item = {}, execution = { id: "exec-test" }, contexto = {} } = {},
) {
  const codigo = nodo(nombre).parameters.jsCode;
  const $input = {
    first: () => ({ json: item }),
    all: () => [{ json: item }],
  };
  const $ = (nombreNodo) => {
    assert.ok(
      Object.prototype.hasOwnProperty.call(contexto, nombreNodo),
      "Nodo no simulado: " + nombreNodo,
    );
    return { item: { json: contexto[nombreNodo] } };
  };

  const fn = new Function("$input", "$execution", "$", codigo);
  return fn($input, execution, $);
}

function validar(body, executionId = "exec-test") {
  return ejecutar("Validar payload", {
    item: { body },
    execution: { id: executionId },
  })[0].json;
}

function evaluar(nombre, item, base) {
  return ejecutar(nombre, {
    item,
    contexto: { "Validar payload": base },
  })[0].json;
}

const PEDIDO = {
  evento: "order.created",
  pedido_id: "ORD-001",
  cliente_email: "ana@test.com",
  cliente_nombre: "Ana García",
  total: 258,
  moneda: "EUR",
  estado: "creado",
  fecha: "2026-10-29T10:00:00Z",
  lineas: [{ producto: "Camiseta Eren", cantidad: 2, precio: 129 }],
};

const ESTADO = {
  evento: "order.status_changed",
  pedido_id: "ORD-001",
  estado_anterior: "creado",
  estado: "enviado",
};

const INCIDENCIA = {
  evento: "incident.created",
  incidencia_id: "INC-001",
  pedido_id: "ORD-001",
  cliente_email: "ana@test.com",
  telegram_chat_id: "123456789",
  tipo: "retraso_envio",
  descripcion: "Mi pedido no ha llegado",
  estado: "abierta",
  prioridad: "alta",
  fecha: "2026-10-30T10:00:00Z",
};

// ---------------------------------------------------------------
// Validación
// ---------------------------------------------------------------

test("acepta un pedido válido y normaliza moneda y líneas", () => {
  const salida = validar(PEDIDO);
  assert.equal(salida.valido, true);
  assert.deepEqual(salida.errores, []);
  assert.equal(salida.evento, "order.created");
  assert.equal(salida.entidad_id, "ORD-001");
  assert.equal(salida.payload.moneda, "EUR");
  assert.equal(salida.payload.lineas.length, 1);
  assert.equal(salida.payload.lineas[0].cantidad, 2);
});

test("rechaza un pedido sin pedido_id", () => {
  const salida = validar({ ...PEDIDO, pedido_id: "" });
  assert.equal(salida.valido, false);
  assert.ok(salida.errores.some((e) => e.includes("pedido_id")));
});

test("rechaza un total no numérico o no positivo", () => {
  assert.equal(validar({ ...PEDIDO, total: "mucho" }).valido, false);
  assert.equal(validar({ ...PEDIDO, total: 0 }).valido, false);
});

test("rechaza un email con formato inválido", () => {
  const salida = validar({ ...PEDIDO, cliente_email: "ana-arroba-test" });
  assert.equal(salida.valido, false);
  assert.ok(salida.errores.some((e) => e.includes("cliente_email")));
});

test("rechaza un pedido sin líneas", () => {
  assert.equal(validar({ ...PEDIDO, lineas: [] }).valido, false);
  assert.equal(validar({ ...PEDIDO, lineas: "no-es-lista" }).valido, false);
});

test("rechaza una línea con cantidad cero o precio negativo", () => {
  const sinCantidad = validar({
    ...PEDIDO,
    lineas: [{ producto: "Camiseta", cantidad: 0, precio: 10 }],
  });
  assert.equal(sinCantidad.valido, false);

  const precioNegativo = validar({
    ...PEDIDO,
    lineas: [{ producto: "Camiseta", cantidad: 1, precio: -1 }],
  });
  assert.equal(precioNegativo.valido, false);
});

test("acepta un cambio de estado válido", () => {
  const salida = validar(ESTADO);
  assert.equal(salida.valido, true);
  assert.equal(salida.payload.estado, "enviado");
  assert.equal(salida.payload.estado_anterior, "creado");
});

test("rechaza un estado que no está en el enum", () => {
  const salida = validar({ ...ESTADO, estado: "perdido" });
  assert.equal(salida.valido, false);
  assert.ok(salida.errores.some((e) => e.includes("estado inválido")));
});

test("acepta una incidencia válida", () => {
  const salida = validar(INCIDENCIA);
  assert.equal(salida.valido, true);
  assert.equal(salida.entidad_id, "INC-001");
  assert.equal(salida.payload.prioridad, "alta");
});

test("rechaza una incidencia sin descripción", () => {
  const salida = validar({ ...INCIDENCIA, descripcion: "   " });
  assert.equal(salida.valido, false);
  assert.ok(salida.errores.some((e) => e.includes("descripcion")));
});

test("rechaza un evento desconocido", () => {
  const salida = validar({ evento: "order.deleted", pedido_id: "ORD-001" });
  assert.equal(salida.valido, false);
  assert.ok(salida.errores.some((e) => e.includes("evento no soportado")));
});

// ---------------------------------------------------------------
// Evaluación de la respuesta del back-office
// ---------------------------------------------------------------

test("un pedido nuevo responde 201 y se registra como correcto", () => {
  const base = validar(PEDIDO);
  const salida = evaluar("Evaluar pedido", { ok: true, pedido_id: "ORD-001" }, base);
  assert.equal(salida.http_status, 201);
  assert.equal(salida.respuesta.ok, true);
  assert.equal(salida.respuesta.duplicado, false);
  assert.equal(salida.log.resultado, "correcto");
  assert.equal(salida.log.origen, "n8n");
  assert.ok(salida.log.duracion_ms >= 0);
});

test("un pedido duplicado responde 200 y se marca como duplicado", () => {
  const base = validar(PEDIDO);
  const salida = evaluar("Evaluar pedido", { aviso: "El pedido ya existía" }, base);
  assert.equal(salida.http_status, 200);
  assert.equal(salida.respuesta.duplicado, true);
  assert.match(salida.log.detalle, /duplicado/);
});

test("un cambio de estado correcto responde 200", () => {
  const base = validar(ESTADO);
  const salida = evaluar("Evaluar estado", { ok: true }, base);
  assert.equal(salida.http_status, 200);
  assert.equal(salida.respuesta.estado, "enviado");
  assert.equal(salida.log.resultado, "correcto");
});

test("una incidencia nueva responde 201", () => {
  const base = validar(INCIDENCIA);
  const salida = evaluar("Evaluar incidencia", { ok: true }, base);
  assert.equal(salida.http_status, 201);
  assert.equal(salida.respuesta.incidencia_id, "INC-001");
});

test("una incidencia duplicada responde 200", () => {
  const base = validar(INCIDENCIA);
  const salida = evaluar("Evaluar incidencia", { aviso: "La incidencia ya existía" }, base);
  assert.equal(salida.http_status, 200);
  assert.equal(salida.respuesta.duplicado, true);
});

test("un error de validación responde 422 y no llama al back-office", () => {
  const salida = ejecutar("Preparar error validación", {
    contexto: {
      "Validar payload": {
        valido: false,
        errores: ["falta pedido_id"],
        evento: "order.created",
        entidad_id: null,
        execution_id: "exec-test",
        inicio_ms: Date.now() - 5,
        payload: {},
      },
    },
  })[0].json;

  assert.equal(salida.http_status, 422);
  assert.equal(salida.log.codigo_error, "VALIDACION");
  assert.equal(salida.log.origen, "n8n");
});

test("un 404 del back-office se traduce a BACKOFFICE_404", () => {
  const base = validar(ESTADO);
  const salida = evaluar(
    "Error estado",
    { error: { status: 404, message: '404 - {"error":"Pedido no encontrado"}' } },
    base,
  );
  assert.equal(salida.http_status, 404);
  assert.equal(salida.log.codigo_error, "BACKOFFICE_404");
});

test("un timeout se traduce a BACKOFFICE_TIMEOUT y 504", () => {
  const base = validar(PEDIDO);
  const salida = evaluar("Error pedido", { error: { message: "Timeout exceeded" } }, base);
  assert.equal(salida.http_status, 504);
  assert.equal(salida.log.codigo_error, "BACKOFFICE_TIMEOUT");
});

test("un 500 del back-office se traduce a BACKOFFICE_5XX y 502", () => {
  const base = validar(PEDIDO);
  const salida = evaluar("Error pedido", { error: { httpCode: 500, message: "Internal error" } }, base);
  assert.equal(salida.http_status, 502);
  assert.equal(salida.log.codigo_error, "BACKOFFICE_5XX");
});

// ---------------------------------------------------------------
// Estructura del workflow
// ---------------------------------------------------------------

test("el workflow contiene los nodos y tipos exigidos", () => {
  const tipos = new Set(workflow.nodes.map((n) => n.type));
  const exigidos = [
    "n8n-nodes-base.webhook",
    "n8n-nodes-base.code",
    "n8n-nodes-base.if",
    "n8n-nodes-base.switch",
    "n8n-nodes-base.httpRequest",
    "n8n-nodes-base.respondToWebhook",
  ];

  for (const tipo of exigidos) {
    assert.ok(tipos.has(tipo), "Falta el tipo de nodo: " + tipo);
  }

  assert.equal(nodo("Webhook tienda").parameters.path, "integracion-tarea2");
  assert.equal(nodo("Webhook tienda").parameters.responseMode, "responseNode");
  assert.equal(nodo("Enrutar por evento").parameters.rules.values.length, 3);
});

test("todas las conexiones apuntan a nodos existentes", () => {
  const nombres = new Set(workflow.nodes.map((n) => n.name));

  for (const [origen, salidas] of Object.entries(workflow.connections)) {
    assert.ok(nombres.has(origen), "Conexión desde un nodo inexistente: " + origen);

    for (const salida of salidas.main) {
      for (const conexion of salida) {
        assert.ok(
          nombres.has(conexion.node),
          "Conexión hacia un nodo inexistente: " + conexion.node,
        );
      }
    }
  }
});

test("las llamadas al back-office usan BACKOFFICE_URL y no una URL hardcodeada", () => {
  const http = workflow.nodes.filter((n) => n.type === "n8n-nodes-base.httpRequest");
  const backoffice = http.filter((n) =>
    n.parameters.url.includes("$env.BACKOFFICE_URL"),
  );

  assert.ok(backoffice.length >= 4);

  for (const n of backoffice) {
    assert.match(n.parameters.url, /^\=\{\{ \$env\.BACKOFFICE_URL \}\}/);
  }

  for (const n of http) {
    assert.match(n.parameters.url, /\$env\./);
    assert.equal(/onrender\.com/i.test(n.parameters.url), false);
  }
});

test("las cuatro ramas de error avisan por Telegram", () => {
  const alertas = workflow.nodes.filter((n) => n.name.startsWith("Avisar Telegram"));
  assert.equal(alertas.length, 4);

  for (const n of alertas) {
    assert.match(n.parameters.url, /api\.telegram\.org/);
    assert.equal(n.onError, "continueRegularOutput");
  }
});

test("el export no contiene credenciales ni secretos", () => {
  const serializado = JSON.stringify(workflow);
  assert.equal(serializado.includes('"credentials"'), false);
  assert.equal(/onrender\.com/i.test(serializado), false);
  assert.equal(/postgres(ql)?:\/\//i.test(serializado), false);
  assert.equal(/123456789/.test(serializado), false);
});
