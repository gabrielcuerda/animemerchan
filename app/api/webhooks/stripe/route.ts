import { direccionDesdeMetadata } from "@/lib/checkout";
import { createPedido } from "@/lib/cart";
import { enviarFactura } from "@/lib/email/enviar-factura";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { enviarPedidoIntegracion } from "@/lib/integracion/enviar-integracion";

/**
 * Webhook de Stripe.
 *
 * Es la vía fiable para registrar el pedido: el cliente puede cerrar la
 * pestaña justo después de pagar y la página de confirmación no llegaría a
 * crearlo. `crear_pedido` es idempotente por `pago_id`, así que que pasen
 * ambos no duplica nada.
 *
 * El webhook no recibe cookies, por eso el usuario y la sesión del carrito
 * viajan en `metadata` de la Checkout Session.
 */

/**
 * A quién va la factura.
 *
 * El orden importa. Lo primero es lo que el cliente escribió en la página de
 * Stripe, que es donde introduce la tarjeta y donde Stripe garantiza que hay un
 * email (sin él no hay recibo). `customer_email` es el que le pusimos al crear
 * la sesión, y `metadata.email` el respaldo por si el webhook llegara con una
 * sesión creada antes de que existiera este campo.
 */
function emailDeLaSesion(
  session: Stripe.Checkout.Session,
  metadata: Record<string, string>,
) {
  return (
    session.customer_details?.email ??
    session.customer_email ??
    metadata.email ??
    null
  );
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Falta la firma" }, { status: 400 });
  }

  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      getStripeWebhookSecret(),
    );
  } catch (error) {
    console.error("[stripe] Firma inválida:", error);
    return NextResponse.json({ error: "Firma inválida" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.payment_status !== "paid") {
        console.log(
          `[stripe] Sesión ${session.id} aún no pagada (${session.payment_status})`,
        );
        break;
      }

      const metadata = session.metadata ?? {};
      const direccion = direccionDesdeMetadata(metadata.direccion);
      const email = emailDeLaSesion(session, metadata);

      try {
        const pedidoId = await createPedido({
          // El email va dentro de `direccion` para que `crear_pedido` lo guarde en
          // `pedidos.direccion_pedido.email`. Sin eso, la factura solo se podría
          // mandar desde esta petición y no se podría reenviar a mano más
          // adelante.
          direccion: email ? { ...direccion, email } : direccion,
          pagoId: session.id,
          metodoPago: "stripe",
          usuarioId: metadata.user_id || null,
          sessionId: metadata.cart_session_id || null,
        });

        console.log(`[stripe] Pedido ${pedidoId} creado (${session.id})`);
      } catch (error) {
        // Si algo falla devolvemos 500 para que Stripe reintente.
        console.error("[stripe] Error creando el pedido:", error);
        return NextResponse.json(
          { error: "Error creando el pedido" },
          { status: 500 },
        );
      }

      // La factura va DESPUÉS de crear el pedido y en su propio try/catch que no
      // devuelve 500 a propósito: un 500 aquí haría que Stripe reintentara el
      // webhook entero y, con él, `createPedido`, que ya está hecho. Perder la
      // factura es malo; perder el pedido, no. El reenvío manual desde el panel
      // cubre el hueco.
      try {
        await enviarFactura({ pagoId: session.id, email });
      } catch (error) {
        console.error("[stripe] Error enviando la factura:", error);
      }
      // Integración con el back-office. Igual que la factura: su
      // fallo no puede hacer que Stripe reintente un pedido ya creado.
      await enviarPedidoIntegracion(session.id, email);
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(`[stripe] Sesión caducada: ${session.id}`);
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
