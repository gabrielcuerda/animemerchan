// Servidor mínimo para el cuadro de mando operativo.
//
// Sustituye a `vercel dev`: sirve los archivos estáticos de la carpeta y hace
// de proxy hacia el back-office (que no envía cabeceras CORS), agregando las
// seis colecciones en una sola respuesta `/api/dashboard`. Funciona igual en
// local (`node server.js`) y en Render (start command `node server.js`).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = __dirname;
const BACKOFFICE_URL = (process.env.BACKOFFICE_URL || "https://backoffice-tarea2.onrender.com").replace(/\/+$/, "");
const BACKOFFICE_TOKEN = process.env.BACKOFFICE_TOKEN || "";
const TIMEOUT_MS = 30_000;
const RUTAS = [
  "/pedidos",
  "/incidencias",
  "/decisiones",
  "/logs",
  "/productos-mas-solicitados",
  "/metricas/resolucion",
];

function fetchJson(ruta) {
  return new Promise((resolve, reject) => {
    const url = new URL(BACKOFFICE_URL + ruta);
    const req = https.get(
      url,
      {
        headers: {
          Accept: "application/json",
          ...(BACKOFFICE_TOKEN ? { Authorization: `Bearer ${BACKOFFICE_TOKEN}` } : {}),
        },
        timeout: TIMEOUT_MS,
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}`));
          } else {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          }
        });
      },
    );
    req.on("timeout", () => {
      req.destroy(new Error("timeout"));
    });
    req.on("error", reject);
  });
}

function comoLista(valor) {
  return Array.isArray(valor) ? valor : [];
}

async function handleApi(res) {
  const resultados = await Promise.allSettled(RUTAS.map(fetchJson));

  const datos = {
    "/pedidos": [],
    "/incidencias": [],
    "/decisiones": [],
    "/logs": [],
    "/productos-mas-solicitados": [],
    "/metricas/resolucion": null,
  };
  const errores = [];

  resultados.forEach((resultado, indice) => {
    const ruta = RUTAS[indice];
    if (resultado.status === "fulfilled") {
      if (ruta === "/metricas/resolucion") {
        datos[ruta] = resultado.value;
      } else {
        datos[ruta] = comoLista(resultado.value);
      }
    } else {
      const motivo = resultado.reason;
      errores.push({
        ruta,
        mensaje:
          motivo && motivo.message ? String(motivo.message) : String(motivo),
      });
    }
  });

  const logs = datos["/logs"]
    .slice()
    .sort((a, b) => Number(b.id || 0) - Number(a.id || 0))
    .slice(0, 500);

  const cuerpo = {
    ok: errores.length < RUTAS.length,
    fuente: BACKOFFICE_URL,
    generadoEn: new Date().toISOString(),
    pedidos: datos["/pedidos"],
    incidencias: datos["/incidencias"],
    decisiones: datos["/decisiones"],
    logs,
    productos: datos["/productos-mas-solicitados"],
    resolucion: datos["/metricas/resolucion"],
    errores,
  };

  res.writeHead(cuerpo.ok ? 200 : 502, {
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(cuerpo));
}

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/api/dashboard") {
    return handleApi(res).catch((e) => {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: String(e) }));
    });
  }

  let filePath = path.join(ROOT, url.pathname === "/" ? "index.html" : url.pathname);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end();
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Not found");
    }
    res.writeHead(200, {
      "Content-Type": mime[path.extname(filePath)] || "application/octet-stream",
    });
    res.end(data);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Cuadro de mando en http://localhost:${PORT}`);
  console.log(`Back-office: ${BACKOFFICE_URL}`);
});
