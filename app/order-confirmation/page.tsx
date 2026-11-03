import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { IVA_PORCENTAJE } from "@/lib/constants";
import { createPedido, getPedidoPorPago } from "@/lib/cart";
import { direccionDesdeMetadata, envioDesdeMetadata } from "@/lib/checkout";
import { enviarFactura, type ResultadoEnvio } from "@/lib/email/enviar-factura";
import { getStripe } from "@/lib/stripe";
import type { Pedido } from "@/lib/supabase/types";
import Link from "next/link";
import Image from "next/image";

export const dynamic = "force-dynamic";

type Estado = "confirmado" | "procesando" | "error";

/**
 * Email del comprador, con la misma precedencia que en el webhook
 * (`app/api/webhooks/stripe/route.ts`): primero lo que escribió en la página de
 * Stripe, luego el que le pasamos al crear la sesión.
 */
function emailDeLaSesion(
  session: {
    customer_details?: { email?: string | null } | null;
    customer_email?: string | null;
  },
  metadata: Record<string, string>,
) {
  return (
    session.customer_details?.email ??
    session.customer_email ??
    metadata.email ??
    null
  );
}

/**
 * La factura nunca puede romper esta página: el pago ya está cobrado y el pedido
 * ya está en la base de datos. Si el envío falla, se anota en el log y el
 * cliente ve igualmente su confirmación.
 */
async function enviarFacturaSinRomper(params: {
  pedido: Pedido;
  pagoId: string;
}): Promise<ResultadoEnvio | null> {
  try {
    return await enviarFactura(params);
  } catch (error) {
    console.error("[confirmación] Error enviando la factura:", error);
    return null;
  }
}

async function resolverPedido(sessionId: string): Promise<{
  estado: Estado;
  pedido?: Pedido;
  mensaje?: string;
  /** `true` solo si la factura salió ahora o ya había salido antes. */
  facturaEnviada?: boolean;
}> {
  // Verificamos contra Stripe: la URL es del navegador y no vale como prueba
  // de que el pago se haya hecho.
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== "paid") {
    return {
      estado: "procesando",
      mensaje:
        "Estamos confirmando el pago. Si acabas de pagar, actualiza la página en unos segundos.",
    };
  }

  const pedido = await getPedidoPorPago(sessionId);

  if (pedido) {
    // El webhook ya creó el pedido, así que lo normal es que la factura ya haya
    // salido de su lado. Se vuelve a llamar igualmente porque, si el webhook no
    // llegó (en local hace falta `stripe listen`), así es como sale igualmente.
    // `correo_reservar` hace que este segundo intento no duplique nada.
    const factura = await enviarFacturaSinRomper({ pedido, pagoId: sessionId });

    return {
      estado: "confirmado",
      pedido,
      facturaEnviada: Boolean(factura?.enviado || factura?.yaEnviada),
    };
  }

  // El webhook puede tardar o no haber llegado. Lo creamos aquí como red de
  // seguridad; es idempotente por `pago_id`.
  const metadata = session.metadata ?? {};
  const email = emailDeLaSesion(session, metadata);

  try {
    await createPedido({
      direccion: {
        ...direccionDesdeMetadata(metadata.direccion),
        ...(email ? { email } : {}),
      },
      pagoId: session.id,
      metodoPago: "stripe",
      usuarioId: metadata.user_id || null,
      sessionId: metadata.cart_session_id || null,
      costeEnvio: envioDesdeMetadata(metadata.coste_envio_eur),
    });
  } catch (error) {
    console.error("[confirmación] No se ha podido crear el pedido:", error);
    return {
      estado: "procesando",
      mensaje:
        "El pago está confirmado y estamos guardando tu pedido. Te enviaremos la factura por email.",
    };
  }

  const confirmado = await getPedidoPorPago(sessionId);

  if (!confirmado) {
    return {
      estado: "procesando",
      mensaje: "Tu pedido se está registrando.",
    };
  }

  const factura = await enviarFacturaSinRomper({
    pedido: confirmado,
    pagoId: sessionId,
  });

  return {
    estado: "confirmado",
    pedido: confirmado,
    facturaEnviada: Boolean(factura?.enviado || factura?.yaEnviada),
  };
}

export default async function OrderConfirmationPage(props: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await props.searchParams;

  if (!session_id) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-amber-500" />
        <h1 className="mt-6 text-3xl font-bold">No encontramos tu pedido</h1>
        <p className="mt-2 text-neutral-500">
          El enlace de confirmación no es válido.
        </p>
        <Link
          href="/search"
          className="mt-6 inline-block rounded-full bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:opacity-90"
        >
          Seguir comprando
        </Link>
      </div>
    );
  }

  let resultado: Awaited<ReturnType<typeof resolverPedido>>;

  try {
    resultado = await resolverPedido(session_id);
  } catch (error) {
    console.error("[confirmación] Error:", error);
    resultado = {
      estado: "error",
      mensaje:
        "No hemos podido verificar el pago. Inténtalo de nuevo en unos minutos.",
    };
  }

  const { estado, pedido, mensaje, facturaEnviada } = resultado;

  if (estado !== "confirmado" || !pedido) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <ClockIcon className="mx-auto h-16 w-16 text-amber-500" />
        <h1 className="mt-6 text-3xl font-bold">
          {estado === "error" ? "Algo ha ido mal" : "Pago recibido"}
        </h1>
        <p className="mt-2 text-neutral-500">{mensaje}</p>
        <Link
          href="/account/orders"
          className="mt-6 inline-block rounded-full bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:opacity-90"
        >
          Ver mis pedidos
        </Link>
      </div>
    );
  }

  const desglose = pedido.direccion_pago;
  const direccion = pedido.direccion_pedido;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="text-center">
        <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500" />
        <h1 className="mt-6 text-3xl font-bold">¡Pedido confirmado!</h1>
        <p className="mt-2 text-neutral-500">
          {facturaEnviada ? (
            <>
              Te hemos enviado la factura por email
              {pedido.direccion_pedido?.email
                ? ` a ${pedido.direccion_pedido.email}`
                : ""}
              . Gracias por tu compra.
            </>
          ) : (
            <>
              Tu pedido está confirmado, pero no hemos podido enviarte la factura
              por email. Puedes verla y descargarla con el botón de abajo.
            </>
          )}
        </p>
        {pedido.pago_id ? (
          <Link
            href={`/factura/${encodeURIComponent(pedido.pago_id)}`}
            className="mt-4 inline-block rounded-full border border-neutral-300 px-5 py-2 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Ver la factura
          </Link>
        ) : null}
      </div>

      <div className="mt-12 rounded-lg border border-neutral-200 p-6 dark:border-neutral-700">
        <h2 className="mb-4 text-lg font-semibold">Detalles del pedido</h2>

        <div className="mb-4 flex justify-between text-sm">
          <span className="text-neutral-500">Número de pedido</span>
          <span className="font-mono">
            {pedido.id.slice(0, 8).toUpperCase()}
          </span>
        </div>
        <div className="mb-4 flex justify-between text-sm">
          <span className="text-neutral-500">Estado</span>
          <span className="capitalize">
            {pedido.status === "paid" ? "Pagado" : pedido.status}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-neutral-500">Total</span>
          <span className="font-semibold">
            {pedido.total.toFixed(2)} {pedido.moneda}
          </span>
        </div>

        <ul className="mt-6 divide-y divide-neutral-200 border-t border-neutral-200 pt-4 dark:divide-neutral-700 dark:border-neutral-700">
          {pedido.items_pedido.map((item) => (
            <li key={item.id} className="flex items-center gap-4 py-4">
              {item.img_producto && (
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900">
                  <Image
                    src={item.img_producto}
                    alt={item.titulo_producto}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
              )}
              <span className="min-w-0 flex-1 text-sm">
                {item.titulo_producto}
                <span className="block text-neutral-500">
                  {item.cantidad} × {item.precio.toFixed(2)} {pedido.moneda}
                </span>
              </span>
              <span className="text-sm font-medium">
                {(item.precio * item.cantidad).toFixed(2)} {pedido.moneda}
              </span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-2 border-t border-neutral-200 pt-4 text-sm dark:border-neutral-700">
          <div className="flex justify-between">
            <dt className="text-neutral-500">Subtotal</dt>
            <dd>
              {pedido.subtotal.toFixed(2)} {pedido.moneda}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">
              IVA ({desglose?.iva_porcentaje ?? IVA_PORCENTAJE} %)
            </dt>
            <dd>
              {(
                desglose?.iva ??
                pedido.total - pedido.subtotal - pedido.coste_envio
              ).toFixed(2)}{" "}
              {pedido.moneda}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">Envío</dt>
            <dd>
              {pedido.coste_envio > 0
                ? `${pedido.coste_envio.toFixed(2)} ${pedido.moneda}`
                : "Gratis"}
            </dd>
          </div>
          <div className="flex justify-between border-t border-neutral-200 pt-2 text-base font-semibold dark:border-neutral-700">
            <dt>Total</dt>
            <dd>
              {pedido.total.toFixed(2)} {pedido.moneda}
            </dd>
          </div>
        </dl>

        {direccion && (
          <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-700">
            <h3 className="mb-2 text-sm font-medium">Dirección de envío</h3>
            <address className="text-sm not-italic text-neutral-500">
              {direccion.nombre}
              <br />
              {direccion.calle}
              <br />
              {direccion.codigo_postal} {direccion.ciudad}
              {direccion.provincia ? `, ${direccion.provincia}` : ""}
              <br />
              {direccion.pais}
              {direccion.telefono ? (
                <>
                  <br />
                  {direccion.telefono}
                </>
              ) : null}
            </address>
          </div>
        )}
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/search"
          className="inline-block rounded-full bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:opacity-90"
        >
          Seguir comprando
        </Link>
      </div>
    </div>
  );
}
