BUG-08 - Se pueden crear tareas con un estado inicial distinto de TODO (hallazgo preexistente H-03)

- Descripción del problema: `POST /api/projects/:projectId/tasks` conserva el
  campo `status` enviado por el cliente al crear la tarea. `createTask`
  (`server/src/modules/tasks/tasks.service.ts:43`) hace un spread de `body`
  sobre los datos (`...(body as object)`, línea 65) y no fuerza `status: 'TODO'`.
  (Hallazgo preexistente reportado como H-03 en el laboratorio de hallazgos.)

- Pasos exactos para reproducirlo:
  1. Autenticarse como miembro de un proyecto.
  2. Enviar `POST /api/projects/proj-1/tasks` con
     `{ "title": "Nueva tarea", "status": "DONE" }`.

- Qué esperaba según la especificación: US-05 c3 exige que el estado inicial de
  toda tarea sea siempre `TODO`, aunque la solicitud incluya otro estado.

- Qué obtuvo realmente: la tarea se guardó y se devolvió con estado `DONE`.

- Severidad: ALTA.
