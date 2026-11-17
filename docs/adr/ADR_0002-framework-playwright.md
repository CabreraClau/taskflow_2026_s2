# ADR 0002 Framework Playwright: fixtures, datos y Component Object

Estado: aceptado e implementado. Fecha inicial: 16 de noviembre de 2026.
Actualización del bloque ADR/Playwright: 17 de noviembre de 2026.

## Contexto

El ADR 0001 describe la aplicación y las pruebas de integración con Jest,
Supertest y SQLite. Este ADR registra la arquitectura de las pruebas web.
La primera versión incorporó el Component Object `TaskCard`, integrado en los
helpers, y una regresión con dos tarjetas de igual título. El feedback valoró
esa integración y señaló que todavía faltaban fixtures propias y una capa de
datos de prueba.

En la base `61930c4`, las cuatro historias registraban un propietario por UI,
pero varios casos de asignación y autorización dependían de Bob y Caro del
seed. El test de accesibilidad tenía una función llamada `fixture`, sin usar
`test.extend()`. La configuración podía reutilizar los servidores y la base de
desarrollo. Las evidencias de accesibilidad se escribían sobre archivos
históricos de `docs/evidence/m2`.

## Decisión

### Responsabilidades del framework

| Capa | Implementación | Responsabilidad |
|---|---|---|
| Datos | [test-data.ts](../../e2e/data/test-data.ts) | Tipos y fábricas de usuarios, proyectos y tareas; identidades únicas por llamada |
| Fixtures | [fixtures.ts](../../e2e/fixtures.ts) | Preparar cuentas y sesión real por test; escenario de accesibilidad y adjuntos por ejecución |
| Acciones de UI | [helpers.ts](../../e2e/helpers.ts) | Crear proyectos/tareas, agregar miembros y abrir detalles con la interfaz real |
| Component Object | [TaskCard.ts](../../e2e/components/TaskCard.ts) | Encapsular una tarjeta identificada por el id público de tarea |
| Casos | Los cuatro `us*.spec.ts` y [a11y.spec.ts](../../e2e/playwright/tests/a11y.spec.ts) | Expresar la acción y las expectativas de cada historia |
| Entorno | [playwright.config.ts](../../playwright.config.ts) y [start-api.cjs](../../e2e/support/start-api.cjs) | Levantar servidores exclusivos, migrar una SQLite temporal y limpiar al terminar |

Las fábricas no conocen HTTP, Playwright ni Prisma. Generan datos válidos por
defecto y admiten valores explícitos. Los títulos y valores de frontera de las
historias siguen definidos en los casos, por ejemplo las etiquetas repetidas,
los 31 caracteres y las fechas usadas para reproducir defectos.

### Fixtures propias y autenticación

`test.extend()` declara fixtures de alcance **test** y preparación diferida:

- `owner`, `member`, `secondMember` y `outsider` registran cuentas nuevas por la
  API real con emails UUID. Cada reintento recibe identidades nuevas.
- `member` y `secondMember` son candidatos: el caso los agrega a su proyecto
  por UI cuando necesita esa membresía. `outsider` permanece fuera del proyecto.
- `authenticatedPage` usa el token y usuario devueltos por la API, los coloca
  en las claves de `localStorage` del cliente y abre Proyectos. Usa el contexto
  de navegador que Playwright aísla y cierra por test. No guarda sesiones en
  archivos ni modifica respuestas mediante mocks.
- `accessibilityScenario` usa las mismas fábricas y el propietario para crear
  un proyecto y una tarea por API. Mantiene la página anónima para que los casos
  de accesibilidad puedan recorrer Login y Registro antes del login por UI.
- `evidence` escribe JSON en `testInfo.outputPath()` y lo adjunta al resultado.
  Las capturas de accesibilidad también se guardan y adjuntan por test.

Las cuatro historias importan `test` y `expect` desde el módulo de fixtures.
La preparación de cuentas deja de repetir el registro por UI. El registro se
comprueba por API durante el setup; estas historias no acreditan por sí solas
el flujo visual de envío de registro. Los casos de accesibilidad conservan
el login real por UI y la inspección del formulario de registro.

### Component Object y acciones funcionales

Se conserva `TaskCard` sin cambios. Recibe `page` e id de tarea, ubica la raíz
con `data-testid="task-card"` y el enlace que termina en ese id, y busca sus
controles dentro de esa raíz. No depende de posición, clases CSS ni del título.

La regresión US-14 c2/c5 mantiene dos tareas de título idéntico, asigna una a un
miembro y la reasigna al segundo mediante UI. Después de recargar, sólo la
tarjeta elegida muestra al segundo miembro; la otra sigue sin asignar y ambas
conservan TODO. Los usuarios ahora son fixtures, no cuentas del seed.

La creación de proyectos/tareas, las membresías y las acciones de las cuatro
historias siguen usando los formularios reales. Los casos que verifican
peticiones que la UI no permite representar conservan su llamada directa a la
API y sus expectativas originales.

### Base temporal y ciclo de vida

Cada ejecución inicia `start-api.cjs`, que crea un directorio temporal propio,
precrea `e2e.db` y aplica `prisma migrate deploy`. No ejecuta el seed. El script
fija explícitamente su `DATABASE_URL`, aunque exista otra en el entorno.

La API usa el puerto 3100 y el cliente 5174. `reuseExistingServer: false`
impide usar una instancia ajena. Vite usa `--strictPort`; su proxy recibe
`TASKFLOW_API_URL` para apuntar a esta API. El comportamiento de desarrollo
conserva el proxy predeterminado a 3000.

Los datos se aíslan por identidad y proyecto dentro de una base por ejecución,
con un worker por SQLite. No se afirma que exista una base distinta por test.
Playwright cierra los contextos de navegador y detiene los servidores mediante
SIGTERM; el lanzador elimina su directorio temporal después de salir la API,
también cuando hay tests fallidos. Un cierre forzado del proceso o del sistema
puede dejar un directorio temporal huérfano; las siguientes ejecuciones crean
uno nuevo y no lo reutilizan.

Reportes HTML, capturas, trazas y JSON se generan bajo `.audit/playwright/`,
ignorado por Git. Los adjuntos usan directorios propios por caso y reintento.
La evidencia histórica versionada no se sobrescribe. Los informes resumidos
de esta comparación se guardan explícitamente en `docs/evidence/adr-playwright`.

## Alternativas consideradas

- **Seguir sólo con helpers y cuentas del seed:** no resuelve la observación y
  obliga a preparar datos externos antes de ejecutar un caso aislado.
- **Compartir una cuenta y un `storageState` persistido:** reduce el setup, pero
  comparte datos mutables entre historias y obliga a gestionar archivos de
  sesión. Se prefieren cuentas por test y estado de navegador en memoria.
- **Reutilizar el servidor y resetear la base de desarrollo:** acopla las
  pruebas a una sesión ajena. Se elige una base desechable creada por el
  lanzador y puertos exclusivos que fallan si ya están ocupados.
- **Preparar todas las operaciones por API:** puede acelerar los casos, pero
  eliminaría recorridos de UI que ya se estaban verificando. La API prepara
  cuentas y el escenario de accesibilidad; los helpers conservan las acciones
  funcionales de las historias.
- **Introducir un Page Object de todo el tablero o Screenplay:** no es
  necesario para este faltante. Se mantiene el Component Object existente y
  se agregan las dos capas que faltaban.

## Consecuencias y límites

Los casos pueden ejecutarse de forma individual sin Bob, Caro ni el seed.
Las cuentas y el estado de sesión se preparan desde un solo módulo; los datos
válidos se definen en fábricas tipadas. Agregar una fixture sólo la activa en
los casos que la solicitan. El registro por API y las migraciones agregan un
costo de preparación; un solo worker sigue siendo una decisión conservadora
para SQLite, no una demostración de ejecución paralela.

El helper `abrirTarea` conserva las esperas heredadas para la doble carga de
React StrictMode. Este bloque no modifica esa sincronización ni las reglas
de negocio. Los cinco defectos existentes continúan visibles en las pruebas,
sin `skip`, `fixme`, `test.fail()` ni expectativas debilitadas. El job E2E de
GitHub Actions queda fuera de este bloque.

## Verificación realizada

Entorno local: macOS 26.6 arm64, Node 24.22.1, npm 10.9.3, Playwright 1.65.0,
Chromium Headless Shell 158.0.8127.18 (build 1254), Prisma 6.19.3 y zona
`America/Montevideo`. Dependencias instaladas desde los lockfiles, sin
actualizarlos. No se presenta esta medición como una ejecución en CI.

| Medición | Preparación | Aprobadas | Fallidas | Omitidas / inestables |
|---|---|---:|---:|---:|
| Antes, base `61930c4` | Copia aislada, SQLite temporal con seed | 17 | 5 | 0 / 0 |
| Después | SQLite nueva con migraciones y fixtures, sin seed | 17 | 5 | 0 / 0 |
| Después de integrar `main` (`d08590f`) | Misma suite sin seed | 17 | 5 | 0 / 0 |
| US-14 c2/c5 aislada, dos repeticiones | Nueva ejecución sin seed | 2 | 0 | 0 / 0 |
| US-14 c1 usuario ajeno aislada, dos repeticiones | Nueva ejecución sin seed | 2 | 0 | 0 / 0 |

Los mismos 22 títulos y resultados se conservaron antes/después. Los fallos
son [BUG-01](../bugs/BUG-01-etiquetas-sin-normalizar.md),
[BUG-02](../bugs/BUG-02-etiquetas-case-insensitive.md),
[BUG-03](../bugs/BUG-03-etiquetas-duplicado-y-200.md),
[BUG-04](../bugs/BUG-04-vencimiento-zona-horaria.md) y
[BUG-05](../bugs/BUG-05-edicion-sin-membresia.md).
La suite completa devuelve código 1 por estos cinco casos; los aislados
terminaron con código 0.

También pasaron el chequeo estricto de TypeScript E2E, la sintaxis del
lanzador y la compilación del cliente. En las cuatro ejecuciones nuevas se
comprobó que una base centinela indicada mediante `DATABASE_URL` no cambió,
que la evidencia histórica se conservó y que no quedaron directorios de
base temporal nuevos. Al ocupar 3100 con un servidor de prueba, Playwright
rechazó el arranque con código 1 y sólo envió `GET /api/health`, sin ejecutar
casos ni peticiones de datos.

Evidencia: [antes](../evidence/adr-playwright/before.txt),
[después](../evidence/adr-playwright/after.txt),
[reasignación aislada](../evidence/adr-playwright/isolated-reassign.txt),
[usuario ajeno aislado](../evidence/adr-playwright/isolated-outsider.txt),
[puerto ocupado](../evidence/adr-playwright/port-guard.txt),
[TypeScript](../evidence/adr-playwright/typecheck.txt),
[sintaxis del lanzador](../evidence/adr-playwright/launcher-syntax.txt),
[build del cliente](../evidence/adr-playwright/build-client.txt) y
[resumen de casos, hashes y aislamiento](../evidence/adr-playwright/results.json).

### Integración previa a la publicación

Se actualizó la rama con `origin/main` en `d08590f`, que incorpora el primer
bloque y las nuevas pruebas API, Postman y reportes de bugs del equipo.
La integración fue fast-forward, sin conflictos ni cambios sobre esos archivos.
Se repitieron los 22 E2E y conservaron exactamente los mismos resultados.
La suite API ampliada ejecutó 46 pruebas: 43 aprobadas y los tres fallos
existentes BUG-06, BUG-07 y BUG-08. Esto es una medición nueva; no reemplaza los
conteos históricos del primer bloque.

Evidencia adicional: [E2E integrados](../evidence/adr-playwright/integrated.txt)
y [API integrada](../evidence/adr-playwright/integrated-api.txt).

### Reproducción

Instalar con `npm ci` desde la raíz. Ejecutar `npx prisma generate` dentro de
`server/` y volver a la raíz. Instalar el navegador con
`npx playwright install chromium`. No preparar ni borrar la base de desarrollo.

```sh
npm run typecheck:e2e
npm run build:client
npm run test:e2e -- --project=chromium --retries=0
npm run test:e2e -- e2e/us14-asignar.spec.ts --grep 'c2/c5' --repeat-each=2 --retries=0
npm run test:e2e -- e2e/us14-asignar.spec.ts --grep 'US-14 c1 · Asignar la tarea a alguien' --repeat-each=2 --retries=0
```

Para reproducir el **antes**, usar una copia separada de `61930c4`, instalar
sus dependencias y fijar `DATABASE_URL` a un archivo SQLite temporal nuevo
antes de migrar y ejecutar el seed desde `server/`. Precrear el archivo vacío,
usar `npx prisma migrate deploy` y `npm run db:seed` en esa copia. Ejecutar
`npx playwright test --project=chromium --retries=0` con esa variable y
`CI=1` para impedir reutilizar servidores. Esa versión usa 3000/5173 y escribe
evidencias dentro de su propia copia. No ejecutar su seed sobre una base de
trabajo existente.

Referencias: [fixtures de Playwright](https://playwright.dev/docs/test-fixtures),
[servidores de pruebas](https://playwright.dev/docs/test-webserver) y
[autenticación](https://playwright.dev/docs/auth).
