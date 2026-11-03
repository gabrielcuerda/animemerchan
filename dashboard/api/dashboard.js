/**
 * Proxy de datos del cuadro de mando.
 *
 * El back-office no envía `Access-Control-Allow-Origin`, así que el navegador
 * no puede llamarlo desde otro dominio. Esta función corre en el servidor de
 * Vercel, consulta las cuatro colecciones y devuelve un único JSON al
 * dashboard. De paso cachea la respuesta: Render free duerme el servicio
 * cuando no hay tráfico y una petición que despierta el contenedor puede
 * tardar decenas de segundos.
 *
 * Los datos NO se transforman aquí: se devuelven tal cual llegan del
 * back-office. Los cálculos (y sus tests) viven en `metricas.js`, que se
 * ejecuta en el navegador. Así lo que se muestra es exactamente lo que hay
 * en el sistema.
 */

const BACKOFFICE_URL = (
  process.env.BACKOFFICE_URL || "https://backoffice-tarea2.onrender.com"
).replace(/\/+$/, "");

const BACKOFFICE_TOKEN = process.env.BACKOFFICE_TOKEN || "";

/** Tiempo máximo por petición. Con el arranque en frío de Render, 10 s se quedan cortos. */
const TIMEOUT_MS = 15_000;

/** Tope de eventos que se devuelven. Con 500 sobra para cualquier métrica. */
const MAX_LOGS = 500;

const RUTAS = [
  "/pedidos", "/incidencias", "/decisiones", "/logs",
  "/productos-mas-solicitados", "/metricas/resolucion",
];

async function pedir(ruta) {
  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), TIMEOUT_MS);

  try {
    const respuesta = await fetch(`${BACKOFFICE_URL}${ruta}`, {
      headers: {
        Accept: "application/json",
        ...(BACKOFFICE_TOKEN
          ? { Authorization: `Bearer ${BACKOFFICE_TOKEN}` }
          : {}),
      },
      signal: control.signal,
    });

    if (!respuesta.ok) {
      throw new Error(`HTTP ${respuesta.status}`);
    }

    return await respuesta.json();
  } finally {
    clearTimeout(temporizador);
  }
}

function comoLista(valor) {
  return Array.isArray(valor) ? valor : [];
}

export default async function handler(peticion, respuesta) {
  if (peticion.method !== "GET") {
    respuesta.setHeader("Allow", "GET");
    respuesta.status(405).json({ ok: false, error: "Método no permitido" });
    return;
  }

  const resultados = await Promise.allSettled(RUTAS.map(pedir));

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
          motivo?.name === "AbortError"
            ? `Sin respuesta en ${TIMEOUT_MS / 1000} s (¿back-office dormido?)`
            : String(motivo?.message || motivo),
      });
    }
  });

  const logs = datos["/logs"]
    .slice()
    .sort((a, b) => Number(b.id || 0) - Number(a.id || 0))
    .slice(0, MAX_LOGS);

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

  // Si algo ha fallado se cachea menos: interesa reintentar pronto. Si todo
  // ha ido bien, 30 s de caché y un minuto de revalidación en segundo plano.
  respuesta.setHeader(
    "Cache-Control",
    errores.length
      ? "public, s-maxage=15, stale-while-revalidate=30"
      : "public, s-maxage=30, stale-while-revalidate=120",
  );

  if (!cuerpo.ok) {
    respuesta.status(502).json(cuerpo);
    return;
  }

  respuesta.status(200).json(cuerpo);
}
