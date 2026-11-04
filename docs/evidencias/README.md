# Evidencias de la Tarea 2

Guarda aquí las capturas que se citan en la memoria. Usa nombres descriptivos
y no las metas en la carpeta de build.

## Convención de nombres

```text
p2-01-canvas.png                 Canvas del workflow con las 3 ramas
p2-02-pedido-201.png             Escenario 1: pedido creado (201)
p2-03-duplicado-200.png          Idempotencia: 200 + duplicado: true
p2-04-validacion-422.png         Rama de error: 422 + VALIDACION
p2-05-estado-200.png             Escenario 2: cambio de estado (200)
p2-06-incidencia-201.png         Escenario 3: incidencia creada (201)
p2-07-logs-n8n.png               GET /logs con origen: n8n y duracion_ms
p2-08-backoffice-antes.png       Back-office antes de la integración
p2-09-backoffice-despues.png     Back-office después de la integración
```

## Qué debe verse en cada una

1. **Canvas:** nodos `Webhook tienda`, `Validar payload`, `¿Payload válido?`,
   `Enrutar por evento` y las tres ramas. Que se lea el nombre del workflow.
2. **Pedido 201:** ejecución verde, respuesta con `pedido_id: "ORD-001"` y el
   nodo `HTTP crear pedido` en verde.
3. **Duplicado 200:** misma ejecución, respuesta con `duplicado: true` y el log
   con `detalle: "duplicado ignorado"`.
4. **Validación 422:** ejecución roja en `Preparar error validación`, respuesta
   con el array `errores` y el nodo `HTTP crear pedido` **sin ejecutar**.
5. **Estado 200:** respuesta con `estado: "enviado"` y `PATCH` en verde.
6. **Incidencia 201:** respuesta con `incidencia_id: "INC-001"` y `POST
   /incidencias` en verde.
7. **Logs:** salida de `GET /logs` filtrada por `origen == "n8n"`, con
   `execution_id`, `resultado`, `codigo_error`, `detalle` y `duracion_ms`.
8. **Antes/después:** `GET /pedidos` o la portada del back-office antes de
   enviar los payloads y después, con `ORD-001` y la incidencia `INC-001`.

## Consejo para la defensa

Ten abiertas las capturas y el workflow en vivo. Si el profesor pregunta por
una rama, enseña la ejecución concreta, no el canvas genérico. Los tests de
`n8n/test/workflow.test.mjs` también sirven como evidencia de que la lógica
está probada sin depender de la nube.
