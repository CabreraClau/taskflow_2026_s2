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
