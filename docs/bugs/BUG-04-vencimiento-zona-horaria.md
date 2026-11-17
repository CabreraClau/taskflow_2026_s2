BUG-04 - La fecha de vencimiento se corre un día según la zona horaria

- Descripción del problema: Al guardar una fecha de vencimiento y volver a
  leerla, el día devuelto es el anterior cuando el servidor corre en una zona
  horaria negativa (por ejemplo UTC-3). `parseDueDate`
  (`server/src/lib/ids.ts:38`) interpreta `'2026-09-15'` con `new Date(value)`,
  que la toma como medianoche UTC, y `formatDueDate`
  (`server/src/lib/ids.ts:42`) la formatea con los getters locales
  (`getFullYear`, `getMonth`, `getDate`), restando el offset.

- Pasos exactos para reproducirlo:
  1. Autenticarse como miembro del proyecto de la tarea `task-1`.
  2. Enviar `PATCH /api/tasks/task-1` con `{ "dueDate": "2026-09-15" }`.
  3. Leer la respuesta (o volver a consultar `GET /api/tasks/task-1`).
  (Cubierto por el test E2E `e2e/us16-vencimiento.spec.ts` → US-16 c2/c3, que
  corre con `timezoneId: 'America/Montevideo'`.)

- Qué esperaba según la especificación: US-16 c2/c3 exigen que la fecha se
  envíe y devuelva en formato `YYYY-MM-DD` y que sea siempre la misma que se
  cargó, sin importar la zona horaria del cliente ni del servidor. Se espera
  recibir `2026-09-15`.

- Qué obtuvo realmente: la API respondió `200` pero devolvió
  `"dueDate": "2026-09-14"`, es decir, un día antes.

- Severidad: ALTA.

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
  npx playwright test e2e/us16-vencimiento.spec.ts -g "US-16 c2/c3" --project=chromium
  ```

- Evidencia:
  - Test automatizado que falla: `e2e/us16-vencimiento.spec.ts`, caso "US-16 c2/c3".
  - Error registrado por Playwright: `Expected: "2026-09-15" / Received: "2026-09-14"`, en
    [`error-context.md`](../../test-results/us16-vencimiento-US-16-·-F-2438c-orrimiento-por-zona-horaria-chromium/error-context.md).
  - Captura de pantalla del fallo:
    [`test-failed-1.png`](../../test-results/us16-vencimiento-US-16-·-F-2438c-orrimiento-por-zona-horaria-chromium/test-failed-1.png).
  - Traza del reintento (abrir con `npx playwright show-trace`):
    [`trace.zip`](../../test-results/us16-vencimiento-US-16-·-F-2438c-orrimiento-por-zona-horaria-chromium-retry1/trace.zip).
