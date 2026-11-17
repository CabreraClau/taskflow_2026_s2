# Equipo 4 — Calificaciones por equipo, Testing y Calidad de Software 2026

**Repo:** https://github.com/CabreraClau/taskflow_2026_s2

Este archivo tiene solo las tareas calificadas por equipo. Las notas individuales (cuestionario de la clase 1, cuestionarios de Moodle y participación) se llevan aparte.

_Escala de las notas: 0-100._

## Tareas por equipo

| Tarea | Clase | Peso | Puntos del curso (máx., de 100) | Nota | Aporta a la final (puntos) | Observaciones |
|---|---|---|---|---|---|---|
| Taller de refinamiento | 2 | 5,3 | 2,65 | pendiente |  | Pendiente de entrega: no figura en el repo (se buscó INVEST, Gherkin y refinamiento en todo el repo). |
| Integration + cobertura + refactor (código pestilente + Ej. 1 de clase 7) | 3 y 7 | 10,6 | 5,30 | 75 | 3,98 | Buen listado de 5 smells con ubicación, evidencia y mejora, y cobertura de ramas de 50,20 % con umbral en Jest. Falta el refactor: el propio documento dice «sin refactorizar». |
| Postman + Supertest, caza de bugs | 5 | 5,3 | 2,65 | 80 | 2,12 | Supertest con status, cuerpo y casos negativos; los 3 tests rojos son bugs de la spec. Postman no se cuenta. Los reportes de bug no tienen entorno, reproducibilidad ni evidencia. |
| ADR | 6 | 5,3 | 2,65 | 83 | 2,20 | Component Object `TaskCard` bien integrado y ADR con contexto, decisión, alternativas y consecuencias. Del resto del framework Playwright hay helpers y config, pero no fixtures propias ni capa de datos. |
| E2E + bugs | 7 y 8 | 10,6 | 5,30 | 80 | 4,24 | 18 casos para US-12, US-14, US-15 y US-16 (4, 5, 5 y 4); ejecutados: 17 de 22 tests pasan y los 5 rojos son BUG-01 a BUG-05 de la spec. Los bugs son GitHub issues (#10 a #17) pero sin pasos, entorno, reproducibilidad ni evidencia. |
| Performance (k6: tabla seed chica vs grande + issue) | 9 | 5,3 | 2,65 | 100 | 2,65 | Tabla seed chica vs. grande, hipótesis (paginación sin aplicar y consultas por tarea) e issue #5 con los criterios de la spec citados. Reproducido: con la seed grande el p95 supera los 500 ms. |
| Seguridad + accesibilidad (ZAP, axe-core, CVSS) | 11 | 5,3 | 2,65 | 70 | 1,85 | Buenos hallazgos manuales (SQL injection, edición ajena, recuperación de contraseña), axe-core con fix verificado y user stories de remediación. No usaron OWASP ZAP y falta el puntaje CVSS. |
| Pipeline (`ci.yml` y job de E2E) | 12 | 10,6 | 5,30 | 97 | 5,14 | `ci.yml` con 5 jobs independientes y cache de npm, mergeado a `main` (PR #9), con ESLint instalado. En Actions fallan solo Tests y Cobertura por los 3 bugs de la spec. Falta el job de E2E (opcional). |
| Presentación (por definir) | 16 | 15,9 | 7,95 | pendiente |  | Pendiente: todavía no está definida. |
| Informe de una página | 12 | 12,8 | 6,40 | pendiente |  | Pendiente de entrega: no figura en el repo. |
| **Total por equipo** | | **87,0** (53,0 ya calificados) | **43,50** | 83,7 (promedio ponderado de lo calificado) | **22,18** | Faltan por entregar: Taller de refinamiento, Presentación e Informe de una página. |
| Tareas individuales (Moodle 6, participación 5, cuestionario clase 1 2; pesos provisorios) |  | 13 | 6,50 |  | pendiente | Se llevan aparte, ver `Calificacion_final.md`. |
| **Proyecto final corregido** |  |  | **50,00** | pendiente | pendiente | Vale el 50 % de la nota final. Se califica después de que arreglen lo señalado en estas tareas. |
| **Total del curso** |  |  | **100,00** |  | **22,18** de 100 (hasta ahora; faltan individuales y proyecto final) | 43,50 (equipo) + 6,50 (individuales) + 50,00 (proyecto) |

_Los 13 de peso restantes de las tareas (6,5 puntos del curso: Moodle 6, participación 5, cuestionario clase 1 2) son individuales. Pesos provisorios, pendientes de confirmar._

## Proyecto corregido

| Concepto | Nota | Observaciones |
|---|---|---|
| Nota del proyecto corregido (incluye Rúbrica C de Pact) | | |

## Sugerencias de arreglo para el equipo (2026-11-17)

Notas en escala 0-100. Los "GitHub issues" son los tickets de la pestaña Issues del repo.

### Integration + cobertura + refactor
- **Refactor de smells:** `docs/code-smells.md` documenta 5 smells pero dice «sin refactorizar». Elegir 1 o 2 (por ejemplo las constantes de `auth.service.ts` o el email duplicado en tres archivos), escribir antes un test de caracterización que fije el comportamiento, refactorizar y verificar que los tests siguen en verde. Agregar una tabla «smell, refactor, commit». Recupera hasta 25 puntos de la tarea.

### E2E + bugs
- **Completar los GitHub issues #10 a #17:** agregar pasos para reproducir, entorno (navegador, zona horaria, commit), reproducibilidad y evidencia (captura o salida del test). Los pasos ya están en `docs/bugs/`: copiarlos al issue. Recupera hasta 20 puntos.

### ADR
- **Resto del framework Playwright:** crear fixtures propias con `test.extend()` (por ejemplo un usuario ya autenticado) y una capa de datos de prueba, en vez de depender de Bob y Caro del seed. Hasta 17 puntos.

### Seguridad + accesibilidad
- **CVSS:** calcular vector y puntaje de SEC-01 y SEC-02 con la calculadora de first.org (CVSS 3.1) y anotarlos junto a la severidad. CVSS es la escala estándar de 0 a 10 para medir qué tan grave es una vulnerabilidad. Hasta 17 puntos.
- **OWASP ZAP:** correr un baseline scan contra la app local, guardar el reporte HTML en `docs/` y cruzar sus hallazgos con los manuales. Hasta 13 puntos.

### Postman + Supertest
- **Reportes de bug incompletos:** agregar entorno, reproducibilidad y evidencia a los hallazgos H-01 a H-03 y a `docs/bugs/`. Hasta 15 puntos.
- **Patrón AAA:** separar con una línea en blanco o un comentario Arrange, Act y Assert, y verificar también el cuerpo en los tests que hoy solo miran el status. Hasta 5 puntos.

### Pipeline
- **Job de E2E (opcional):** agregar un job con checkout, setup-node con cache, `npm ci`, `npx prisma generate` en `server`, `npx playwright install --with-deps chromium` y `npx playwright test`, subiendo el reporte como artefacto. 3 puntos.

### Pendientes de entrega
- Taller de refinamiento, Presentación e Informe de una página.
