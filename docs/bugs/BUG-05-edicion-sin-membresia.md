BUG-05 - Un usuario ajeno al proyecto puede editar la tarea (no devuelve 403)

- Descripción del problema: Un usuario autenticado que NO es miembro del
  proyecto puede editar el título, la descripción, la prioridad y la fecha de
  vencimiento de una tarea, y la API responde `200`. En
  `server/src/modules/tasks/tasks.routes.ts:14` la ruta `PATCH /tasks/:taskId`
  (y también `DELETE`, línea 15) no usa el middleware
  `requireTaskProjectMember`, y `updateTask`
  (`server/src/modules/tasks/tasks.service.ts:87`) no valida la membresía para
  esos campos (sólo valida al cambiar el `status`).

- Pasos exactos para reproducirlo:
  1. Registrar al usuario A y crear un proyecto con una tarea `task-1`.
  2. Autenticarse como el usuario B (ajeno, `caro@test.com`) y obtener su JWT.
  3. Enviar `PATCH /api/tasks/task-1` con `Authorization: Bearer <jwt de B>` y
     cuerpo `{ "title": "Cambiado por un ajeno" }`.
  (Cubierto por el test E2E `e2e/us12-editar.spec.ts` → US-12 c5.)

- Qué esperaba según la especificación: US-12 c5 exige que sólo los miembros
  del proyecto al que pertenece la tarea puedan editarla; un ajeno debe recibir
  `403` y la tarea debe conservar su título original.

- Qué obtuvo realmente: la API respondió `200` y aplicó el cambio de título.

- Severidad: ALTA.

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
  npx playwright test e2e/us12-editar.spec.ts -g "US-12 c5" --project=chromium
  ```

- Evidencia:
  - Test automatizado que falla: `e2e/us12-editar.spec.ts`, caso "US-12 c5".
  - Error registrado por Playwright: `Expected: 403 / Received: 200`, en
    [`error-context.md`](../../test-results/us12-editar-US-12-·-Editar-d4b6b--puede-editar-la-tarea-403--chromium/error-context.md).
  - Captura de pantalla del fallo:
    [`test-failed-1.png`](../../test-results/us12-editar-US-12-·-Editar-d4b6b--puede-editar-la-tarea-403--chromium/test-failed-1.png).
  - Traza del reintento (abrir con `npx playwright show-trace`):
    [`trace.zip`](../../test-results/us12-editar-US-12-·-Editar-d4b6b--puede-editar-la-tarea-403--chromium-retry1/trace.zip).
