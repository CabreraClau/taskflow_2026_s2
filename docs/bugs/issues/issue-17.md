**Criterio violado:** US-05 c3: "El estado inicial de toda tarea es siempre TODO, aunque la solicitud incluya otro estado"

**Entorno:** API REST, sin navegador · Express 4.21.2 · Prisma 6.19.3 · SQLite (una base temporal por archivo de test) · Jest 29.7.0 + Supertest 7.0.0 · Newman (Postman) · Windows local y GitHub Actions `ubuntu-latest`, Node 22 · commits `e3caeb5`, `d75afbf`, `e502144` y `eac188c`; la causa sigue presente en `main` (`d08590f`, 17/11/2026)

**Datos / precondiciones:** Usuario miembro de un proyecto, con su JWT.

**Pasos:**
1. `POST /api/projects/<id>/tasks` con `{ "title": "Nueva tarea", "status": "DONE" }`.

**Esperado:** `201` con `"status": "TODO"`.

**Obtenido:** `201` con `"status": "DONE"`; el historial registra `null → DONE`, saltándose US-06 c2 (no se puede ir de TODO a DONE). Causa: `createTask` (`server/src/modules/tasks/tasks.service.ts:43`) hace `...(body as object)` (línea 65) y no fuerza `status: 'TODO'`.

**Reproducibilidad:** 4 de 4 corridas de Jest (local 08/11 y 17/11/2026, Actions run #1 y #3) y 1 de 1 en Newman. Determinístico; se reproduce en Windows y en Linux (Actions).

Para reproducirlo en un comando:
```sh
cd server && npx jest tests/tasks.test.ts -t "BUG-08"
```

**Evidencia:**
- Salida de Jest del 17/11/2026: `Expected: "TODO" / Received: "DONE"` → [jest-run.txt](https://github.com/CabreraClau/taskflow_2026_s2/blob/main/docs/evidence/clase5/jest-run.txt)
- Newman del 17/11/2026: `expected 'DONE' to deeply equal 'TODO'` → [newman-run.txt](https://github.com/CabreraClau/taskflow_2026_s2/blob/main/docs/evidence/clase5/newman-run.txt)
- Job *Tests* en rojo en GitHub Actions: [run #1](https://github.com/CabreraClau/taskflow_2026_s2/actions/runs/42922806419) y [run #3](https://github.com/CabreraClau/taskflow_2026_s2/actions/runs/42923045185)
- Informe completo: [docs/hallazgos-api.md](https://github.com/CabreraClau/taskflow_2026_s2/blob/main/docs/hallazgos-api.md) (H-03)

**Test que lo reproduce:** `server/tests/tasks.test.ts` › `crea las tareas siempre con estado inicial TODO aunque el cliente envie otro estado (US-05 c3) [BUG-08]`; Postman: carpeta `H-03`

**Severidad:** alta

Ficha en el repo: [docs/bugs](https://github.com/CabreraClau/taskflow_2026_s2/tree/main/docs/bugs) (BUG-08).
