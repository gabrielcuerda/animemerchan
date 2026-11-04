import { getCartSessionId } from "@/lib/cart";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Eventos de negocio del embudo de compra.
 *
 * La tabla `eventos` no se escribe nunca directamente: todo pasa por la función
 * `registrar_evento`, que es la única que decide qué `usuario_id` se guarda
 * (sale de `auth.uid()`, no del cliente).
 *
 * Los eventos que se generan dentro de la base de datos —`cart.item_added`,
 * `order.created` y `payment.simulated`— los emiten los ganchos SQL de
 * `carrito_add_item` y `crear_pedido`, dentro de la misma transacción que el
 * cambio de estado. Ver `supabase/migrations/20261005000000_eventos.sql`.
 */

/**
 * Rampa de eventos.
 *
 * `support.requested` e `incident.created` no están aquí: la postventa no se
 * registra en la tabla `eventos` de la tienda. Las incidencias viajan al
 * back-office por `INTEGRACION_WEBHOOK_URL` con el evento `incident.created`.
 */
export const TIPOS_EVENTO = [
  "product.viewed",
  "cart.item_added",
  "checkout.started",
  "order.created",
  "payment.simulated",
] as const;

export type EventoTipo = (typeof TIPOS_EVENTO)[number];

export type EventoMetadata = Record<string, unknown>;

/**
 * Registra un evento. Nunca lanza.
 *
 * Es telemetría, no lógica de negocio: si el registro falla, la compra tiene
 * que seguir adelante igualmente. Por eso va envuelto en `try/catch` y el
 * error solo se escribe en el log del servidor.
 *
 * Solo se llama desde route handlers y server actions, nunca durante el
 * render. Por eso `getCartSessionId` va con `create: false`: en render, generar
 * la cookie sería escribir en las cookies de una respuesta que además puede
 * estar cacheándose.
 */
export async function registrarEvento(
  tipo: EventoTipo,
  metadata: EventoMetadata = {},
): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.rpc("registrar_evento", {
      p_tipo_evento: tipo,
      p_session_id: (await getCartSessionId({ create: false })) ?? null,
      p_metadata: metadata,
    });

    if (error) {
      console.error(
        `[eventos] No se ha podido registrar "${tipo}": ${error.message}`,
      );
    }
  } catch (error) {
    console.error(`[eventos] Error registrando "${tipo}":`, error);
  }
}
