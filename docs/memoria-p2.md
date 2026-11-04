# Aportación de la Persona 2 a la memoria

> Borrador para que la Persona 4 lo integre en el PDF de 8–12 páginas. Cubre
> los apartados de contrato, payloads, validaciones y gestión de errores, más
> la aportación al anexo de IA. El contrato completo está en
> [`contrato-integracion.md`](./contrato-integracion.md).

## 1. Contrato de integración

La tienda de la Tarea 1 no escribe en el back-office: emite eventos por HTTP.
El workflow de n8n es el único punto de entrada en producción. El contrato fija
tres eventos y una respuesta uniforme:

| Evento | Origen | Destino en el back-office |
| --- | --- | --- |
| `order.created` | Webhook de Stripe y `/order-confirmation` | `POST /pedidos` |
| `order.status_changed` | `/admin/pedidos` | `PATCH /pedidos/:id/estado` |
| `incident.created` | Bot de Telegram (Persona 3) | `POST /incidencias` |

Cada evento comparte el campo `evento` y se identifica por una clave de
negocio: `pedido_id` o `incidencia_id`. Esa clave es la que hace posible la
idempotencia. Los campos, tipos, obligatoriedad y respuestas están en el
contrato; los más importantes son:

- `total` numérico y mayor que 0.
- `lineas` con al menos un elemento; `cantidad` entero > 0 y `precio` ≥ 0.
- `estado` dentro de `creado`, `pago_simulado`, `preparacion`, `enviado`,
  `cancelado`.
- `fecha` en ISO 8601.
- `cliente_email` opcional, pero con formato válido si viene.

La decisión de contrato más importante fue **separar la validación de la
persistencia**: n8n valida y normaliza; el back-office vuelve a validar y es el
único que escribe. Así un fallo de n8n no corrompe la base de datos y una
llamada directa al back-office tampoco se salta las reglas.

## 2. Payloads de prueba

Se prepararon ocho fixtures en `n8n/payloads/`. Los tres escenarios del
enunciado son:

1. `01-pedido-valido.json` — pedido `ORD-001` de Ana García, 258 €, una línea
   de dos camisetas.
2. `04-estado-valido.json` — cambio de `creado` a `enviado` del mismo pedido.
3. `06-incidencia-valida.json` — incidencia `INC-001` asociada a `ORD-001`,
   abierta desde Telegram con prioridad alta.

Los otros cinco cubren los caminos negativos: duplicado, pedido inválido,
estado inválido, incidencia sin descripción y evento desconocido. Tener el
camino feliz y el negativo en el mismo formato permite repetir la demo sin
inventar datos y comparar respuestas.

## 3. Validaciones

Hay dos capas deliberadas:

| Validación | n8n | Back-office | Por qué |
| --- | --- | --- | --- |
| Campos obligatorios | Sí | Sí | n8n devuelve un 422 uniforme; el back-office se protege de llamadas directas. |
| Tipos numéricos | Sí | Sí | Evita que un string llegue a PostgreSQL. |
| Email | Sí | No | La tienda ya lo valida; n8n lo comprueba por si cambia el emisor. |
| Estados y prioridades | Sí | Sí | Listas cerradas en los dos lados. |
| Líneas no vacías | Sí | Sí | Un pedido sin líneas no es factible. |
| Idempotencia | Detecta `aviso` | `ON CONFLICT` | La base de datos decide; n8n lo hace visible. |

La validación de n8n se ejecuta en un nodo Code y devuelve un objeto
`{ valido, errores, evento, entidad_id, execution_id, payload }`. El resto del
workflow solo ve `payload` ya normalizado: moneda en mayúsculas, estado por
defecto `creado`, fecha por defecto y líneas con tipos numéricos.

## 4. Gestión de errores

El workflow tiene una rama de error por cada rama de negocio. No hay un
`catch` genérico que devuelva siempre 500: cada causa tiene su código.

| Código | HTTP | Cuándo |
| --- | --- | --- |
| `VALIDACION` | `422` | Falta un campo, un tipo no cuadra, email inválido, importe ≤ 0, línea vacía o estado fuera del enum. |
| `BACKOFFICE_404` | `404` | El pedido o la incidencia no existe. |
| `BACKOFFICE_422` | `422` | El back-office rechaza un payload que n8n dejó pasar. |
| `BACKOFFICE_5XX` | `502` | Error 5xx, red caída o respuesta inesperada. |
| `BACKOFFICE_TIMEOUT` | `504` | Sin respuesta en 10 s tras los reintentos. |

Además:

- **Reintentos:** los nodos HTTP contra el back-office hacen 3 intentos con 2 s
  de espera. La tienda no reintenta, así que la resiliencia vive en n8n.
- **Timeout:** 10 s por intento. Es mayor que el timeout de 5 s de la tienda,
  pero la tienda solo necesita saber que el evento se aceptó; el trabajo de n8n
  puede continuar aunque el cliente corte.
- **Log siempre:** las ramas correctas y las de error llaman a `POST /logs`.
- **Log no bloqueante:** si el back-office está caído, el nodo de log también
  falla, pero `onError: continueRegularOutput` deja enviar la respuesta.
- **Aviso opcional:** las ramas de error intentan un mensaje de Telegram. Si no
  hay token, el aviso falla y la respuesta sigue.

## 5. Idempotencia

La idempotencia tiene dos capas:

1. **Fuerte, en PostgreSQL:** `pedido_id` e `incidencia_id` son claves
   primarias. `INSERT ... ON CONFLICT DO NOTHING` impide duplicar aunque dos
   peticiones lleguen a la vez.
2. **Visible, en n8n:** cuando el back-office responde `200` con `aviso`, el
   nodo `Evaluar *` marca `duplicado: true`, devuelve `200` a la tienda y
   registra `detalle: "duplicado ignorado"`.

No se hace un `GET` previo: sería una carrera entre la comprobación y la
escritura. La clave primaria es la única decisión atómica. La prueba está en
`02-pedido-duplicado.json`: el primer envío da `201`; el segundo, `200` con
`duplicado: true`, y `GET /pedidos` sigue teniendo una sola fila.

## 6. Registro y cuadro de mando

Cada ejecución llama a `POST /logs` con:

```json
{
  "execution_id": "123",
  "evento": "order.created",
  "pedido_id": "ORD-001",
  "resultado": "correcto",
  "codigo_error": null,
  "detalle": "pedido creado",
  "duracion_ms": 184,
  "origen": "n8n"
}
```

El `execution_id` de n8n hace que un reintento del mismo workflow no duplique la
métrica. `duracion_ms` y `codigo_error` son los campos que necesita el cuadro de
mando de la Persona 4 para latencia y tasa de error. **Sin este logging, esas
métricas salen a `null`.**

El back-office también escribe logs internos. Para las métricas de integración
hay que filtrar por `origen === "n8n"`; si no, cada evento se cuenta dos veces.

## 7. Decisiones de diseño y alternativas

- **n8n frente a un script a medida:** n8n da webhook, ramas, reintentos,
  ejecuciones visibles y export JSON sin escribir un servidor. El coste es la
  dependencia de una instancia y el arranque en frío de Render Free.
- **Validar en n8n y en el back-office:** parece duplicado, pero son públicos
  distintos. n8n protege la integración; el back-office se protege de cualquier
  cliente.
- **Log en n8n además del log del back-office:** el del back-office dice qué
  entidad se creó; el de n8n dice cuánto tardó y qué código de error hubo. Son
  datos distintos.
- **Telegram opcional:** el aviso es útil, pero no puede ser un punto único de
  fallo. Por eso va después del log y con `onError`.

## 8. Evidencias

Las capturas que acompañan a esta memoria están en `docs/evidencias/`:

- Canvas del workflow con las tres ramas.
- Pedido `201`, duplicado `200`, validación `422`.
- Cambio de estado `200` e incidencia `201`.
- `GET /logs` con `origen: "n8n"` y `duracion_ms`.
- Back-office antes y después (Persona 1).
- Registro técnico del smoke test en `docs/evidencias/smoke-test.md`.

## 9. Limitaciones y mejoras

1. **Sin autenticación:** el webhook y el back-office aceptan cualquier
   petición. Mejora: token compartido o firma HMAC.
2. **Render Free se duerme:** el primer evento puede superar el timeout de 5 s
   de la tienda. Mejora: plan de pago o keep-alive (ya incluido).
3. **Doble logging:** hay que filtrar por `origen`. Mejora: que el back-office
   marque sus logs internos con `origen: "backoffice"`.
4. **`execution_id` local a la instancia:** si se borra la base de datos de n8n,
   los IDs se reinician. Mejora: prefijar con el ID del workflow o un UUID.
5. **Sin cola de reintentos duradera:** si n8n está caído cuando la tienda
   emite el evento, el pedido no se reintenta. Mejora: outbox en la tienda o
   cola externa.

## 10. Aportación al anexo de uso de IA

- **Modelo:** asistente de código integrado en el entorno de desarrollo.
- **Para qué se usó:** borrador del JSON del workflow, de los nodos Code y de
  los tests; revisión de la documentación de despliegue.
- **Prompts representativos:**
  - “Genera un workflow de n8n con webhook, validación de campos, ramas OK y
    error, llamada a un back-office y log de ejecución.”
  - “Escribe tests en Node que extraigan el `jsCode` del JSON exportado y
    prueben la validación y el mapeo de errores.”
  - “Revisa este contrato contra `backoffice/server.js` y dime qué campos o
    códigos no coinciden.”
- **Qué se revisó a mano:** el contrato se contrastó con `backoffice/server.js`
  (campos, estados, códigos reales); el workflow se importó en n8n 2.46.4 y se
  ejecutó contra un back-office simulado.
- **Errores encontrados:**
  - El primer mapeo de errores buscaba `statusCode`/`httpCode`, pero n8n 2.46
    entrega el código en `error.status`. Se corrigió y se añadió un test.
  - El `Respond to Webhook` con `JSON.stringify` podía doblecodificar el
    cuerpo; se cambió a devolver el objeto.
  - El aviso de Telegram con token vacío fallaba; se comprobó que `onError`
    deja seguir la respuesta.
- **Acciones prohibidas:** la IA no tuvo acceso a credenciales reales, no
  desplegó nada en Render/Supabase y no envió mensajes a clientes. Todo lo
  sensible se configuró a mano.

## 11. Punto de partida (aportación)

Antes de esta tarea, en la rama principal no había ningún workflow de n8n: la
tienda podía apuntar directamente al back-office, sin validación intermedia,
sin reintentos, sin log de ejecución y sin código de error uniforme. La Persona
3 tenía un borrador de workflow de incidencias, pero solo validaba y respondía:
no llamaba al back-office ni registraba en `/logs`. Esta aportación añade la
capa de integración completa y deja el contrato y las pruebas para que las otras
tres personas integren sus partes.
