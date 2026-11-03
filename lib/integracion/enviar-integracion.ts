import type { PedidoFacturable } from "@/lib/email/modelo";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Envía un pedido creado al back-office (vía n8n).
 *
 * Misma regla que la factura: la integración NUNCA puede tumbar un pago. Si
 * n8n o el back-office están caídos, el pedido ya existe en la tienda y el
 * fallo queda registrado en el log del propio back-office (cuando vuelva) o
 * en la consola del webhook.
 *
 * La URL va en INTEGRACION_WEBHOOK_URL: apunta primero al back-office
 * directamente (pruebas) y después al webhook de n8n, sin tocar este código.
 */

const ESTADOS: Record<string, string> = {
  pending: "creado",
  paid: "pago_simulado",
  shipped: "enviado",
  delivered: "enviado",
  cancelled: "cancelado",
};

/**
 * El webhook no tiene cookies, así que se lee el pedido con `correo_pedido`
 * (la misma que usa la factura) en vez de `pedido_por_pago`, que filtra por
 * `auth.uid()` y devolvería NULL.
 */
async function cargarPedido(pagoId: string): Promise<PedidoFacturable | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("correo_pedido", {
    p_pago_id: pagoId,
  });

  if (error) {
    console.error(
      "[integracion] No se ha podido leer el pedido:",
      error.message,
    );
    return null;
  }

  return (data as PedidoFacturable | null) ?? null;
}

export async function enviarPedidoIntegracion(
  pagoId: string,
  emailFallback?: string | null,
): Promise<void> {
  const url = process.env.INTEGRACION_WEBHOOK_URL;

  if (!url) {
    console.warn(
      "[integracion] INTEGRACION_WEBHOOK_URL no configurada; pedido NO enviado.",
    );
    return;
  }

  try {
    const pedido = await cargarPedido(pagoId);

    if (!pedido) {
      console.error(`[integracion] No existe pedido para el pago ${pagoId}.`);
      return;
    }

    const payload = {
      evento: "order.created",
      pedido_id: pedido.id,
      cliente_email: pedido.direccion_pedido?.email ?? emailFallback ?? "",
      cliente_nombre: pedido.direccion_pedido?.nombre ?? null,
      total: Number(pedido.total),
      moneda: pedido.moneda || "EUR",
      estado: ESTADOS[pedido.status] ?? "creado",
      fecha: pedido.created_at,
      lineas: (pedido.items_pedido ?? []).map((linea) => ({
        producto: linea.titulo_producto,
        cantidad: Number(linea.cantidad),
        precio: Number(linea.precio),
      })),
    };

    const respuesta = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });

    if (respuesta.ok) {
      console.log(
        `[integracion] Pedido ${pedido.id} enviado a la integración.`,
      );
    } else {
      console.error(
        `[integracion] El receptor devolvió ${respuesta.status} para el pedido ${pedido.id}.`,
      );
    }
  } catch (error) {
    // Red caída, back-office parado, timeout... registrado aquí y seguimos.
    console.error(
      "[integracion] Error enviando el pedido al back-office:",
      error,
    );
  }
}

/**
 * Avisa del cambio de estado de un pedido (Escenario 2).
 *
 * Mismo destino que order.created: primero el back-office en directo y
 * después el webhook de n8n, que lo reenviará a PATCH /pedidos/:id/estado.
 * El estado viaja ya traducido al vocabulario del back-office, así que
 * n8n no tiene que reimplementar el mapeo.
 *
 * Como el resto de la integración, nunca lanza: si falla, el cambio de
 * estado en la tienda ya se ha hecho y sólo se anota en la consola.
 */
export async function enviarEstadoIntegracion(
  pedidoId: string,
  estadoAnterior: string | null,
  estado: string,
): Promise<void> {
  const url = process.env.INTEGRACION_WEBHOOK_URL;

  if (!url) {
    console.warn(
      "[integracion] INTEGRACION_WEBHOOK_URL no configurada; cambio de estado NO enviado.",
    );
    return;
  }

  try {
    const respuesta = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        evento: "order.status_changed",
        pedido_id: pedidoId,
        ...(estadoAnterior
          ? { estado_anterior: ESTADOS[estadoAnterior] ?? estadoAnterior }
          : {}),
        estado: ESTADOS[estado] ?? estado,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (respuesta.ok) {
      console.log(
        `[integracion] Cambio de estado de ${pedidoId} enviado (${estado}).`,
      );
    } else {
      console.error(
        `[integracion] El receptor devolvió ${respuesta.status} para el cambio de estado de ${pedidoId}.`,
      );
    }
  } catch (error) {
    console.error(
      "[integracion] Error enviando el cambio de estado al back-office:",
      error,
    );
  }
}
