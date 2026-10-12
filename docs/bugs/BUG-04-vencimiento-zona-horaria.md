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
