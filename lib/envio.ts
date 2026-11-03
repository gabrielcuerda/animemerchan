/**
 * Coste de envío variable por tramos de importe.
 *
 * Por qué por subtotal y no un fijo: el catálogo se mueve en la banda de precios
 * que anuncian los filtros de `lib/constants.ts` (<150 / 150-200 / >200 €) y una
 * camiseta cuesta 129 €. Con un umbral bajo de envío gratis, cualquier pedido
 * sería gratuito y el coste nunca cambiaría; estos tramos sí se notan al añadir
 * o quitar unidades del carrito.
 *
 * `subtotal` va SIN IVA, igual que `productos.precio` y que las líneas de
 * `items_pedido`. El total que paga el cliente es:
 *
 *     total = subtotal + iva(21 %) + calcularCosteEnvio(subtotal)
 *
 * Esta regla está duplicada a propósito en la función SQL `crear_pedido`
 * (`supabase/migrations/20261103000000_envio_variable.sql`): aquí se calcula
 * para cobrar en Stripe y para pintar el carrito, y allí para guardar en
 * `pedidos.coste_envio`. Si cambias los tramos, cambia los dos sitios o la
 * factura y la base de datos dejarán de cuadrar.
 */

export type TramoEnvio = {
  /** Límite superior (exclusivo) del subtotal al que aplica este coste. */
  hasta: number;
  coste: number;
};

/** Tramos ordenados de menor a mayor. El último tramo abierto (≥ 300 €) es gratis. */
export const TRAMOS_ENVIO: readonly TramoEnvio[] = [
  { hasta: 150, coste: 5.95 },
  { hasta: 300, coste: 2.95 },
];

/** A partir de este subtotal (sin IVA) el envío es gratuito. */
export const ENVIO_GRATIS_DESDE = 300;

/** Redondea a céntimos; evita que los flotantes dejen `5.950000000001`. */
function aCentimos(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/**
 * Coste de envío para un subtotal dado. Nunca lanza: un subtotal inválido
 * (NaN, negativo, undefined) se trata como 0 €, que cae en el tramo más caro.
 * La telemetría y el carrito no pueden tumbar una compra por un número raro.
 */
export function calcularCosteEnvio(subtotal: number): number {
  const importe = Number(subtotal);

  if (!Number.isFinite(importe) || importe < 0) {
    return TRAMOS_ENVIO[0]?.coste ?? 0;
  }

  const tramo = TRAMOS_ENVIO.find((t) => importe < t.hasta);

  return tramo ? tramo.coste : 0;
}

/**
 * Cuánto falta para el envío gratis. Devuelve 0 si ya se alcanzó el umbral.
 * Lo usan los mensajes del carrito ("te faltan X € para envío gratis").
 */
export function faltaParaEnvioGratis(subtotal: number): number {
  const importe = Number(subtotal);

  if (!Number.isFinite(importe) || importe >= ENVIO_GRATIS_DESDE) return 0;

  return aCentimos(ENVIO_GRATIS_DESDE - Math.max(0, importe));
}
