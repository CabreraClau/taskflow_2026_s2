BUG-01 - Las etiquetas no se normalizan a minúsculas

- Descripción del problema: Al agregar una etiqueta con mayúsculas, la API la
  guarda y la devuelve tal cual en vez de normalizarla a minúsculas. El método
  `addTag` (`server/src/modules/tasks/tasks.service.ts:192`) sólo aplica
  `trim()`, nunca `toLowerCase()`.

- Pasos exactos para reproducirlo:
  1. Autenticarse como miembro del proyecto de la tarea `task-1` y obtener el JWT.
  2. Enviar `POST /api/tasks/task-1/tags` con `Authorization: Bearer <jwt>` y
     cuerpo `{ "name": "Backend" }`.
  3. Consultar `GET /api/tasks/task-1` (o el listado de etiquetas).
  (Cubierto por el test E2E `e2e/us15-etiquetas.spec.ts` → US-15 c1.)

- Qué esperaba según la especificación: US-15 c1 exige que las etiquetas se
  guarden normalizadas a minúsculas y sin espacios al inicio ni al final; la
  etiqueta debe quedar registrada como `backend`.

- Qué obtuvo realmente: la API respondió `201` y guardó la etiqueta como
  `Backend`, sin normalizar. La tarea muestra el chip `Backend`.

- Severidad: MEDIA.

- Entorno:
  - Código: commit `f368466` (03/11/2026), donde se generaron las capturas;
    la causa raíz citada arriba sigue presente en `eac188c` (17/11/2026).
  - Navegador: Chromium de Playwright 1.65.0 (`Desktop Chrome`), un worker,
    `retries: 1` en local.
  - Zona horaria: `America/Montevideo` (UTC−3) en el navegador
    (`timezoneId`) y en el servidor (`TZ`), según `playwright.config.ts`.
  - Servidores: API en `http://localhost:3000` y cliente Vite en
    `http://localhost:5173`, sobre una base SQLite sembrada con `npm run db:reset`.
  - Sistema: Windows (máquina local del equipo).

- Reproducibilidad: siempre (2 de 2 intentos: la corrida y el reintento
  automático de Playwright fallaron con el mismo resultado). Para
  reproducirlo en un comando, con la base recién sembrada:

  ```sh
  npx playwright test e2e/us15-etiquetas.spec.ts -g "US-15 c1" --project=chromium
  ```

- Evidencia:
  - Test automatizado que falla: `e2e/us15-etiquetas.spec.ts`, caso "US-15 c1".
  - Error registrado por Playwright: `Expected: "backend" / Received: "Backend" (`getByTestId('tag-chip-name')`)`, en
    [`error-context.md`](../../test-results/us15-etiquetas-US-15-·-Eti-88664-da-normalizada-a-minúsculas-chromium/error-context.md).
  - Captura de pantalla del fallo:
    [`test-failed-1.png`](../../test-results/us15-etiquetas-US-15-·-Eti-88664-da-normalizada-a-minúsculas-chromium/test-failed-1.png).
  - Traza del reintento (abrir con `npx playwright show-trace`):
    [`trace.zip`](../../test-results/us15-etiquetas-US-15-·-Eti-88664-da-normalizada-a-minúsculas-chromium-retry1/trace.zip).
