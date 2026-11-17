BUG-03 - Volver a agregar una etiqueta genera un duplicado y responde 201

- Descripción del problema: Volver a agregar una etiqueta que la tarea ya tiene
  no devuelve `200` ni evita el duplicado. `addTag`
  (`server/src/modules/tasks/tasks.service.ts:192`) crea siempre un nuevo
  registro en `taskTag` sin comprobar si el vínculo ya existe, y el controller
  (`server/src/modules/tasks/tasks.controller.ts:95`) responde siempre `201`.

- Pasos exactos para reproducirlo:
  1. Autenticarse como miembro del proyecto de la tarea `task-1`.
  2. Enviar `POST /api/tasks/task-1/tags` con `{ "name": "bug" }` (responde 201).
  3. Enviar de nuevo `POST /api/tasks/task-1/tags` con `{ "name": "bug" }`.
  4. Consultar las etiquetas de `task-1`.
  (Cubierto por el test E2E `e2e/us15-etiquetas.spec.ts` → US-15 c3.)

- Qué esperaba según la especificación: US-15 c3 exige que una tarea no pueda
  tener la misma etiqueta más de una vez y que volver a agregarla devuelva
  `200` sin generar un duplicado (la tarea debe tener exactamente 1 etiqueta
  `bug`).

- Qué obtuvo realmente: la API respondió `201` en el segundo intento y creó un
  segundo vínculo `taskTag`, por lo que la tarea lista la etiqueta `bug` dos
  veces.

- Severidad: MEDIA.

- Entorno:
  - Código: commit `f368466` (03/11/2026), donde se generaron las capturas;
    la causa raíz citada arriba sigue presente en `eac188c` (17/11/2026).
  - Navegador: Chromium 156.0.8078.4 con Playwright 1.64.0 (`Desktop Chrome`), un worker,
    `retries: 1` en local.
  - Zona horaria: `America/Montevideo` (UTC−3) en el navegador
    (`timezoneId`) y en el servidor (`TZ`), según `playwright.config.ts`.
  - Servidores: API en `http://localhost:3000` y cliente Vite en
    `http://localhost:5173`, sobre una base SQLite sembrada con `npm run db:reset`.
  - Sistema: Windows (`win32`, según la traza de Playwright).

- Reproducibilidad: siempre (2 de 2 intentos: la corrida y el reintento
  automático de Playwright fallaron con el mismo resultado). Para
  reproducirlo en un comando, con la base recién sembrada:

  ```sh
  npx playwright test e2e/us15-etiquetas.spec.ts -g "US-15 c3" --project=chromium
  ```

- Evidencia:
  - Test automatizado que falla: `e2e/us15-etiquetas.spec.ts`, caso "US-15 c3".
  - Error registrado por Playwright: `Expected: 1 / Received: 2 chips de etiqueta (`getByTestId('tag-chip')`)`, en
    [`error-context.md`](../../test-results/us15-etiquetas-US-15-·-Eti-0d66c--200-y-no-genera-duplicados-chromium/error-context.md).
  - Captura de pantalla del fallo:
    [`test-failed-1.png`](../../test-results/us15-etiquetas-US-15-·-Eti-0d66c--200-y-no-genera-duplicados-chromium/test-failed-1.png).
  - Traza del reintento (abrir con `npx playwright show-trace`):
    [`trace.zip`](../../test-results/us15-etiquetas-US-15-·-Eti-0d66c--200-y-no-genera-duplicados-chromium-retry1/trace.zip).
