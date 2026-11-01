const express = require("express");
const Database = require("better-sqlite3");
const path = require("node:path");

const app = express();
const db = new Database(path.join(__dirname, "pedidos.db"));
const PUERTO = process.env.PORT || 4000;

app.use(express.json());

// ---------------------------------------------------------------
// 1. Esquema: crea las tablas si no existen (idempotente)
// ---------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS pedidos (
    pedido_id    TEXT PRIMARY KEY,
    cliente_email TEXT NOT NULL,
    cliente_nombre TEXT,
    total        REAL NOT NULL,
    moneda       TEXT NOT NULL DEFAULT 'EUR',
    estado       TEXT NOT NULL DEFAULT 'creado',
    fecha        TEXT NOT NULL,
    recibido_en  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS lineas_pedido (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id  TEXT NOT NULL REFERENCES pedidos(pedido_id),
    producto   TEXT NOT NULL,
    cantidad   INTEGER NOT NULL,
    precio     REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS integracion_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    evento     TEXT NOT NULL,
    pedido_id  TEXT,
    resultado  TEXT NOT NULL,   -- 'correcto' | 'error'
    detalle    TEXT,
    creado_en  TEXT NOT NULL DEFAULT (datetime('now'))
  );

    CREATE TABLE IF NOT EXISTS incidencias (
    incidencia_id    TEXT PRIMARY KEY,
    pedido_id        TEXT,
    cliente_email    TEXT NOT NULL,
    telegram_chat_id TEXT,
    tipo             TEXT NOT NULL,
    descripcion      TEXT NOT NULL,
    estado           TEXT NOT NULL DEFAULT 'abierta',
    prioridad        TEXT,
    fecha            TEXT NOT NULL,
    recibido_en      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS decisiones_agente (
    decision_id       TEXT PRIMARY KEY,
    incidencia_id     TEXT NOT NULL REFERENCES incidencias(incidencia_id),
    tipo_caso         TEXT NOT NULL,
    accion_propuesta  TEXT NOT NULL,
    respuesta_cliente TEXT,
    justificacion     TEXT NOT NULL,
    prioridad         TEXT,
    confianza         REAL,
    riesgos           TEXT,
    estado            TEXT NOT NULL DEFAULT 'pendiente_revision',
    revisado_por      TEXT,
    fecha_propuesta   TEXT NOT NULL,
    fecha_revision    TEXT,
    recibido_en       TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ---------------------------------------------------------------
// 2. Función auxiliar: escribe en el log de integración
//
// ---------------------------------------------------------------
function registrar(evento, pedidoId, resultado, detalle) {
  db.prepare(
    `INSERT INTO integracion_log (evento, pedido_id, resultado, detalle)
     VALUES (?, ?, ?, ?)`,
  ).run(evento, pedidoId, resultado, detalle);
}

// ---------------------------------------------------------------
// 3. POST /pedidos — recibe un pedido de n8n (Escenario 1)
// ---------------------------------------------------------------
app.post("/pedidos", (req, res) => {
  const p = req.body || {};

  // Validación de campos obligatorios
  const faltan = ["pedido_id", "cliente_email", "total", "lineas"].filter(
    (campo) => p[campo] === undefined || p[campo] === null,
  );

  if (faltan.length > 0) {
    const detalle = `Faltan campos: ${faltan.join(", ")}`;
    registrar("order.created", p.pedido_id ?? null, "error", detalle);
    return res.status(422).json({ error: detalle });
  }

  // Idempotencia: si el pedido ya existe, no lo duplicamos
  const yaExiste = db
    .prepare("SELECT pedido_id FROM pedidos WHERE pedido_id = ?")
    .get(p.pedido_id);

  if (yaExiste) {
    registrar("order.created", p.pedido_id, "correcto", "duplicado ignorado");
    return res.status(200).json({ aviso: "El pedido ya existía" });
  }

  // Guardar pedido + sus líneas (en transacción: todo o nada)
  const guardar = db.transaction(() => {
    db.prepare(
      `INSERT INTO pedidos (pedido_id, cliente_email, cliente_nombre, total, moneda, estado, fecha)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      p.pedido_id,
      p.cliente_email,
      p.cliente_nombre ?? null,
      Number(p.total),
      p.moneda ?? "EUR",
      p.estado ?? "creado",
      p.fecha,
    );

    const linea = db.prepare(
      `INSERT INTO lineas_pedido (pedido_id, producto, cantidad, precio)
       VALUES (?, ?, ?, ?)`,
    );
    for (const l of p.lineas) {
      linea.run(p.pedido_id, l.producto, Number(l.cantidad), Number(l.precio));
    }
  });

  guardar();
  registrar("order.created", p.pedido_id, "correcto", "pedido creado");
  res.status(201).json({ ok: true, pedido_id: p.pedido_id });
});

// ---------------------------------------------------------------
// 4. GET /pedidos — lista de pedidos (para ver el "después")
// ---------------------------------------------------------------
app.get("/pedidos", (req, res) => {
  const { cliente_email } = req.query;

  const pedidos = cliente_email
    ? db
        .prepare(
          "SELECT * FROM pedidos WHERE cliente_email = ? ORDER BY recibido_en DESC",
        )
        .all(cliente_email)
    : db.prepare("SELECT * FROM pedidos ORDER BY recibido_en DESC").all();

  res.json(pedidos);
});

// ---------------------------------------------------------------
// 5. GET /pedidos/:id — un pedido con sus líneas
// ---------------------------------------------------------------
app.get("/pedidos/:id", (req, res) => {
  const pedido = db
    .prepare("SELECT * FROM pedidos WHERE pedido_id = ?")
    .get(req.params.id);

  if (!pedido) return res.status(404).json({ error: "Pedido no encontrado" });

  const lineas = db
    .prepare("SELECT * FROM lineas_pedido WHERE pedido_id = ?")
    .all(req.params.id);

  res.json({ ...pedido, lineas });
});

// ---------------------------------------------------------------
// 6. PATCH /pedidos/:id/estado — cambio de estado (Escenario 2)
// ---------------------------------------------------------------
const ESTADOS_VALIDOS = [
  "creado",
  "pago_simulado",
  "preparacion",
  "enviado",
  "cancelado",
];

app.patch("/pedidos/:id/estado", (req, res) => {
  const { estado } = req.body || {};

  if (!ESTADOS_VALIDOS.includes(estado)) {
    registrar(
      "cambio_estado",
      req.params.id,
      "error",
      `Estado inválido: ${estado}`,
    );
    return res.status(422).json({
      error: `Estado inválido. Valores: ${ESTADOS_VALIDOS.join(", ")}`,
    });
  }

  const resultado = db
    .prepare("UPDATE pedidos SET estado = ? WHERE pedido_id = ?")
    .run(estado, req.params.id);

  if (resultado.changes === 0) {
    registrar("cambio_estado", req.params.id, "error", "pedido inexistente");
    return res.status(404).json({ error: "Pedido no encontrado" });
  }

  registrar("cambio_estado", req.params.id, "correcto", `estado → ${estado}`);
  res.json({ ok: true, pedido_id: req.params.id, estado });
});

// ---------------------------------------------------------------
// 7. GET /logs — historial de integraciones (aciertos y errores)
// ---------------------------------------------------------------
app.get("/logs", (req, res) => {
  const logs = db
    .prepare("SELECT * FROM integracion_log ORDER BY id DESC")
    .all();
  res.json(logs);
});

// ---------------------------------------------------------------
// 8. Incidencias (Escenario 3) — nacen en Telegram y llegan
//    por el flujo de n8n con el evento incident.created
// ---------------------------------------------------------------
const ESTADOS_INCIDENCIA = ["abierta", "en_revision", "resuelta", "cerrada"];
const PRIORIDADES = ["alta", "media", "baja"];

app.post("/incidencias", (req, res) => {
  const p = req.body || {};

  const faltan = [
    "incidencia_id",
    "cliente_email",
    "tipo",
    "descripcion",
    "fecha",
  ].filter((campo) => p[campo] === undefined || p[campo] === null);

  if (faltan.length > 0) {
    const detalle = `Faltan campos: ${faltan.join(", ")}`;
    registrar("incident.created", p.pedido_id ?? null, "error", detalle);
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
  const yaExiste = db
    .prepare("SELECT incidencia_id FROM incidencias WHERE incidencia_id = ?")
    .get(p.incidencia_id);

  if (yaExiste) {
    registrar(
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
    const pedido = db
      .prepare("SELECT pedido_id FROM pedidos WHERE pedido_id = ?")
      .get(p.pedido_id);
    if (!pedido) aviso = `; pedido no encontrado (${p.pedido_id})`;
  }

  db.prepare(
    `INSERT INTO incidencias (incidencia_id, pedido_id, cliente_email, telegram_chat_id, tipo, descripcion, estado, prioridad, fecha)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    p.incidencia_id,
    p.pedido_id ?? null,
    p.cliente_email,
    p.telegram_chat_id ?? null,
    p.tipo,
    p.descripcion,
    p.estado ?? "abierta",
    p.prioridad ?? null,
    p.fecha,
  );

  registrar(
    "incident.created",
    p.pedido_id ?? null,
    "correcto",
    `incidencia creada${aviso}`,
  );
  res.status(201).json({ ok: true, incidencia_id: p.incidencia_id });
});

// GET /incidencias — filtros ?pedido_id=, ?cliente_email= y ?estado=
app.get("/incidencias", (req, res) => {
  const { pedido_id, cliente_email, estado } = req.query;

  let sql = "SELECT * FROM incidencias WHERE 1=1";
  const parametros = [];

  if (pedido_id) {
    sql += " AND pedido_id = ?";
    parametros.push(pedido_id);
  }
  if (cliente_email) {
    sql += " AND cliente_email = ?";
    parametros.push(cliente_email);
  }
  if (estado) {
    sql += " AND estado = ?";
    parametros.push(estado);
  }

  sql += " ORDER BY recibido_en DESC";
  res.json(db.prepare(sql).all(...parametros));
});

// PATCH /incidencias/:id — actualiza estado, tipo (categoría) o prioridad
app.patch("/incidencias/:id", (req, res) => {
  const { estado, tipo, prioridad } = req.body || {};

  if (estado !== undefined && !ESTADOS_INCIDENCIA.includes(estado)) {
    registrar("cambio_incidencia", null, "error", `Estado inválido: ${estado}`);
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
    cambios.push("estado = ?");
    valores.push(estado);
    resumen.push(`estado → ${estado}`);
  }
  if (tipo !== undefined) {
    cambios.push("tipo = ?");
    valores.push(tipo);
    resumen.push(`tipo → ${tipo}`);
  }
  if (prioridad !== undefined) {
    cambios.push("prioridad = ?");
    valores.push(prioridad);
    resumen.push(`prioridad → ${prioridad}`);
  }

  if (cambios.length === 0) {
    return res.status(422).json({
      error: "No hay campos que actualizar (estado, tipo, prioridad)",
    });
  }

  const incidencia = db
    .prepare("SELECT * FROM incidencias WHERE incidencia_id = ?")
    .get(req.params.id);

  if (!incidencia) {
    registrar("cambio_incidencia", null, "error", "incidencia inexistente");
    return res.status(404).json({ error: "Incidencia no encontrada" });
  }

  db.prepare(
    `UPDATE incidencias SET ${cambios.join(", ")} WHERE incidencia_id = ?`,
  ).run(...valores, req.params.id);

  registrar(
    "cambio_incidencia",
    incidencia.pedido_id,
    "correcto",
    `incidencia ${req.params.id}: ${resumen.join(", ")}`,
  );
  res.json({ ok: true, incidencia_id: req.params.id });
});

// ---------------------------------------------------------------
// 9. decisiones_agente — lo que el agente propone y su revisión
//    (tabla aparte de integracion_log: P4 necesita "propuestas vs
//    aprobadas")
// ---------------------------------------------------------------
const ESTADOS_DECISION = ["pendiente_revision", "aprobado", "rechazado"];

app.post("/decisiones", (req, res) => {
  const p = req.body || {};

  const faltan = [
    "decision_id",
    "incidencia_id",
    "tipo_caso",
    "accion_propuesta",
    "justificacion",
  ].filter((campo) => p[campo] === undefined || p[campo] === null);

  if (faltan.length > 0) {
    const detalle = `Faltan campos: ${faltan.join(", ")}`;
    registrar("decision.created", null, "error", detalle);
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

  // Una decisión tiene que recaer sobre una incidencia existente
  const incidencia = db
    .prepare("SELECT incidencia_id FROM incidencias WHERE incidencia_id = ?")
    .get(p.incidencia_id);

  if (!incidencia) {
    const detalle = `Incidencia inexistente: ${p.incidencia_id}`;
    registrar("decision.created", null, "error", detalle);
    return res.status(422).json({ error: detalle });
  }

  // Idempotencia por decision_id
  const yaExiste = db
    .prepare("SELECT decision_id FROM decisiones_agente WHERE decision_id = ?")
    .get(p.decision_id);

  if (yaExiste) {
    registrar("decision.created", null, "correcto", "duplicado ignorado");
    return res.status(200).json({ aviso: "La decisión ya existía" });
  }

  db.prepare(
    `INSERT INTO decisiones_agente (decision_id, incidencia_id, tipo_caso, accion_propuesta, respuesta_cliente, justificacion, prioridad, confianza, riesgos, estado, revisado_por, fecha_propuesta, fecha_revision)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    p.decision_id,
    p.incidencia_id,
    p.tipo_caso,
    p.accion_propuesta,
    p.respuesta_cliente ?? null,
    p.justificacion,
    p.prioridad ?? null,
    p.confianza != null ? Number(p.confianza) : null,
    p.riesgos ?? null,
    p.estado ?? "pendiente_revision",
    p.revisado_por ?? null,
    p.fecha_propuesta ?? new Date().toISOString(),
    p.fecha_revision ?? null,
  );

  registrar(
    "decision.created",
    null,
    "correcto",
    `decisión ${p.decision_id} propuesta sobre ${p.incidencia_id}`,
  );
  res.status(201).json({ ok: true, decision_id: p.decision_id });
});

// GET /decisiones — filtros ?incidencia_id= y ?estado=
app.get("/decisiones", (req, res) => {
  const { incidencia_id, estado } = req.query;

  let sql = "SELECT * FROM decisiones_agente WHERE 1=1";
  const parametros = [];

  if (incidencia_id) {
    sql += " AND incidencia_id = ?";
    parametros.push(incidencia_id);
  }
  if (estado) {
    sql += " AND estado = ?";
    parametros.push(estado);
  }

  sql += " ORDER BY recibido_en DESC";
  res.json(db.prepare(sql).all(...parametros));
});

// PATCH /decisiones/:id — revisión humana (aprobar o rechazar)
app.patch("/decisiones/:id", (req, res) => {
  const { estado, revisado_por, fecha_revision, respuesta_cliente } =
    req.body || {};

  if (estado !== undefined && !ESTADOS_DECISION.includes(estado)) {
    registrar("revision_decision", null, "error", `Estado inválido: ${estado}`);
    return res.status(422).json({
      error: `Estado inválido. Valores: ${ESTADOS_DECISION.join(", ")}`,
    });
  }

  const cambios = [];
  const valores = [];
  const resumen = [];

  if (estado !== undefined) {
    cambios.push("estado = ?");
    valores.push(estado);
    resumen.push(`estado → ${estado}`);
  }
  if (revisado_por !== undefined) {
    cambios.push("revisado_por = ?");
    valores.push(revisado_por);
    resumen.push(`revisado_por → ${revisado_por}`);
  }
  if (fecha_revision !== undefined) {
    cambios.push("fecha_revision = ?");
    valores.push(fecha_revision);
    resumen.push("fecha_revision actualizada");
  }
  if (respuesta_cliente !== undefined) {
    cambios.push("respuesta_cliente = ?");
    valores.push(respuesta_cliente);
    resumen.push("respuesta_cliente actualizada");
  }

  if (cambios.length === 0) {
    return res.status(422).json({
      error:
        "No hay campos que actualizar (estado, revisado_por, fecha_revision, respuesta_cliente)",
    });
  }

  const decision = db
    .prepare("SELECT decision_id FROM decisiones_agente WHERE decision_id = ?")
    .get(req.params.id);

  if (!decision) {
    registrar("revision_decision", null, "error", "decisión inexistente");
    return res.status(404).json({ error: "Decisión no encontrada" });
  }

  db.prepare(
    `UPDATE decisiones_agente SET ${cambios.join(", ")} WHERE decision_id = ?`,
  ).run(...valores, req.params.id);

  registrar(
    "revision_decision",
    null,
    "correcto",
    `decisión ${req.params.id}: ${resumen.join(", ")}`,
  );
  res.json({ ok: true, decision_id: req.params.id });
});

// ---------------------------------------------------------------
// 10. GET / — portada HTML con endpoints y estado actual
// ---------------------------------------------------------------
app.get("/", (req, res) => {
  const nPedidos = db.prepare("SELECT COUNT(*) AS n FROM pedidos").get().n;
  const nIncidencias = db
    .prepare("SELECT COUNT(*) AS n FROM incidencias")
    .get().n;
  const nDecisiones = db
    .prepare("SELECT COUNT(*) AS n FROM decisiones_agente")
    .get().n;

  const filas = [
    ["GET", "/", "Esta portada"],
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
    ["GET", "/logs", "Trazabilidad de integraciones"],
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
    <p>Sistema independiente del eCommerce: Express + SQLite con almacenamiento propio</p>
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
<footer>Datos de prueba: ana@test.com · ORD-001 · INC-001 · DEC-001 — la base de datos es efímera en Render (se vacía en cada despliegue)</footer>
</body>
</html>`);
});

app.listen(PUERTO, () => {
  console.log(`Back-office escuchando en http://localhost:${PUERTO}`);
});
