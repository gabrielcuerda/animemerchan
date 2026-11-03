import { IVA_PORCENTAJE, MONEDA } from "@/lib/constants";
import { calcularCosteEnvio } from "@/lib/envio";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import type { Carrito, CarritoItem, Pedido } from "@/lib/supabase/types";

/**
 * El carrito vive en Supabase, no en el navegador.
 *
 * Todo el acceso pasa por funciones SECURITY DEFINER (`carrito_*` y
 * `crear_pedido`) porque RLS no puede validar el `cart_session_id` de un
 * visitante anónimo: es un uuid que viaja en una cookie y la base de datos no
 * tiene forma de contrastarlo. Ver `supabase/migrations/`.
 */

const COOKIE_SESION = "cart_session_id";
const DIAS_SESION = 60 * 60 * 24 * 30;

async function getSessionId(options?: {
  readOnly?: boolean;
}): Promise<string | undefined> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(COOKIE_SESION)?.value;

  if (sessionId) return sessionId;
  if (options?.readOnly) return undefined;

  const newSessionId = randomUUID();
  cookieStore.set(COOKIE_SESION, newSessionId, {
    path: "/",
    maxAge: DIAS_SESION,
    sameSite: "lax",
  });

  return newSessionId;
}

type Propietario = {
  userId: string | null;
  sessionId: string | null;
};

/**
 * Id de sesión del carrito anónimo. Con `create: false` solo lee la cookie;
 * por defecto la genera si no existe, así que solo debe llamarse desde acciones
 * y route handlers, nunca durante el render.
 */
export async function getCartSessionId(options?: { create?: boolean }) {
  return getSessionId(options?.create === false ? { readOnly: true } : {});
}

/**
 * Con sesión iniciada manda el usuario; si no, la cookie de navegación.
 * Devuelve `sessionId: null` cuando hay usuario para no filtrar el carrito
 * anónimo por error.
 */
async function getPropietario(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  options?: { readOnly?: boolean; requireSessionId?: boolean },
): Promise<Propietario> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) return { userId: user.id, sessionId: null };

  const sessionId = await getSessionId({
    readOnly: options?.readOnly,
  });

  if (!sessionId && options?.requireSessionId) {
    throw new Error("No se ha podido identificar la sesión del carrito.");
  }

  return { userId: null, sessionId: sessionId ?? null };
}

/** Redondea a céntimos para que los céntimos no se acumulen en la suma. */
function calcularTotales(items: CarritoItem[]) {
  const subtotal = items.reduce(
    (sum, item) => sum + (item.producto_variantes?.precio || 0) * item.cantidad,
    0,
  );
  const iva = Math.round(subtotal * IVA_PORCENTAJE) / 100;
  const costeEnvio = calcularCosteEnvio(subtotal);
  const total = subtotal + iva + costeEnvio;

  return {
    totalItems: items.reduce((sum, item) => sum + item.cantidad, 0),
    subtotal: Math.round(subtotal * 100) / 100,
    iva,
    costeEnvio,
    total: Math.round(total * 100) / 100,
    moneda: MONEDA,
  };
}

function rpcError(mensaje: string, error: { message: string; code?: string }) {
  return new Error(
    `${mensaje} (${error.code ?? "sin código"}: ${error.message})`,
  );
}

export async function getCart(): Promise<Carrito | undefined> {
  const supabase = await createSupabaseServerClient();
  const { userId, sessionId } = await getPropietario(supabase, {
    readOnly: true,
  });

  if (!userId && !sessionId) return undefined;

  const { data, error } = await supabase.rpc("carrito_get_items", {
    p_session_id: sessionId,
  });

  if (error) {
    // El carrito se lee en el layout raíz: si fallamos aquí tumbamos la web
    // entera. Registramos el error y seguimos como si el carrito estuviera vacío.
    console.error(
      "[carrito] No se ha podido leer el carrito. ¿Has ejecutado la migración " +
        `supabase/migrations/20261003000000_carrito_pedidos.sql? ${error.message}`,
    );
    return undefined;
  }

  const items = (data ?? []) as CarritoItem[];
  if (items.length === 0) return undefined;

  return { items, ...calcularTotales(items) };
}

export async function addToCart(payload: {
  productoId: string;
  varianteId: string;
  cantidad: number;
}): Promise<Carrito | undefined> {
  const supabase = await createSupabaseServerClient();
  const { userId, sessionId } = await getPropietario(supabase, {
    requireSessionId: true,
  });

  // Si el visitante acaba de iniciar sesión, su carrito anónimo se traslada
  // antes de añadir para que no se quede huérfano.
  if (userId) {
    const cookieSession = await getSessionId({ readOnly: true });
    if (cookieSession) {
      const { error } = await supabase.rpc("carrito_merge", {
        p_session_id: cookieSession,
      });
      if (error) console.error("[carrito] merge fallido:", error.message);
    }
  }

  const { error } = await supabase.rpc("carrito_add_item", {
    p_producto_id: payload.productoId,
    p_variante_id: payload.varianteId || null,
    p_cantidad: payload.cantidad,
    p_session_id: sessionId,
  });

  if (error) throw rpcError("No se ha podido añadir al carrito", error);

  return getCart();
}

export async function updateCartItem(
  itemId: string,
  cantidad: number,
): Promise<Carrito | undefined> {
  const supabase = await createSupabaseServerClient();
  const { sessionId } = await getPropietario(supabase, {
    requireSessionId: true,
  });

  const { error } = await supabase.rpc("carrito_set_cantidad", {
    p_item_id: itemId,
    p_cantidad: cantidad,
    p_session_id: sessionId,
  });

  if (error) throw rpcError("No se ha podido actualizar la cantidad", error);

  return getCart();
}

export async function removeCartItem(
  itemId: string,
): Promise<Carrito | undefined> {
  const supabase = await createSupabaseServerClient();
  const { sessionId } = await getPropietario(supabase, {
    requireSessionId: true,
  });

  const { error } = await supabase.rpc("carrito_remove_item", {
    p_item_id: itemId,
    p_session_id: sessionId,
  });

  if (error) throw rpcError("No se ha podido borrar el artículo", error);

  return getCart();
}

export async function clearCart(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { sessionId } = await getPropietario(supabase, {
    requireSessionId: true,
  });

  const { error } = await supabase.rpc("carrito_clear", {
    p_session_id: sessionId,
  });

  if (error) throw rpcError("No se ha podido vaciar el carrito", error);
}

export type DireccionEnvio = {
  nombre: string;
  calle: string;
  ciudad: string;
  provincia: string;
  codigo_postal: string;
  pais: string;
  telefono?: string;
  /**
   * Destinatario de la factura. Viaja dentro de `p_direccion`, así que
   * `crear_pedido` lo guarda en `pedidos.direccion_pedido.email` sin tocar SQL.
   *
   * Es el dato que hace posible mandar la factura a un invitado: sin él solo
   * existe el email que el cliente escribió en la página de Stripe, que no se
   * conserva en ninguna parte.
   */
  email?: string;
};

/**
 * Convierte el carrito en pedido. Lo llama el webhook de Stripe una vez
 * confirmado el pago; `pedidoId` es el id del pedido para consultar después.
 *
 * La función SQL es idempotente por `pagoId`, así que llamarla dos veces con el
 * mismo pago no duplica el pedido ni descuenta el stock dos veces.
 */
export async function createPedido(payload: {
  direccion: DireccionEnvio;
  pagoId: string;
  metodoPago?: string;
  /** El webhook no recibe cookies: le pasa el dueño explícitamente. */
  usuarioId?: string | null;
  sessionId?: string | null;
  /**
   * Envío que se cobró en Stripe (`metadata.coste_envio_eur`). Es el único dato
   * del carrito que sobrevive cuando el pedido se crea desde el webhook, que no
   * recibe cookies. Si no llega, `crear_pedido` lo calcula a partir del subtotal.
   */
  costeEnvio?: number | null;
}): Promise<string> {
  const supabase = await createSupabaseServerClient();

  const sessionId =
    payload.sessionId !== undefined
      ? payload.sessionId
      : ((await getSessionId({ readOnly: true })) ?? null);

  const { data, error } = await supabase.rpc("crear_pedido", {
    p_usuario_id: payload.usuarioId ?? null,
    p_session_id: sessionId,
    p_direccion: payload.direccion,
    p_pago_id: payload.pagoId,
    p_metodo_pago: payload.metodoPago ?? "stripe",
    p_iva_porcentaje: IVA_PORCENTAJE,
    // El envío se cobró en Stripe con los tramos de `lib/envio.ts` y viaja en
    // la metadata de la sesión. Si no viene (sesiones antiguas), se manda null
    // y lo decide `crear_pedido`:
    // supabase/migrations/20261103000000_envio_variable.sql
    p_coste_envio: payload.costeEnvio ?? null,
  });

  if (error) throw rpcError("No se ha podido crear el pedido", error);

  return data as string;
}

/** Pedido (con sus líneas) a partir del id de sesión de Stripe. */
export async function getPedidoPorPago(
  pagoId: string,
): Promise<Pedido | undefined> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("pedido_por_pago", {
    p_pago_id: pagoId,
  });

  if (error) throw rpcError("No se ha podido leer el pedido", error);

  return (data as Pedido | null) ?? undefined;
}
