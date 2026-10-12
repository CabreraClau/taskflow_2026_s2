BUG-07 - Los filtros de estado, prioridad y asignado no se combinan (hallazgo preexistente H-02)

- Descripción del problema: `GET /api/projects/:projectId/tasks` aplica sólo el
  último de los filtros `status`, `priority` y `assignedTo` en vez de aplicar
  todos los enviados. `buildFilters`
  (`server/src/modules/tasks/tasks.repository.ts:12`) reasigna por completo el
  objeto `where` en cada `if`, pisando el filtro anterior.
  (Hallazgo preexistente reportado como H-02 en el laboratorio de hallazgos.)

- Pasos exactos para reproducirlo:
  1. Crear en el mismo proyecto una tarea TODO/HIGH asignada a `user-1`, una
     TODO/LOW asignada a `user-2` y una IN_PROGRESS/HIGH asignada a `user-2`.
  2. Como miembro del proyecto, pedir
     `GET /api/projects/proj-1/tasks?status=TODO&priority=HIGH`.
  3. Pedir `GET /api/projects/proj-1/tasks?status=TODO&priority=LOW&assignedTo=user-1`.

- Qué esperaba según la especificación: US-07 c5 indica que los filtros son
  combinables y se aplican simultáneamente. La primera consulta debe devolver
  sólo la tarea TODO/HIGH; la segunda, un arreglo vacío.

- Qué obtuvo realmente: la primera consulta devolvió también la tarea
  IN_PROGRESS/HIGH; la segunda devolvió la tarea asignada a `user-1` aunque no
  cumple `status=TODO`.

- Severidad: ALTA.
