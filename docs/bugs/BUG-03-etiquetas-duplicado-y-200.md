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
