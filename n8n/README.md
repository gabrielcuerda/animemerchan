# n8n · workflow de integración

Carpeta de la Persona 2. Contiene el workflow exportado, el generador, los
tests, los payloads de prueba y la guía de despliegue en **Render Free** con
**Supabase PostgreSQL** como base de datos de n8n.

- Workflow importable: [`workflow-integracion.json`](./workflow-integracion.json)
- Generador: [`build-workflow.mjs`](./build-workflow.mjs)
- Tests: [`test/workflow.test.mjs`](./test/workflow.test.mjs)
- Contrato: [`../docs/contrato-integracion.md`](../docs/contrato-integracion.md)
- Variables de entorno: [`.env.example`](./.env.example)

## 1. Qué hace el workflow

```text
POST /webhook/integracion-tarea2
        │
        ▼
  Validar payload ──► ¿válido? ──no──► POST /logs ──► 422
        │ sí
        ▼
  Switch por evento
   ├── order.created        ──► POST  /pedidos              ──► 201 / 200 duplicado
   ├── order.status_changed ──► PATCH /pedidos/:id/estado   ──► 200
   └── incident.created     ──► POST  /incidencias          ──► 201 / 200 duplicado
        │
        ▼
  POST /logs (origen: n8n) ──► Respond to Webhook
```

En todas las ramas se registra la ejecución en `POST /logs` con
`execution_id`, `resultado`, `codigo_error`, `detalle`, `duracion_ms` y
`origen: "n8n"`. Si el back-office falla, el nodo de log también se ejecuta y
la tienda recibe `502` o `504` con el código correspondiente. En las ramas de
error se intenta además un **aviso opcional por Telegram**; si no hay token
configurado, el aviso falla y la respuesta sigue su curso.

Cuando se crea una incidencia (`incident.created`), el workflow envía un aviso
al chat configurado en `ALERT_TELEGRAM_CHAT_ID` con la referencia, el pedido, el
cliente, el tipo y la descripción. Es un aviso interno para el equipo, no un
mensaje al cliente. Si el token o el chat no están configurados, el aviso falla
pero la incidencia se crea igualmente.

## 2. Despliegue de n8n en Render Free

### 2.1 Base de datos en Supabase

1. Crea un **proyecto nuevo y exclusivo para n8n** (no reutilices el de la
   tienda: n8n crea sus propias tablas y migraciones).
2. En Supabase: **Connect → Session pooler**. Copia estos datos:

   | Dato          | Ejemplo                               | Variable en Render       |
   | ------------- | ------------------------------------- | ------------------------ |
   | Host          | `aws-0-eu-west-1.pooler.supabase.com` | `DB_POSTGRESDB_HOST`     |
   | Puerto        | `5432`                                | `DB_POSTGRESDB_PORT`     |
   | Usuario       | `postgres.abcdefghijklmnop`           | `DB_POSTGRESDB_USER`     |
   | Contraseña    | la del proyecto                       | `DB_POSTGRESDB_PASSWORD` |
   | Base de datos | `postgres`                            | `DB_POSTGRESDB_DATABASE` |

   Usa el **Session pooler** (puerto `5432`), no el Transaction pooler
   (puerto `6543`): n8n abre conexiones persistentes y el pooler transaccional
   puede romper las migraciones.

3. No hace falta crear tablas: n8n las crea al arrancar.

### 2.2 Servicio en Render

**Opción A (recomendada): imagen oficial.**

1. Render → **New → Web Service → Existing Image**.
2. Imagen: `docker.io/n8nio/n8n:latest`.
3. Plan: **Free**. Región: la más cercana.
4. En **Environment**, añade las variables de la sección 2.3.
5. En **Advanced → Health Check Path**, pon `/healthz`.
6. Deploy.

**Opción B: desde este repositorio con Dockerfile.**

1. Render → **New → Web Service** → conecta el repositorio.
2. Runtime: **Docker**.
3. Root Directory: `n8n` (o Dockerfile Path `n8n/Dockerfile`).
4. Plan Free y las mismas variables.
5. Health Check Path: `/healthz`.

También hay una plantilla de Blueprint en
[`render.example.yaml`](./render.example.yaml). Render busca `render.yaml` en
la raíz del repo; si quieres usarla, copia el contenido a `/render.yaml`.

### 2.3 Variables de entorno

Copia [`/.env.example`](./.env.example) y rellena los valores. Las claves:

| Variable                                | Valor                                    | Por qué                                                                                                        |
| --------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `PORT`                                  | `5678`                                   | Render enruta el tráfico a este puerto.                                                                        |
| `N8N_PORT`                              | `5678`                                   | n8n escucha aquí. Si no coincide con `PORT`, Render da 502.                                                    |
| `N8N_HOST`                              | `tu-servicio.onrender.com`               | Sin `https://`.                                                                                                |
| `N8N_PROTOCOL`                          | `https`                                  | Render termina TLS.                                                                                            |
| `N8N_EDITOR_BASE_URL`                   | `https://tu-servicio.onrender.com`       | Enlaces del editor.                                                                                            |
| `N8N_WEBHOOK_URL`                       | `https://tu-servicio.onrender.com/`      | **Con barra final.** Si falta, los webhooks apuntan a localhost. En versiones antiguas se llama `WEBHOOK_URL`. |
| `N8N_PROXY_HOPS`                        | `1`                                      | Hay un proxy delante (Render).                                                                                 |
| `N8N_SECURE_COOKIE`                     | `true`                                   | La cookie de sesión solo viaja por HTTPS.                                                                      |
| `N8N_ENCRYPTION_KEY`                    | cadena aleatoria de 32+ caracteres       | **Fija.** Si cambia, se pierden las credenciales cifradas. Genera con `openssl rand -hex 32`.                  |
| `GENERIC_TIMEZONE`                      | `Europe/Madrid`                          | Fechas del editor.                                                                                             |
| `TZ`                                    | `Europe/Madrid`                          | Zona del contenedor.                                                                                           |
| `DB_TYPE`                               | `postgresdb`                             | Usa PostgreSQL, no SQLite.                                                                                     |
| `DB_POSTGRESDB_HOST`                    | host del Session pooler                  | Supabase.                                                                                                      |
| `DB_POSTGRESDB_PORT`                    | `5432`                                   | Session pooler.                                                                                                |
| `DB_POSTGRESDB_DATABASE`                | `postgres`                               | Base del proyecto.                                                                                             |
| `DB_POSTGRESDB_USER`                    | `postgres.<project-ref>`                 | Usuario del pooler.                                                                                            |
| `DB_POSTGRESDB_PASSWORD`                | contraseña                               | Secreta.                                                                                                       |
| `DB_POSTGRESDB_SCHEMA`                  | `public`                                 | Proyecto dedicado a n8n.                                                                                       |
| `DB_POSTGRESDB_SSL_ENABLED`             | `true`                                   | Supabase exige SSL.                                                                                            |
| `DB_POSTGRESDB_SSL_REJECT_UNAUTHORIZED` | `false`                                  | Certificado del pooler.                                                                                        |
| `DB_POSTGRESDB_POOL_SIZE`               | `2`                                      | El plan Free tiene poca memoria.                                                                               |
| `BACKOFFICE_URL`                        | `https://backoffice-tarea2.onrender.com` | **Sin barra final.** Lo usan los nodos HTTP.                                                                   |
| `TELEGRAM_BOT_TOKEN`                    | token del bot (opcional)                 | Avisos de error por Telegram. Lo aporta la Persona 3.                                                          |
| `ALERT_TELEGRAM_CHAT_ID`                | chat que recibe los avisos (opcional)    | Si falta, el aviso falla y el flujo sigue.                                                                     |
| `N8N_BLOCK_ENV_ACCESS_IN_NODE`          | `false`                                  | El workflow usa `$env.BACKOFFICE_URL`. Si lo pones a `true`, los nodos fallan.                                 |
| `EXECUTIONS_DATA_PRUNE`                 | `true`                                   | No llenar la base de datos gratuita.                                                                           |
| `EXECUTIONS_DATA_MAX_AGE`               | `168`                                    | 7 días de ejecuciones.                                                                                         |
| `EXECUTIONS_DATA_SAVE_ON_SUCCESS`       | `all`                                    | Evidencias de ejecuciones correctas.                                                                           |
| `EXECUTIONS_DATA_SAVE_ON_ERROR`         | `all`                                    | Evidencias de errores.                                                                                         |
| `N8N_DIAGNOSTICS_ENABLED`               | `false`                                  | Menos ruido y menos llamadas externas.                                                                         |

> **No subas el `.env` real.** El `.env.example` no lleva secretos. En Render
> las variables se pegan en el panel, no en el repositorio.

### 2.4 Primer arranque

1. Abre `https://tu-servicio.onrender.com`.
2. Crea la cuenta de **owner** de n8n. No hay registro público: solo la primera
   cuenta.
3. Si Render tarda en arrancar, mira los logs. Los errores típicos son de
   puerto (`PORT`/`N8N_PORT`) o de conexión a Supabase (SSL/credenciales).

### 2.5 Si usas n8n 1.x en Render Free

Render Free tiene 512 MB y n8n 2.x puede quedarse sin memoria al abrir el
editor. Si pasa, usa **n8n 1.113.3**:

- Imagen: `docker.io/n8nio/n8n:1.113.3`.
- `WEBHOOK_URL=https://tu-servicio.onrender.com/` (en 1.x no existe
  `N8N_WEBHOOK_URL`).
- No definas `N8N_RUNNERS_*`: en 1.x los nodos Code se ejecutan en el proceso
  principal.
- Si el editor muestra `Connection lost`, añade `N8N_PUSH_BACKEND=sse`.
- El workflow exportado usa **Webhook 2.1** e **IF 2.2** para ser compatible
  con 1.113.3 y con 2.x.

### 2.6 Importar por API si la UI no muestra "Import from File"

En algunas versiones 1.x el menú de importación no aparece. La API siempre
funciona:

1. En n8n: **Settings → API → Create API Key**.
2. Prepara el JSON (la API de 1.113.3 exige `settings: {}` y rechaza
   propiedades extra dentro de `settings`):

   ```bash
   node -e "const w=require('./workflow-integracion.json'); const fs=require('fs'); fs.writeFileSync('/tmp/wf-api.json', JSON.stringify({name:w.name,nodes:w.nodes,connections:w.connections,settings:{}}, null, 2));"
   ```

3. Crea el workflow:

   ```bash
   curl -X POST "https://tu-servicio.onrender.com/api/v1/workflows" \
     -H "X-N8N-API-KEY: TU_API_KEY" \
     -H "Content-Type: application/json" \
     --data @/tmp/wf-api.json
   ```

4. Actívalo con el `id` que devuelve la respuesta:

   ```bash
   curl -X POST "https://tu-servicio.onrender.com/api/v1/workflows/TU_ID/activate" \
     -H "X-N8N-API-KEY: TU_API_KEY"
   ```

5. La UI puede seguir mostrando `Connection lost` por SSE, pero el workflow
   queda guardado y activo. Compruébalo con el webhook.

## 3. Importar el workflow

1. En n8n: **Workflows → Import from File**.
2. Selecciona `workflow-integracion.json`.
3. Abre el workflow y revisa que `BACKOFFICE_URL` esté definida en el entorno.
4. Pulsa **Save** y luego **Active** (en n8n 2.x el botón se llama
   **Publish**).
5. La URL de producción es:

   ```text
   https://tu-servicio.onrender.com/webhook/integracion-tarea2
   ```

   La URL de prueba (botón _Listen for test event_) es:

   ```text
   https://tu-servicio.onrender.com/webhook-test/integracion-tarea2
   ```

   La de producción **solo funciona con el workflow activo**.

## 4. Conectar la tienda

En el `.env` de la tienda (Vercel → Environment Variables):

```env
INTEGRACION_WEBHOOK_URL=https://tu-servicio.onrender.com/webhook/integracion-tarea2
```

En local sin n8n puedes seguir apuntando al back-office directo:

```env
INTEGRACION_WEBHOOK_URL=http://localhost:4000/pedidos
```

Recuerda que las variables `NEXT_PUBLIC_*` se sustituyen en el build; esta no
lleva `NEXT_PUBLIC_`, pero Vercel necesita un redeploy para leerla.

## 5. Probar

Desde esta carpeta (`n8n/`):

```bash
export N8N_URL="https://tu-servicio.onrender.com"
export BACKOFFICE_URL="https://backoffice-tarea2.onrender.com"
```

> En Windows usa `curl.exe` y variables de PowerShell
> (`$env:N8N_URL="..."`); `curl` y `export` no funcionan igual en PowerShell.

### 5.1 Escenario 1 — pedido válido

```bash
curl -i -X POST "$N8N_URL/webhook/integracion-tarea2" \
  -H "Content-Type: application/json" \
  --data @payloads/01-pedido-valido.json
```

Esperado: `201` con `ok: true` y `pedido_id: "ORD-001"`.

### 5.2 Idempotencia — el mismo pedido otra vez

```bash
curl -i -X POST "$N8N_URL/webhook/integracion-tarea2" \
  -H "Content-Type: application/json" \
  --data @payloads/02-pedido-duplicado.json
```

Esperado: `200` con `duplicado: true`. En el back-office sigue habiendo **un
solo** `ORD-001`.

### 5.3 Error de validación

```bash
curl -i -X POST "$N8N_URL/webhook/integracion-tarea2" \
  -H "Content-Type: application/json" \
  --data @payloads/03-pedido-invalido.json
```

Esperado: `422` con `errores: ["total debe ser un número mayor que 0", ...]`.

### 5.4 Escenario 2 — cambio de estado

```bash
curl -i -X POST "$N8N_URL/webhook/integracion-tarea2" \
  -H "Content-Type: application/json" \
  --data @payloads/04-estado-valido.json
```

Esperado: `200` con `estado: "enviado"`.

### 5.5 Escenario 3 — incidencia

```bash
curl -i -X POST "$N8N_URL/webhook/integracion-tarea2" \
  -H "Content-Type: application/json" \
  --data @payloads/06-incidencia-valida.json
```

Esperado: `201` con `incidencia_id: "INC-001"`.

### 5.6 Comprobar el back-office y los logs

```bash
# Pedidos (debe haber un solo ORD-001)
curl -s "$BACKOFFICE_URL/pedidos" | jq '.[] | select(.pedido_id == "ORD-001")'

# Ejecuciones registradas por n8n
curl -s "$BACKOFFICE_URL/logs" \
  | jq '.[] | select(.origen == "n8n") | {evento, resultado, codigo_error, detalle, duracion_ms}'
```

### 5.7 Tests locales del workflow

No necesitan n8n ni red:

```bash
cd n8n
npm test
```

Los tests leen el JSON exportado, extraen el código de los nodos Code y
comprueban validaciones, duplicados, mapeo de errores y estructura del workflow.

## 6. Integración con la Persona 3 (Telegram)

La rama `incident.created` ya está en este workflow. El bot de Telegram debe
enviar el evento al mismo webhook:

```text
POST https://tu-servicio.onrender.com/webhook/integracion-tarea2
```

con el cuerpo de `payloads/06-incidencia-valida.json`. El workflow valida, crea
la incidencia en el back-office y registra la ejecución. La propuesta del
agente y los botones de aprobación/rechazo son de la Persona 3.

El borrador antiguo `n8n/workflow-incidencias.json` (rama `feat/p3-agente`)
solo validaba y respondía; no llamaba al back-office ni registraba en `/logs`.
Se puede retirar cuando el bot apunte a este webhook.

## 7. Keep-alive en Render Free

Render duerme el servicio tras 15 minutos sin tráfico. El primer webhook puede
tardar más que los 5 s de timeout de la tienda. El repositorio incluye
[`.github/workflows/keepalive.yml`](../.github/workflows/keepalive.yml), que
hace ping a n8n y al back-office cada 10 minutos.

Configura en GitHub → **Settings → Variables → Actions**:

| Variable         | Valor                                    |
| ---------------- | ---------------------------------------- |
| `N8N_URL`        | `https://tu-servicio.onrender.com`       |
| `BACKOFFICE_URL` | `https://backoffice-tarea2.onrender.com` |

También puedes usar un cron externo (cron-job.org) si prefieres no depender de
GitHub Actions.

## 8. Evidencias para la memoria

Guarda las capturas en [`../docs/evidencias/`](../docs/evidencias/README.md):

1. Canvas del workflow con las tres ramas.
2. Ejecución verde del pedido (`201`).
3. Ejecución del duplicado (`200`, `duplicado: true`).
4. Ejecución roja de validación (`422`).
5. Ejecución del cambio de estado (`200`).
6. Ejecución de la incidencia (`201`).
7. `GET /logs` con `origen: "n8n"` y `duracion_ms`.
8. Back-office antes y después (las aporta la Persona 1).

## 9. Problemas típicos

| Síntoma                                   | Causa                                           | Solución                                                                                       |
| ----------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `404` al llamar al webhook                | Workflow no publicado/activo o ruta mal         | Publica/activa el workflow y usa `/webhook/`, no `/webhook-test/`.                             |
| `$env.BACKOFFICE_URL` vacío               | `N8N_BLOCK_ENV_ACCESS_IN_NODE=true`             | Ponlo a `false` y reinicia.                                                                    |
| `502` en Render                           | n8n escucha en otro puerto                      | `PORT=5678` y `N8N_PORT=5678`.                                                                 |
| Error de conexión a Supabase              | Pooler equivocado o SSL                         | Usa Session pooler (5432), `DB_POSTGRESDB_SSL_ENABLED=true` y `..._REJECT_UNAUTHORIZED=false`. |
| Las credenciales desaparecen al reiniciar | `N8N_ENCRYPTION_KEY` cambia                     | Fija la clave en Render y no la regeneres.                                                     |
| El primer evento tarda 50 s               | Render Free dormido                             | Keep-alive cada 10 min.                                                                        |
| El pedido se duplica                      | No debería: el back-office usa `ON CONFLICT`    | Revisa que el `pedido_id` sea el mismo; si cambia, son pedidos distintos.                      |
| El nodo Code falla                        | Task runners desactivados en una imagen antigua | En n8n 2.x ya vienen activos; si usas una imagen antigua, `N8N_RUNNERS_ENABLED=true`.          |
| Los logs no aparecen en el dashboard      | n8n no llegó a `POST /logs`                     | Mira la ejecución de n8n; el nodo de log no debe bloquear la respuesta.                        |
