# ADR 0002 Arquitectura de pruebas Playwright y Component Object de tarjetas

Estado: aceptado. Fecha: 16 de noviembre de 2026.

## Contexto

El ADR 0001 registra la arquitectura de la aplicación y su integración de API
con Jest, Supertest y SQLite. Este documento lo complementa con la arquitectura
real de las pruebas web y la decisión del taller de Clase 6. La aplicación
mantiene su arquitectura y sus componentes React.

La suite web usa Playwright con TypeScript. Los archivos de `e2e/` se organizan
por historia de usuario; `e2e/helpers.ts` reúne acciones funcionales compartidas
de registro, login, creación de proyecto/tarea, apertura de tarea y membresías.
Los tests reciben las fixtures nativas `page` y `request` de Playwright. No hay
Page Objects de pantallas, fixtures propias con `test.extend()` ni autenticación
inyectada con `storageState` en estas historias.

La configuración existente usa un worker por SQLite, un proyecto Chromium,
reintentos, reporte HTML, trace en el primer reintento y capturas ante fallos.
La URL local y los comandos de arranque viven en `playwright.config.ts`.
El registro y la preparación de las historias existentes se realizan por UI;
los helpers de API permiten verificar casos que esa UI no permite solicitar.
El test de accesibilidad de M2 también prepara recursos por API y los observa
en la UI. Esa combinación existe, pero no representa un framework completo
con todas las capas de la estructura presentada en clase.

## Decisión

Se conserva la organización funcional de los helpers y se incorpora un
Component Object para una tarjeta del tablero en
[`e2e/components/TaskCard.ts`](../../e2e/components/TaskCard.ts).
Una tarjeta aparece por cada tarea en las tres columnas del tablero. Su título,
asignado y selector de estado forman una pieza repetida con la misma semántica.
Por eso conviene encapsular la tarjeta, en lugar de modelar todo el tablero
como un único objeto para resolver esta repetición.

`TaskCard` recibe la página y el identificador público de la tarea. Localiza la
raíz mediante `data-testid="task-card"` y el enlace que termina en el id de esa
tarea. Todos sus controles se buscan dentro de esa raíz mediante `data-testid`.
No selecciona por posición, clases CSS o un título que podría estar repetido.
Los locators se resuelven de nuevo cuando cambia el DOM o se recarga el tablero.
El objeto ofrece la acción de abrir la tarjeta y expone locators para que cada
test mantenga visibles sus expectativas de negocio.

[`e2e/helpers.ts`](../../e2e/helpers.ts) reutiliza el objeto al verificar la
tarjeta creada y al abrir el detalle. Las cuatro historias existentes se
benefician de esa integración sin duplicar los selectores de la tarjeta.
El helper de apertura conserva su sincronización específica con la doble
carga de React StrictMode; este cambio no intenta resolver ese problema.

Se agrega una regresión de US-14 c2/c5 en
[`e2e/us14-asignar.spec.ts`](../../e2e/us14-asignar.spec.ts): dos tareas comparten
título, se asigna una a Bob y luego se reasigna a Caro mediante UI. Tras
recargar, sólo esa tarjeta debe mostrar el nuevo asignado; la otra permanece
sin asignar y ambas conservan TODO. El caso verifica persistencia y aislamiento
de la operación, además del alcance del Component Object.

## Alternativas consideradas

- Mantener los selectores de tarjeta inline en cada helper o spec: conserva
  poca estructura, pero repite el contrato del componente y facilita confundir
  tarjetas con el mismo título.
- Introducir un Page Object de todo el tablero: tendría sentido si se
  centralizaran sus formularios, filtros y navegación. Es más amplio que la
  pieza repetida identificada para este taller.
- Crear fixtures propias y preparar todo por API: puede reducir la repetición
  y el tiempo de setup, pero requiere definir creación y limpieza de recursos.
  Se deja como evolución y no se afirma que ya esté implementado.
- Adoptar Screenplay: agrega actores y tareas que no se justifican para el
  tamaño actual de esta suite ni para esta extracción concreta.

## Consecuencias

Los cambios futuros de la tarjeta tienen un lugar común en el código de
testing. La prueba de reasignación usa dos títulos iguales para detectar una
selección ambigua que podría pasar inadvertida con una sola tarjeta.
El objeto depende de los `data-testid` y del enlace público de tarea, por lo
que un cambio de ese contrato requerirá actualizarlo.

La suite sigue dependiendo de Bob y Caro del seed en varios casos existentes,
de setup funcional y de esperas fijas heredadas en la apertura de detalles.
Este ADR no presenta esas limitaciones como resueltas. Tampoco acredita que
todos los E2E estén verdes: los tests de bugs de negocio deben conservar sus
expectativas contra la especificación y reportar los fallos reales.

## Verificación

Con la aplicación y el seed de pruebas preparados, ejecutar la regresión
de reasignación y después las cuatro historias para revisar la integración:

```powershell
npx playwright test e2e/us14-asignar.spec.ts --project=chromium --grep 'c2/c5'
npx playwright test e2e/us12-editar.spec.ts e2e/us14-asignar.spec.ts e2e/us15-etiquetas.spec.ts e2e/us16-vencimiento.spec.ts --project=chromium
```

Registrar los resultados reales de esas ejecuciones junto con los bugs
conocidos; agregar este documento no reemplaza la evidencia de ejecución.
