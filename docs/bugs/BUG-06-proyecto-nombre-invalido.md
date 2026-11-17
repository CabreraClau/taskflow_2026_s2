BUG-06 - Se crean proyectos con un nombre inválido (hallazgo preexistente H-01)

- Descripción del problema: `POST /api/projects` acepta nombres nulos, vacíos,
  compuestos sólo por espacios, de menos de tres caracteres o de tipo numérico;
  en varios de esos casos crea un proyecto con nombre vacío. `create`
  (`server/src/modules/projects/projects.controller.ts:27`) sólo valida
  `name.length > 100`, nunca el mínimo de 3 ni que el nombre sea no vacío.
  (Hallazgo preexistente reportado como H-01 en el laboratorio de hallazgos.)

- Pasos exactos para reproducirlo:
  1. Registrar un usuario y obtener su JWT.
  2. Enviar `POST /api/projects` con `Authorization: Bearer <jwt>` y cuerpo
     `{ "name": "a" }`.
  3. Repetir con `{ "name": "" }` y `{ "name": "   " }`.

- Qué esperaba según la especificación: US-03 c1 exige un nombre obligatorio de
  entre 3 y 100 caracteres; todos esos valores deben responder `400`
  `VALIDATION_ERROR`.

- Qué obtuvo realmente: el servicio respondió `201` y creó el proyecto (con
  nombre vacío cuando el valor era una cadena de espacios).

- Severidad: MEDIA.

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
  npx jest tests/projects.test.ts -t "BUG-06"
  ```

- Evidencia:
  - Test automatizado que falla: `server/tests/projects.test.ts`, caso marcado `[BUG-06]`.
  - Salida de Jest guardada en
    [`docs/evidence/m2/jest-run.txt`](../evidence/m2/jest-run.txt):
    `Expected: 400 / Received: 201`.
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
  - Request de Postman equivalente: carpeta "H-01" de la colección
    [`docs/postman/TaskFlow-clase5.postman_collection.json`](../postman/TaskFlow-clase5.postman_collection.json).
  - Informe del hallazgo original: [`docs/hallazgos-api.md`](../hallazgos-api.md) (H-01).
