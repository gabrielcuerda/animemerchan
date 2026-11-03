/**
 * Cálculo de las métricas del cuadro de mando.
 *
 * Funciones puras: reciben las listas del back-office y devuelven números.
 * No tocan el DOM ni hacen peticiones, así que se pueden probar con
 * `node --test` sin navegador (ver `test/metricas.test.mjs`).
 *
 * Tolerancia a datos incompletos: el back-office devuelve `null` en
 * `duracion_ms`, `codigo_error`, `origen` y `prioridad` mientras los flujos de
 * n8n no los rellenen. Cada métrica que depende de ellos devuelve `null` en
 * lugar de 0 para que la interfaz distinga "no hay datos" de "vale cero".
 */

/** Estados en los que una incidencia ya no cuenta como abierta. */
const INCIDENCIAS_CERRADAS = new Set([
  "cerrada",
  "cerrado",
  "resuelta",
  "resuelto",
  "cancelada",
  "cancelado",
]);

/** Estados en los que una decisión del agente sigue pendiente de revisión. */
const DECISIONES_PENDIENTES = new Set([
  "pendiente",
  "pendiente_revision",
  "en_revision",
  "propuesta",
]);

export function aNumero(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

/** Devuelve `AAAA-MM-DD` si la fecha es válida y `null` si no. */
export function diaDe(fecha) {
  if (typeof fecha !== "string") return null;
  const coincidencia = fecha.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!coincidencia) return null;
  const dia = coincidencia[1];
  return Number.isNaN(Date.parse(`${dia}T00:00:00Z`)) ? null : dia;
}

export function resumenPedidos(lista) {
  const pedidos = Array.isArray(lista) ? lista : [];
  const porEstado = Object.create(null);
  const porDia = Object.create(null);
  let importe = 0;

  for (const pedido of pedidos) {
    importe += aNumero(pedido?.total);

    const estado = String(pedido?.estado || "sin_estado").trim();
    porEstado[estado] = (porEstado[estado] || 0) + 1;

    const dia = diaDe(pedido?.fecha) ?? diaDe(pedido?.recibido_en);
    if (dia) porDia[dia] = (porDia[dia] || 0) + 1;
  }

  return { total: pedidos.length, importe, porEstado, porDia };
}

export function resumenIncidencias(lista) {
  const incidencias = Array.isArray(lista) ? lista : [];
  const porEstado = Object.create(null);
  const porPrioridad = Object.create(null);
  let abiertas = 0;

  for (const incidencia of incidencias) {
    const estado = String(incidencia?.estado || "sin_estado").trim();
    porEstado[estado] = (porEstado[estado] || 0) + 1;

    const prioridad = String(incidencia?.prioridad || "sin_prioridad").trim();
    porPrioridad[prioridad] = (porPrioridad[prioridad] || 0) + 1;

    if (!INCIDENCIAS_CERRADAS.has(estado.toLowerCase())) {
      abiertas += 1;
    }
  }

  return {
    total: incidencias.length,
    abiertas,
    porEstado,
    porPrioridad,
  };
}

export function resumenLogs(lista) {
  const logs = Array.isArray(lista) ? lista : [];
  const erroresPorTipo = Object.create(null);
  const porEvento = Object.create(null);
  let correctos = 0;
  let fallidos = 0;
  let duplicados = 0;
  let sumaDuracion = 0;
  let conDuracion = 0;

  for (const log of logs) {
    const resultado = String(log?.resultado || "").toLowerCase();
    if (resultado === "correcto" || resultado === "ok") correctos += 1;
    else if (resultado === "error" || resultado === "fallido") fallidos += 1;

    if (/duplicad/i.test(String(log?.detalle || ""))) duplicados += 1;

    const evento = String(log?.evento || "sin_evento").trim();
    porEvento[evento] = (porEvento[evento] || 0) + 1;

    const codigo = String(log?.codigo_error || "").trim();
    if (codigo) erroresPorTipo[codigo] = (erroresPorTipo[codigo] || 0) + 1;

    const duracion = Number(log?.duracion_ms);
    if (Number.isFinite(duracion) && duracion > 0) {
      sumaDuracion += duracion;
      conDuracion += 1;
    }
  }

  const evaluados = correctos + fallidos;

  return {
    total: logs.length,
    correctos,
    fallidos,
    tasaExito: evaluados ? (correctos / evaluados) * 100 : null,
    duplicados,
    erroresPorTipo,
    porEvento,
    latenciaMedia: conDuracion ? sumaDuracion / conDuracion : null,
    conDuracion,
  };
}

export function resumenDecisiones(lista) {
  const decisiones = Array.isArray(lista) ? lista : [];
  const porEstado = Object.create(null);
  const porPrioridad = Object.create(null);
  let aprobadas = 0;
  let rechazadas = 0;
  let pendientes = 0;

  for (const decision of decisiones) {
    const estado = String(decision?.estado || "sin_estado")
      .trim()
      .toLowerCase();
    porEstado[estado] = (porEstado[estado] || 0) + 1;

    const prioridad = String(decision?.prioridad || "sin_prioridad").trim();
    porPrioridad[prioridad] = (porPrioridad[prioridad] || 0) + 1;

    if (estado === "aprobado" || estado === "aprobada") aprobadas += 1;
    else if (estado === "rechazado" || estado === "rechazada")
      rechazadas += 1;
    else if (DECISIONES_PENDIENTES.has(estado)) pendientes += 1;
  }

  const revisadas = aprobadas + rechazadas;

  return {
    total: decisiones.length,
    aprobadas,
    rechazadas,
    pendientes,
    porEstado,
    porPrioridad,
    tasaAprobacion: revisadas ? (aprobadas / revisadas) * 100 : null,
  };
}

/**
 * Rellena los días sin pedidos con 0 para que la gráfica tenga un eje continuo.
 * Devuelve `[{ dia, valor }]` ordenado de más antiguo a más reciente.
 */
export function seriePorDia(porDia, dias = 14) {
  const mapa = porDia || {};
  const serie = [];
  const hoy = new Date();

  for (let atras = dias - 1; atras >= 0; atras -= 1) {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() - atras);
    const dia = fecha.toISOString().slice(0, 10);
    serie.push({ dia, valor: mapa[dia] || 0 });
  }

  return serie;
}

/** Convierte `{ clave: valor }` en `[{ clave, valor }]` ordenado de mayor a menor. */
export function aPares(mapa) {
  return Object.entries(mapa || {})
    .map(([clave, valor]) => ({ clave, valor: aNumero(valor) }))
    .sort((a, b) => b.valor - a.valor || a.clave.localeCompare(b.clave));
}

export function formatearEuros(valor) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(aNumero(valor));
}

export function formatearPorcentaje(valor, decimales = 1) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "—";
  return `${valor.toFixed(decimales).replace(".", ",")} %`;
}

export function formatearNumero(valor) {
  return new Intl.NumberFormat("es-ES").format(aNumero(valor));
}

export function formatearFecha(fecha) {
  if (!fecha) return "—";
  const momento = Date.parse(fecha);
  if (Number.isNaN(momento)) return String(fecha);
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(momento));
}
export function resumenProductos(lista) {
  const productos = Array.isArray(lista) ? lista : [];
  return productos
    .map((p) => ({
      producto: String(p?.producto ?? "sin_nombre").trim() || "sin_nombre",
      unidades: aNumero(p?.unidades),
      pedidos: aNumero(p?.pedidos),
    }))
    .sort((a, b) => b.unidades - a.unidades || a.producto.localeCompare(b.producto));
}

export function tiempoMedioResolucion(valor) {
  const ms = Number(valor?.media_ms);
  return Number.isFinite(ms) && ms > 0 ? ms : null;
}

export function tasaConversion(logs, pedidos) {
  const eventos = Array.isArray(logs) ? logs : [];
  const checkouts = eventos.filter(
    (l) => String(l?.evento || "").toLowerCase() === "checkout.started",
  ).length;
  if (!checkouts) return null;
  const creados = new Set(
    eventos
      .filter(
        (l) =>
          String(l?.evento || "").toLowerCase() === "order.created" &&
          String(l?.resultado || "").toLowerCase() !== "error",
      )
      .map((l) => l?.pedido_id)
      .filter(Boolean),
  ).size || (Array.isArray(pedidos) ? pedidos.length : 0);
  return (creados / checkouts) * 100;
}