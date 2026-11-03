import { IVA_PORCENTAJE } from "@/lib/constants";
import { getCart, type DireccionEnvio } from "@/lib/cart";
import { getStripe } from "@/lib/stripe";
import { siteConfig } from "@/lib/site";

/**
 * Pago con Stripe Checkout alojado: el usuario sale de la web a la página de
 * Stripe, introduce la tarjeta y Stripe le envía la factura por email
 * (`invoice_creation.enabled`).
 *
 * El importe SIEMPRE se calcula en servidor a partir del carrito en base de
 * datos. Nunca se acepta un total enviado por el navegador.
 */

/**
 * Stripe limita cada valor de `metadata` a 500 caracteres, así que la dirección
 * viaja como cadena compacta en lugar de JSON (un JSON truncado no parsea).
 */
export function direccionAMetadata(direccion: DireccionEnvio): string {
  const partes = [
    direccion.nombre,
    direccion.calle,
    `${direccion.codigo_postal} ${direccion.ciudad}`,
    direccion.provincia,
    direccion.pais,
    direccion.telefono ?? "",
  ]
    .map((parte) =>
      String(parte ?? "")
        .replace(/\|/g, " ")
        .trim(),
    )
    .join("|");

  // Stripe rechaza la sesión si un valor de metadata pasa de 500 caracteres.
  return recortar(partes, 500);
}

export function direccionDesdeMetadata(valor?: string | null): DireccionEnvio {
  const [
    nombre = "",
    calle = "",
    cpCiudad = "",
    provincia = "",
    pais = "España",
    telefono = "",
  ] = (valor ?? "").split("|").map((parte) => parte.trim());

  const [codigo_postal = "", ...restoCiudad] = cpCiudad.split(/\s+/);
  const ciudad = restoCiudad.join(" ");

  return {
    nombre,
    calle,
    ciudad,
    provincia,
    codigo_postal,
    pais: pais || "España",
    ...(telefono ? { telefono } : {}),
  };
}

/**
 * Coste de envío que se cobró en Stripe, leído de `metadata.coste_envio_eur`.
 *
 * Existe porque el webhook de confirmación llega sin cookies y no puede volver
 * a leer el carrito: el único sitio que sabe cuánto se cobró de envío es la
 * Checkout Session. Devuelve `null` si el valor no está o no es un número
 * razonable, para que `crear_pedido` decida (es el caso de las sesiones creadas
 * antes de que existiera esta clave).
 */
export function envioDesdeMetadata(valor?: string | null): number | null {
  const limpio = String(valor ?? "").trim();

  // `Number("")` es 0, y 0 es un envío gratis legítimo: hay que distinguir
  // "no hay dato" de "se cobraron 0 €".
  if (limpio === "") return null;

  const importe = Number(limpio);

  if (!Number.isFinite(importe) || importe < 0 || importe > 1000) return null;

  return Math.round(importe * 100) / 100;
}

type Linea = {
  quantity: number;
  price_data: {
    currency: string;
    unit_amount: number;
    product_data: { name: string; description?: string };
  };
};

function toCents(importe: number): number {
  return Math.round(importe * 100);
}

/** Stripe corta en 140 caracteres el valor de un campo de factura. */
function recortar(valor: string, max = 140): string {
  const limpio = valor.replace(/\s+/g, " ").trim();
  return limpio.length <= max ? limpio : `${limpio.slice(0, max - 1)}…`;
}

export async function crearSesionCheckout(params: {
  direccion: DireccionEnvio;
  origin: string;
  userId?: string | null;
  userEmail?: string | null;
  /**
   * Email del invitado. Con sesión initiated manda el de la cuenta
   * (`userEmail`) y este se ignora, para que la factura salga siempre a la
   * dirección con la que se registró.
   */
  email?: string | null;
  sessionId: string | null;
}) {
  const cart = await getCart();

  if (!cart || cart.items.length === 0) {
    throw new Error("El carrito está vacío.");
  }

  const email = params.userEmail ?? params.email ?? null;

  const lineas: Linea[] = cart.items.map((item) => {
    const titulo = item.productos?.titulo ?? "Producto";
    const variante = item.producto_variantes?.titulo;

    return {
      quantity: item.cantidad,
      price_data: {
        currency: "eur",
        unit_amount: toCents(item.producto_variantes?.precio ?? 0),
        product_data: {
          name: titulo.slice(0, 120),
          ...(variante && variante !== "Default Title"
            ? { description: variante.slice(0, 120) }
            : {}),
        },
      },
    };
  });

  // El IVA va como línea propia para que se vea en la factura de Stripe.
  if (cart.iva > 0) {
    lineas.push({
      quantity: 1,
      price_data: {
        currency: "eur",
        unit_amount: toCents(cart.iva),
        product_data: { name: `IVA (${IVA_PORCENTAJE} %)` },
      },
    });
  }

  if (cart.costeEnvio > 0) {
    lineas.push({
      quantity: 1,
      price_data: {
        currency: "eur",
        unit_amount: toCents(cart.costeEnvio),
        product_data: { name: "Envío" },
      },
    });
  }

  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    locale: "es",
    line_items: lineas,
    // Con usuario identificado, Stripe rellena el email y la factura sale a su
    // nombre. Sin sesión, el cliente lo escribe en la página de Stripe; se le
    // pasa el que ya escribió en `/checkout` para que no tenga que repetirlo y
    // para que la factura de Stripe y la nuestra vayan al mismo sitio.
    ...(email ? { customer_email: email } : {}),
    success_url: `${params.origin}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${params.origin}/cart`,
    // Factura + envío por email gestionados por Stripe.
    invoice_creation: {
      enabled: true,
      invoice_data: {
        description: "Pedido Animemerchan",
        footer: `${siteConfig.name} · ${siteConfig.email} · ${siteConfig.phone}`,
        // El SDK v22 no tipa `shipping_details` en InvoiceData, así que la
        // dirección viaja como campos personalizados de la factura. Ojo: el
        // nombre admite 40 caracteres y el valor 140.
        custom_fields: [
          {
            name: "Enviar a",
            value: recortar(
              `${params.direccion.nombre}, ${params.direccion.calle}, ` +
                `${params.direccion.codigo_postal} ${params.direccion.ciudad}`,
            ),
          },
          {
            name: "Provincia y país",
            value: recortar(
              [params.direccion.provincia, params.direccion.pais]
                .filter(Boolean)
                .join(", "),
            ),
          },
          ...(params.direccion.telefono
            ? [
                {
                  name: "Teléfono",
                  value: recortar(params.direccion.telefono),
                },
              ]
            : []),
        ],
      },
    },
    metadata: {
      user_id: params.userId ?? "",
      cart_session_id: params.sessionId ?? "",
      direccion: direccionAMetadata(params.direccion),
      // El email va en su PROPIA clave y no dentro de la cadena `direccion`:
      // esa va jointeada con `|` y recortada a 500 caracteres por el límite de
      // Stripe, y una dirección larga más el correo la reventarían. Aquí no
      // hay recorte porque un email no llega a 500.
      email: email ?? "",
      total_eur: cart.total.toFixed(2),
      // El envío viaja a la confirmación del pago. El webhook no puede releer
      // el carrito (no tiene cookies) y `crear_pedido` guarda lo que recibe en
      // `p_coste_envio`; sin este dato la factura saldría con envío 0 €.
      coste_envio_eur: cart.costeEnvio.toFixed(2),
    },
  });

  if (!session.url) {
    throw new Error("Stripe no ha devuelto la URL de pago.");
  }

  // Se devuelven también el identificador de la sesión de Stripe y los totales
  // del carrito para que quien llama pueda registrar `checkout.started` sin
  // tener que releer el carrito: el `stripe_session_id` es lo que permite
  // emparejar después este evento con el pedido que se cree al confirmar el
  // pago.
  return {
    url: session.url,
    sessionId: session.id,
    total: cart.total,
    totalItems: cart.totalItems,
  };
}
