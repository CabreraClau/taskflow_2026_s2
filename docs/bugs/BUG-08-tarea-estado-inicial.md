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
  npx jest tests/tasks.test.ts -t "BUG-08"
  ```

- Evidencia:
  - Test automatizado que falla: `server/tests/tasks.test.ts`, caso marcado `[BUG-08]`.
  - Salida de Jest guardada en
    [`docs/evidence/m2/jest-run.txt`](../evidence/m2/jest-run.txt):
    `Expected: "TODO" / Received: "DONE"`.
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
  - Request de Postman equivalente: carpeta "H-03" de la colección
    [`docs/postman/TaskFlow-clase5.postman_collection.json`](../postman/TaskFlow-clase5.postman_collection.json).
  - Informe del hallazgo original: [`docs/hallazgos-api.md`](../hallazgos-api.md) (H-03).
