# Contract testing con Pact en TaskFlow

Implementación del handout «Handout Contract testing con Pact en TaskFlow (2)»,
sin la segunda interacción ni los ejercicios opcionales.

## Archivos y ejecución

- `server/jest.pact.config.js`: configuración independiente que reutiliza la base
  SQLite temporal de `tests/globalSetup.ts` y `tests/setup.ts`, sin seed.
- `server/contract-tests/consumer/projects.pact.test.ts`: declara el GET autenticado
  a `/api/projects` y genera `server/pacts/TaskFlowWeb-TaskFlowAPI.json`.
- `server/contract-tests/provider/verify.pact.test.ts`: inicia la API real en un
  puerto libre, prepara el estado `ana tiene un proyecto` y verifica el contrato.

Desde la raíz:

```bash
npm --prefix server run test:pact
```

O, desde `server/`, en este orden:

```bash
npm run test:pact:consumer
npm run test:pact:provider
```

Los comandos equivalentes del handout son `npx jest -c jest.pact.config.js consumer`
y `npx jest -c jest.pact.config.js provider`. `npm test` mantiene su selección de
tests habitual y no incluye los contratos. No ejecutar ambas suites simultáneamente:
comparten el directorio temporal que el setup recrea.

Se instaló exactamente `@pact-foundation/pact@17.1.4`. Aunque el handout indica
Node 20+, esta versión del paquete declara Node >=22; usar Node 22 o superior
para cumplir sus requisitos.

## Qué verifica el contrato

El consumer reproduce la petición HTTP del frontend; no ejecuta React ni el helper
real que depende de `localStorage` y URLs relativas. Exige HTTP 200 y una lista
no vacía con `id`, `name`, `description` y `archived`, usando matchers por tipo.
`ownerId` y `createdAt` quedan fuera porque `ProjectsPage.tsx` no los consume.
El contrato generado contiene una sola interacción.

El provider crea a Ana, su proyecto y su membresía OWNER en SQLite temporal.
Su filtro sustituye el token de ejemplo por un JWT real firmado con `signToken`,
únicamente cuando la solicitud ya trae Authorization. Al finalizar cierra la API;
el setup compartido desconecta Prisma y elimina la base del test.

## Experimento de ruptura

Cambiar temporalmente `name: p.name` por `title: p.name` en `serialize`, dentro de
`server/src/modules/projects/projects.controller.ts`. Ejecutar el provider y
`npm test`, restaurar `name` y ejecutar nuevamente el provider.

Antes de la mutación, la suite habitual obtuvo 11 tests aprobados y 3 fallidos:

- `Tareas › aplica status y priority simultaneamente al filtrar tareas`.
- `Tareas › crea las tareas siempre con estado inicial TODO aunque el cliente envie otro estado`.
- `Proyectos › rechaza crear un proyecto con nombre demasiado corto`.

Estos fallos son previos a la implementación del handout.

### Resultados ejecutados (2026-11-03)

| Paso | Resultado |
| --- | --- |
| Consumer inicial | 1 test aprobado; contrato generado y revisado |
| Provider inicial | 1 test aprobado; HTTP 200 y cuerpo compatibles |
| Provider con `title` en lugar de `name` | Falla por `$[0] -> Actual map is missing the following keys: name` |
| `npm test` con la ruptura | Los mismos 11 aprobados y 3 fallidos de la línea de base |
| Restauración de `name` y ejecución completa de Pact | Consumer y provider aprobados (2 tests) |
| `npm run build` | Compilación TypeScript aprobada |

La ejecución se completó con Node 20.17.0 pese al aviso de engines de npm;
eso no cambia el requisito declarado de Node >=22 del paquete instalado.
El controlador quedó restaurado, sin cambios funcionales.

### Respuesta para discutir

La suite habitual no detectó la desaparición de `name`: el test de creación
comprueba el status y el de listado solamente la cantidad de proyectos.
Por eso no aparecieron fallos adicionales al cambiar el campo por `title`.
Sin Pact, este quiebre podría detectarse en una prueba de interfaz que comprobara
el nombre o al usar la pantalla de proyectos, donde el frontend seguiría leyendo
`project.name`. Pact lo detecta al verificar el provider, antes de integrar ese
cambio con el frontend.
