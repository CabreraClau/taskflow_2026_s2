**Criterio violado:** US-03 c1: "El nombre del proyecto es obligatorio y tiene entre 3 y 100 caracteres"

**Entorno:** API REST, sin navegador · Express 4.21.2 · Prisma 6.19.3 · SQLite (una base temporal por archivo de test) · Jest 29.7.0 + Supertest 7.0.0 · Newman (Postman) · Windows local y GitHub Actions `ubuntu-latest`, Node 22 · commits `e3caeb5`, `d75afbf`, `e502144` y `eac188c`; la causa sigue presente en `main` (`d08590f`, 17/11/2026)

**Datos / precondiciones:** Usuario registrado (`POST /api/auth/register` con `Password1`) y su JWT.

**Pasos:**
1. `POST /api/projects` con `Authorization: Bearer <jwt>` y `{ "name": "ab" }`.
2. Repetir con `{ "name": "a" }`, `{ "name": "" }` y `{ "name": "   " }`.

**Esperado:** `400` con `error.code = "VALIDATION_ERROR"` en todos los casos.

**Obtenido:** `201` y el proyecto queda creado. `"   "` se recorta a `""`: si ya existe uno vacío responde `409`, lo que confirma que se guardan proyectos de nombre vacío. Valores límite: 3 → 201 ✅ · 100 → 201 ✅ · 101 → 400 ✅. Causa: `create` (`server/src/modules/projects/projects.controller.ts:27`) sólo valida `name.length > 100`.

**Reproducibilidad:** 4 de 4 corridas de Jest (local 08/11 y 17/11/2026, Actions run #1 y #3) y 1 de 1 en Newman. Determinístico: no depende del orden de los tests ni de la zona horaria; se reproduce en Windows y en Linux (Actions).

Para reproducirlo en un comando:
```sh
cd server && npx jest tests/projects.test.ts -t "BUG-06"
```

**Evidencia:**
- Salida de Jest del 17/11/2026: `Expected: 400 / Received: 201` → [jest-run.txt](https://github.com/CabreraClau/taskflow_2026_s2/blob/main/docs/evidence/clase5/jest-run.txt)
- Corrida de Newman del 17/11/2026: 4 aserciones en rojo (`got 201` ×3 y `got 409`) → [newman-run.txt](https://github.com/CabreraClau/taskflow_2026_s2/blob/main/docs/evidence/clase5/newman-run.txt)
- Job *Tests* en rojo en GitHub Actions: [run #1](https://github.com/CabreraClau/taskflow_2026_s2/actions/runs/42922806419) y [run #3](https://github.com/CabreraClau/taskflow_2026_s2/actions/runs/42923045185)
- Informe completo: [docs/hallazgos-api.md](https://github.com/CabreraClau/taskflow_2026_s2/blob/main/docs/hallazgos-api.md) (H-01)

**Test que lo reproduce:** `server/tests/projects.test.ts` › `rechaza crear un proyecto con nombre demasiado corto (US-03 c1) [BUG-06]`; Postman: carpeta `H-01` de `docs/postman/TaskFlow-clase5.postman_collection.json`

**Severidad:** media

Ficha en el repo: [docs/bugs](https://github.com/CabreraClau/taskflow_2026_s2/tree/main/docs/bugs) (BUG-06).
