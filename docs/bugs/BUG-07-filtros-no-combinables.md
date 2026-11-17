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

- Entorno:
  - Código: rama `main`, commit `eac188c` (17/11/2026). La causa raíz citada
    arriba sigue presente en ese commit.
  - Capa probada: API REST (sin navegador), `server/` con Express 4.21.2,
    Prisma 6.19.3 y SQLite. Cada archivo de test usa su propia base temporal
    copiada de `server/tests/.tmp/template.db`.
  - Herramientas: Jest 29.7.0 + ts-jest 29.2.5 + Supertest 7.0.0.
  - Corridas registradas: local en Windows (08/11/2026, commit
    `e3caeb5`) y GitHub Actions `ubuntu-latest`, Node 22 (run #1, commit
    `d75afbf`, y run #3, commit `e502144`).
  - Exploración manual: Postman, colección `docs/postman/TaskFlow-clase5.postman_collection.json`
    con el entorno `docs/postman/TaskFlow-local.postman_environment.json`
    (API en `http://localhost:3000/api`).

- Reproducibilidad: siempre (4 de 4 corridas registradas: local 08/11/2026,
  runs #1 y #3 de GitHub Actions y local 17/11/2026). El defecto es
  determinístico: no depende de datos aleatorios, del orden de los tests ni
  de la zona horaria. Para reproducirlo en un comando:

  ```sh
  cd server
  npx jest tests/tasks.test.ts -t "BUG-07"
  ```

- Evidencia:
  - Test automatizado que falla: `server/tests/tasks.test.ts`, caso marcado `[BUG-07]`.
  - Salida de Jest guardada en
    [`docs/evidence/m2/jest-run.txt`](../evidence/m2/jest-run.txt):
    `Expected length: 1 / Received length: 2 (aparece también la tarea IN_PROGRESS/HIGH `task-7`)`.
  - Corrida del 17/11/2026 sobre `eac188c`:
    [`docs/evidence/clase5/jest-run.txt`](../evidence/clase5/jest-run.txt)
    (3 rojos, 39 verdes).
  - Corridas de CI con el job *Tests* en rojo:
    [run #1](https://github.com/CabreraClau/taskflow_2026_s2/actions/runs/42922806419) y
    [run #3](https://github.com/CabreraClau/taskflow_2026_s2/actions/runs/42923045185)
    (resumen en [`docs/evidence/clase12/actions-run.txt`](../evidence/clase12/actions-run.txt)).
  - Corrida de Newman del 17/11/2026:
    [`docs/evidence/clase5/newman-run.txt`](../evidence/clase5/newman-run.txt)
    (17 aserciones, 7 rojas: las de H-01, H-02 y H-03).
  - Request de Postman equivalente: carpeta "H-02" de la colección
    [`docs/postman/TaskFlow-clase5.postman_collection.json`](../postman/TaskFlow-clase5.postman_collection.json).
  - Informe del hallazgo original: [`docs/hallazgos-api.md`](../hallazgos-api.md) (H-02).
