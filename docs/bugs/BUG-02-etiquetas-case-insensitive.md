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
