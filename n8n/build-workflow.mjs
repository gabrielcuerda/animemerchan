/**
 * Genera `workflow-integracion.json`, el workflow que se importa en n8n.
 *
 * El JSON es el artefacto de entrega. Este script existe para que el workflow
 * se pueda regenerar y revisar sin editar 30 nodos a mano. Si alguien cambia
 * el flujo desde la interfaz de n8n, debe volver a exportar el JSON y
 * actualizarlo; a partir de ahí, el JSON manda.
 *
 * Ejecutar:
 *   cd n8n && node build-workflow.mjs
 */

import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";

// ---------------------------------------------------------------
// Código de los nodos Code
// ---------------------------------------------------------------

const validarPayload = `
const ESTADOS_PEDIDO = ['creado', 'pago_simulado', 'preparacion', 'enviado', 'cancelado'];
const ESTADOS_INCIDENCIA = ['abierta', 'en_revision', 'resuelta', 'cerrada'];
const PRIORIDADES = ['alta', 'media', 'baja'];
const EVENTOS = ['order.created', 'order.status_changed', 'incident.created'];

// El Webhook de n8n entrega { headers, params, query, body }. Se acepta
// también el payload plano para poder probar el nodo con "Execute step".
const crudo = $input.first().json || {};
const d = crudo.body && typeof crudo.body === 'object' ? crudo.body : crudo;
const errores = [];

function texto(valor) {
  if (valor === undefined || valor === null) return '';
  return String(valor).trim();
}

function numero(valor) {
  if (valor === undefined || valor === null || valor === '') return NaN;
  return Number(valor);
}

function emailValido(valor) {
  return /^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(valor);
}

function fechaValida(valor) {
  return !Number.isNaN(Date.parse(valor));
}

const evento = texto(d.evento);
if (!EVENTOS.includes(evento)) {
  errores.push('evento no soportado: "' + evento + '"');
}

const executionId = String($execution.id);
const inicioMs = Date.now();
let entidadId = texto(d.pedido_id) || null;
let payload = {};

if (evento === 'order.created') {
  const pedidoId = texto(d.pedido_id);
  if (!pedidoId) errores.push('falta pedido_id');
  entidadId = pedidoId || null;

  const total = numero(d.total);
  if (!Number.isFinite(total) || total <= 0) {
    errores.push('total debe ser un número mayor que 0');
  }

  const estado = texto(d.estado) || 'creado';
  if (!ESTADOS_PEDIDO.includes(estado)) {
    errores.push('estado inválido: "' + estado + '"');
  }

  const moneda = (texto(d.moneda) || 'EUR').toUpperCase();
  if (!/^[A-Z]{3}$/.test(moneda)) {
    errores.push('moneda debe ser un código ISO de 3 letras');
  }

  const clienteEmail = texto(d.cliente_email);
  if (clienteEmail && !emailValido(clienteEmail)) {
    errores.push('cliente_email no válido');
  }

  const fecha = texto(d.fecha) || new Date().toISOString();
  if (!fechaValida(fecha)) {
    errores.push('fecha no válida (ISO 8601)');
  }

  const lineas = Array.isArray(d.lineas) ? d.lineas : null;
  if (!lineas || lineas.length === 0) {
    errores.push('lineas debe ser una lista con al menos una línea');
  } else {
    for (let i = 0; i < lineas.length; i += 1) {
      const linea = lineas[i] || {};
      if (!texto(linea.producto)) {
        errores.push('lineas[' + i + '].producto es obligatorio');
      }
      const cantidad = numero(linea.cantidad);
      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        errores.push('lineas[' + i + '].cantidad debe ser un entero mayor que 0');
      }
      const precio = numero(linea.precio);
      if (!Number.isFinite(precio) || precio < 0) {
        errores.push('lineas[' + i + '].precio debe ser un número mayor o igual que 0');
      }
    }
  }

  payload = {
    evento: evento,
    pedido_id: pedidoId,
    cliente_email: clienteEmail || null,
    cliente_nombre: texto(d.cliente_nombre) || null,
    total: total,
    moneda: moneda,
    estado: estado,
    fecha: fechaValida(fecha) ? fecha : null,
    lineas: (lineas || []).map(function (linea) {
      return {
        producto: texto(linea && linea.producto),
        cantidad: numero(linea && linea.cantidad),
        precio: numero(linea && linea.precio),
      };
    }),
  };
}

if (evento === 'order.status_changed') {
  const pedidoId = texto(d.pedido_id);
  if (!pedidoId) errores.push('falta pedido_id');
  entidadId = pedidoId || null;

  const estado = texto(d.estado);
  if (!ESTADOS_PEDIDO.includes(estado)) {
    errores.push('estado inválido: "' + estado + '"');
  }

  const anterior = texto(d.estado_anterior);
  if (anterior && !ESTADOS_PEDIDO.includes(anterior)) {
    errores.push('estado_anterior inválido: "' + anterior + '"');
  }

  payload = {
    evento: evento,
    pedido_id: pedidoId,
    estado: estado,
  };
  if (anterior) payload.estado_anterior = anterior;
}

if (evento === 'incident.created') {
  const incidenciaId = texto(d.incidencia_id);
  if (!incidenciaId) errores.push('falta incidencia_id');
  entidadId = incidenciaId || null;

  const tipo = texto(d.tipo);
  if (!tipo) errores.push('falta tipo');

  const descripcion = texto(d.descripcion);
  if (!descripcion) errores.push('falta descripcion');

  const fecha = texto(d.fecha);
  if (!fecha || !fechaValida(fecha)) {
    errores.push('fecha no válida (ISO 8601)');
  }

  const estado = texto(d.estado) || 'abierta';
  if (!ESTADOS_INCIDENCIA.includes(estado)) {
    errores.push('estado inválido: "' + estado + '"');
  }

  const prioridad = texto(d.prioridad) || null;
  if (prioridad && !PRIORIDADES.includes(prioridad)) {
    errores.push('prioridad inválida: "' + prioridad + '"');
  }

  const clienteEmail = texto(d.cliente_email);
  if (clienteEmail && !emailValido(clienteEmail)) {
    errores.push('cliente_email no válido');
  }

  payload = {
    evento: evento,
    incidencia_id: incidenciaId,
    pedido_id: texto(d.pedido_id) || null,
    cliente_email: clienteEmail || null,
    telegram_chat_id: texto(d.telegram_chat_id) || null,
    tipo: tipo,
    descripcion: descripcion,
    estado: estado,
    prioridad: prioridad,
    fecha: fechaValida(fecha) ? fecha : null,
  };
}

return [{
  json: {
    valido: errores.length === 0,
    errores: errores,
    evento: evento || 'desconocido',
    entidad_id: entidadId,
    execution_id: executionId,
    inicio_ms: inicioMs,
    payload: payload,
  },
}];
`.trim();

const evaluarPedido = `
const base = $('Validar payload').item.json;
const res = $input.first().json || {};
const duplicado = Boolean(res.aviso);
const ok = res.ok === true || duplicado;
const detalle = duplicado ? 'duplicado ignorado' : 'pedido creado';
const duracion = Date.now() - base.inicio_ms;

return [{
  json: {
    http_status: duplicado ? 200 : 201,
    respuesta: {
      ok: ok,
      duplicado: duplicado,
      evento: base.evento,
      pedido_id: base.entidad_id,
      execution_id: base.execution_id,
    },
    log: {
      execution_id: base.execution_id,
      evento: base.evento,
      pedido_id: base.entidad_id,
      resultado: ok ? 'correcto' : 'error',
      codigo_error: ok ? null : 'BACKOFFICE_RESPUESTA',
      detalle: detalle,
      duracion_ms: duracion,
      origen: 'n8n',
    },
  },
}];
`.trim();

const evaluarEstado = `
const base = $('Validar payload').item.json;
const res = $input.first().json || {};
const ok = res.ok === true;
const estado = base.payload.estado;
const detalle = ok ? 'estado -> ' + estado : 'respuesta inesperada del back-office';
const duracion = Date.now() - base.inicio_ms;

return [{
  json: {
    http_status: ok ? 200 : 502,
    respuesta: {
      ok: ok,
      evento: base.evento,
      pedido_id: base.entidad_id,
      estado: estado,
      execution_id: base.execution_id,
    },
    log: {
      execution_id: base.execution_id,
      evento: base.evento,
      pedido_id: base.entidad_id,
      resultado: ok ? 'correcto' : 'error',
      codigo_error: ok ? null : 'BACKOFFICE_RESPUESTA',
      detalle: detalle,
      duracion_ms: duracion,
      origen: 'n8n',
    },
  },
}];
`.trim();

const evaluarIncidencia = `
const base = $('Validar payload').item.json;
const res = $input.first().json || {};
const duplicado = Boolean(res.aviso);
const ok = res.ok === true || duplicado;
const detalle = duplicado ? 'duplicado ignorado' : 'incidencia creada';
const duracion = Date.now() - base.inicio_ms;

return [{
  json: {
    http_status: duplicado ? 200 : 201,
    respuesta: {
      ok: ok,
      duplicado: duplicado,
      evento: base.evento,
      incidencia_id: base.entidad_id,
      execution_id: base.execution_id,
    },
    log: {
      execution_id: base.execution_id,
      evento: base.evento,
      pedido_id: base.payload.pedido_id || null,
      resultado: ok ? 'correcto' : 'error',
      codigo_error: ok ? null : 'BACKOFFICE_RESPUESTA',
      detalle: detalle,
      duracion_ms: duracion,
      origen: 'n8n',
    },
  },
}];
`.trim();

const errorValidacion = `
const base = $('Validar payload').item.json;
const detalle = base.errores.join('; ');
const duracion = Date.now() - base.inicio_ms;
const pedido = base.evento === 'incident.created'
  ? (base.payload && base.payload.pedido_id ? base.payload.pedido_id : null)
  : base.entidad_id;

return [{
  json: {
    http_status: 422,
    respuesta: {
      ok: false,
      evento: base.evento,
      errores: base.errores,
      execution_id: base.execution_id,
    },
    log: {
      execution_id: base.execution_id,
      evento: base.evento,
      pedido_id: pedido,
      resultado: 'error',
      codigo_error: 'VALIDACION',
      detalle: detalle,
      duracion_ms: duracion,
      origen: 'n8n',
    },
  },
}];
`.trim();

const errorBackoffice = `
const base = $('Validar payload').item.json;
const err = $input.first().json || {};

// n8n entrega el error del nodo HTTP con formas distintas según la versión:
// a veces { error: { httpCode, message } } y a veces { error: "texto" }.
const detalleError = typeof err.error === 'string'
  ? err.error
  : (err.error && err.error.message) || err.message || 'Error desconocido';

const status = Number(
  err.statusCode ||
  err.httpCode ||
  (err.error && err.error.httpCode) ||
  (err.error && err.error.statusCode) ||
  (err.error && err.error.status) ||
  0
);

const esTimeout = /timeout|timed out|ETIMEDOUT|aborted|ECONNRESET/i.test(detalleError);
let httpStatus = 502;
let codigo = 'BACKOFFICE_5XX';

if (status === 404) {
  httpStatus = 404;
  codigo = 'BACKOFFICE_404';
} else if (status === 422) {
  httpStatus = 422;
  codigo = 'BACKOFFICE_422';
} else if (esTimeout) {
  httpStatus = 504;
  codigo = 'BACKOFFICE_TIMEOUT';
}

const duracion = Date.now() - base.inicio_ms;
const detalle = ('Back-office ' + (status || 'sin respuesta') + ': ' + detalleError).slice(0, 500);
const pedido = base.evento === 'incident.created'
  ? (base.payload && base.payload.pedido_id ? base.payload.pedido_id : null)
  : base.entidad_id;

const respuesta = {
  ok: false,
  evento: base.evento,
  codigo_error: codigo,
  execution_id: base.execution_id,
};

if (base.evento === 'incident.created') {
  respuesta.incidencia_id = base.entidad_id;
} else {
  respuesta.pedido_id = base.entidad_id;
}

return [{
  json: {
    http_status: httpStatus,
    respuesta: respuesta,
    log: {
      execution_id: base.execution_id,
      evento: base.evento,
      pedido_id: pedido,
      resultado: 'error',
      codigo_error: codigo,
      detalle: detalle,
      duracion_ms: duracion,
      origen: 'n8n',
    },
  },
}];
`.trim();

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

const nodos = [];
const conexiones = {};

function nodo(nombre, tipo, version, posicion, parametros, extra = {}) {
  const creado = {
    parameters: parametros,
    type: tipo,
    typeVersion: version,
    position: posicion,
    id: randomUUID(),
    name: nombre,
    ...extra,
  };
  nodos.push(creado);
  return creado;
}

function conectar(origen, destino, salida = 0) {
  if (!conexiones[origen]) conexiones[origen] = { main: [] };
  while (conexiones[origen].main.length <= salida) conexiones[origen].main.push([]);
  conexiones[origen].main[salida].push({ node: destino, type: "main", index: 0 });
}

function http(nombre, posicion, metodo, ruta, cuerpo, extra = {}) {
  const parametros = {
    method: metodo,
    url: "={{ $env.BACKOFFICE_URL }}" + ruta,
    options: { timeout: 10000 },
  };

  if (cuerpo) {
    parametros.sendBody = true;
    parametros.specifyBody = "json";
    parametros.jsonBody = "={{ JSON.stringify(" + cuerpo + ") }}";
  }

  return nodo(nombre, "n8n-nodes-base.httpRequest", 4.2, posicion, parametros, {
    onError: "continueErrorOutput",
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 2000,
    ...extra,
  });
}

function log(nombre, posicion, origen) {
  return nodo(
    nombre,
    "n8n-nodes-base.httpRequest",
    4.2,
    posicion,
    {
      method: "POST",
      url: "={{ $env.BACKOFFICE_URL }}/logs",
      sendBody: true,
      specifyBody: "json",
      jsonBody: "={{ JSON.stringify($json.log) }}",
      options: { timeout: 5000 },
    },
    {
      onError: "continueRegularOutput",
      retryOnFail: true,
      maxTries: 2,
      waitBetweenTries: 1000,
    },
  );
}

function responder(nombre, posicion, origen) {
  return nodo(
    nombre,
    "n8n-nodes-base.respondToWebhook",
    1.5,
    posicion,
    {
      respondWith: "json",
      responseBody: "={{ $('" + origen + "').item.json.respuesta }}",
      options: {
        responseCode: "={{ Number($('" + origen + "').item.json.http_status) }}",
        responseHeaders: {
          entries: [{ name: "Content-Type", value: "application/json" }],
        },
      },
    },
  );
}

/**
 * Aviso opcional por Telegram en las ramas de error.
 *
 * Se hace con HTTP Request y variables de entorno (no con el nodo Telegram)
 * para que el export no dependa de una credencial concreta. Si el token o el
 * chat no están configurados, el nodo falla y `onError` deja seguir el flujo:
 * la respuesta al webhook no se pierde por una alerta.
 */
function alerta(nombre, posicion, origen) {
  const base = "$('" + origen + "').item.json.log";
  const texto =
    "'🚨 Integración: ' + " +
    base +
    ".evento + ' | ' + (" +
    base +
    ".codigo_error || 'sin código') + ' | ' + " +
    base +
    ".detalle";

  return nodo(
    nombre,
    "n8n-nodes-base.httpRequest",
    4.2,
    posicion,
    {
      method: "POST",
      url: "=https://api.telegram.org/bot{{ $env.TELEGRAM_BOT_TOKEN }}/sendMessage",
      sendBody: true,
      specifyBody: "json",
      jsonBody:
        "={{ JSON.stringify({ chat_id: $env.ALERT_TELEGRAM_CHAT_ID, text: " +
        texto +
        " }) }}",
      options: { timeout: 5000 },
    },
    {
      onError: "continueRegularOutput",
      retryOnFail: false,
    },
  );
}

function sticky(nombre, posicion, ancho, alto, contenido) {
  return nodo(nombre, "n8n-nodes-base.stickyNote", 1, posicion, {
    content: contenido,
    height: alto,
    width: ancho,
    color: 7,
  });
}

// ---------------------------------------------------------------
// Nodos
// ---------------------------------------------------------------

nodo(
  "Webhook tienda",
  "n8n-nodes-base.webhook",
  2.2,
  [-900, 300],
  {
    httpMethod: "POST",
    path: "integracion-tarea2",
    responseMode: "responseNode",
    options: {},
  },
  { webhookId: randomUUID() },
);

nodo("Validar payload", "n8n-nodes-base.code", 2, [-660, 300], {
  jsCode: validarPayload,
});

nodo("¿Payload válido?", "n8n-nodes-base.if", 2.4, [-420, 300], {
  conditions: {
    options: {
      caseSensitive: true,
      leftValue: "",
      typeValidation: "strict",
      version: 4,
    },
    conditions: [
      {
        id: randomUUID(),
        leftValue: "={{ $json.valido }}",
        rightValue: false,
        operator: { type: "boolean", operation: "true", singleValue: true },
      },
    ],
    combinator: "and",
  },
  options: {},
});

nodo("Enrutar por evento", "n8n-nodes-base.switch", 3.3, [-180, 120], {
  rules: {
    values: [
      {
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: "",
            typeValidation: "strict",
            version: 2,
          },
          conditions: [
            {
              id: randomUUID(),
              leftValue: "={{ $json.evento }}",
              rightValue: "order.created",
              operator: { type: "string", operation: "equals" },
            },
          ],
          combinator: "and",
        },
        renameOutput: true,
        outputKey: "order.created",
      },
      {
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: "",
            typeValidation: "strict",
            version: 2,
          },
          conditions: [
            {
              id: randomUUID(),
              leftValue: "={{ $json.evento }}",
              rightValue: "order.status_changed",
              operator: { type: "string", operation: "equals" },
            },
          ],
          combinator: "and",
        },
        renameOutput: true,
        outputKey: "order.status_changed",
      },
      {
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: "",
            typeValidation: "strict",
            version: 2,
          },
          conditions: [
            {
              id: randomUUID(),
              leftValue: "={{ $json.evento }}",
              rightValue: "incident.created",
              operator: { type: "string", operation: "equals" },
            },
          ],
          combinator: "and",
        },
        renameOutput: true,
        outputKey: "incident.created",
      },
    ],
  },
  options: { fallbackOutput: "none" },
});

// Escenario 1: pedido integrado
http("HTTP crear pedido", [60, -120], "POST", "/pedidos", "$json.payload");
nodo("Evaluar pedido", "n8n-nodes-base.code", 2, [300, -120], {
  jsCode: evaluarPedido,
});
log("Log pedido", [540, -120], "Evaluar pedido");
responder("Responder pedido", [780, -120], "Evaluar pedido");

nodo("Error pedido", "n8n-nodes-base.code", 2, [300, 20], {
  jsCode: errorBackoffice,
});
log("Log error pedido", [540, 20], "Error pedido");
alerta("Avisar Telegram pedido", [680, 20], "Error pedido");
responder("Responder error pedido", [820, 20], "Error pedido");

// Escenario 2: cambio de estado
http("HTTP cambiar estado", [60, 220], "PATCH", "/pedidos/{{ $json.entidad_id }}/estado", '{ "estado": $json.payload.estado }', {
  onError: "continueErrorOutput",
  retryOnFail: true,
  maxTries: 3,
  waitBetweenTries: 2000,
});
nodo("Evaluar estado", "n8n-nodes-base.code", 2, [300, 220], {
  jsCode: evaluarEstado,
});
log("Log estado", [540, 220], "Evaluar estado");
responder("Responder estado", [780, 220], "Evaluar estado");

nodo("Error estado", "n8n-nodes-base.code", 2, [300, 360], {
  jsCode: errorBackoffice,
});
log("Log error estado", [540, 360], "Error estado");
alerta("Avisar Telegram estado", [680, 360], "Error estado");
responder("Responder error estado", [820, 360], "Error estado");

// Escenario 3: incidencia postventa (la envía el bot de Telegram de P3)
http("HTTP crear incidencia", [60, 560], "POST", "/incidencias", "$json.payload");
nodo("Evaluar incidencia", "n8n-nodes-base.code", 2, [300, 560], {
  jsCode: evaluarIncidencia,
});
log("Log incidencia", [540, 560], "Evaluar incidencia");
responder("Responder incidencia", [780, 560], "Evaluar incidencia");

nodo("Error incidencia", "n8n-nodes-base.code", 2, [300, 700], {
  jsCode: errorBackoffice,
});
log("Log error incidencia", [540, 700], "Error incidencia");
alerta("Avisar Telegram incidencia", [680, 700], "Error incidencia");
responder("Responder error incidencia", [820, 700], "Error incidencia");

// Rama de error de validación
nodo("Preparar error validación", "n8n-nodes-base.code", 2, [-180, 760], {
  jsCode: errorValidacion,
});
log("Log validación", [60, 760], "Preparar error validación");
alerta("Avisar Telegram validación", [200, 760], "Preparar error validación");
responder("Responder 422", [340, 760], "Preparar error validación");

// ---------------------------------------------------------------
// Notas del canvas
// ---------------------------------------------------------------

sticky(
  "Nota contrato",
  [-900, -180],
  520,
  220,
  [
    "## Contrato de integración",
    "",
    "Documento: `docs/contrato-integracion.md`",
    "",
    "- Eventos: `order.created`, `order.status_changed`, `incident.created`.",
    "- Valida tipos, campos obligatorios, email, importe, líneas y estados.",
    "- Idempotencia por `pedido_id` / `incidencia_id`: el back-office responde `aviso` y aquí se registra como duplicado.",
    "- Cada ejecución se registra en `POST /logs` con `origen: n8n`.",
  ].join("\n"),
);

sticky(
  "Nota errores",
  [-180, 900],
  520,
  190,
  [
    "## Códigos de error",
    "",
    "| Código | HTTP | Cuándo |",
    "| --- | --- | --- |",
    "| `VALIDACION` | 422 | Falta un campo o un tipo no cuadra |",
    "| `BACKOFFICE_404` | 404 | Pedido o incidencia inexistente |",
    "| `BACKOFFICE_422` | 422 | El back-office rechaza el payload |",
    "| `BACKOFFICE_5XX` | 502 | Back-office caído o error interno |",
    "| `BACKOFFICE_TIMEOUT` | 504 | Sin respuesta en 10 s |",
  ].join("\n"),
);

sticky(
  "Nota eventos",
  [-420, 40],
  260,
  190,
  [
    "## Entradas",
    "",
    "La tienda envía `order.*`.",
    "",
    "El bot de Telegram de P3 envía `incident.created` al mismo webhook.",
    "",
    "Todo entra por `POST /webhook/integracion-tarea2`.",
  ].join("\n"),
);

// ---------------------------------------------------------------
// Conexiones
// ---------------------------------------------------------------

conectar("Webhook tienda", "Validar payload");
conectar("Validar payload", "¿Payload válido?");
conectar("¿Payload válido?", "Enrutar por evento", 0);
conectar("¿Payload válido?", "Preparar error validación", 1);

conectar("Enrutar por evento", "HTTP crear pedido", 0);
conectar("Enrutar por evento", "HTTP cambiar estado", 1);
conectar("Enrutar por evento", "HTTP crear incidencia", 2);

conectar("HTTP crear pedido", "Evaluar pedido", 0);
conectar("HTTP crear pedido", "Error pedido", 1);
conectar("Evaluar pedido", "Log pedido");
conectar("Log pedido", "Responder pedido");
conectar("Error pedido", "Log error pedido");
conectar("Log error pedido", "Avisar Telegram pedido");
conectar("Avisar Telegram pedido", "Responder error pedido");

conectar("HTTP cambiar estado", "Evaluar estado", 0);
conectar("HTTP cambiar estado", "Error estado", 1);
conectar("Evaluar estado", "Log estado");
conectar("Log estado", "Responder estado");
conectar("Error estado", "Log error estado");
conectar("Log error estado", "Avisar Telegram estado");
conectar("Avisar Telegram estado", "Responder error estado");

conectar("HTTP crear incidencia", "Evaluar incidencia", 0);
conectar("HTTP crear incidencia", "Error incidencia", 1);
conectar("Evaluar incidencia", "Log incidencia");
conectar("Log incidencia", "Responder incidencia");
conectar("Error incidencia", "Log error incidencia");
conectar("Log error incidencia", "Avisar Telegram incidencia");
conectar("Avisar Telegram incidencia", "Responder error incidencia");

conectar("Preparar error validación", "Log validación");
conectar("Log validación", "Avisar Telegram validación");
conectar("Avisar Telegram validación", "Responder 422");

// ---------------------------------------------------------------
// Workflow
// ---------------------------------------------------------------

const workflow = {
  name: "Tarea 2 - Integracion tienda / back-office",
  nodes: nodos,
  connections: conexiones,
  active: false,
  settings: {
    executionOrder: "v1",
    saveManualExecutions: true,
    callerPolicy: "workflowsFromSameOwner",
    timezone: "Europe/Madrid",
  },
  pinData: {},
  meta: {
    generatedBy: "n8n/build-workflow.mjs",
    contract: "docs/contrato-integracion.md",
  },
};

const salida = new URL("./workflow-integracion.json", import.meta.url);
writeFileSync(salida, JSON.stringify(workflow, null, 2) + "\n", "utf8");

console.log("Workflow generado: " + salida.pathname);
console.log("Nodos: " + workflow.nodes.length + " · Conexiones: " + Object.keys(workflow.connections).length);
