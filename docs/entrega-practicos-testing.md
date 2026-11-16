# Entrega de los prácticos de arquitectura, integración y contratos

Fecha de verificación: 16 de noviembre de 2026. Base: `98c9a98` de `main`. Los cambios se hicieron en `completar-practicos-testing`.

## Qué cambió

- **Arquitectura web.** Se incorporó [TaskCard](../e2e/components/TaskCard.ts) y se reutilizó al crear y abrir tareas desde el tablero. La tarjeta se identifica por id de tarea: dos tareas pueden tener el mismo título. El [ADR 0002](adr/ADR_0002-framework-playwright.md) explica por qué se encapsuló esa pieza y cuáles son los límites del patrón. El caso US-14 c2/c5 reasigna una de dos tareas homónimas y verifica, después de recargar, que sólo cambió la elegida.
- **Integración y cobertura.** Siete [casos de proyectos](../server/tests/project-workflows.test.ts) y [tareas](../server/tests/task-workflows.test.ts) verifican cambios persistidos y respuestas HTTP en SQLite. Incluyen administración de proyectos, membresías, asignación, transiciones e historial, fechas, etiquetas y comentarios. [Jest](../server/jest.config.js) exige como mínimo 40 % de ramas y 70 % de líneas.
- **Contratos de la API.** Se conserva la interacción de proyectos y se agregan el login válido y la consulta de comentarios de una tarea por un miembro de su proyecto. El consumidor usa el cliente HTTP del frontend; el proveedor se verifica contra la API real con estados preparados en SQLite. [Detalle y comandos de Pact](contract-testing-pact.md).
- **Registro de bugs.** Los ocho hallazgos históricos ya tienen tickets individuales con criterio, resultado esperado, observación y severidad. Este trabajo los registra; no corrige el comportamiento productivo que describen.

## Correspondencia con GitHub Issues

| Hallazgo | Comportamiento observado | Severidad | Issue |
|---|---|---|---|
| BUG-01 | Una etiqueta nueva conserva sus mayúsculas | Media | [#10](https://github.com/CabreraClau/taskflow_2026_s2/issues/10) |
| BUG-02 | Cambiar la capitalización crea una segunda etiqueta | Media | [#11](https://github.com/CabreraClau/taskflow_2026_s2/issues/11) |
| BUG-03 | Repetir exactamente la etiqueta devuelve 201 y la duplica | Media | [#12](https://github.com/CabreraClau/taskflow_2026_s2/issues/12) |
| BUG-04 | El vencimiento se desplaza un día en UTC−3 | Alta | [#13](https://github.com/CabreraClau/taskflow_2026_s2/issues/13) |
| BUG-05 | La edición no exige siempre la membresía del proyecto | Alta | [#14](https://github.com/CabreraClau/taskflow_2026_s2/issues/14) |
| BUG-06 | La creación de proyectos acepta nombres demasiado cortos | Media | [#15](https://github.com/CabreraClau/taskflow_2026_s2/issues/15) |
| BUG-07 | El listado no respeta todos los filtros simultáneos | Alta | [#16](https://github.com/CabreraClau/taskflow_2026_s2/issues/16) |
| BUG-08 | La creación de tareas admite un estado inicial distinto de TODO | Alta | [#17](https://github.com/CabreraClau/taskflow_2026_s2/issues/17) |

## Cómo verificar e interpretar el resultado

En la raíz del repositorio, con las dependencias instaladas y Prisma generado:

```sh
npm run test:coverage
npm --prefix server run test:pact
```

Ejecutar esos dos comandos **uno después del otro**: ambas suites preparan el mismo directorio temporal de Jest. Para la prueba de navegador, usar una base **exclusiva de pruebas** con el seed de TaskFlow (Bob y Caro) y las instrucciones del [ADR](adr/ADR_0002-framework-playwright.md).

| Medición de Jest | Anterior, [registrada en el ejercicio de CI](clase12-ejercicio-1b.md) | Esta rama | Mínimo |
|---|---:|---:|---:|
| Ramas | 32,63 % | 50,20 % (120/239) | 40 % |
| Líneas | 62,44 % | 85,41 % (539/631) | 70 % |

Los siete casos nuevos pasaron. El total de integración fue **18 aprobados de 21**: todavía fallan BUG-06, BUG-07 y BUG-08. El comando completo devuelve código 1 por esos tres defectos; ambos umbrales se cumplen. La comparación de porcentajes usa la medición histórica del pipeline y la medición de esta rama.

**Web:** pasaron 7 de 7 regresiones seleccionadas en Chromium, sin reintentos, sobre una base nueva con el seed. Se verificaron US-12 c1, US-14 c1/c5, c2/c5 y c3, US-15 c4 y c5, y US-16 c7. Esta selección incluye al menos un uso del tablero por cada historia; no es una ejecución completa de todos los E2E. Pasaron también la compilación del servidor, el build del cliente y el lint del servidor.

**Contrato:** pasaron los tres tests del consumidor. El Verifier reprodujo las tres interacciones contra el servidor real y obtuvo las respuestas acordadas para proyectos, login y comentarios. El [archivo Pact](../server/pacts/TaskFlowWeb-TaskFlowAPI.json) quedó versionado junto con el código que lo genera.
