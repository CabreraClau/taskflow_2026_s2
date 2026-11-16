# Contract testing con Pact en TaskFlow

La implementación inicial siguió el handout «Handout Contract testing con Pact
en TaskFlow (2)» con el listado de proyectos. La ampliación funcional incorpora
login exitoso y listado de comentarios autorizado, conservando ese contrato.

## Archivos y ejecución

- `server/jest.pact.config.js`: configuración independiente que reutiliza la base
  SQLite temporal de `tests/globalSetup.ts` y `tests/setup.ts`, sin seed.
- `server/contract-tests/consumer/`: declara login, proyectos y comentarios, y
  genera `server/pacts/TaskFlowWeb-TaskFlowAPI.json` con las tres interacciones.
- `server/contract-tests/consumer/browser-api.ts`: adapta el entorno de Node para
  ejecutar el cliente HTTP real de `client/src/lib/api.ts` contra Pact.
- `server/contract-tests/provider/verify.pact.test.ts`: inicia la API real en un
  puerto libre, prepara el estado de cada interacción y verifica el contrato.

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

Los tres consumers usan el helper `api` del frontend. El adaptador aporta
`localStorage` en memoria y resuelve las URLs relativas contra el servidor de
Pact; las respuestas siguen recorriendo HTTP y el parser del cliente real.
Restaura ambos globales al finalizar cada prueba. No monta React ni prueba la
persistencia de sesión del componente `AuthProvider`.

| Interacción | Estado del provider | Qué exige |
| --- | --- | --- |
| `POST /api/auth/login` | `ana tiene credenciales válidas` | Credenciales correctas, HTTP 200, identidad del usuario y token con estructura JWT. |
| `GET /api/projects` | `ana tiene un proyecto` | HTTP 200 y lista no vacía con `id`, `name`, `description` y `archived`, igual que el contrato original. |
| `GET /api/tasks/:taskId/comments` | `ana es miembro de una tarea con comentarios` | Miembro autorizado, HTTP 200 y comentarios con IDs prefijados, texto y fecha ISO 8601. |

Los matchers permiten valores distintos manteniendo los tipos y formatos que
consume la interfaz. En proyectos, `ownerId` y `createdAt` siguen fuera porque
`ProjectsPage.tsx` no los usa. En login, el email coincide con la cuenta solicitada;
el JWT es un ejemplo sintético en el archivo Pact, nunca una credencial real.

El provider prepara fixtures distintos para cada estado en SQLite temporal.
Para login crea una contraseña con bcrypt y usa la ruta real de autenticación.
Para proyectos mantiene a Ana como OWNER. Para comentarios crea un dueño distinto
y a Ana como MEMBER, con una tarea y un comentario. El estado devuelve el ID
público de la tarea y el generador de ruta lo incorpora a la request, evitando
depender del autoincremento o del orden de las interacciones.

El filtro sustituye el token de ejemplo por un JWT real firmado con `signToken`
únicamente cuando la solicitud ya trae Authorization. El login no recibe ese
header. Al finalizar se cierra la API; el setup compartido desconecta Prisma y
elimina la base del test.

## Validación de la ampliación (2026-11-16)

`npm --prefix server run test:pact` terminó con código 0: los tres tests consumer
y el test provider aprobaron. El provider verificó las tres interacciones contra
la API real. El JSON se regeneró mediante Pact y se comprobó que la interacción
original de proyectos continúa intacta.

Como experimento puntual, una copia temporal del contrato de login exigió
`sessionToken` en lugar de `token`. Pact terminó con código 1 y el diagnóstico
exacto `Actual map is missing the following keys: sessionToken`. No se aceptó un
rechazo genérico como evidencia. La copia y el wrapper se eliminaron; no se
modificó producción ni se agregó una prueba deliberadamente roja a la suite.

Evidencia sanitizada: [resumen de verificación](evidence/pact/verification-summary.md).

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

Esta tabla conserva la ejecución histórica del contrato original y su experimento
de ruptura. No representa por sí sola la validación de las interacciones añadidas.

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
