# Animemerchan

Tienda de merchandising de anime y manga importado directamente desde Japón.

## Stack

- Next.js 15 con App Router
- Supabase Auth, PostgreSQL y Storage
- Tailwind CSS v4
- TypeScript

## Desarrollo local

1. Instala las dependencias:

```bash
pnpm install
```

2. Configura `.env.local` (copia `.env.example`):

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICA
ADMIN_EMAILS=admin@ejemplo.com
```

`ADMIN_EMAILS` es opcional y da acceso a la **interfaz** de `/admin`, pero no a
los datos: la base de datos solo acepta el rol `admin` en `app_metadata` (ver el
paso 4). Es una lista de emails de despliegue, no un mecanismo de permisos.

3. Aplica las migraciones de la base de datos. Es **obligatorio** y van **en
   orden**, porque cada una da por hecho que la anterior ya está aplicada:

   | Fichero                                                         | Qué se rompe sin él                                                                                                                                                                     |
   | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `supabase/migrations/20261003000000_carrito_pedidos.sql`        | «Añadir al carrito» no hace nada: `carrito_items` tiene RLS activado y sin políticas de escritura.                                                                                      |
   | `supabase/migrations/20261004000000_admin_p5.sql`               | El panel `/admin` no carga nada: **ninguna** función `admin_*` existe en la base de datos.                                                                                              |
   | `supabase/migrations/20261005000000_eventos.sql`                | La tabla `eventos` no se crea y la instrumentación del embudo de compra no registra.                                                                                                    |
   | `supabase/migrations/20261006000000_admin_pedidos_perfiles.sql` | El listado de pedidos del panel falla con `PGRST200`: no hay relación `pedidos` → `perfiles`. Además `perfiles` se queda vacía y los formularios de perfil y dirección no guardan nada. |
   | `supabase/migrations/20261007000000_correos.sql`                | No se manda ninguna factura por correo: no existen `correo_reservar`, `correo_pedido` ni la tabla `correos_enviados`. La compra sigue funcionando, pero nadie recibe la factura.        |

   Se ejecutan desde **Supabase Studio → SQL Editor → New query**: copias el
   contenido del fichero y pulsas _Run_. Las tres son idempotentes, así que
   puedes ejecutarlas las veces que haga falta.

4. Concede el rol de administrador a la cuenta que va a entrar al panel. La
   migración anterior crea `is_admin()` y `require_admin()`, y las dos miran
   **solo** el claim `role` de `app_metadata`: sin él, todas las funciones del
   panel fallan con _No tienes permisos_. `ADMIN_EMAILS` no cuenta.

   En Supabase Studio → Authentication → Users, edita el usuario y pon
   `app_metadata` = `{"role":"admin"}`. O por SQL:

   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
     || jsonb_build_object('role', 'admin')
   where email = 'TU_EMAIL';
   ```

   Después **cierra sesión y vuelve a entrar**: el claim va dentro del JWT firmado
   y una sesión ya abierta no lo ve. Mientras el rol venga solo de
   `ADMIN_EMAILS`, el panel muestra un aviso naranja en la parte superior.

   Para confirmar que las migraciones se aplicaron de verdad:

   ```sql
   -- Debe existir el bucket 'productos': lo crea la migración del panel
   select id, public from storage.buckets;
   ```

   Si una RPC responde `Could not find the function ... in the schema cache`, la
   función existe pero PostgREST todavía no la ha visto: recarga el esquema con

   ```sql
   notify pgrst, 'reload schema';
   ```

5. Inicia el servidor:

```bash
pnpm dev
```

La aplicación estará disponible en `http://localhost:3000`.

## Estructura

- `app`: rutas, páginas y layouts de Next.js
- `components`: componentes de interfaz
- `lib/commerce`: tipos y adaptadores de catálogo
- `lib/db`: consultas de productos, categorías, cuentas y pedidos
- `lib/email`: transporte SMTP, modelo de factura y plantilla del correo
- `lib/supabase`: clientes browser/server y proxy de sesión
- `proxy.ts`: actualización de sesión y protección de rutas

## Supabase

Las tablas principales son `categorias`, `productos`, `producto_imagenes`, `producto_variantes`, `perfiles`, `wishlist`, `carrito_items`, `pedidos` e `items_pedido`.

Activa Row Level Security para que cada usuario solo pueda modificar sus propios datos de cuenta, pedidos y lista de deseos. Las categorías, productos, imágenes y variantes pueden ser públicas para lectura.

## Carrito y pago

El carrito **vive en Supabase**, no en el navegador:

- Con sesión iniciada se guarda en `carrito_items.user_id`.
- Sin sesión se guarda en `carrito_items.session_id`, un uuid que viaja en la
  cookie `cart_session_id`. Al iniciar sesión, `carrito_merge` traslada el
  carrito anónimo al del usuario sumando las líneas repetidas.

El acceso a la tabla se hace **solo** a través de funciones `SECURITY DEFINER`
(`carrito_*`, `crear_pedido`, `pedido_por_pago`) definidas en la migración. No es
capricho: RLS no puede contrastar el `session_id` de un visitante anónimo porque
no hay forma de validar un valor que llega en una cookie. Las funciones aplican
la regla de propiedad internamente y el RLS se queda activado sin políticas, de
modo que cualquier acceso directo a la tabla se deniega.

El pago usa **Stripe Checkout alojado**: `/checkout` pide la dirección de envío
y redirige a la página de Stripe, donde el cliente paga con tarjeta. Stripe crea
la factura y se la envía por email (`invoice_creation`). El importe se calcula
siempre en servidor a partir del carrito en base de datos; el cliente nunca
envía el total.

`productos.precio` se guarda **sin IVA**. El 21 % (`IVA_PORCENTAJE` en
`lib/constants.ts`) se aplica al calcular el total y se guarda desglosado en
`pedidos.direccion_pago`, porque la tabla no tiene columna de impuestos.

El pedido se crea con la función `crear_pedido`, que es **idempotente por
`pago_id`**: da igual que la cree el webhook de Stripe o la página de
confirmación, no se duplica ni se descuenta el stock dos veces.

## Facturas por email

Además de la factura que manda Stripe, el proyecto manda la suya desde
`ayuda@animemerchan.onl`, tanto en compras con cuenta como anónimas.

**De dónde sale el email.** `/checkout` lo pide como campo obligatorio y se
conserva en `pedidos.direccion_pedido.email`. Stripe también lo pide en su
página, pero lo que el cliente escriba ahí no se guarda en nuestra base de datos,
y sin ese dato no hay forma de mandar la factura a un invitado ni de reenviarla a
mano. Con sesión iniciada el campo viene relleno y bloqueado: la factura va a la
dirección de la cuenta.

**Cómo sale.** Nodemailer contra el SMTP del hosting (`SMTP_HOST`), no una API de
terceros. El remitente es la casilla del propio dominio, que es lo único que
permite que SPF y DKIM cuadren.

**Por qué no se mandan dos.** `crear_pedido` se llama desde el webhook y desde
`/order-confirmation`, así que los dos intentan mandarla. Lo resuelve el índice
`unique (pedido_id, plantilla)` de `correos_enviados`: `correo_reservar` hace un
INSERT que solo actualiza la fila si el envío anterior falló o si se fuerza con
`p_forzar`. Es una operación atómica, así que da igual que los dos lleguen a la
vez. El único sitio que puede repetir una factura ya enviada es el botón
**Reenviar factura** de `/admin/pedidos/[id]`.

**Un fallo de correo no rompe una venta.** Si falta `SMTP_PASSWORD`, si la tabla
no está migrada o si DonDominio rechaza el envío, el pedido queda pagado igual:
el error va al log y el panel enseña el último envío fallido. Nunca se devuelve
un 500 al webhook por un correo, porque eso haría que Stripe reintentara el
pedido entero.

La factura se numera `FAC-{año}-{ocho caracteres del id del pedido}`. Se deriva
del id en lugar de usar un contador porque el uuid garantiza unicidad sin
serializar el alta; es el mismo número en el email, en `/factura/[pago_id]` y en
el panel.

Los datos del emisor (razón social, NIF) están en `datosFiscales`, dentro de
`lib/site.ts`, y no en la plantilla: es la misma fuente que usan las páginas
legales.

### Webhook en desarrollo

`STRIPE_WEBHOOK_SECRET` del dashboard **no** sirve para desarrollo local. Con la
Stripe CLI instalada:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copia el `whsec_...` que imprime a `.env.local` y reinicia el servidor. En
producción, registra `https://TU-DOMINIO/api/webhooks/stripe` en el dashboard
con el evento `checkout.session.completed`.

Aun sin webhook, la página de confirmación verifica el pago contra Stripe y
crea el pedido si aún no existe, así que no se pierde una compra.

En Supabase Auth configura las URLs de redirección permitidas:

- `http://localhost:3000/auth/callback`
- `https://TU-DOMINIO/auth/callback`

En Vercel añade las mismas variables de entorno para los entornos Production y Preview.

## Variables de entorno en Vercel

Vercel no lee `.env.local`, así que hay que declararlas en el dashboard:
**Project → Settings → Environment Variables**, en los entornos **Production** y **Preview**.

| Variable                               | Necesaria para                 |
| -------------------------------------- | ------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`             | toda la app                    |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | toda la app                    |
| `STRIPE_SECRET_KEY`                    | checkout                       |
| `STRIPE_WEBHOOK_SECRET`                | webhook de pagos               |
| `SITE_NAME`                            | nombre mostrado en la interfaz |
| `ADMIN_EMAILS`                         | acceso a `/admin`              |
| `SMTP_HOST`                            | envío de facturas              |
| `SMTP_PORT`                            | envío de facturas              |
| `SMTP_USER`                            | envío de facturas              |
| `SMTP_PASSWORD`                        | envío de facturas              |
| `EMAIL_FROM`                           | remitente visible              |
| `EMAIL_REPLY_TO`                       | respuestas del cliente         |
| `EMAIL_BCC`                            | copia oculta de cada factura   |
| `NEXT_PUBLIC_SITE_URL`                 | enlaces absolutos del email    |

`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` ya no se usa: el pago ocurre en la página
alojada de Stripe, así que no hay tarjeta dentro de la web.

### Envío de correo

```env
SMTP_HOST=smtp.dondominio.com
SMTP_PORT=465
SMTP_USER=ayuda@animemerchan.onl
SMTP_PASSWORD=la_contrasena_del_panel
EMAIL_FROM=Animemerchan <ayuda@animemerchan.onl>
EMAIL_REPLY_TO=ayuda@animemerchan.onl
EMAIL_BCC=ayuda@animemerchan.onl
NEXT_PUBLIC_SITE_URL=https://TU-DOMINIO
```

Sin `SMTP_HOST`, `SMTP_USER` y `SMTP_PASSWORD` la tienda funciona igual y no se
manda ninguna factura; no hace falta que el build falle por esto.

`EMAIL_BCC` es **copia oculta** a propósito: en CC el cliente vería la casilla
del negocio y las respuestas se irían a dos sitios. Pon aquí
`ayuda@animemerchan.onl` y el equipo recibe el justificante de cada factura en
Gmail sin cambiar nada, porque DonDominio entrega en `trabajosie45@gmail.com` todo
lo que llega a esa casilla.

`NEXT_PUBLIC_SITE_URL` es la URL pública del sitio, porque los enlaces del correo
no pueden ser relativos. Si no la declaras se usa `VERCEL_URL` (la pone Vercel
sola) y, en local, `http://localhost:3000`.

### Entregabilidad

Sin registros DNS el correo sale pero acaba en spam. En la zona DNS de
`animemerchan.onl`, en el panel de DonDominio:

| Registro                            | Valor                                                                         |
| ----------------------------------- | ----------------------------------------------------------------------------- |
| SPF (TXT)                           | `v=spf1 include:_spf.dondominio.com ~all` (confirma el `include` en su panel) |
| DKIM (TXT en `selector._domainkey`) | el que genere DonDominio                                                      |
| DMARC (TXT en `_dmarc`)             | `v=DMARC1; p=none; rua=mailto:dmarc@animemerchan.onl`                         |

Empieza con DMARC en `p=none` para observar qué pasa sin arriesgar que se rechace
correo legítimo, y súbelo a `p=quarantine` cuando veas que todo llega.

**`.onl` es un TLD con mala reputación de spam**: Gmail va a mandar los correos a
"Otros" aunque todo esté bien configurado. Durante las pruebas mira la carpeta de
spam del cliente, y comprueba en Supabase que la fila de `correos_enviados` está
en `enviado`, que es la parte que depende de nosotros.

> **Importante:** `NEXT_PUBLIC_*` se sustituye por su valor **durante el build**.
> Si cambias o añades una de estas variables, tienes que **hacer un redeploy**;
> si no, el build seguirá usando el valor anterior.

Si falta alguna variable requerida, el build falla con un mensaje que indica
cuál es y dónde añadirla (`lib/supabase/env.ts`, `lib/stripe.ts`).

## Verificación

```bash
pnpm exec tsc --noEmit
pnpm run build
```

## Tarea 2: back-office e integración

La Tarea 2 extiende la tienda con un **back-office independiente**: una API en
Node.js/Express con su propia base de datos SQLite (`backoffice/pedidos.db`),
separada de Supabase y desplegada fuera del entorno local. La tienda y los
flujos de automatización le envían los eventos de la tienda por API (JSON).

- **URL pública:** `https://backoffice-tarea2.onrender.com`
- **Código:** carpeta `backoffice/`

### Ejecución local

Requisito: Node.js 18+ (comprueba con `node -v`).

```bash
cd backoffice
npm install        # sólo la primera vez
node server.js     # escucha en http://localhost:4000
```

La base de datos se crea sola al arrancar; cada PC tiene la suya local. En
Windows, para probar con `curl` hay que usar `curl.exe` y meter el JSON en un
fichero (`-d "@payloads/pedido-1.json"`), porque PowerShell rompe las comillas
en línea.

### Endpoints

| Método  | Ruta                  | Qué hace                                                                            |
| ------- | --------------------- | ----------------------------------------------------------------------------------- |
| `POST`  | `/pedidos`            | crea un pedido (evento `order.created`)                                             |
| `GET`   | `/pedidos`            | lista de pedidos (filtro `?cliente_email=`)                                         |
| `GET`   | `/pedidos/:id`        | un pedido con sus líneas                                                            |
| `PATCH` | `/pedidos/:id/estado` | cambio de estado (`creado`, `pago_simulado`, `preparacion`, `enviado`, `cancelado`) |
| `POST`  | `/incidencias`        | crea una incidencia (evento `incident.created`)                                     |
| `GET`   | `/incidencias`        | lista (filtros `?pedido_id=`, `?cliente_email=`, `?estado=`)                        |
| `PATCH` | `/incidencias/:id`    | actualiza estado/tipo/prioridad                                                     |
| `POST`  | `/decisiones`         | propuesta del agente de IA                                                          |
| `GET`   | `/decisiones`         | lista (filtros `?incidencia_id=`, `?estado=`)                                       |
| `PATCH` | `/decisiones/:id`     | revisión humana: aprobar o rechazar                                                 |
| `GET`   | `/`                   | portada con la lista de endpoints                                                   |

### Datos de prueba

Los payloads de ejemplo están en `backoffice/payloads/`:

- `pedido-1.json` — pedido válido de Ana García (`ana@test.com`, `ORD-001`)
- `pedido-error.json` — payload inválido (faltan campos → responde 422)
- `estado-enviado.json` — cambio de estado a `enviado`
- `incidencia-1.json` — incidencia `INC-001` asociada a `ORD-001`
- `decision-1.json` — propuesta del agente `DEC-001` sobre `INC-001`
- `incidencia-en-revision.json` / `decision-aprobada.json` — parches de estado

### Validaciones e idempotencia

- `POST` con campos obligatorios ausentes → `422` con el detalle, registrado en
  `GET /logs` como `resultado: "error"`.
- Reenviar el mismo `pedido_id` / `incidencia_id` / `decision_id` **no duplica**
  la entidad (idempotencia) y se registra como `duplicado ignorado`.
- Estados y prioridades se validan contra listas cerradas.

### Integración con la tienda

La tienda envía `order.created` desde el webhook de Stripe
(`lib/integracion/enviar-integracion.ts`) a la URL declarada en
`INTEGRACION_WEBHOOK_URL`. En local apunta al back-office en `localhost:4000`
para pruebas; en el flujo final pasa por el workflow de **n8n**, que valida y
transforma el payload antes de reenviarlo al back-office público
(`https://backoffice-tarea2.onrender.com/pedidos`).

### Despliegue en Render

Servicio **Web Service** en plan Free:

| Campo          | Valor                                     |
| -------------- | ----------------------------------------- |
| Source         | este repositorio (rama `main`)            |
| Root Directory | `backoffice`                              |
| Build Command  | `npm install`                             |
| Start Command  | `node server.js`                          |
| Puerto         | asignado por Render en `process.env.PORT` |

### Limitaciones conocidas

- **Base de datos efímera:** en Render el disco no persiste; cada despliegue o
  reinicio crea un `pedidos.db` vacío. Para la demo se regeneran los datos con
  los payloads de prueba.
- **Sin autenticación:** la API no tiene usuarios ni tokens; cualquiera con la
  URL puede leer y escribir. Es un prototipo académico sin actividad comercial.
- **Sin límite de tasa ni HTTPS propio:** se apoya en el TLS y el rate limiting
  de Render.
