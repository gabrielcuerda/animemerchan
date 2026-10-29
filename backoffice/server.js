const express = require("express");
const Database = require("better-sqlite3");
const path = require("node:path");

const app = express();
const db = new Database(path.join(__dirname, "pedidos.db"));
const PUERTO = 4000;

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
  const pedidos = db
    .prepare("SELECT * FROM pedidos ORDER BY recibido_en DESC")
    .all();
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
// 8. GET / — página de bienvenida con los endpoints disponibles
// ---------------------------------------------------------------
app.get("/", (req, res) => {
  res.json({
    servicio: "Back-office Tarea 2",
    endpoints: [
      "POST /pedidos",
      "GET /pedidos",
      "GET /pedidos/:id",
      "PATCH /pedidos/:id/estado",
      "GET /logs",
    ],
  });
});

app.listen(PUERTO, () => {
  console.log(`Back-office escuchando en http://localhost:${PUERTO}`);
});
