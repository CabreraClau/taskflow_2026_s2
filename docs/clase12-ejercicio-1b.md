# Clase 12 — Ejercicio 1B: lectura del pipeline

Fecha: 10 de noviembre de 2026, America/Montevideo.

Pipeline: `.github/workflows/ci.yml`, cinco jobs independientes (sin `needs`): build del servidor, build del cliente, lint, tests y cobertura. Corre en cada `push` y `pull_request` con Node 22.

Resultado local de referencia (mismos comandos que ejecuta cada job):

| Job | Comando | Resultado |
| --- | --- | --- |
| Build servidor | `npm run build` | Verde |
| Build cliente | `npm run build:client` | Verde |
| Lint | `npm run lint` | Verde, 0 errores y 0 warnings |
| Tests | `npm test` | Rojo, 11 pasan y 3 fallan |
| Cobertura | `npm run test:coverage` | Rojo, mismos 3 fallos; 62,44 % líneas y 32,63 % ramas |

## Clasificación de cada etapa en rojo

| Etapa en rojo | Categoría | Evidencia |
| --- | --- | --- |
| Tests: `rechaza crear un proyecto con nombre demasiado corto` | a. Bug real | `server/tests/projects.test.ts:37`, espera 400 y obtiene 201. Corresponde a [BUG-06](bugs/BUG-06-proyecto-nombre-invalido.md). |
| Tests: `aplica status y priority simultaneamente al filtrar tareas` | a. Bug real | `server/tests/tasks.test.ts:89`, espera 1 tarea y obtiene 2. Corresponde a [BUG-07](bugs/BUG-07-filtros-no-combinables.md). |
| Tests: `crea las tareas siempre con estado inicial TODO aunque el cliente envie otro estado` | a. Bug real | `server/tests/tasks.test.ts:103`, espera `TODO` y obtiene `DONE`. Corresponde a [BUG-08](bugs/BUG-08-tarea-estado-inicial.md). |
| Cobertura | b. Falta de tests | 62,44 % de líneas y 32,63 % de ramas contra el objetivo de 70 % / 40 %. No hay umbral configurado en `server/jest.config.js`, así que el job falla por los 3 tests rojos; la cobertura además queda por debajo del objetivo. |
| Lint (resuelto) | c. Calidad de código | Antes de esta entrega, `server/src/modules/comments/comments.service.ts` líneas 7, 16 y 26 reportaba `Unexpected any` y `'e' is defined but never used`. Se corrigieron los tipos; hoy el job queda verde. |
| Build servidor y build cliente | d. Pipeline o entorno | Sin fallas: `tsc` y `vite build` terminan con código 0. |

## Resultado en GitHub Actions

Corrida [run #1](https://github.com/CabreraClau/taskflow_2026_s2/actions/runs/42922806419) sobre la rama `agregar-ci`, commit `d75afbf`:

| Job | Resultado |
| --- | --- |
| Build servidor | success |
| Build cliente | success |
| Lint | success |
| Tests | failure |
| Cobertura | failure |

Tres jobs en verde y dos en rojo, como anticipa la clase. Evidencia: [actions-run.txt](evidence/clase12/actions-run.txt).

## Criterio de lectura

- No se borró ni deshabilitó ningún test rojo: los 3 fallos son defectos reales contra la especificación y quedan documentados en `docs/bugs/`.
- El pipeline es informativo: `main` no tiene branch protection, por lo que el rojo se lee y se clasifica, no bloquea el merge.
- Los 3 hallazgos de lint se corrigieron en lugar de ocultarse; se registran igualmente como categoría c para dejar trazabilidad.

## Reproducción

```powershell
npm ci
npx prisma generate
```

En `server/` o desde la raíz con los scripts del `package.json`:

```powershell
npm run build
npm run build:client
npm run lint
npm test
npm run test:coverage
```
