BUG-02 - Las etiquetas distinguen mayúsculas de minúsculas

- Descripción del problema: Al agregar una etiqueta que ya existe con otra
  capitalización, la API crea una etiqueta nueva en vez de reutilizar la
  existente. La búsqueda `db.tag.findFirst({ where: { name } })`
  (`server/src/modules/tasks/tasks.service.ts:203`) compara de forma sensible a
  mayúsculas, por lo que `Bug` y `BUG` se tratan como etiquetas distintas.

- Pasos exactos para reproducirlo:
  1. Autenticarse como miembro del proyecto de la tarea `task-1`.
  2. Enviar `POST /api/tasks/task-1/tags` con `{ "name": "Bug" }`.
  3. Enviar `POST /api/tasks/task-1/tags` con `{ "name": "BUG" }`.
  4. Consultar las etiquetas de `task-1`.
  (Cubierto por el test E2E `e2e/us15-etiquetas.spec.ts` → US-15 c2.)

- Qué esperaba según la especificación: US-15 c2 indica que las etiquetas no
  distinguen mayúsculas de minúsculas: `'Bug'`, `'BUG'` y `'bug'` son la misma
  etiqueta. La tarea debe seguir teniendo exactamente una etiqueta llamada
  `bug`.

- Qué obtuvo realmente: la tarea quedó con dos etiquetas distintas (`Bug` y
  `BUG`), es decir, un duplicado lógico.

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
  npx playwright test e2e/us15-etiquetas.spec.ts -g "US-15 c2" --project=chromium
  ```

- Evidencia:
  - Test automatizado que falla: `e2e/us15-etiquetas.spec.ts`, caso "US-15 c2".
  - Error registrado por Playwright: `Expected: 1 / Received: 2 chips de etiqueta (`getByTestId('tag-chip')`)`, en
    [`error-context.md`](../../test-results/us15-etiquetas-US-15-·-Eti-1f981-rea-dos-etiquetas-distintas-chromium/error-context.md).
  - Captura de pantalla del fallo:
    [`test-failed-1.png`](../../test-results/us15-etiquetas-US-15-·-Eti-1f981-rea-dos-etiquetas-distintas-chromium/test-failed-1.png).
  - Traza del reintento (abrir con `npx playwright show-trace`):
    [`trace.zip`](../../test-results/us15-etiquetas-US-15-·-Eti-1f981-rea-dos-etiquetas-distintas-chromium-retry1/trace.zip).
