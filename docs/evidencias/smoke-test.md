# Smoke test del workflow (registro técnico)

Prueba ejecutada el **3 de noviembre de 2026** con:

- n8n `2.46.4` en Docker (`docker.io/n8nio/n8n:latest`).
- Workflow `n8n/workflow-integracion.json` importado y publicado.
- Back-office simulado en local con las mismas rutas y códigos que
  `backoffice/server.js` (`POST /pedidos`, `PATCH /pedidos/:id/estado`,
  `POST /incidencias`, `POST /logs`).
- `BACKOFFICE_URL=http://host.docker.internal:4000`.
- `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`.

Esta prueba **no sustituye** a las capturas del back-office real. Sirve para
dejar constancia de que el workflow importa y se ejecuta, y de que las
expresiones, los códigos HTTP y el logging funcionan.

## Resultados

| Petición | HTTP | Cuerpo observado |
| --- | --- | --- |
| `01-pedido-valido.json` | `201` | `{"ok":true,"duplicado":false,"evento":"order.created","pedido_id":"ORD-001","execution_id":"1"}` |
| `02-pedido-duplicado.json` | `200` | `{"ok":true,"duplicado":true,"evento":"order.created","pedido_id":"ORD-001","execution_id":"2"}` |
| `03-pedido-invalido.json` | `422` | `{"ok":false,"evento":"order.created","errores":["total debe ser un número mayor que 0","lineas debe ser una lista con al menos una línea"],"execution_id":"3"}` |
| `04-estado-valido.json` | `200` | `{"ok":true,"evento":"order.status_changed","pedido_id":"ORD-001","estado":"enviado","execution_id":"4"}` |
| `05-estado-invalido.json` | `422` | `{"ok":false,"evento":"order.status_changed","errores":["estado inválido: \"perdido\""],"execution_id":"5"}` |
| `06-incidencia-valida.json` | `201` | `{"ok":true,"duplicado":false,"evento":"incident.created","incidencia_id":"INC-001","execution_id":"6"}` |
| `07-incidencia-invalida.json` | `422` | `{"ok":false,"evento":"incident.created","errores":["falta descripcion"],"execution_id":"7"}` |
| `08-evento-desconocido.json` | `422` | `{"ok":false,"evento":"order.deleted","errores":["evento no soportado: \"order.deleted\""],"execution_id":"8"}` |
| `order.status_changed` con `ORD-999` | `404` | `{"ok":false,"evento":"order.status_changed","codigo_error":"BACKOFFICE_404","pedido_id":"ORD-999"}` |
| `order.created` con el back-office caído | `502` | `{"ok":false,"evento":"order.created","codigo_error":"BACKOFFICE_5XX","pedido_id":"ORD-001"}` |
| Incidencia `INC-001` repetida | `200` | `{"ok":true,"duplicado":true,"evento":"incident.created","incidencia_id":"INC-001"}` |

## Logs observados

Cada ejecución llamó a `POST /logs` con `origen: "n8n"`:

```text
order.created        correcto  -                      pedido creado              89 ms
order.created        correcto  -                      duplicado ignorado         20 ms
order.created        error     VALIDACION             total/líneas inválidas     23 ms
order.status_changed correcto  -                      estado -> enviado          35 ms
order.status_changed error     VALIDACION             estado inválido            10 ms
incident.created     correcto  -                      incidencia creada          20 ms
incident.created     error     VALIDACION             falta descripcion           6 ms
order.deleted        error     VALIDACION             evento no soportado        10 ms
order.status_changed error     BACKOFFICE_404          pedido inexistente       4118 ms
order.created        error     BACKOFFICE_5XX          back-office caído         ~4 s
```

## Qué demuestra

1. El JSON **importa** en n8n sin errores de esquema.
2. Las expresiones `$env.BACKOFFICE_URL`, `$('Nodo').item` y `$execution.id`
   funcionan en runtime.
3. Las tres ramas del `Switch` llegan a la ruta correcta del back-office.
4. La validación corta antes de llamar al back-office.
5. La idempotencia se detecta y se responde con `200` + `duplicado: true`.
6. El mapeo de errores (`404`, `502`, `VALIDACION`) devuelve el HTTP correcto.
7. El nodo de log no bloquea la respuesta si el back-office está caído.

> El aviso opcional de Telegram no se probó con un token real. Sí se comprobó
> que, sin `TELEGRAM_BOT_TOKEN`, el nodo de aviso falla y la respuesta `422`
> sigue llegando al cliente: la notificación no bloquea el flujo.
