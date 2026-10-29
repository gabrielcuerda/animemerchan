import { siteConfig as SITE } from "@/lib/site";
import type { Cart, Menu, Page } from "./types";

function emptyCart(): Cart {
  return {
    id: "local-cart",
    checkoutUrl: "/account",
    totalQuantity: 0,
    lines: [],
    cost: {
      subtotalAmount: { amount: "0", currencyCode: "EUR" },
      totalAmount: { amount: "0", currencyCode: "EUR" },
      totalTaxAmount: { amount: "0", currencyCode: "EUR" },
    },
  };
}

export async function getCart(): Promise<Cart> {
  return emptyCart();
}

export async function createCart(): Promise<Cart> {
  return emptyCart();
}

export async function addToCart(
  _lines: { merchandiseId: string; quantity: number }[],
): Promise<Cart> {
  return emptyCart();
}

export async function removeFromCart(_lineIds: string[]): Promise<Cart> {
  return emptyCart();
}

export async function updateCart(
  _lines: { id: string; quantity: number }[],
): Promise<Cart> {
  return emptyCart();
}

export async function getMenu(_handle: string): Promise<Menu[]> {
  return [];
}

const pages: Record<string, Page> = {
  about: {
    title: "Sobre nosotros",
    body: `<p>Animemerchan es una tienda especializada en merchandising de anime y manga importado directamente desde Japón. Seleccionamos figuras de acción, manga, apparel y coleccionables de franquicias como Dragon Ball, One Piece, Naruto, Jujutsu Kaisen, Demon Slayer, Attack on Titan y Chainsaw Man.</p>

<h2>Quiénes somos</h2>
<p>Somos un equipo pequeño de aficionados que empezó comprando figuras para su colección personal y acabó importándolas para otros coleccionistas. No vendemos producto de segunda mano ni réplicas: todo lo que sale de nuestro almacén es original y está sellado.</p>

<h2>Qué vendemos</h2>
<ul>
<li><strong>Figuras de acción</strong>: de 8 a 30 cm, con caja original y todos sus accesorios.</li>
<li><strong>Manga y tomos</strong>: en idioma japonés, volúmenes sueltos o packs completas.</li>
<li><strong>Apparel</strong>: camisetas, sudaderas y calcetines con diseños oficiales.</li>
<li><strong>Coleccionables</strong>: pins, posavasos, cartas y figuras de edición limitada.</li>
</ul>

<h2>Cómo trabajamos</h2>
<ol>
<li>Compramos directamente a distribuidores de Japón, sin intermediarios.</li>
<li>Revisamos el estado y el embalaje de cada pieza antes de prepararla.</li>
<li>Enviamos desde nuestro almacén en Madrid, normalmente en 24-48 horas laborables.</li>
<li>Respondemos por email antes y después del pedido.</li>
</ol>

<h2>Dónde estamos</h2>
<p>${SITE.name}<br />${SITE.address}<br />${SITE.email}<br />${SITE.phone}</p>

<h2>Proyecto académico</h2>
<p>Esta web es un <strong>proyecto académico universitario</strong>. No se venden productos reales ni se procesan pagos reales: es una demostración funcional de una tienda online construida con Next.js, Supabase y Stripe.</p>`,
    bodySummary:
      "Tienda especializada en merchandising de anime y manga importado de Japón: figuras, manga, apparel y coleccionables originales.",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2025-03-10T00:00:00.000Z",
    seo: {
      title: "Sobre nosotros",
      description:
        "Tienda de merchandising de anime y manga importado de Japón: figuras, manga, apparel y coleccionables originales.",
    },
  },

  contacto: {
    title: "Contacto",
    body: `<p>Estamos aquí para resolver cualquier duda antes o después de tu pedido. Escríbenos y te respondemos en menos de 24 horas laborables.</p>

<h2>Email</h2>
<p><a href="mailto:${SITE.email}">${SITE.email}</a><br />La vía más rápida para cualquier consulta sobre un pedido.</p>

<h2>Teléfono</h2>
<p><a href="${SITE.phoneHref}">${SITE.phone}</a><br />${SITE.schedule}</p>

<h2>Dirección</h2>
<p>${SITE.address}</p>

<h2>Antes de escribir</h2>
<ul>
<li>Para <strong>el estado de un pedido</strong>, incluye el número de pedido y el correo con el que compraste.</li>
<li>Para <strong>una devolución</strong>, consulta antes la <a href="/devoluciones">política de devoluciones</a> y ten a mano fotos del producto.</li>
<li>Para <strong>dudas sobre un producto concreto</strong>, indica la referencia exacta del artículo.</li>
</ul>

<h2>Tiempo de respuesta</h2>
<p>Respondemos todos los mensajes en un máximo de 24 horas laborables. Si tu mensaje entra antes de las 14:00 de un día laborable, lo respondemos el mismo día.</p>`,
    bodySummary:
      "Email, teléfono, horario y dirección de atención al cliente de Animemerchan.",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2025-02-18T00:00:00.000Z",
    seo: {
      title: "Contacto",
      description:
        "Email, teléfono, horario y dirección de atención al cliente de Animemerchan.",
    },
  },

  envios: {
    title: "Envíos y entregas",
    body: `<p>Enviamos a toda la península ibérica y al resto de la Unión Europea. Todos los envíos salen con número de seguimiento que puedes consultar desde tu cuenta.</p>

<h2>Plazos de entrega</h2>
<table>
<thead><tr><th>Modalidad</th><th>Plazo</th><th>Seguimiento</th></tr></thead>
<tbody>
<tr><td>Estándar península</td><td>24-48 horas laborables</td><td>Sí</td></tr>
<tr><td>Estándar Europa</td><td>3-5 días laborables</td><td>Sí</td></tr>
<tr><td>Expres península</td><td>24 horas</td><td>Sí</td></tr>
<tr><td>Recogida en Madrid</td><td>2 horas, con cita previa</td><td>No</td></tr>
</tbody>
</table>
<p>Los plazos empiezan a contar desde que el pedido sale de nuestro almacén, no desde que se realiza el pago.</p>

<h2>Coste del envío</h2>
<table>
<thead><tr><th>Destino</th><th>Estándar</th><th>Expres</th></tr></thead>
<tbody>
<tr><td>Península</td><td>4,90 €</td><td>9,90 €</td></tr>
<tr><td>Baleares y Canarias</td><td>12,90 €</td><td>19,90 €</td></tr>
<tr><td>Europa</td><td>14,90 €</td><td>24,90 €</td></tr>
</tbody>
</table>

<h2>Envío gratis</h2>
<p>El envío estándar es <strong>gratuito en pedidos desde ${SITE.freeShippingThreshold} €</strong>. No hace falta introducir ningún código: el descuento se aplica automáticamente al pasar el importe en el carrito.</p>

<h2>Pedidos antes de las 14:00</h2>
<p>Los pedidos confirmados antes de las 14:00 de un día laborable salen ese mismo día. Después de esa hora, el envío comienza el día laborable siguiente.</p>

<h2>Pre-venta y bajo pedido</h2>
<p>Los artículos marcados como <strong>Próximamente</strong> o <strong>Bajo pedido</strong> no tienen stock inmediato. En la ficha de cada producto verás la fecha estimada de disponibilidad; los artículos en pre-venta pueden cancelarse sin coste si esa fecha se retrasa más de 30 días.</p>

<h2>Direcciones de entrega</h2>
<p>Puedes guardar varias direcciones en <a href="/account/addresses">tu cuenta</a> y elegir una al hacer el pedido. El transportista te avisa por email y SMS cuando el paquete sale para entrega.</p>

<h2>Si el pedido no llega</h2>
<p>Si pasan 5 días laborables desde la fecha estimada y el seguimiento no muestra novedades, escríbenos y lo investigamos. Si el paquete figura como perdido, reenviamos o reembolsamos el producto sin coste.</p>`,
    bodySummary:
      "Plazos, costes de envío, envío gratis desde 60 €, seguimiento y qué hacer si el pedido no llega.",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2025-04-02T00:00:00.000Z",
    seo: {
      title: "Envíos y entregas",
      description:
        "Plazos, costes de envío, envío gratis desde 60 € y seguimiento de tu pedido.",
    },
  },

  devoluciones: {
    title: "Devoluciones",
    body: `<p>Tienes <strong>30 días desde la recepción</strong> para devolver cualquier producto sin usar y en su embalaje original. El proceso es gratuito: el transportista de recogida corre por nuestra cuenta.</p>

<h2>Cómo devolver un producto</h2>
<ol>
<li>Solicita la devolución desde tu cuenta, en <a href="/account/orders">Mis pedidos</a>.</li>
<li>Indica el motivo y, si quieres, adjunta fotos del estado del producto.</li>
<li>Guarda el producto en su caja original con todos sus accesorios.</li>
<li>Imprime la etiqueta que te enviamos por email o lleva el paquete a un punto de recogida.</li>
<li>Te avisamos por email cuando recibamos el paquete y revisamos el estado.</li>
</ol>

<h2>Condiciones</h2>
<ul>
<li>El producto debe estar <strong>sin usar</strong>, sin daños y con su etiqueta original.</li>
<li>Debe incluir todos los accesorios: caja, manuales, pegatinas y piezas sueltas.</li>
<li>Los productos personalizados no admiten devolución.</li>
<li>Abrir la caja para comprobar la calidad no cuenta como uso.</li>
</ul>

<h2>Producto dañado o error de fábrica</h2>
<p>Si el producto llega roto o no corresponde a lo anunciado, escríbenos con fotos y te enviamos una sustitución sin coste. No hace falta que devuelvas el producto hasta que confirmemos la incidencia.</p>

<h2>Reembolso</h2>
<p>Emitimos el reembolso en un máximo de <strong>7 días desde la recepción de la devolución</strong>, por el mismo método de pago. Los gastos de envío originales solo se reembolsan si el motivo es un error nuestro.</p>

<h2>Cambios</h2>
<p>No hacemos cambios directos. Si prefieres otra talla, modelo o color, devuelve el producto y realiza un pedido nuevo.</p>

<h2>Cancelación</h2>
<p>Puedes cancelar tu pedido desde tu cuenta mientras no se haya enviado. Si ya está en tránsito, espera a la entrega y devuélvelo: la recogida sigue siendo gratuita.</p>`,
    bodySummary:
      "Devolución gratuita en 30 días: cómo hacerla, condiciones, reembolsos y cancelaciones.",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2025-03-28T00:00:00.000Z",
    seo: {
      title: "Devoluciones",
      description:
        "Devuelve cualquier producto en 30 días de forma gratuita. Reembolso en 7 días.",
    },
  },

  "preguntas-frecuentes": {
    title: "Preguntas frecuentes",
    body: `<p>Resolvemos las dudas que más nos llegan por email. Si la tuya no está aquí, escríbenos a <a href="mailto:${SITE.email}">${SITE.email}</a>.</p>

<h2>Sobre los productos</h2>

<h3>¿De dónde viene el producto?</h3>
<p>Todo el merchandising se importa directamente desde Japón a través de nuestros proveedores habituales. No compramos nada en el mercado de segunda mano.</p>

<h3>¿Los productos son originales?</h3>
<p>Sí. Todas las piezas son originales y vienen selladas de fábrica. En la ficha de cada producto indicamos el fabricante y la escala para que puedas verificarlo.</p>

<h3>¿Qué diferencia hay entre pre-venta y bajo pedido?</h3>
<p>En <strong>pre-venta</strong> el artículo está anunciado pero todavía no ha llegado a nuestro almacén. En <strong>bajo pedido</strong> lo solicitamos al proveedor después de tu compra. En ambos casos verás la fecha estimada en la ficha.</p>

<h3>¿Las figuras incluyen accesorios?</h3>
<p>Sí, salvo que la ficha indique lo contrario. Si al recibir el paquete falta alguna pieza, trátalo como una incidencia y te la enviamos sin coste.</p>

<h2>Sobre el envío</h2>

<h3>¿Cuánto cuesta el envío?</h3>
<p>4,90 € en península y 14,90 € en Europa. Es <strong>gratis desde ${SITE.freeShippingThreshold} €</strong> en envío estándar, sin código.</p>

<h3>¿Puedo cancelar un pedido?</h3>
<p>Puedes cancelar desde tu cuenta mientras no se haya enviado. Después de la entrega, la vía es la devolución gratuita.</p>

<h3>¿Envían a Canarias o al extranjero?</h3>
<p>Sí, a Canarias y Baleares con su tarifa propia, y al resto de la Unión Europea con un plazo de 3 a 5 días laborables.</p>

<h2>Sobre el pago</h2>

<h3>¿Qué métodos de pago aceptáis?</h3>
<p>Tarjeta de crédito y débito, Bizum, PayPal y transferencia bancaria. El pago se procesa de forma cifrada a través de Stripe.</p>

<h3>¿Puedo pagar contra entrega?</h3>
<p>No. Por seguridad solo aceptamos pago anticipado.</p>

<h2>Sobre la cuenta</h2>

<h3>¿Necesito cuenta para comprar?</h3>
<p>No, puedes comprar como invitado. La cuenta solo sirve para seguir pedidos, guardar direcciones y usar la lista de deseos.</p>

<h3>¿Cómo elimino mi cuenta?</h3>
<p>Escríbenos desde el correo con el que te registraste y la borramos en 72 horas, junto con todos tus datos personales.</p>`,
    bodySummary:
      "Origen de los productos, autenticidad, envío, pagos y gestión de la cuenta.",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2025-04-15T00:00:00.000Z",
    seo: {
      title: "Preguntas frecuentes",
      description:
        "Todo lo que necesitas saber antes de comprar: origen, envíos, pagos y devoluciones.",
    },
  },

  "aviso-legal": {
    title: "Aviso legal",
    body: `<p>Este aviso regula el uso de la web y las compras en ${SITE.name}. Navegar por el sitio implica aceptar estas condiciones.</p>

<h2>1. Titular del sitio</h2>
<p>${SITE.name}<br />${SITE.address}<br />${SITE.email}<br />${SITE.phone}</p>

<h2>2. Objeto y condiciones</h2>
<p>Este sitio ofrece merchandising de anime y manga. Al realizar un pedido aceptas estas condiciones, las de <a href="/devoluciones">devoluciones</a> y la <a href="/privacidad">política de privacidad</a>.</p>

<h2>3. Precios e IVA</h2>
<p>Todos los precios se muestran en euros con el <strong>IVA incluido</strong>. El importe final con los gastos de envío aparece antes de confirmar el pago y no cambia después.</p>

<h2>4. Pagos</h2>
<p>Aceptamos tarjeta, Bizum, PayPal y transferencia bancaria. El pedido se considera firme cuando el pago se autoriza. Los datos de la tarjeta se procesan directamente a través de Stripe y no se almacenan en nuestros servidores.</p>

<h2>5. Disponibilidad</h2>
<p>Los artículos de edición limitada pueden agotarse entre que los añades al carrito y confirmas el pago. Si ocurre, te lo indicamos y te devolvemos el importe.</p>

<h2>6. Propiedad intelectual</h2>
<p>Los logotipos, marcas, personajes y títulos de las franquicias pertenecen a sus respectivos titulares. Esta tienda vende productos físicos de esos titulares; no está afiliada ni patrocinada por ellos.</p>

<h2>7. Responsabilidad</h2>
<p>Respondemos por los daños directos derivados de un uso incorrecto del sitio. No somos responsables de lucro cesante ni de daños indirectos.</p>

<h2>8. Legislación aplicable</h2>
<p>Estas condiciones se rigen por la legislación española. Para cualquier controversia, las partes se someten a los juzgados y tribunales de Madrid.</p>

<h2>9. Proyecto académico</h2>
<p>Esta web es un proyecto académico universitario. No se venden productos reales, no se realizan cobros reales y los datos de las tarjetas son ficticios.</p>`,
    bodySummary:
      "Condiciones generales de uso de la tienda: titular, precios, pagos, propiedad intelectual y legislación aplicable.",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2025-02-25T00:00:00.000Z",
    seo: {
      title: "Aviso legal",
      description:
        "Condiciones generales de uso de la tienda: titular, precios con IVA, pagos y legislación aplicable.",
    },
  },

  privacidad: {
    title: "Política de privacidad",
    body: `<p>Esta política explica qué datos personales recogemos, para qué los usamos y cómo puedes ejercer tus derechos conforme al RGPD y a la LOPDGDD.</p>

<h2>1. Responsable del tratamiento</h2>
<p>${SITE.name}<br />${SITE.address}<br />${SITE.email}</p>

<h2>2. Qué datos recogemos</h2>
<table>
<thead><tr><th>Dato</th><th>Cuándo</th><th>Obligatorio</th></tr></thead>
<tbody>
<tr><td>Nombre y apellidos</td><td>Al registrarse</td><td>Sí</td></tr>
<tr><td>Correo electrónico</td><td>Al registrarse o comprar</td><td>Sí</td></tr>
<tr><td>Dirección de envío</td><td>Al hacer el pedido</td><td>Sí</td></tr>
<tr><td>Teléfono</td><td>Al hacer el pedido</td><td>No</td></tr>
<tr><td>Lista de deseos</td><td>Al guardar productos</td><td>No</td></tr>
<tr><td>Datos de pago</td><td>Procesados por Stripe</td><td>No los almacenamos</td></tr>
</tbody>
</table>

<h2>3. Para qué los usamos</h2>
<ul>
<li>Gestionar tu pedido, el envío y las devoluciones.</li>
<li>Crear y mantener tu cuenta y tu lista de deseos.</li>
<li>Enviarte la factura y las notificaciones del pedido.</li>
<li>Atender tus consultas por email.</li>
<li>Cumplir obligaciones legales y contables.</li>
</ul>
<p>No hacemos perfiles de usuario ni publicidad personalizada con tus datos.</p>

<h2>4. Base legal</h2>
<p>Tratamos los datos para <strong>ejecutar el contrato</strong> (compra y cuenta) y para <strong>cumplir obligaciones legales</strong>. El tratamiento con fines de marketing requiere tu consentimiento, que puedes retirar cuando quieras.</p>

<h2>5. Con quién los compartimos</h2>
<p>Solo con los proveedores necesarios para prestar el servicio:</p>
<ul>
<li><strong>Supabase</strong>: base de datos y autenticación de usuarios.</li>
<li><strong>Stripe</strong>: pasarela de pago.</li>
<li><strong>Empresa de transporte</strong>: nombre, dirección y teléfono para entregar el paquete.</li>
</ul>
<p>No vendemos ni cedemos tus datos a terceros con fines comerciales.</p>

<h2>6. Conservación</h2>
<p>Los datos de la cuenta se guardan mientras la cuenta esté activa. Los datos de los pedidos se conservan <strong>5 años</strong> por obligación fiscal. Las direcciones sin usar se eliminan al año.</p>

<h2>7. Tus derechos</h2>
<p>Puedes solicitar el <strong>acceso</strong>, la <strong>rectificación</strong>, la <strong>supresión</strong>, la <strong>limitación</strong> y la <strong>oposición</strong> al tratamiento, así como retirar tu consentimiento en cualquier momento. También puedes presentar una reclamación ante la Agencia Española de Protección de Datos.</p>
<p>Escríbenos a <a href="mailto:${SITE.email}">${SITE.email}</a> y atendemos la solicitud en menos de 72 horas.</p>

<h2>8. Seguridad</h2>
<p>Usamos cifrado TLS, control de acceso por usuario y copias de seguridad periódicas. Ningún sistema es infalible, pero aplicamos medidas técnicas y organizativas razonables.</p>`,
    bodySummary:
      "Qué datos personales tratamos, con qué finalidad, cuánto tiempo los conservamos y cómo ejercer tus derechos.",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2025-03-05T00:00:00.000Z",
    seo: {
      title: "Política de privacidad",
      description:
        "Qué datos personales tratamos, con qué finalidad y cómo ejercer tus derechos RGPD.",
    },
  },

  cookies: {
    title: "Política de cookies",
    body: `<p>Usamos cookies y tecnologías similares para que la web funcione correctamente y para entender cómo se usa. Esta política explica cuáles y por qué.</p>

<h2>1. Qué son las cookies</h2>
<p>Son pequeños archivos que el navegador guarda en tu dispositivo. Las hay <strong>técnicas</strong>, necesarias para que la web funcione, y <strong>de terceros</strong>, que coloca un servicio externo para medir el uso o mostrar publicidad.</p>

<h2>2. Cookies propias (técnicas)</h2>
<p>Son imprescindibles: sin ellas el carrito y la sesión no funcionan.</p>
<table>
<thead><tr><th>Nombre</th><th>Uso</th><th>Duración</th></tr></thead>
<tbody>
<tr><td>carrito</td><td>Guarda los productos del carrito</td><td>Sesión</td></tr>
<tr><td>idioma</td><td>Recuerda si prefieres español o inglés</td><td>1 año</td></tr>
<tr><td>sesion</td><td>Mantiene la sesión iniciada</td><td>Sesión</td></tr>
</tbody>
</table>

<h2>3. Cookies de terceros</h2>
<ul>
<li><strong>Stripe</strong>: gestiona el pago en su propio marco y usa cookies propias para prevenir el fraude.</li>
<li><strong>Analítica</strong>: métricas agregadas de páginas vistas. No guardamos datos personales identificables.</li>
</ul>

<h2>4. Cómo gestionarlas</h2>
<p>Puedes borrar o bloquear las cookies desde la configuración de tu navegador. Ten en cuenta que si bloqueas las técnicas, el carrito y el inicio de sesión dejarán de funcionar.</p>

<h2>5. Consentimiento</h2>
<p>Las cookies no técnicas requieren tu consentimiento previo. Puedes aceptarlas o rechazarlas desde el aviso de cookies y cambiar tu decisión más tarde cuando quieras.</p>

<h2>6. Cambios en esta política</h2>
<p>Actualizamos esta página si cambian los servicios que usamos. La fecha de última actualización aparece al final del documento.</p>`,
    bodySummary:
      "Qué cookies usa la web, cuáles son técnicas, cuáles de terceros y cómo gestionarlas.",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2025-02-11T00:00:00.000Z",
    seo: {
      title: "Política de cookies",
      description:
        "Cookies técnicas y de terceros que usa la web, y cómo gestionarlas o revocarlas.",
    },
  },
};

export async function getPage(handle: string): Promise<Page | null> {
  return pages[handle] ?? null;
}

export async function getStaticPages(): Promise<Page[]> {
  return Object.values(pages);
}
