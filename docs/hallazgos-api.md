# Hallazgos de la API · Clase 5 (Postman + Supertest)

Versión en Markdown del informe [`Lab_hallazgo test API .pdf`](../Lab_hallazgo%20test%20API%20.pdf),
completada con entorno, reproducibilidad y evidencia. Fuente de verdad:
[`taskflow_especificacion_requerimientos.docx`](../taskflow_especificacion_requerimientos.docx).
Módulos explorados: Proyectos y Tareas (ciclo de vida, filtros).

## Entorno común

| Dato | Valor |
|---|---|
| Código | rama `main`, commit `eac188c` (17/11/2026); la causa raíz de cada hallazgo sigue presente |
| API | `server/` · Express 4.21.2 · Prisma 6.19.3 · SQLite |
| Exploración manual | Postman, colección [`postman/TaskFlow-clase5.postman_collection.json`](postman/TaskFlow-clase5.postman_collection.json), entorno `TaskFlow local` (`http://localhost:3000/api`) |
| Automatización | Jest 29.7.0 · ts-jest 29.2.5 · Supertest 7.0.0; una base SQLite temporal por archivo de test |
| Corridas registradas | local en Windows (08/11/2026, commit `e3caeb5`, [`evidence/m2/jest-run.txt`](evidence/m2/jest-run.txt)); GitHub Actions `ubuntu-latest`, Node 22: [run #1](https://github.com/CabreraClau/taskflow_2026_s2/actions/runs/42922806419) (`d75afbf`) y [run #3](https://github.com/CabreraClau/taskflow_2026_s2/actions/runs/42923045185) (`e502144`) |

Los tres hallazgos son **determinísticos**: no dependen de datos aleatorios,
del orden de ejecución ni de la zona horaria. Fallaron en las 4 corridas
registradas (4/4); la última, del 17/11/2026, está en
[`evidence/clase5/jest-run.txt`](evidence/clase5/jest-run.txt) (42 tests: 39 verdes y 3 rojos).

| Hallazgo | Ticket | Test de Supertest (rojo) | Severidad |
|---|---|---|---|
| H-01 | [BUG-06](bugs/BUG-06-proyecto-nombre-invalido.md) · issue #15 | `projects.test.ts` › `[BUG-06]` | Media |
| H-02 | [BUG-07](bugs/BUG-07-filtros-no-combinables.md) · issue #16 | `tasks.test.ts` › `[BUG-07]` | Alta |
| H-03 | [BUG-08](bugs/BUG-08-tarea-estado-inicial.md) · issue #17 | `tasks.test.ts` › `[BUG-08]` | Alta |

---

## H-01 — Se crean proyectos con un nombre inválido

- **Endpoint:** `POST /api/projects`
- **Descripción:** acepta nombres vacíos, compuestos sólo por espacios o de
  menos de tres caracteres; con espacios crea un proyecto de nombre vacío.
  `create` (`server/src/modules/projects/projects.controller.ts:27`) sólo
  valida `name.length > 100`.
- **Pasos para reproducir:**
  1. `POST /api/auth/register` con `{ "email": "h01@test.com", "password": "Password1" }`; guardar `token`.
  2. `POST /api/projects` con `Authorization: Bearer <token>` y `{ "name": "ab" }`.
  3. Repetir con `{ "name": "a" }`, `{ "name": "" }` y `{ "name": "   " }`.
- **Esperado (US-03 c1):** nombre obligatorio de 3 a 100 caracteres →
  `400` con `error.code = "VALIDATION_ERROR"`.
- **Obtenido:** `201` y el proyecto queda creado. En la corrida de Postman,
  `"   "` devolvió `409 CONFLICT`: la API lo recorta a `""` y lo toma como
  duplicado del proyecto de nombre vacío creado por la request anterior. Eso
  confirma que se guardan proyectos con nombre vacío.
- **Valores límite:** 2 caracteres → 201 ❌ · 3 → 201 ✅ · 100 → 201 ✅ · 101 → 400 ✅.
  Sólo falla el límite inferior.
- **Reproducibilidad:** siempre (4/4). Un comando: `cd server && npx jest tests/projects.test.ts -t "BUG-06"`.
- **Evidencia:** salida de Jest `Expected: 400 / Received: 201` en
  [`evidence/m2/jest-run.txt`](evidence/m2/jest-run.txt); job *Tests* en rojo
  en los runs #1 y #3 de Actions; corrida de Newman del 17/11/2026
  ([`evidence/clase5/newman-run.txt`](evidence/clase5/newman-run.txt) y
  `newman-run.json`): 4 aserciones en rojo (`got 201` ×3 y `got 409`).
- **Severidad:** MEDIA.

## H-02 — Los filtros de estado, prioridad y asignado no se combinan

- **Endpoint:** `GET /api/projects/:projectId/tasks`
- **Descripción:** aplica sólo el último filtro de `status`, `priority` y
  `assignedTo`. `buildFilters` (`server/src/modules/tasks/tasks.repository.ts:12`)
  reasigna `where` completo en cada `if`.
- **Pasos para reproducir:**
  1. Como owner A, crear un proyecto y agregar al usuario B como miembro.
  2. Crear las tareas TODO/HIGH asignada a A, TODO/LOW asignada a B y HIGH
     asignada a B; pasar esta última a `IN_PROGRESS` con `PATCH /api/tasks/:id`.
  3. `GET /api/projects/<id>/tasks?status=TODO&priority=HIGH`.
  4. `GET /api/projects/<id>/tasks?status=TODO&priority=LOW&assignedTo=<id de A>`.
- **Esperado (US-07 c5, tabla de decisión de la clase 5):** los filtros se
  aplican juntos. Paso 3 → sólo la tarea TODO/HIGH. Paso 4 → `[]`.
- **Obtenido:** paso 3 devuelve también la tarea IN_PROGRESS/HIGH; paso 4
  devuelve la tarea de A aunque es HIGH.
- **Reproducibilidad:** siempre (4/4). Un comando: `cd server && npx jest tests/tasks.test.ts -t "BUG-07"`.
- **Evidencia:** salida de Jest `Expected length: 1 / Received length: 2`
  (incluye `task-7`, `status: "IN_PROGRESS"`) en
  [`evidence/m2/jest-run.txt`](evidence/m2/jest-run.txt); runs #1 y #3 de
  Actions; Newman del 17/11/2026: `expected [ 'task-10013', 'task-10015' ] to
  deeply equal [ 'task-10013' ]`; la segunda consulta devolvió `task-10013` en vez de `[]`.
- **Severidad:** ALTA (el tablero muestra tareas que no corresponden al filtro).

## H-03 — Se pueden crear tareas con un estado inicial distinto de TODO

- **Endpoint:** `POST /api/projects/:projectId/tasks`
- **Descripción:** conserva el `status` que manda el cliente. `createTask`
  (`server/src/modules/tasks/tasks.service.ts:43`) hace `...(body as object)`
  (línea 65) y no fuerza `status: 'TODO'`.
- **Pasos para reproducir:**
  1. Autenticarse como miembro de un proyecto.
  2. `POST /api/projects/<id>/tasks` con `{ "title": "Nueva tarea", "status": "DONE" }`.
- **Esperado (US-05 c3):** `201` y `status: "TODO"`.
- **Obtenido:** `201` y `status: "DONE"`; además el historial registra
  `null → DONE`, saltándose la regla de US-06 c2 (no se puede ir de TODO a DONE).
- **Reproducibilidad:** siempre (4/4). Un comando: `cd server && npx jest tests/tasks.test.ts -t "BUG-08"`.
- **Evidencia:** salida de Jest `Expected: "TODO" / Received: "DONE"` en
  [`evidence/m2/jest-run.txt`](evidence/m2/jest-run.txt); runs #1 y #3 de
  Actions; Newman del 17/11/2026: `expected 'DONE' to deeply equal 'TODO'`.
- **Severidad:** ALTA.
