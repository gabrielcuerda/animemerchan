# Defensa · Persona 2 (1:45)

> Guion para 4 diapositivas. El objetivo es que se entienda el contrato, que se
> vea el workflow funcionando y que quede claro qué pasa cuando algo falla.

## Diapositiva 1 — Contrato y flujo (25 s)

**Título:** Un contrato, tres eventos, un webhook.

- La tienda no habla con el back-office: emite `order.created`,
  `order.status_changed` e `incident.created`.
- Todo entra por `POST /webhook/integracion-tarea2`.
- n8n valida, transforma, enruta y registra.
- El contrato fija campos, tipos, obligatorios y respuestas.

**Frase de cierre:** “Si un campo cambia, cambia el contrato; no hay
improvisación entre sistemas.”

## Diapositiva 2 — Workflow (35 s)

**Título:** Webhook → validar → enrutar → back-office → log.

- Nodo Code de validación: obligatorios, tipos, email, importe, líneas,
  estados y prioridades.
- `IF` válido / inválido.
- `Switch` por evento:
  - `order.created` → `POST /pedidos`.
  - `order.status_changed` → `PATCH /pedidos/:id/estado`.
  - `incident.created` → `POST /incidencias`.
- Después de cada llamada: `POST /logs` con `execution_id`, `duracion_ms`,
  `resultado` y `origen: "n8n"`.
- En error: log + aviso opcional a Telegram + respuesta 4xx/5xx.

**Frase de cierre:** “El camino feliz y el camino triste están dibujados; no
hay un `catch` genérico.”

## Diapositiva 3 — Errores e idempotencia (30 s)

**Título:** Dos capas para no duplicar y cinco códigos para saber qué falló.

- Idempotencia fuerte: `pedido_id` / `incidencia_id` son claves primarias y el
  back-office usa `ON CONFLICT DO NOTHING`.
- Idempotencia visible: si el back-office responde `aviso`, n8n devuelve `200`
  con `duplicado: true` y lo registra.
- Códigos: `VALIDACION` (422), `BACKOFFICE_404`, `BACKOFFICE_422`,
  `BACKOFFICE_5XX` (502), `BACKOFFICE_TIMEOUT` (504).
- La tienda no reintenta; n8n reintenta 3 veces con 2 s de espera.
- Si el back-office está caído, el log falla pero la respuesta no se pierde.

**Frase de cierre:** “La base de datos decide si hay duplicado; n8n lo cuenta.”

## Diapositiva 4 — Evidencias y límites (15 s)

**Título:** Probado, no supuesto.

- `201` pedido, `200` duplicado, `422` validación, `200` estado, `201`
  incidencia.
- `GET /logs` con `origen: "n8n"` y `duracion_ms`.
- Tests: `cd n8n && npm test` (25 casos).
- Límites: Render Free se duerme (keep-alive), sin autenticación, doble log.

**Frase de cierre:** “El workflow importa en n8n real y se ejecutó contra un
back-office simulado; las capturas del back-office real las aporta la Persona
1.”

## Preguntas probables

| Pregunta                                | Respuesta corta                                                                                      |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| ¿Por qué n8n y no un script?            | Webhook, ramas, reintentos, ejecuciones visibles y export JSON sin mantener un servidor.             |
| ¿Por qué validas dos veces?             | n8n protege la integración; el back-office se protege de llamadas directas.                          |
| ¿Cómo evitas duplicados?                | Clave primaria + `ON CONFLICT`; n8n detecta el `aviso` y lo marca.                                   |
| ¿Qué pasa si n8n está caído?            | La tienda ya cobró; el error queda en consola y el pedido se puede reenviar. No hay outbox (mejora). |
| ¿Qué pasa si el back-office está caído? | n8n reintenta 3 veces; luego responde 502/504 y registra el error.                                   |
| ¿Por qué logs duplicados?               | El back-office registra la entidad y n8n la ejecución. Se filtran por `origen`.                      |
| ¿Qué falta para producción?             | Autenticación, plan de pago o keep-alive, outbox y límites de tasa.                                  |
| ¿Qué aporta el agente de Telegram?      | Es la entrada de `incident.created`; la aprobación humana es de la Persona 3.                        |
