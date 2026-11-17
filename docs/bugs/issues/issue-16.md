**Criterio violado:** US-07 c5: "Los filtros son combinables entre sí y se aplican todos simultáneamente"

**Entorno:** API REST, sin navegador · Express 4.21.2 · Prisma 6.19.3 · SQLite (una base temporal por archivo de test) · Jest 29.7.0 + Supertest 7.0.0 · Newman (Postman) · Windows local y GitHub Actions `ubuntu-latest`, Node 22 · commits `e3caeb5`, `d75afbf`, `e502144` y `eac188c`; la causa sigue presente en `main` (`d08590f`, 17/11/2026)

**Datos / precondiciones:** Owner A y miembro B en el mismo proyecto. Tareas: TODO/HIGH asignada a A, TODO/LOW asignada a B y HIGH asignada a B pasada a `IN_PROGRESS`.

**Pasos:**
1. `GET /api/projects/<id>/tasks?status=TODO&priority=HIGH` como miembro.
2. `GET /api/projects/<id>/tasks?status=TODO&priority=LOW&assignedTo=<id de A>`.

**Esperado:** Paso 1: sólo la tarea TODO/HIGH. Paso 2: `[]`.

**Obtenido:** Paso 1 devuelve también la tarea IN_PROGRESS/HIGH. Paso 2 devuelve la tarea de A aunque es HIGH. Causa: `buildFilters` (`server/src/modules/tasks/tasks.repository.ts:12`) reasigna `where` completo en cada `if`.

**Reproducibilidad:** 4 de 4 corridas de Jest (local 08/11 y 17/11/2026, Actions run #1 y #3) y 1 de 1 en Newman. Determinístico; se reproduce en Windows y en Linux (Actions).

Para reproducirlo en un comando:
```sh
cd server && npx jest tests/tasks.test.ts -t "BUG-07"
```

**Evidencia:**
- Salida de Jest del 17/11/2026: `Expected length: 1 / Received length: 2` (incluye `task-11`, `IN_PROGRESS`) → [jest-run.txt](https://github.com/CabreraClau/taskflow_2026_s2/blob/main/docs/evidence/clase5/jest-run.txt)
- Newman del 17/11/2026: `expected [ 'task-10013', 'task-10015' ] to deeply equal [ 'task-10013' ]` → [newman-run.txt](https://github.com/CabreraClau/taskflow_2026_s2/blob/main/docs/evidence/clase5/newman-run.txt)
- Job *Tests* en rojo en GitHub Actions: [run #1](https://github.com/CabreraClau/taskflow_2026_s2/actions/runs/42922806419) y [run #3](https://github.com/CabreraClau/taskflow_2026_s2/actions/runs/42923045185)
- Informe completo: [docs/hallazgos-api.md](https://github.com/CabreraClau/taskflow_2026_s2/blob/main/docs/hallazgos-api.md) (H-02)

**Test que lo reproduce:** `server/tests/tasks.test.ts` › `aplica status y priority simultaneamente al filtrar tareas (US-07 c5) [BUG-07]`; Postman: carpeta `H-02`

**Severidad:** alta

Ficha en el repo: [docs/bugs](https://github.com/CabreraClau/taskflow_2026_s2/tree/main/docs/bugs) (BUG-07).
