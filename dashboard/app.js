import {
  aPares,
  formatearEuros,
  formatearFecha,
  formatearNumero,
  formatearPorcentaje,
  resumenDecisiones,
  resumenIncidencias,
  resumenLogs,
  resumenPedidos,
  resumenProductos,
  seriePorDia,
  tasaConversion,
  tiempoMedioResolucion,
} from "./metricas.js";

const parametros = new URLSearchParams(window.location.search);
const MODO_DEMO = parametros.get("modo") === "demo";
const URL_DATOS = MODO_DEMO ? "./demo/datos.json" : "/api/dashboard";

const $ = (id) => document.getElementById(id);
const SVG = "http://www.w3.org/2000/svg";

/** Convierte `sin_prioridad` o `en_revision` en algo legible. */
function humanizar(clave) {
  const texto = String(clave ?? "").replace(/_/g, " ").trim();
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : "—";
}

function crearElemento(etiqueta, atributos = {}) {
  const elemento = document.createElementNS(SVG, etiqueta);
  for (const [nombre, valor] of Object.entries(atributos)) {
    elemento.setAttribute(nombre, String(valor));
  }
  return elemento;
}

/**
 * Gráfico de barras en SVG, sin dependencias. Se dibuja con un viewBox fijo:
 * el CSS lo escala al ancho de la tarjeta y así no hay que recalcular al
 * redimensionar la ventana.
 */
function dibujarBarras(contenedor, pares, opciones = {}) {
  const { etiquetaValor = (valor) => formatearNumero(valor) } = opciones;
  contenedor.replaceChildren();

  const ancho = 520;
  const alto = 190;
  const margen = { arriba: 18, derecha: 6, abajo: 34, izquierda: 6 };
  const anchoUtil = ancho - margen.izquierda - margen.derecha;
  const altoUtil = alto - margen.arriba - margen.abajo;

  const svg = crearElemento("svg", {
    viewBox: `0 0 ${ancho} ${alto}`,
    role: "presentation",
  });

  const maximo = Math.max(1, ...pares.map((par) => par.valor));
  const paso = anchoUtil / Math.max(1, pares.length);
  const anchoBarra = Math.min(46, paso * 0.62);

  const eje = crearElemento("line", {
    x1: margen.izquierda,
    y1: margen.arriba + altoUtil,
    x2: ancho - margen.derecha,
    y2: margen.arriba + altoUtil,
    class: "eje",
  });
  svg.append(eje);

  if (!pares.length) {
    const vacio = crearElemento("text", {
      x: ancho / 2,
      y: alto / 2,
      "text-anchor": "middle",
      class: "vacio",
    });
    vacio.textContent = "Sin datos todavía";
    svg.append(vacio);
    contenedor.append(svg);
    return;
  }

  pares.forEach((par, indice) => {
    const x = margen.izquierda + indice * paso + (paso - anchoBarra) / 2;
    const altura = (par.valor / maximo) * altoUtil;
    const y = margen.arriba + altoUtil - altura;

    if (par.valor > 0) {
      const barra = crearElemento("rect", {
        x,
        y,
        width: anchoBarra,
        height: Math.max(altura, 2),
        rx: 4,
        class: "barra",
      });
      const titulo = crearElemento("title");
      titulo.textContent = `${par.etiqueta}: ${etiquetaValor(par.valor)}`;
      barra.append(titulo);
      svg.append(barra);

      const valor = crearElemento("text", {
        x: x + anchoBarra / 2,
        y: y - 5,
        "text-anchor": "middle",
        class: "valor-barra",
      });
      valor.textContent = etiquetaValor(par.valor);
      svg.append(valor);
    }

    const etiqueta = crearElemento("text", {
      x: x + anchoBarra / 2,
      y: margen.arriba + altoUtil + 16,
      "text-anchor": "middle",
      class: "etiqueta-eje",
    });
    etiqueta.textContent = par.etiqueta;
    svg.append(etiqueta);
  });

  contenedor.append(svg);
}

function pintarLista(id, pares, { vacio = "Sin datos todavía" } = {}) {
  const lista = $(id);
  lista.replaceChildren();

  if (!pares.length) {
    const item = document.createElement("li");
    item.className = "dato-vacio";
    item.textContent = vacio;
    lista.append(item);
    return;
  }

  for (const par of pares) {
    const item = document.createElement("li");
    const nombre = document.createElement("span");
    nombre.textContent = humanizar(par.clave);
    const valor = document.createElement("span");
    valor.className = "dato-valor";
    valor.textContent = formatearNumero(par.valor);
    item.append(nombre, valor);
    lista.append(item);
  }
}

function pintarUltimosLogs(logs) {
  const cuerpo = $("ultimos-logs");
  cuerpo.replaceChildren();

  const recientes = logs.slice(0, 10);

  if (!recientes.length) {
    const fila = document.createElement("tr");
    const celda = document.createElement("td");
    celda.colSpan = 5;
    celda.textContent = "Sin eventos registrados todavía.";
    fila.append(celda);
    cuerpo.append(fila);
    return;
  }

  for (const log of recientes) {
    const fila = document.createElement("tr");

    const fecha = document.createElement("td");
    fecha.textContent = formatearFecha(log.creado_en);

    const evento = document.createElement("td");
    evento.textContent = log.evento || "—";

    const pedido = document.createElement("td");
    pedido.textContent = log.pedido_id || "—";

    const resultado = document.createElement("td");
    const insignia = document.createElement("span");
    const correcto = String(log.resultado || "").toLowerCase() === "correcto";
    insignia.className = `insignia ${
      correcto ? "insignia-ok" : log.resultado ? "insignia-error" : "insignia-neutra"
    }`;
    insignia.textContent = humanizar(log.resultado || "sin resultado");
    resultado.append(insignia);

    const detalle = document.createElement("td");
    detalle.textContent = log.detalle || "—";

    fila.append(fecha, evento, pedido, resultado, detalle);
    cuerpo.append(fila);
  }
}

function pintarAvisoParcial(errores) {
  const aviso = $("aviso-parcial");

  if (!errores.length) {
    aviso.hidden = true;
    aviso.replaceChildren();
    return;
  }

  aviso.replaceChildren();
  const titulo = document.createElement("strong");
  titulo.textContent = "Aviso: ";
  aviso.append(
    titulo,
    document.createTextNode(
      `no se pudieron leer ${errores.map((error) => error.ruta).join(", ")}. Las métricas que dependen de esos datos aparecen incompletas.`,
    ),
  );
  aviso.hidden = false;
}

function pintarPie(datos) {
  $("pie-fuente").textContent = MODO_DEMO
    ? "demo/datos.json (datos de demostración)"
    : datos.fuente || "—";
  $("pie-fecha").textContent = formatearFecha(
    datos.generadoEn || new Date().toISOString(),
  );
  $("pie-registros").textContent =
    `${formatearNumero((datos.pedidos || []).length)} pedidos · ` +
    `${formatearNumero((datos.incidencias || []).length)} incidencias · ` +
    `${formatearNumero((datos.logs || []).length)} eventos · ` +
    `${formatearNumero((datos.decisiones || []).length)} decisiones`;
  $("pie-modo").textContent = MODO_DEMO
    ? "Modo demostración: estas cifras NO proceden del back-office."
    : "Modo real: cifras leídas del back-office desplegado.";
  $("pie-modo").style.color = MODO_DEMO ? "var(--demo)" : "var(--ok)";
}

function renderizar(datos) {
  const pedidos = resumenPedidos(datos.pedidos);
  const incidencias = resumenIncidencias(datos.incidencias);
  const logs = resumenLogs(datos.logs);
  const decisiones = resumenDecisiones(datos.decisiones);
  const productos = resumenProductos(datos.productos);
  const conversion = tasaConversion(datos.logs, datos.pedidos);
  const resolucion = tiempoMedioResolucion(datos.resolucion);

  // Indicadores
  $("kpi-pedidos").textContent = formatearNumero(pedidos.total);
  $("kpi-importe").textContent = formatearEuros(pedidos.importe);

  $("kpi-incidencias").textContent = formatearNumero(incidencias.abiertas);
  $("nota-incidencias").textContent =
    `${formatearNumero(incidencias.total)} en total`;

  const exito = logs.tasaExito;
  $("kpi-exito").textContent = formatearPorcentaje(exito);
  $("kpi-exito").classList.toggle("kpi-aviso", exito === null);
  $("nota-exito").textContent =
    exito === null
      ? "Sin eventos evaluables"
      : `${formatearNumero(logs.correctos)} correctos · ${formatearNumero(logs.fallidos)} fallidos`;

  $("kpi-eventos").textContent = formatearNumero(logs.total);
  $("nota-eventos").textContent =
    `${formatearNumero(logs.duplicados)} duplicados ignorados`;

  $("kpi-duplicados").textContent = formatearNumero(logs.duplicados);

  $("kpi-decisiones").textContent = formatearNumero(decisiones.total);
  $("nota-decisiones").textContent =
    `${formatearNumero(decisiones.pendientes)} pendientes de revisión`;

  const aprobacion = decisiones.tasaAprobacion;
  $("kpi-aprobacion").textContent = formatearPorcentaje(aprobacion);
  $("kpi-aprobacion").classList.toggle("kpi-aviso", aprobacion === null);
  $("nota-aprobacion").textContent =
    aprobacion === null
      ? "Sin decisiones revisadas"
      : `${formatearNumero(decisiones.aprobadas)} aprobadas · ${formatearNumero(decisiones.rechazadas)} rechazadas`;

  const latencia = logs.latenciaMedia;
  $("kpi-latencia").textContent =
    latencia === null ? "Sin datos" : `${formatearNumero(Math.round(latencia))} ms`;
  $("kpi-latencia").classList.toggle("kpi-aviso", latencia === null);
  $("nota-latencia").textContent =
    latencia === null
      ? "Pendiente: n8n debe registrar duracion_ms"
      : `Media de ${formatearNumero(logs.conDuracion)} ejecuciones`;

  const kpiConversion = $("kpi-conversion");
  kpiConversion.textContent = formatearPorcentaje(conversion);
  kpiConversion.classList.toggle("kpi-aviso", conversion === null);
  $("nota-conversion").textContent =
  conversion === null
    ? "Sin datos de checkout.started"
    : "Pedidos creados / checkouts";

 const kpiResolucion = $("kpi-resolucion");
   kpiResolucion.textContent =
    resolucion === null
     ? "Sin datos"
     : `${formatearNumero(Math.round(resolucion / 60000))} min`;
  kpiResolucion.classList.toggle("kpi-aviso", resolucion === null);
   $("nota-resolucion").textContent =
     resolucion === null
      ? "Pendiente: incidencias sin cerrar"
      : `Media de ${formatearNumero(datos.resolucion?.cerradas ?? 0)} incidencias`;

  // Gráficos
  dibujarBarras(
    $("grafico-dias"),
    seriePorDia(pedidos.porDia, 14).map((punto) => ({
      etiqueta: punto.dia.slice(8, 10) + "/" + punto.dia.slice(5, 7),
      valor: punto.valor,
    })),
  );

  dibujarBarras(
    $("grafico-estados"),
    aPares(pedidos.porEstado).map((par) => ({
      etiqueta: humanizar(par.clave),
      valor: par.valor,
    })),
  );

  // Listas y tabla
  pintarLista(
    $("productos"),
    productos.map((p) => ({ clave: p.producto, valor: p.unidades })),
  );
  pintarLista($("prioridades"), aPares(incidencias.porPrioridad));
  pintarLista($("eventos"), aPares(logs.porEvento).slice(0, 6));
  pintarLista(
    $("errores"),
    aPares(logs.erroresPorTipo),
    { vacio: "Sin errores registrados." },
  );
  pintarUltimosLogs(datos.logs || []);

  pintarAvisoParcial(datos.errores || []);
  pintarPie(datos);

  $("cargando").hidden = true;
  $("panel-error").hidden = true;
  $("panel-datos").hidden = false;
}

function mostrarError(mensaje) {
  $("cargando").hidden = true;
  $("panel-datos").hidden = true;
  $("error-mensaje").textContent = mensaje;
  $("panel-error").hidden = false;
}

async function cargar() {
  const boton = $("refrescar");
  boton.disabled = true;
  $("panel-error").hidden = true;
  $("cargando").hidden = false;

  try {
    const respuesta = await fetch(URL_DATOS, { cache: "no-store" });
    const datos = await respuesta.json();

    // El proxy devuelve 502 con `ok: false` cuando *todo* falla. Si al menos
    // una colección llegó, se pinta lo que hay y se avisa de lo que falta.
    const hayDatos =
      (datos.pedidos || []).length +
        (datos.incidencias || []).length +
        (datos.decisiones || []).length +
        (datos.logs || []).length >
      0;

    if (!respuesta.ok && !hayDatos) {
      const detalle = (datos.errores || [])
        .map((error) => `${error.ruta}: ${error.mensaje}`)
        .join(" · ");
      throw new Error(detalle || `El servidor respondió ${respuesta.status}.`);
    }

    renderizar(datos);
  } catch (error) {
    mostrarError(
      error instanceof Error ? error.message : "Error desconocido al cargar.",
    );
  } finally {
    boton.disabled = false;
  }
}

function prepararModo() {
  const avisoDemo = $("aviso-demo");
  if (avisoDemo) avisoDemo.hidden = !MODO_DEMO;
  if (MODO_DEMO) {
    document.title = "Cuadro de mando (demostración) · Animemerchan";
  }
}

prepararModo();
$("refrescar").addEventListener("click", cargar);
$("reintentar").addEventListener("click", cargar);
cargar();
