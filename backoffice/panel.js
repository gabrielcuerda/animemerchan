const express = require("express");

/**
 * Panel visual del back-office (rutas /panel*).
 *
 * Sólo lectura y en HTML, para que la demo se vea bonita en el navegador.
 * NO toca la API JSON original (/pedidos, /logs, ...): n8n, la tienda y el
 * cuadro de mando sigue recibiendo exactamente lo mismo que antes.
 */

function esc(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function fecha(valor) {
  if (!valor) return "—";
  const d = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(d.getTime())) return String(valor);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

const TONO = {
  creado: "gris",
  pago_simulado: "azul",
  preparacion: "ambar",
  enviado: "verde",
  cancelado: "rojo",
  abierta: "rojo",
  en_revision: "ambar",
  resuelta: "verde",
  cerrada: "gris",
  pendiente_revision: "ambar",
  aprobado: "verde",
  rechazado: "rojo",
  correcto: "verde",
  error: "rojo",
  alta: "rojo",
  media: "ambar",
  baja: "gris",
};

function hinchaza(texto, tono) {
  return `<span class="hinchaza h-${tono}">${esc(texto)}</span>`;
}

function estado(valor) {
  return hinchaza(valor ?? "—", TONO[valor] ?? "gris");
}

function eventoHinchaza(evento) {
  const texto = String(evento ?? "—");
  const base = texto.split(".")[0];
  let tono = "gris";
  if (base === "order") tono = "azul";
  else if (base === "incident") tono = "ambar";
  else if (base === "decision") tono = "morado";
  else if (base === "cambio" || base === "revision") tono = "teal";
  else if (texto.includes("error")) tono = "rojo";
  return hinchaza(texto, tono);
}

const ESTILOS = `
  * { box-sizing: border-box; }
  body { margin:0; font-family: system-ui, -apple-system, sans-serif; background:#f4f5f7; color:#1c2430; }
  header { background: linear-gradient(135deg,#4338ca,#7c3aed); color:#fff; padding:26px 24px 16px; }
  header .caja { max-width:1040px; margin:0 auto; }
  h1 { margin:0 0 4px; font-size:24px; }
  header p { margin:0; opacity:.85; font-size:14px; }
  nav { margin-top:14px; display:flex; gap:8px; flex-wrap:wrap; }
  nav a { color:#fff; text-decoration:none; font-size:13px; padding:5px 12px; border-radius:999px; background:rgba(255,255,255,.14); border:1px solid rgba(255,255,255,.3); }
  nav a.activo { background:#fff; color:#4338ca; font-weight:700; border-color:#fff; }
  main { max-width:1040px; margin:-12px auto 40px; padding:0 24px; }
  .tarjetas { display:flex; gap:14px; flex-wrap:wrap; }
  .tarjeta { background:#fff; border:1px solid #e3e6ea; border-radius:12px; padding:16px 20px; flex:1; min-width:170px; box-shadow:0 1px 3px rgba(16,24,40,.06); }
  .tarjeta .num { font-size:30px; font-weight:700; color:#4338ca; }
  .tarjeta .lab { font-size:13px; color:#667085; }
  h2 { font-size:16px; margin:26px 0 10px; }
  .tabla-env { overflow-x:auto; background:#fff; border:1px solid #e3e6ea; border-radius:12px; box-shadow:0 1px 3px rgba(16,24,40,.06); }
  table { width:100%; border-collapse:collapse; }
  th, td { text-align:left; padding:10px 14px; font-size:13.5px; border-bottom:1px solid #eef0f3; vertical-align:top; }
  th { background:#f9fafb; color:#475467; font-size:12px; text-transform:uppercase; letter-spacing:.5px; }
  tr:last-child td { border-bottom:0; }
  .mono { font-family: ui-monospace, Consolas, monospace; font-size:12.5px; }
  .apagado { color:#98a2b3; font-size:12px; }
  .hinchaza { display:inline-block; padding:2px 9px; border-radius:999px; font-size:11.5px; font-weight:700; white-space:nowrap; }
  .h-verde { background:#ecfdf3; color:#027a48; }
  .h-rojo { background:#fef3f2; color:#b42318; }
  .h-ambar { background:#fffaeb; color:#b54708; }
  .h-azul { background:#eff8ff; color:#175cd3; }
  .h-morado { background:#f4f3ff; color:#5925dc; }
  .h-teal { background:#f0fdfa; color:#0f766e; }
  .h-gris { background:#f2f4f7; color:#475467; }
  .chips { display:flex; gap:8px; margin:0 0 14px; flex-wrap:wrap; }
  .chips a { text-decoration:none; font-size:13px; padding:5px 12px; border-radius:999px; background:#fff; border:1px solid #d0d5dd; color:#344054; }
  .chips a.activo { background:#4338ca; border-color:#4338ca; color:#fff; font-weight:600; }
  .resumen-detalle { font-size:13px; color:#667085; margin:12px 0 0; }
  .vacio-td { text-align:center; color:#98a2b3; padding:28px !important; }
  footer { max-width:1040px; margin:0 auto 30px; padding:0 24px; font-size:12px; color:#98a2b3; text-align:center; }
`;

const ENLACES = [
  ["", "Resumen"],
  ["logs", "Logs"],
  ["pedidos", "Pedidos"],
  ["incidencias", "Incidencias"],
  ["decisiones", "Decisiones"],
];

function pagina(titulo, cuerpo, activo) {
  const nav = ENLACES.map(
    ([ruta, texto]) =>
      `<a href="/panel${ruta ? `/${ruta}` : ""}" class="${activo === ruta ? "activo" : ""}">${texto}</a>`,
  ).join("");

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)} · Back-office</title>
<style>${ESTILOS}</style>
</head>
<body>
<header>
  <div class="caja">
    <h1>Back-office · Tarea 2</h1>
    <p>${esc(titulo)}</p>
    <nav>${nav}<a href="/">Portada ↗</a></nav>
  </div>
</header>
<main>${cuerpo}</main>
<footer>API JSON: <span class="mono">/pedidos · /incidencias · /decisiones · /logs · /healthz</span> — Prototipo académico</footer>
</body>
</html>`;
}

function crearPanel({ pool }) {
  const router = express.Router();

  const manejar = (fn) => (req, res, next) => {
    fn(req, res).catch(next);
  };

  // ---------------------------------------------------------------
  // Resumen: tarjetas, % de éxito y últimos eventos
  // ---------------------------------------------------------------
  router.get(
    "/panel",
    manejar(async (req, res) => {
      const [cPedidos, cIncidencias, cDecisiones, cLog, ultimos] =
        await Promise.all([
          pool.query("SELECT COUNT(*)::int AS n FROM pedidos"),
          pool.query("SELECT COUNT(*)::int AS n FROM incidencias"),
          pool.query("SELECT COUNT(*)::int AS n FROM decisiones_agente"),
          pool.query(
            `SELECT COUNT(*)::int AS total,
                    COUNT(*) FILTER (WHERE resultado = 'correcto')::int AS correctos,
                    COUNT(*) FILTER (WHERE resultado = 'error')::int AS errores
             FROM integracion_log`,
          ),
          pool.query("SELECT * FROM integracion_log ORDER BY id DESC LIMIT 8"),
        ]);

      const log = cLog.rows[0];
      const exito =
        log.total > 0 ? Math.round((log.correctos * 100) / log.total) : null;

      const tarjetas = [
        [cPedidos.rows[0].n, "pedidos"],
        [cIncidencias.rows[0].n, "incidencias"],
        [cDecisiones.rows[0].n, "decisiones del agente"],
        [log.total, "eventos en el log"],
      ]
        .map(
          ([n, lab]) =>
            `<div class="tarjeta"><div class="num">${n}</div><div class="lab">${lab}</div></div>`,
        )
        .join("");

      const filas = ultimos.rows
        .map(
          (l) => `<tr>
            <td class="mono">${l.id}</td>
            <td>${eventoHinchaza(l.evento)}</td>
            <td class="mono">${esc(l.pedido_id ?? "—")}</td>
            <td>${estado(l.resultado)}</td>
            <td>${esc(l.detalle ?? "—")}</td>
            <td class="mono">${fecha(l.creado_en)}</td>
          </tr>`,
        )
        .join("");

      res.type("html").send(
        pagina(
          "Resumen",
          `
  <div class="tarjetas">${tarjetas}</div>
  <p class="resumen-detalle">Éxito de la integración: <b>${exito ?? "—"} %</b> · ${log.correctos} correctos · ${log.errores} errores</p>
  <h2>Últimos eventos</h2>
  <div class="tabla-env"><table>
    <tr><th>#</th><th>Evento</th><th>Pedido</th><th>Resultado</th><th>Detalle</th><th>Cuándo</th></tr>
    ${filas || `<tr><td colspan="6" class="vacio-td">Todavía no hay eventos en el log.</td></tr>`}
  </table></div>
  <div class="chips">
    <a href="/panel/logs">Ver todos los logs →</a>
    <a href="/panel/pedidos">Pedidos →</a>
    <a href="/panel/incidencias">Incidencias →</a>
    <a href="/panel/decisiones">Decisiones →</a>
  </div>
  `,
          "",
        ),
      );
    }),
  );

  // ---------------------------------------------------------------
  // Logs con filtro por resultado
  // ---------------------------------------------------------------
  router.get(
    "/panel/logs",
    manejar(async (req, res) => {
      const { resultado } = req.query;

      let sql = "SELECT * FROM integracion_log WHERE 1=1";
      const valores = [];
      if (resultado === "correcto" || resultado === "error") {
        valores.push(resultado);
        sql += ` AND resultado = $${valores.length}`;
      }
      sql += " ORDER BY id DESC LIMIT 500";

      const r = await pool.query(sql, valores);

      const chips = [
        ["", "Todos"],
        ["correcto", "Correctos"],
        ["error", "Errores"],
      ]
        .map(
          ([valor, texto]) =>
            `<a href="/panel/logs${valor ? `?resultado=${valor}` : ""}" class="${(resultado || "") === valor ? "activo" : ""}">${texto}</a>`,
        )
        .join("");

      const filas = r.rows
        .map(
          (l) => `<tr>
            <td class="mono">${l.id}</td>
            <td>${eventoHinchaza(l.evento)}</td>
            <td class="mono">${esc(l.pedido_id ?? "—")}</td>
            <td>${estado(l.resultado)}</td>
            <td>${esc(l.detalle ?? "—")}</td>
            <td class="mono">${esc(l.origen ?? "—")}</td>
            <td class="mono">${l.duracion_ms != null ? `${l.duracion_ms} ms` : "—"}</td>
            <td class="mono">${fecha(l.creado_en)}</td>
          </tr>`,
        )
        .join("");

      res.type("html").send(
        pagina(
          "Logs de integración",
          `
  <div class="chips">${chips}</div>
  <div class="tabla-env"><table>
    <tr><th>#</th><th>Evento</th><th>Pedido</th><th>Resultado</th><th>Detalle</th><th>Origen</th><th>Duración</th><th>Cuándo</th></tr>
    ${filas || `<tr><td colspan="8" class="vacio-td">No hay eventos con ese filtro.</td></tr>`}
  </table></div>
  <p class="resumen-detalle">Últimos 500 eventos. La API JSON completa sigue en <a href="/logs">/logs</a>.</p>
  `,
          "logs",
        ),
      );
    }),
  );

  // ---------------------------------------------------------------
  // Pedidos
  // ---------------------------------------------------------------
  router.get(
    "/panel/pedidos",
    manejar(async (req, res) => {
      const r = await pool.query(`
        SELECT p.*,
               (SELECT COUNT(*) FROM lineas_pedido l
                 WHERE l.pedido_id = p.pedido_id)::int AS lineas
        FROM pedidos p
        ORDER BY p.recibido_en DESC
        LIMIT 200
      `);

      const filas = r.rows
        .map(
          (p) => `<tr>
            <td class="mono">${esc(p.pedido_id)}</td>
            <td>${esc(p.cliente_nombre ?? "—")}<br><span class="apagado">${esc(p.cliente_email ?? "sin email")}</span></td>
            <td class="mono">${Number(p.total).toFixed(2)} ${esc(p.moneda)}</td>
            <td class="mono">${p.lineas}</td>
            <td>${estado(p.estado)}</td>
            <td class="mono">${fecha(p.fecha)}</td>
            <td class="mono">${fecha(p.recibido_en)}</td>
          </tr>`,
        )
        .join("");

      res.type("html").send(
        pagina(
          "Pedidos",
          `
  <div class="tabla-env"><table>
    <tr><th>Pedido</th><th>Cliente</th><th>Total</th><th>Líneas</th><th>Estado</th><th>Fecha</th><th>Recibido</th></tr>
    ${filas || `<tr><td colspan="7" class="vacio-td">Todavía no hay pedidos.</td></tr>`}
  </table></div>
  <p class="resumen-detalle">Máximo 200 filas. La API JSON está en <a href="/pedidos">/pedidos</a>.</p>
  `,
          "pedidos",
        ),
      );
    }),
  );

  // ---------------------------------------------------------------
  // Incidencias
  // ---------------------------------------------------------------
  router.get(
    "/panel/incidencias",
    manejar(async (req, res) => {
      const r = await pool.query(
        "SELECT * FROM incidencias ORDER BY recibido_en DESC LIMIT 200",
      );

      const filas = r.rows
        .map(
          (i) => `<tr>
            <td class="mono">${esc(i.incidencia_id)}</td>
            <td class="mono">${esc(i.pedido_id ?? "—")}</td>
            <td>${esc(i.cliente_email ?? "sin email")}</td>
            <td>${esc(i.tipo)}</td>
            <td>${estado(i.estado)}</td>
            <td>${estado(i.prioridad ?? "—")}</td>
            <td>${esc(i.descripcion)}</td>
            <td class="mono">${fecha(i.recibido_en)}</td>
          </tr>`,
        )
        .join("");

      res.type("html").send(
        pagina(
          "Incidencias",
          `
  <div class="tabla-env"><table>
    <tr><th>Incidencia</th><th>Pedido</th><th>Cliente</th><th>Tipo</th><th>Estado</th><th>Prioridad</th><th>Descripción</th><th>Recibida</th></tr>
    ${filas || `<tr><td colspan="8" class="vacio-td">Todavía no hay incidencias.</td></tr>`}
  </table></div>
  <p class="resumen-detalle">Máximo 200 filas. La API JSON está en <a href="/incidencias">/incidencias</a>.</p>
  `,
          "incidencias",
        ),
      );
    }),
  );

  // ---------------------------------------------------------------
  // Decisiones del agente
  // ---------------------------------------------------------------
  router.get(
    "/panel/decisiones",
    manejar(async (req, res) => {
      const r = await pool.query(
        "SELECT * FROM decisiones_agente ORDER BY recibido_en DESC LIMIT 200",
      );

      const filas = r.rows
        .map(
          (d) => `<tr>
            <td class="mono">${esc(d.decision_id)}</td>
            <td class="mono">${esc(d.incidencia_id)}</td>
            <td>${esc(d.tipo_caso)}</td>
            <td>${esc(d.accion_propuesta)}</td>
            <td>${estado(d.estado)}</td>
            <td>${estado(d.prioridad ?? "—")}</td>
            <td class="mono">${d.confianza != null ? Number(d.confianza).toFixed(2) : "—"}</td>
            <td>${esc(d.revisado_por ?? "—")}</td>
            <td class="mono">${fecha(d.recibido_en)}</td>
          </tr>`,
        )
        .join("");

      res.type("html").send(
        pagina(
          "Decisiones del agente",
          `
  <div class="tabla-env"><table>
    <tr><th>Decisión</th><th>Incidencia</th><th>Caso</th><th>Acción propuesta</th><th>Estado</th><th>Prioridad</th><th>Confianza</th><th>Revisada por</th><th>Recibida</th></tr>
    ${filas || `<tr><td colspan="9" class="vacio-td">Todavía no hay decisiones.</td></tr>`}
  </table></div>
  <p class="resumen-detalle">Máximo 200 filas. La API JSON está en <a href="/decisiones">/decisiones</a>.</p>
  `,
          "decisiones",
        ),
      );
    }),
  );

  return router;
}

module.exports = { crearPanel };
