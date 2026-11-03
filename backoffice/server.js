const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const { Pool } = require("pg");

const app = express();
const PUERTO = process.env.PORT || 4000;

if (!process.env.DATABASE_URL) {
  console.error(
    "Falta DATABASE_URL. Crea backoffice/.env con: DATABASE_URL=postgresql://...",
  );
  process.exit(1);
}

const opcionesPool = {
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
};

// El Session Pooler de Supabase exige SSL. `rejectUnauthorized: false`
// evita errores de certificado tanto en local como en Render.
if (opcionesPool.connectionString.includes("pooler.supabase.com")) {
  opcionesPool.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(opcionesPool);

app.use(express.json());

// ---------------------------------------------------------------
// 1. Esquema: crea las tablas si no existen (idempotente)
// ---------------------------------------------------------------
const ESQUEMA = `
  CREATE TABLE IF NOT EXISTS pedidos (
    pedido_id      TEXT PRIMARY KEY,
    cliente_email  TEXT,
    cliente_nombre TEXT,
    total          DOUBLE PRECISION NOT NULL,
    moneda         TEXT NOT NULL DEFAULT 'EUR',
    estado         TEXT NOT NULL DEFAULT 'creado',
    fecha          TEXT NOT NULL,
    recibido_en    TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS lineas_pedido (
    id        INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pedido_id TEXT NOT NULL REFERENCES pedidos(pedido_id),
    producto  TEXT NOT NULL,
    cantidad  INTEGER NOT NULL,
    precio    DOUBLE PRECISION NOT NULL
  );

  CREATE TABLE IF NOT EXISTS incidencias (
    incidencia_id    TEXT PRIMARY KEY,
    pedido_id        TEXT,
    cliente_email    TEXT,
    telegram_chat_id TEXT,
    tipo             TEXT NOT NULL,
    descripcion      TEXT NOT NULL,
    estado           TEXT NOT NULL DEFAULT 'abierta',
    prioridad        TEXT,
    fecha            TEXT NOT NULL,
    recibido_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_resolucion TIMESTAMPTZ
  );

  CREATE TABLE IF NOT EXISTS decisiones_agente (
    decision_id       TEXT PRIMARY KEY,
    incidencia_id     TEXT NOT NULL REFERENCES incidencias(incidencia_id),
    tipo_caso         TEXT NOT NULL,
    accion_propuesta  TEXT NOT NULL,
    respuesta_cliente TEXT,
    justificacion     TEXT NOT NULL,
    prioridad         TEXT,
    confianza         DOUBLE PRECISION,
    riesgos           TEXT,
    estado            TEXT NOT NULL DEFAULT 'pendiente_revision',
    revisado_por      TEXT,
    fecha_propuesta   TEXT NOT NULL,
    fecha_revision    TEXT,
    recibido_en       TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS integracion_log (
    id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    execution_id TEXT UNIQUE,
    evento       TEXT NOT NULL,
    pedido_id    TEXT,
    resultado    TEXT NOT NULL,   -- 'correcto' | 'error'
    codigo_error TEXT,
    detalle      TEXT,
    duracion_ms  DOUBLE PRECISION,
    origen       TEXT,           -- 'tienda' | 'n8n' | 'manual'
    creado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS idx_lineas_pedido ON lineas_pedido (pedido_id);
  CREATE INDEX IF NOT EXISTS idx_incidencias_pedido ON incidencias (pedido_id);
  CREATE INDEX IF NOT EXISTS idx_log_creado_en ON integracion_log (creado_en DESC);
`;

// ---------------------------------------------------------------
// 2. Auxiliares
// ---------------------------------------------------------------

// Un campo falta si no llega, es null o es un string en blanco.
// (El "" de cliente_email ahora también dispara el 422.)
function vacio(valor) {
  return (
    valor === undefined ||
    valor === null ||
    (typeof valor === "string" && valor.trim() === "")
  );
}

// Envuelve los handlers async: cualquier error pasa al middleware
// de errores de abajo en vez de dejar petado el proceso.
const manejar = (fn) => (req, res, next) => {
  fn(req, res).catch(next);
};

// Escribe en el log de integración (nunca lanza: si falla, sólo avisa).
async function registrar(evento, pedidoId, resultado, detalle, extra = {}) {
  try {
    await pool.query(
      `INSERT INTO integracion_log
         (execution_id, evento, pedido_id, resultado, codigo_error, detalle, duracion_ms, origen)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        extra.execution_id ?? null,
        evento,
        pedidoId ?? null,
        resultado,
        extra.codigo_error ?? null,
        detalle ?? null,
        extra.duracion_ms ?? null,
        extra.origen ?? null,
      ],
    );
  } catch (err) {
    console.error("No se pudo escribir el log:", err.message);
  }
}

// ---------------------------------------------------------------
// 3. GET /healthz — sondeo de vida para el keep-alive de Render
// ---------------------------------------------------------------
app.get(
  "/healthz",
  manejar(async (req, res) => {
    await pool.query("SELECT 1");
    res.json({
      ok: true,
      servicio: "back-office",
      base_datos: "postgresql",
      fecha: new Date().toISOString(),
    });
  }),
);

// ---------------------------------------------------------------
// 4. POST /pedidos — recibe un pedido de n8n (Escenario 1)
// ---------------------------------------------------------------
app.post(
  "/pedidos",
  manejar(async (req, res) => {
    const p = req.body || {};
    // Escenario 2: la tienda avisa de los cambios de estado por la misma
    // puerta de entrada (order.*). En modo directo se aplica aquí; cuando
    // INTEGRACION_WEBHOOK_URL apunte a n8n, n8n lo reenviará a
    // PATCH /pedidos/:id/estado y este camino no se usará.
    if (p.evento === "order.status_changed") {
      const faltanEstado = ["pedido_id", "estado"].filter((campo) =>
        vacio(p[campo]),
      );

      if (faltanEstado.length > 0) {
        const detalle = `Faltan campos: ${faltanEstado.join(", ")}`;
        await registrar(
          "order.status_changed",
          p.pedido_id ?? null,
          "error",
          detalle,
        );
        return res.status(422).json({ error: detalle });
      }

      if (!ESTADOS_VALIDOS.includes(p.estado)) {
        const detalle = `Estado inválido. Valores: ${ESTADOS_VALIDOS.join(", ")}`;
        await registrar("order.status_changed", p.pedido_id, "error", detalle);
        return res.status(422).json({ error: detalle });
      }

      const cambio = await pool.query(
        "UPDATE pedidos SET estado = $1 WHERE pedido_id = $2 RETURNING pedido_id",
        [p.estado, p.pedido_id],
      );

      if (cambio.rowCount === 0) {
        await registrar(
          "order.status_changed",
          p.pedido_id,
          "error",
          "pedido inexistente",
        );
        return res.status(404).json({ error: "Pedido no encontrado" });
      }

      await registrar(
        "order.status_changed",
        p.pedido_id,
        "correcto",
        `estado → ${p.estado}`,
      );
      return res
        .status(200)
        .json({ ok: true, pedido_id: p.pedido_id, estado: p.estado });
    }

    // Validación de campos obligatorios
    const faltan = ["pedido_id", "total", "lineas"].filter(
      (campo) => vacio(p[campo]),
    );

    if (faltan.length > 0) {
      const detalle = `Faltan campos: ${faltan.join(", ")}`;
      await registrar("order.created", p.pedido_id ?? null, "error", detalle);
      return res.status(422).json({ error: detalle });
    }

    if (!Number.isFinite(Number(p.total))) {
      const detalle = "total debe ser un número";
      await registrar("order.created", p.pedido_id, "error", detalle);
      return res.status(422).json({ error: detalle });
    }

    if (!Array.isArray(p.lineas)) {
      const detalle = "lineas debe ser una lista";
      await registrar("order.created", p.pedido_id, "error", detalle);
      return res.status(422).json({ error: detalle });
    }

    for (const [i, l] of p.lineas.entries()) {
      if (
        vacio(l?.producto) ||
        !Number.isFinite(Number(l?.cantidad)) ||
        !Number.isFinite(Number(l?.precio))
      ) {
        const detalle = `Línea inválida en la posición ${i}: producto, cantidad y precio obligatorios`;
        await registrar("order.created", p.pedido_id, "error", detalle);
        return res.status(422).json({ error: detalle });
      }
    }

    // Guardar pedido + sus líneas (en transacción: todo o nada).
    // ON CONFLICT DO NOTHING = idempotencia nativa de Postgres:
    // si el pedido ya existe, no se duplica.
    const cliente = await pool.connect();
    try {
      await cliente.query("BEGIN");

      const creado = await cliente.query(
        `INSERT INTO pedidos
           (pedido_id, cliente_email, cliente_nombre, total, moneda, estado, fecha)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (pedido_id) DO NOTHING
         RETURNING pedido_id`,
        [
          p.pedido_id,
          vacio(p.cliente_email) ? null : p.cliente_email,
          p.cliente_nombre ?? null,
          Number(p.total),
          p.moneda ?? "EUR",
          p.estado ?? "creado",
          p.fecha ?? new Date().toISOString(),
        ],
      );

      if (creado.rowCount === 0) {
        await cliente.query("ROLLBACK");
        await registrar(
          "order.created",
          p.pedido_id,
          "correcto",
          "duplicado ignorado",
        );
        return res.status(200).json({ aviso: "El pedido ya existía" });
      }

      for (const l of p.lineas) {
        await cliente.query(
          `INSERT INTO lineas_pedido (pedido_id, producto, cantidad, precio)
           VALUES ($1, $2, $3, $4)`,
          [p.pedido_id, l.producto, Number(l.cantidad), Number(l.precio)],
        );
      }

      await cliente.query("COMMIT");
    } catch (err) {
      await cliente.query("ROLLBACK");
      throw err;
    } finally {
      cliente.release();
    }

    await registrar("order.created", p.pedido_id, "correcto", "pedido creado");
    res.status(201).json({ ok: true, pedido_id: p.pedido_id });
  }),
);

// ---------------------------------------------------------------
// 5. GET /pedidos — lista de pedidos (para ver el "después")
// ---------------------------------------------------------------
app.get(
  "/pedidos",
  manejar(async (req, res) => {
    const { cliente_email } = req.query;

    const r = cliente_email
      ? await pool.query(
          "SELECT * FROM pedidos WHERE cliente_email = $1 ORDER BY recibido_en DESC",
          [cliente_email],
        )
      : await pool.query("SELECT * FROM pedidos ORDER BY recibido_en DESC");

    res.json(r.rows);
  }),
);

// ---------------------------------------------------------------
// 6. GET /pedidos/:id — un pedido con sus líneas
// ---------------------------------------------------------------
app.get(
  "/pedidos/:id",
  manejar(async (req, res) => {
    const r = await pool.query("SELECT * FROM pedidos WHERE pedido_id = $1", [
      req.params.id,
    ]);

    if (r.rowCount === 0) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    const lineas = await pool.query(
      "SELECT * FROM lineas_pedido WHERE pedido_id = $1 ORDER BY id",
      [req.params.id],
    );

    res.json({ ...r.rows[0], lineas: lineas.rows });
  }),
);

// ---------------------------------------------------------------
// 7. PATCH /pedidos/:id/estado — cambio de estado (Escenario 2)
// ---------------------------------------------------------------
const ESTADOS_VALIDOS = [
  "creado",
  "pago_simulado",
  "preparacion",
  "enviado",
  "cancelado",
];

app.patch(
  "/pedidos/:id/estado",
  manejar(async (req, res) => {
    const { estado } = req.body || {};

    if (!ESTADOS_VALIDOS.includes(estado)) {
      await registrar(
        "cambio_estado",
        req.params.id,
        "error",
        `Estado inválido: ${estado}`,
      );
      return res.status(422).json({
        error: `Estado inválido. Valores: ${ESTADOS_VALIDOS.join(", ")}`,
      });
    }

    const r = await pool.query(
      "UPDATE pedidos SET estado = $1 WHERE pedido_id = $2 RETURNING pedido_id",
      [estado, req.params.id],
    );

    if (r.rowCount === 0) {
      await registrar(
        "cambio_estado",
        req.params.id,
        "error",
        "pedido inexistente",
      );
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    await registrar(
      "cambio_estado",
      req.params.id,
      "correcto",
      `estado → ${estado}`,
    );
    res.json({ ok: true, pedido_id: req.params.id, estado });
  }),
);
// ---------------------------------------------------------------
// 7b. GET /productos-mas-solicitados — top por unidades
// ---------------------------------------------------------------
app.get("/productos-mas-solicitados", manejar(async (req, res) => {
  const r = await pool.query(`
    SELECT producto,
           SUM(cantidad)::int AS unidades,
           COUNT(DISTINCT pedido_id)::int AS pedidos
    FROM lineas_pedido
    GROUP BY producto
    ORDER BY unidades DESC, producto ASC
    LIMIT 10
  `);
  res.json(r.rows);
}));

// ---------------------------------------------------------------
// 7c. GET /metricas/resolucion — tiempo medio de resolución
// ---------------------------------------------------------------
app.get("/metricas/resolucion", manejar(async (req, res) => {
  const r = await pool.query(`
    SELECT AVG(EXTRACT(EPOCH FROM (fecha_resolucion - recibido_en)) * 1000) AS media_ms,
           COUNT(*) FILTER (WHERE fecha_resolucion IS NOT NULL)::int AS cerradas
    FROM incidencias
  `);
  const row = r.rows[0] || {};
  res.json({ media_ms: row.media_ms ?? null, cerradas: row.cerradas ?? 0 });
}));
// ---------------------------------------------------------------
// 8. GET /logs — historial de integraciones (aciertos y errores)
//    Filtros opcionales: ?evento= y ?resultado=
// ---------------------------------------------------------------
app.get(
  "/logs",
  manejar(async (req, res) => {
    const { evento, resultado } = req.query;

    let sql = "SELECT * FROM integracion_log WHERE 1=1";
    const valores = [];

    if (evento) {
      valores.push(evento);
      sql += ` AND evento = $${valores.length}`;
    }
    if (resultado) {
      valores.push(resultado);
      sql += ` AND resultado = $${valores.length}`;
    }

    sql += " ORDER BY id DESC";
    const r = await pool.query(sql, valores);
    res.json(r.rows);
  }),
);

// ---------------------------------------------------------------
// 9. POST /logs — cada quien registra SUS ejecuciones (n8n, la
//    tienda, pruebas manuales). Idempotente por execution_id, así
//    los reintentos de n8n no duplican métricas.
// ---------------------------------------------------------------
app.post(
  "/logs",
  manejar(async (req, res) => {
    const p = req.body || {};

    const faltan = ["evento", "resultado"].filter((campo) => vacio(p[campo]));
    if (faltan.length > 0) {
      return res
        .status(422)
        .json({ error: `Faltan campos: ${faltan.join(", ")}` });
    }

    let duracion = null;
    if (p.duracion_ms != null && p.duracion_ms !== "") {
      duracion = Number(p.duracion_ms);
      if (!Number.isFinite(duracion)) {
        return res
          .status(422)
          .json({ error: "duracion_ms debe ser un número" });
      }
    }

    const r = await pool.query(
      `INSERT INTO integracion_log
         (execution_id, evento, pedido_id, resultado, codigo_error, detalle, duracion_ms, origen)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (execution_id) DO NOTHING
       RETURNING id`,
      [
        p.execution_id ?? null,
        p.evento,
        p.pedido_id ?? null,
        p.resultado,
        p.codigo_error ?? null,
        p.detalle ?? null,
        duracion,
        p.origen ?? null,
      ],
    );

    if (r.rowCount === 0) {
      return res
        .status(200)
        .json({ aviso: "Este execution_id ya estaba registrado" });
    }

    res.status(201).json({ ok: true, log_id: r.rows[0].id });
  }),
);

// ---------------------------------------------------------------
// 10. Incidencias (Escenario 3) — nacen en Telegram y llegan
//     por el flujo de n8n con el evento incident.created
// ---------------------------------------------------------------
const ESTADOS_INCIDENCIA = ["abierta", "en_revision", "resuelta", "cerrada"];
const PRIORIDADES = ["alta", "media", "baja"];

app.post(
  "/incidencias",
  manejar(async (req, res) => {
    const p = req.body || {};

    const faltan = [
      "incidencia_id",
      "tipo",
      "descripcion",
      "fecha",
    ].filter((campo) => vacio(p[campo]));

    if (faltan.length > 0) {
      const detalle = `Faltan campos: ${faltan.join(", ")}`;
      await registrar(
        "incident.created",
        p.pedido_id ?? null,
        "error",
        detalle,
      );
      return res.status(422).json({ error: detalle });
    }

    if (p.estado != null && !ESTADOS_INCIDENCIA.includes(p.estado)) {
      return res.status(422).json({
        error: `Estado inválido. Valores: ${ESTADOS_INCIDENCIA.join(", ")}`,
      });
    }

    if (p.prioridad != null && !PRIORIDADES.includes(p.prioridad)) {
      return res.status(422).json({
        error: `Prioridad inválida. Valores: ${PRIORIDADES.join(", ")}`,
      });
    }

    // Idempotencia por incidencia_id (igual que en pedidos)
    const insertado = await pool.query(
      `INSERT INTO incidencias
         (incidencia_id, pedido_id, cliente_email, telegram_chat_id, tipo, descripcion, estado, prioridad, fecha)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (incidencia_id) DO NOTHING
       RETURNING incidencia_id`,
      [
        p.incidencia_id,
        p.pedido_id ?? null,
        vacio(p.cliente_email) ? null : p.cliente_email,
        p.telegram_chat_id ?? null,
        p.tipo,
        p.descripcion,
        p.estado ?? "abierta",
        p.prioridad ?? null,
        p.fecha,
      ],
    );

    if (insertado.rowCount === 0) {
      await registrar(
        "incident.created",
        p.pedido_id ?? null,
        "correcto",
        "duplicado ignorado",
      );
      return res.status(200).json({ aviso: "La incidencia ya existía" });
    }

    // El pedido puede aún no haber llegado al back-office: se crea la
    // incidencia igualmente y se anota el aviso. Un cliente no debería
    // perder su queja por un fallo de la cadena.
    let aviso = "";
    if (p.pedido_id) {
      const pedido = await pool.query(
        "SELECT 1 FROM pedidos WHERE pedido_id = $1",
        [p.pedido_id],
      );
      if (pedido.rowCount === 0)
        aviso = `; pedido no encontrado (${p.pedido_id})`;
    }

    await registrar(
      "incident.created",
      p.pedido_id ?? null,
      "correcto",
      `incidencia creada${aviso}`,
    );
    res.status(201).json({ ok: true, incidencia_id: p.incidencia_id });
  }),
);

// GET /incidencias — filtros ?pedido_id=, ?cliente_email= y ?estado=
app.get(
  "/incidencias",
  manejar(async (req, res) => {
    const { pedido_id, cliente_email, estado } = req.query;

    let sql = "SELECT * FROM incidencias WHERE 1=1";
    const valores = [];

    if (pedido_id) {
      valores.push(pedido_id);
      sql += ` AND pedido_id = $${valores.length}`;
    }
    if (cliente_email) {
      valores.push(cliente_email);
      sql += ` AND cliente_email = $${valores.length}`;
    }
    if (estado) {
      valores.push(estado);
      sql += ` AND estado = $${valores.length}`;
    }

    sql += " ORDER BY recibido_en DESC";
    const r = await pool.query(sql, valores);
    res.json(r.rows);
  }),
);

// PATCH /incidencias/:id — actualiza estado, tipo (categoría) o prioridad
app.patch(
  "/incidencias/:id",
  manejar(async (req, res) => {
    const { estado, tipo, prioridad } = req.body || {};

    if (estado !== undefined && !ESTADOS_INCIDENCIA.includes(estado)) {
      await registrar(
        "cambio_incidencia",
        null,
        "error",
        `Estado inválido: ${estado}`,
      );
      return res.status(422).json({
        error: `Estado inválido. Valores: ${ESTADOS_INCIDENCIA.join(", ")}`,
      });
    }

    if (
      prioridad !== undefined &&
      prioridad !== null &&
      !PRIORIDADES.includes(prioridad)
    ) {
      return res.status(422).json({
        error: `Prioridad inválida. Valores: ${PRIORIDADES.join(", ")}`,
      });
    }

    const cambios = [];
    const valores = [];
    const resumen = [];

    if (estado !== undefined) {
      valores.push(estado);
      cambios.push(`estado = $${valores.length}`);
      resumen.push(`estado → ${estado}`);
    }
    if (estado === "resuelta" || estado === "cerrada") {
      cambios.push("fecha_resolucion = COALESCE(fecha_resolucion, now())");
      resumen.push("fecha_resolucion fijada");
    }
    if (tipo !== undefined) {
      valores.push(tipo);
      cambios.push(`tipo = $${valores.length}`);
      resumen.push(`tipo → ${tipo}`);
    }
    if (prioridad !== undefined) {
      valores.push(prioridad);
      cambios.push(`prioridad = $${valores.length}`);
      resumen.push(`prioridad → ${prioridad}`);
    }

    if (cambios.length === 0) {
      return res.status(422).json({
        error: "No hay campos que actualizar (estado, tipo, prioridad)",
      });
    }

    const existe = await pool.query(
      "SELECT pedido_id FROM incidencias WHERE incidencia_id = $1",
      [req.params.id],
    );

    if (existe.rowCount === 0) {
      await registrar(
        "cambio_incidencia",
        null,
        "error",
        "incidencia inexistente",
      );
      return res.status(404).json({ error: "Incidencia no encontrada" });
    }

    valores.push(req.params.id);
    await pool.query(
      `UPDATE incidencias SET ${cambios.join(", ")} WHERE incidencia_id = $${valores.length}`,
      valores,
    );

    await registrar(
      "cambio_incidencia",
      existe.rows[0].pedido_id,
      "correcto",
      `incidencia ${req.params.id}: ${resumen.join(", ")}`,
    );
    res.json({ ok: true, incidencia_id: req.params.id });
  }),
);

// ---------------------------------------------------------------
// 11. decisiones_agente — lo que el agente propone y su revisión
//     (tabla aparte de integracion_log: P4 necesita "propuestas vs
//     aprobadas")
// ---------------------------------------------------------------
const ESTADOS_DECISION = ["pendiente_revision", "aprobado", "rechazado"];

app.post(
  "/decisiones",
  manejar(async (req, res) => {
    const p = req.body || {};

    const faltan = [
      "decision_id",
      "incidencia_id",
      "tipo_caso",
      "accion_propuesta",
      "justificacion",
    ].filter((campo) => vacio(p[campo]));

    if (faltan.length > 0) {
      const detalle = `Faltan campos: ${faltan.join(", ")}`;
      await registrar("decision.created", null, "error", detalle);
      return res.status(422).json({ error: detalle });
    }

    if (p.estado != null && !ESTADOS_DECISION.includes(p.estado)) {
      return res.status(422).json({
        error: `Estado inválido. Valores: ${ESTADOS_DECISION.join(", ")}`,
      });
    }

    if (p.prioridad != null && !PRIORIDADES.includes(p.prioridad)) {
      return res.status(422).json({
        error: `Prioridad inválida. Valores: ${PRIORIDADES.join(", ")}`,
      });
    }

    let confianza = null;
    if (p.confianza != null && p.confianza !== "") {
      confianza = Number(p.confianza);
      if (!Number.isFinite(confianza)) {
        return res.status(422).json({ error: "confianza debe ser un número" });
      }
    }

    // Una decisión tiene que recaer sobre una incidencia existente
    const incidencia = await pool.query(
      "SELECT 1 FROM incidencias WHERE incidencia_id = $1",
      [p.incidencia_id],
    );

    if (incidencia.rowCount === 0) {
      const detalle = `Incidencia inexistente: ${p.incidencia_id}`;
      await registrar("decision.created", null, "error", detalle);
      return res.status(422).json({ error: detalle });
    }

    // Idempotencia por decision_id
    const insertado = await pool.query(
      `INSERT INTO decisiones_agente
         (decision_id, incidencia_id, tipo_caso, accion_propuesta, respuesta_cliente,
          justificacion, prioridad, confianza, riesgos, estado, revisado_por,
          fecha_propuesta, fecha_revision)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (decision_id) DO NOTHING
       RETURNING decision_id`,
      [
        p.decision_id,
        p.incidencia_id,
        p.tipo_caso,
        p.accion_propuesta,
        p.respuesta_cliente ?? null,
        p.justificacion,
        p.prioridad ?? null,
        confianza,
        p.riesgos ?? null,
        p.estado ?? "pendiente_revision",
        p.revisado_por ?? null,
        p.fecha_propuesta ?? new Date().toISOString(),
        p.fecha_revision ?? null,
      ],
    );

    if (insertado.rowCount === 0) {
      await registrar(
        "decision.created",
        null,
        "correcto",
        "duplicado ignorado",
      );
      return res.status(200).json({ aviso: "La decisión ya existía" });
    }

    await registrar(
      "decision.created",
      null,
      "correcto",
      `decisión ${p.decision_id} propuesta sobre ${p.incidencia_id}`,
    );
    res.status(201).json({ ok: true, decision_id: p.decision_id });
  }),
);

// GET /decisiones — filtros ?incidencia_id= y ?estado=
app.get(
  "/decisiones",
  manejar(async (req, res) => {
    const { incidencia_id, estado } = req.query;

    let sql = "SELECT * FROM decisiones_agente WHERE 1=1";
    const valores = [];

    if (incidencia_id) {
      valores.push(incidencia_id);
      sql += ` AND incidencia_id = $${valores.length}`;
    }
    if (estado) {
      valores.push(estado);
      sql += ` AND estado = $${valores.length}`;
    }

    sql += " ORDER BY recibido_en DESC";
    const r = await pool.query(sql, valores);
    res.json(r.rows);
  }),
);

// PATCH /decisiones/:id — revisión humana (aprobar o rechazar)
app.patch(
  "/decisiones/:id",
  manejar(async (req, res) => {
    const { estado, revisado_por, fecha_revision, respuesta_cliente } =
      req.body || {};

    if (estado !== undefined && !ESTADOS_DECISION.includes(estado)) {
      await registrar(
        "revision_decision",
        null,
        "error",
        `Estado inválido: ${estado}`,
      );
      return res.status(422).json({
        error: `Estado inválido. Valores: ${ESTADOS_DECISION.join(", ")}`,
      });
    }

    const cambios = [];
    const valores = [];
    const resumen = [];

    if (estado !== undefined) {
      valores.push(estado);
      cambios.push(`estado = $${valores.length}`);
      resumen.push(`estado → ${estado}`);
    }
    if (revisado_por !== undefined) {
      valores.push(revisado_por);
      cambios.push(`revisado_por = $${valores.length}`);
      resumen.push(`revisado_por → ${revisado_por}`);
    }
    if (fecha_revision !== undefined) {
      valores.push(fecha_revision);
      cambios.push(`fecha_revision = $${valores.length}`);
      resumen.push("fecha_revision actualizada");
    }
    if (respuesta_cliente !== undefined) {
      valores.push(respuesta_cliente);
      cambios.push(`respuesta_cliente = $${valores.length}`);
      resumen.push("respuesta_cliente actualizada");
    }

    if (cambios.length === 0) {
      return res.status(422).json({
        error:
          "No hay campos que actualizar (estado, revisado_por, fecha_revision, respuesta_cliente)",
      });
    }

    const existe = await pool.query(
      "SELECT 1 FROM decisiones_agente WHERE decision_id = $1",
      [req.params.id],
    );

    if (existe.rowCount === 0) {
      await registrar(
        "revision_decision",
        null,
        "error",
        "decisión inexistente",
      );
      return res.status(404).json({ error: "Decisión no encontrada" });
    }

    valores.push(req.params.id);
    await pool.query(
      `UPDATE decisiones_agente SET ${cambios.join(", ")} WHERE decision_id = $${valores.length}`,
      valores,
    );

    await registrar(
      "revision_decision",
      null,
      "correcto",
      `decisión ${req.params.id}: ${resumen.join(", ")}`,
    );
    res.json({ ok: true, decision_id: req.params.id });
  }),
);

// ---------------------------------------------------------------
// 12. GET / — portada HTML con endpoints y estado actual
// ---------------------------------------------------------------
app.get(
  "/",
  manejar(async (req, res) => {
    const [cPedidos, cIncidencias, cDecisiones] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS n FROM pedidos"),
      pool.query("SELECT COUNT(*)::int AS n FROM incidencias"),
      pool.query("SELECT COUNT(*)::int AS n FROM decisiones_agente"),
    ]);

    const nPedidos = cPedidos.rows[0].n;
    const nIncidencias = cIncidencias.rows[0].n;
    const nDecisiones = cDecisiones.rows[0].n;

    const filas = [
      ["GET", "/", "Esta portada"],
      ["GET", "/healthz", "Sondeo de vida (keep-alive de Render)"],
      ["POST", "/pedidos", "Crea un pedido (order.created)"],
      ["GET", "/pedidos", "Lista de pedidos (?cliente_email=)"],
      ["GET", "/pedidos/:id", "Pedido con sus líneas"],
      ["PATCH", "/pedidos/:id/estado", "Cambia el estado"],
      ["POST", "/incidencias", "Crea una incidencia (incident.created)"],
      ["GET", "/incidencias", "Lista (?pedido_id= &cliente_email= &estado=)"],
      ["PATCH", "/incidencias/:id", "Estado, tipo o prioridad"],
      ["POST", "/decisiones", "Propuesta del agente de IA"],
      ["GET", "/decisiones", "Lista (?incidencia_id= &estado=)"],
      ["PATCH", "/decisiones/:id", "Revisión humana: aprobar o rechazar"],
      ["GET", "/logs", "Trazabilidad (?evento= &resultado=)"],
      ["POST", "/logs", "Registra una ejecución de n8n (idempotente)"],
      ["GET", "/productos-mas-solicitados", "Top de productos por unidades"],
      ["GET", "/metricas/resolucion", "Tiempo medio de resolución de incidencias"],
    ]
      .map(
        ([m, ruta, que]) =>
          `<tr><td><span class="m ${m.toLowerCase()}">${m}</span></td><td><code>${ruta}</code></td><td>${que}</td></tr>`,
      )
      .join("");

    res.type("html").send(`<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Back-office · Tarea 2</title>
<style>
  * { box-sizing: border-box; }
  body { margin:0; font-family: system-ui, -apple-system, sans-serif; background:#f4f5f7; color:#1c2430; }
  header { background: linear-gradient(135deg,#4338ca,#7c3aed); color:#fff; padding:32px 24px; }
  header .caja { max-width:920px; margin:0 auto; }
  h1 { margin:0 0 6px; font-size:26px; }
  header p { margin:0; opacity:.85; }
  .aviso { display:inline-block; margin-top:14px; background:rgba(255,255,255,.18); border:1px solid rgba(255,255,255,.4); padding:4px 10px; border-radius:999px; font-size:12px; letter-spacing:.4px; }
  main { max-width:920px; margin:-18px auto 40px; padding:0 24px; }
  .tarjetas { display:flex; gap:14px; flex-wrap:wrap; }
  .tarjeta { background:#fff; border:1px solid #e3e6ea; border-radius:12px; padding:16px 20px; flex:1; min-width:180px; box-shadow:0 1px 3px rgba(16,24,40,.06); }
  .tarjeta .num { font-size:30px; font-weight:700; color:#4338ca; }
  .tarjeta .lab { font-size:13px; color:#667085; }
  h2 { font-size:16px; margin:30px 0 10px; }
  table { width:100%; border-collapse:collapse; background:#fff; border:1px solid #e3e6ea; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(16,24,40,.06); }
  th, td { text-align:left; padding:10px 14px; font-size:14px; border-bottom:1px solid #eef0f3; }
  th { background:#f9fafb; color:#475467; font-size:12px; text-transform:uppercase; letter-spacing:.5px; }
  tr:last-child td { border-bottom:0; }
  code { font-family: ui-monospace, Consolas, monospace; font-size:13px; color:#344054; }
  .m { display:inline-block; min-width:54px; text-align:center; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:700; }
  .m.get { background:#ecfdf3; color:#027a48; }
  .m.post { background:#eff8ff; color:#175cd3; }
  .m.patch { background:#fffaeb; color:#b54708; }
  .url { background:#fff; border:1px dashed #c7cdd6; border-radius:10px; padding:12px 16px; font-family:ui-monospace, Consolas, monospace; font-size:13px; margin-top:18px; color:#344054; word-break:break-all; }
  footer { max-width:920px; margin:0 auto 30px; padding:0 24px; font-size:12px; color:#98a2b3; text-align:center; }
</style>
</head>
<body>
<header>
  <div class="caja">
    <h1>Back-office · Tarea 2</h1>
    <p>Sistema independiente del eCommerce: Express + PostgreSQL (Supabase) con almacenamiento propio</p>
    <span class="aviso">PROTOTIPO ACADÉMICO · SIN ACTIVIDAD COMERCIAL REAL</span>
  </div>
</header>
<main>
  <div class="tarjetas">
    <div class="tarjeta"><div class="num">${nPedidos}</div><div class="lab">pedidos registrados</div></div>
    <div class="tarjeta"><div class="num">${nIncidencias}</div><div class="lab">incidencias</div></div>
    <div class="tarjeta"><div class="num">${nDecisiones}</div><div class="lab">decisiones del agente</div></div>
  </div>
  <h2>Endpoints</h2>
  <table>
    <tr><th>Método</th><th>Ruta</th><th>Descripción</th></tr>
    ${filas}
  </table>
  <div class="url">Base URL: https://backoffice-tarea2.onrender.com — en local: http://localhost:4000</div>
</main>
<footer>Base de datos: Supabase «backoffice-tarea2» (separada de la de la tienda) — los datos persisten entre despliegues · Datos de prueba: ana@test.com · ORD-001 · INC-001 · DEC-001</footer>
</body>
</html>`);
  }),
);

// ---------------------------------------------------------------
// 13. Middleware de errores — ningún error deja el proceso caído
// ---------------------------------------------------------------
app.use((err, req, res, next) => {
  console.error("Error no controlado:", err);
  registrar("error_interno", null, "error", err.message || String(err));
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ error: "Error interno del servidor" });
});

// ---------------------------------------------------------------
// 14. Arranque: primero el esquema, luego escuchar
// ---------------------------------------------------------------
async function iniciar() {
  await pool.query("ALTER TABLE incidencias ADD COLUMN IF NOT EXISTS fecha_resolucion TIMESTAMPTZ");
  await pool.query("ALTER TABLE pedidos ALTER COLUMN cliente_email DROP NOT NULL");
  await pool.query("ALTER TABLE incidencias ALTER COLUMN cliente_email DROP NOT NULL");
  await pool.query(ESQUEMA);
  app.listen(PUERTO, () => {
    console.log(`Back-office escuchando en http://localhost:${PUERTO}`);
  });
}

iniciar().catch((err) => {
  console.error("No se pudo arrancar el back-office:", err);
  process.exit(1);
});
