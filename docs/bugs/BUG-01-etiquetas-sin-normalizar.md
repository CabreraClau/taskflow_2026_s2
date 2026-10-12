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
