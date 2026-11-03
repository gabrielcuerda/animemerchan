"use server";

import { getAdminContext, mensajeError } from "@/lib/admin/auth";
import { obtenerPedido } from "@/lib/admin/pedidos";
import { PEDIDO_STATUS } from "@/lib/admin/tipos";
import type { AdminActionState } from "@/lib/admin/tipos";
import { enviarFactura } from "@/lib/email/enviar-factura";
import { revalidatePath } from "next/cache";
import { enviarEstadoIntegracion } from "@/lib/integracion/enviar-integracion";

function revalidar(pedidoId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/pedidos");
  if (pedidoId) revalidatePath(`/admin/pedidos/${pedidoId}`);
}

/**
 * Cambia el estado de un pedido.
 *
 * `admin_pedido_update_status` devuelve el estado ANTERIOR, y eso es lo que
 * permite avisar del caso peligroso: nada repone stock automáticamente. La
 * lógica de stock vive en `crear_pedido`, que solo resta; no hay trigger de
 * reposición porque una reposición silenciosa haría imposible auditar por qué
 * una unidad volvió a aparecer.
 */
export async function cambiarEstadoPedido(
  pedidoId: string,
  estado: string,
): Promise<AdminActionState> {
  const ctx = await getAdminContext();
  if (!ctx.ok) return { error: ctx.error };

  if (!(PEDIDO_STATUS as readonly string[]).includes(estado)) {
    return { error: "El estado del pedido no es válido." };
  }

  const { data, error } = await ctx.supabase.rpc("admin_pedido_update_status", {
    p_pedido_id: pedidoId,
    p_status: estado,
  });

  if (error) {
    return {
      error: mensajeError(error) ?? "No se ha podido cambiar el estado.",
    };
  }

  revalidar(pedidoId);

  const anterior = typeof data === "string" ? data : null;
  // Escenario 2: el back-office (vía n8n) debe reflejar el mismo estado.
  // Nunca lanza: si la integración falla, el cambio en la tienda ya está hecho.
  await enviarEstadoIntegracion(pedidoId, anterior, estado);

  if (anterior !== "cancelled" && estado === "cancelled") {
    return {
      success:
        "Pedido cancelado. Recuerda reponer el stock de las líneas a mano: " +
        "el sistema no lo hace automáticamente.",
    };
  }

  return { success: "Estado actualizado." };
}

export async function guardarSeguimiento(
  pedidoId: string,
  seguimiento: string,
): Promise<AdminActionState> {
  const ctx = await getAdminContext();
  if (!ctx.ok) return { error: ctx.error };

  const { error } = await ctx.supabase.rpc("admin_pedido_update_tracking", {
    p_pedido_id: pedidoId,
    p_tracking: seguimiento.trim(),
  });

  if (error)
    return { error: mensajeError(error) ?? "No se ha podido guardar." };

  revalidar(pedidoId);
  return { success: "Seguimiento guardado." };
}

/**
 * Reenvía la factura por correo.
 *
 * Es el único sitio desde el que se manda dos veces una factura: `forzar: true`
 * es lo que hace que `correo_reservar` acepte el envío aunque el estado ya sea
 * 'enviado'. Todo lo demás, incluidos el webhook y la página de confirmación,
 * pasa por el camino automático y no puede duplicar nada.
 *
 * El motivo real de que exista es que los clientes no dicen "no ha llegado el
 * correo", dicen "no lo veo en el spam", y casi siempre la bandeja está bien: se
 * ha enviado a una dirección mal escrita.
 */
export async function reenviarFactura(
  pedidoId: string,
): Promise<AdminActionState> {
  const ctx = await getAdminContext();
  if (!ctx.ok) return { error: ctx.error };

  const pedido = await obtenerPedido(pedidoId);

  if (!pedido) return { error: "Ese pedido no existe." };

  if (!pedido.pago_id) {
    return {
      error:
        "Este pedido no tiene identificador de pago, así que no hay forma de " +
        "saber a qué dirección enviarle la factura.",
    };
  }

  if (pedido.status === "cancelled") {
    return {
      error:
        "Este pedido está cancelado. Reenvía la factura solo si el cobro se hizo.",
    };
  }

  const resultado = await enviarFactura({
    pedido,
    pagoId: pedido.pago_id,
    forzar: true,
  });

  revalidar(pedidoId);

  if (resultado.enviado) {
    return { success: "Factura reenviada por correo." };
  }

  return {
    error:
      resultado.motivo ??
      "No se ha podido enviar la factura. Revisa el registro de correos.",
  };
}

/**
 * Notas internas del pedido.
 *
 * Ninguna vista de cliente expone `pedidos.notas` hoy. No introduzcas ninguna que
 * lo haga: es un campo para el equipo, no para la persona que compró.
 */
export async function guardarNotas(
  pedidoId: string,
  notas: string,
): Promise<AdminActionState> {
  const ctx = await getAdminContext();
  if (!ctx.ok) return { error: ctx.error };

  const { error } = await ctx.supabase.rpc("admin_pedido_update_notas", {
    p_pedido_id: pedidoId,
    p_notas: notas,
  });

  if (error)
    return { error: mensajeError(error) ?? "No se ha podido guardar." };

  revalidar(pedidoId);
  return { success: "Notas guardadas." };
}
