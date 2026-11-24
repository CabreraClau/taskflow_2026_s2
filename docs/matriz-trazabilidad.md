# Matriz de trazabilidad de TaskFlow

Fecha: 22 de noviembre de 2026. Base: `2ef43c6` de `main`.
Fuente de los requerimientos: `taskflow_especificacion_requerimientos.docx` (17 historias, 113 criterios de aceptación).

## Cómo se lee

Cada fila sigue la cadena de la clase 2: **Requerimiento → User story → Criterio de aceptación → Test → Resultado**.
Si un test falla, la última columna dice qué bug explica el rojo.

- **Tipo:** `INT` = integración (Jest + Supertest, base SQLite real), `E2E` = Playwright desde la interfaz, `CON` = contrato Pact.
- **Resultado:** ✅ pasa · ❌ falla · — sin test.
- Los resultados son de la corrida del 22/11/2026:
  - `npm run test:coverage` → **43 de 46** tests pasan (3 rojos: BUG-06, BUG-07, BUG-08).
  - `npx playwright test e2e/us --project=chromium` → **13 de 18** pasan (5 rojos: BUG-01 a BUG-05).
  - `npm --prefix server run test:pact` → **3 de 3** consumidores y la verificación del proveedor pasan.

## Resumen por historia

| Historia | Criterios | Con test | ✅ Verde | ❌ Rojo | Sin test |
|---|---:|---:|---:|---:|---:|
| US-01 Registro | 7 | 7 | 7 | 0 | 0 |
| US-02 Login | 7 | 6 | 6 | 0 | 1 |
| US-03 Crear proyecto | 6 | 6 | 5 | 1 | 0 |
| US-04 Listar proyectos | 4 | 3 | 3 | 0 | 1 |
| US-05 Crear tarea | 6 | 6 | 5 | 1 | 0 |
| US-06 Cambiar estado | 7 | 4 | 4 | 0 | 3 |
| US-07 Filtrar y buscar | 8 | 3 | 2 | 1 | 5 |
| US-08 Comentar | 6 | 5 | 5 | 0 | 1 |
| US-09 Editar proyecto | 7 | 2 | 2 | 0 | 5 |
| US-10 Eliminar proyecto | 7 | 1 | 1 | 0 | **6** |
| US-11 Miembros | 7 | 2 | 2 | 0 | 5 |
| US-12 Editar tarea | 7 | 4 | 3 | 1 | 3 |
| US-13 Eliminar tarea | 5 | 1 | 1 | 0 | **4** |
| US-14 Asignar tarea | 6 | 5 | 5 | 0 | 1 |
| US-15 Etiquetas | 7 | 5 | 2 | 3 | 2 |
| US-16 Vencimiento | 8 | 5 | 3 | 2 | 3 |
| US-17 Recuperar contraseña | 8 | 3 | 3 | 0 | 5 |
| **Total** | **113** | **68 (60 %)** | **59 (52 %)** | **9** | **45 (40 %)** |

## Detalle: criterios con test

| US | Criterio | Test | Tipo | Resultado | Bug |
|---|---|---|---|---|---|
| US-01 | c1 email con formato válido | [auth.test.ts:71](../server/tests/auth.test.ts#L71) | INT | ✅ | |
| US-01 | c2 email en minúsculas | [auth.test.ts:30](../server/tests/auth.test.ts#L30) | INT | ✅ | |
| US-01 | c3 contraseña fuerte | [auth.test.ts:58](../server/tests/auth.test.ts#L58) | INT | ✅ | |
| US-01 | c4 email repetido → 409 | [auth.test.ts:42](../server/tests/auth.test.ts#L42) | INT | ✅ | |
| US-01 | c5 registro → 201 + JWT | [auth.test.ts:12](../server/tests/auth.test.ts#L12) | INT | ✅ | |
| US-01 | c6 validación → 400 | [auth.test.ts:58](../server/tests/auth.test.ts#L58) | INT | ✅ | |
| US-01 | c7 no devuelve la contraseña | [auth.test.ts:12](../server/tests/auth.test.ts#L12) | INT | ✅ | |
| US-02 | c1 login → 200 + JWT 24 h | [auth.test.ts:85](../server/tests/auth.test.ts#L85), [login.pact.test.ts:22](../server/contract-tests/consumer/login.pact.test.ts#L22) | INT, CON | ✅ | |
| US-02 | c2 credenciales malas → 401 | [auth.test.ts:101](../server/tests/auth.test.ts#L101) | INT | ✅ | |
| US-02 | c3 mismo mensaje de error | [auth.test.ts:118](../server/tests/auth.test.ts#L118) | INT | ✅ | |
| US-02 | c4 bloqueo tras 5 intentos | [auth-policy.characterization.test.ts:31](../server/tests/auth-policy.characterization.test.ts#L31) | INT | ✅ | |
| US-02 | c6 desbloqueo a los 15 min | [auth-policy.characterization.test.ts:31](../server/tests/auth-policy.characterization.test.ts#L31) | INT | ✅ | |
| US-02 | c7 token con userId | [auth.test.ts:85](../server/tests/auth.test.ts#L85) | INT | ✅ | |
| US-03 | c1 nombre de 3 a 100 caracteres | [projects.test.ts:30](../server/tests/projects.test.ts#L30), [:47](../server/tests/projects.test.ts#L47), [:63](../server/tests/projects.test.ts#L63) | INT | ❌ | BUG-06 (#15) |
| US-03 | c2 descripción ≤ 500 | [projects.test.ts:75](../server/tests/projects.test.ts#L75) | INT | ✅ | |
| US-03 | c3 creador = owner y miembro | [projects.test.ts:11](../server/tests/projects.test.ts#L11) | INT | ✅ | |
| US-03 | c4 nombre repetido → 409 | [projects.test.ts:88](../server/tests/projects.test.ts#L88) | INT | ✅ | |
| US-03 | c5 devuelve id → 201 | [projects.test.ts:11](../server/tests/projects.test.ts#L11) | INT | ✅ | |
| US-03 | c6 sin token → 401 | [projects.test.ts:101](../server/tests/projects.test.ts#L101) | INT | ✅ | |
| US-04 | c1 solo mis proyectos | [projects.test.ts:127](../server/tests/projects.test.ts#L127), [projects.pact.test.ts:15](../server/contract-tests/consumer/projects.pact.test.ts#L15) | INT, CON | ✅ | |
| US-04 | c3 campos de la respuesta | [projects.test.ts:127](../server/tests/projects.test.ts#L127) | INT | ✅ | |
| US-04 | c4 sin proyectos → array vacío | [projects.test.ts:154](../server/tests/projects.test.ts#L154) | INT | ✅ | |
| US-05 | c1 título de 3 a 200 | [tasks.test.ts:35](../server/tests/tasks.test.ts#L35), [:51](../server/tests/tasks.test.ts#L51) | INT | ✅ | |
| US-05 | c2 prioridad válida | [tasks.test.ts:68](../server/tests/tasks.test.ts#L68) | INT | ✅ | |
| US-05 | c3 estado inicial siempre TODO | [tasks.test.ts:117](../server/tests/tasks.test.ts#L117) | INT | ❌ | BUG-08 (#17) |
| US-05 | c4 asignar al crear | [task-workflows.test.ts:41](../server/tests/task-workflows.test.ts#L41) | INT | ✅ | |
| US-05 | c5 solo miembros → 403 | [tasks.test.ts:84](../server/tests/tasks.test.ts#L84) | INT | ✅ | |
| US-05 | c6 devuelve id → 201 | [tasks.test.ts:11](../server/tests/tasks.test.ts#L11) | INT | ✅ | |
| US-06 | c1 transiciones válidas | [tasks.test.ts:135](../server/tests/tasks.test.ts#L135), [task-workflows.test.ts:5](../server/tests/task-workflows.test.ts#L5) | INT | ✅ | |
| US-06 | c3 no se sale de DONE | [tasks.test.ts:152](../server/tests/tasks.test.ts#L152), [task-workflows.test.ts:5](../server/tests/task-workflows.test.ts#L5) | INT | ✅ | |
| US-06 | c4 transición inválida → 422 | [tasks.test.ts:152](../server/tests/tasks.test.ts#L152) | INT | ✅ | |
| US-06 | c7 historial con autor | [task-workflows.test.ts:5](../server/tests/task-workflows.test.ts#L5) | INT | ✅ | |
| US-07 | c1 filtro por estado | [tasks.test.ts:171](../server/tests/tasks.test.ts#L171) | INT | ✅ | |
| US-07 | c2 filtro por asignado | [task-workflows.test.ts:5](../server/tests/task-workflows.test.ts#L5) | INT | ✅ | |
| US-07 | c5 filtros combinables | [tasks.test.ts:196](../server/tests/tasks.test.ts#L196) | INT | ❌ | BUG-07 (#16) |
| US-08 | c1 de 1 a 1000 caracteres | [comments.test.ts:51](../server/tests/comments.test.ts#L51), [task-workflows.test.ts:93](../server/tests/task-workflows.test.ts#L93) | INT | ✅ | |
| US-08 | c2 validación en la API | [task-workflows.test.ts:93](../server/tests/task-workflows.test.ts#L93) | INT | ✅ | |
| US-08 | c3 autor y fecha automáticos | [comments.test.ts:10](../server/tests/comments.test.ts#L10), [comments.pact.test.ts:15](../server/contract-tests/consumer/comments.pact.test.ts#L15) | INT, CON | ✅ | |
| US-08 | c5 solo miembros → 403 | [comments.test.ts:68](../server/tests/comments.test.ts#L68) | INT | ✅ | |
| US-08 | c6 borrar comentario propio (parcial: falta el ajeno → 403) | [task-workflows.test.ts:93](../server/tests/task-workflows.test.ts#L93) | INT | ✅ | |
| US-09 | c4 nombre repetido al editar → 409 | [project-workflows.test.ts:21](../server/tests/project-workflows.test.ts#L21) | INT | ✅ | |
| US-09 | c6 devuelve el proyecto editado | [project-workflows.test.ts:5](../server/tests/project-workflows.test.ts#L5) | INT | ✅ | |
| US-10 | c6 eliminación → 204 (y el proyecto desaparece del listado) | [project-workflows.test.ts:5](../server/tests/project-workflows.test.ts#L5) | INT | ✅ | |
| US-11 | c3 miembro repetido → 409 | [project-workflows.test.ts:35](../server/tests/project-workflows.test.ts#L35) | INT | ✅ | |
| US-11 | c5 el quitado deja de ver el proyecto | [project-workflows.test.ts:35](../server/tests/project-workflows.test.ts#L35) | INT | ✅ | |
| US-12 | c1 editar título | [us12-editar.spec.ts:15](../e2e/us12-editar.spec.ts#L15) | E2E | ✅ | |
| US-12 | c2 título corto → 400 | [us12-editar.spec.ts:36](../e2e/us12-editar.spec.ts#L36) | E2E | ✅ | |
| US-12 | c5 ajeno no edita → 403 | [us12-editar.spec.ts:79](../e2e/us12-editar.spec.ts#L79) | E2E | ❌ | BUG-05 (#14) |
| US-12 | c6 campos ausentes se conservan | [us12-editar.spec.ts:56](../e2e/us12-editar.spec.ts#L56) | E2E | ✅ | |
| US-13 | c3 eliminación → 204 (y la tarea desaparece del listado) | [task-workflows.test.ts:73](../server/tests/task-workflows.test.ts#L73) | INT | ✅ | |
| US-14 | c1 solo miembros → si no, 400 | [us14-asignar.spec.ts:19](../e2e/us14-asignar.spec.ts#L19), [:47](../e2e/us14-asignar.spec.ts#L47) | E2E | ✅ | |
| US-14 | c2 reasignar | [us14-asignar.spec.ts:62](../e2e/us14-asignar.spec.ts#L62) | E2E | ✅ | |
| US-14 | c3 desasignar con null | [us14-asignar.spec.ts:120](../e2e/us14-asignar.spec.ts#L120) | E2E | ✅ | |
| US-14 | c4 cualquier miembro asigna | [us14-asignar.spec.ts:149](../e2e/us14-asignar.spec.ts#L149) | E2E | ✅ | |
| US-14 | c5 no cambia el estado | [us14-asignar.spec.ts:19](../e2e/us14-asignar.spec.ts#L19) | E2E | ✅ | |
| US-15 | c1 normalizada a minúsculas | [us15-etiquetas.spec.ts:11](../e2e/us15-etiquetas.spec.ts#L11) | E2E | ❌ | BUG-01 (#10) |
| US-15 | c2 "Bug" = "BUG" | [us15-etiquetas.spec.ts:32](../e2e/us15-etiquetas.spec.ts#L32) | E2E | ❌ | BUG-02 (#11) |
| US-15 | c3 repetida → 200 sin duplicar | [us15-etiquetas.spec.ts:59](../e2e/us15-etiquetas.spec.ts#L59) | E2E | ❌ | BUG-03 (#12) |
| US-15 | c4 de 1 a 30 caracteres | [us15-etiquetas.spec.ts:86](../e2e/us15-etiquetas.spec.ts#L86) | E2E | ✅ | |
| US-15 | c5 máximo 10 etiquetas | [us15-etiquetas.spec.ts:109](../e2e/us15-etiquetas.spec.ts#L109) | E2E | ✅ | |
| US-16 | c2/c3 fecha igual, sin zona horaria | [us16-vencimiento.spec.ts:16](../e2e/us16-vencimiento.spec.ts#L16) | E2E | ❌ | BUG-04 (#13) |
| US-16 | c5 quitar la fecha | [us16-vencimiento.spec.ts:57](../e2e/us16-vencimiento.spec.ts#L57) | E2E | ✅ | |
| US-16 | c6 formato inválido → 400 | [us16-vencimiento.spec.ts:85](../e2e/us16-vencimiento.spec.ts#L85), [task-workflows.test.ts:41](../server/tests/task-workflows.test.ts#L41) | E2E, INT | ✅ | |
| US-16 | c7 se admite fecha pasada | [us16-vencimiento.spec.ts:38](../e2e/us16-vencimiento.spec.ts#L38) | E2E | ✅ | |
| US-17 | c1 se pide con el email | [auth-policy.characterization.test.ts:79](../server/tests/auth-policy.characterization.test.ts#L79) | INT | ✅ | |
| US-17 | c3 genera token | [auth-policy.characterization.test.ts:79](../server/tests/auth-policy.characterization.test.ts#L79) | INT | ✅ | |
| US-17 | c4 vence a los 60 min | [auth-policy.characterization.test.ts:79](../server/tests/auth-policy.characterization.test.ts#L79) | INT | ✅ | |

(US-16 c2 y c3 se cuentan como dos criterios cubiertos por el mismo test.)

## Huecos que muestra la matriz

1. **Borrados casi sin probar:** de US-10 (eliminar proyecto) y US-13 (eliminar tarea) solo se prueba que el borrado devuelve 204. El **borrado en cascada** (tareas, comentarios, historial y etiquetas), los permisos y el 404 no tienen test. Si la cascada falla, quedan datos huérfanos y nadie se entera.
2. **Permisos casi sin cubrir:** US-06 c5/c6, US-09 c1, US-10 c1, US-11 c1 y c7, US-15 c7, US-16 c8. Coincide con lo que encontró la auditoría de seguridad (edición sin membresía, BUG-05).
3. **US-07 sin paginación ni búsqueda:** c4, c7 y c8 sin test. Es justo donde k6 mostró el problema de performance (p95 de 15,4 s con 5.000 tareas).
4. **US-17 cubierta solo por tests de caracterización:** fijan lo que el sistema hace hoy, no lo que pide la especificación (faltan c2, c5, c6, c7 y c8).
5. **Requerimientos no funcionales:** rendimiento tiene prueba k6 (falla) y seguridad tiene auditoría manual, pero **concurrencia no tiene ninguna prueba**.

## Tests sin criterio de la especificación

No se cuentan en la matriz. No son un problema, pero conviene saber por qué existen:

- `comments.test.ts:86` (sin token → 401) y `projects.test.ts:113` (token inválido): cubren las **convenciones generales** de autenticación, no un criterio de historia.
- `comments.test.ts:100` (tarea inexistente → 404): convención de errores.
- `auth-policy.characterization.test.ts:13` y `:103`: fijan el hash bcrypt antes del refactor de *smells*. Tocan el RNF de seguridad 4 (contraseñas con hash).

## Cómo sabemos que la matriz coincide con los tests reales

- **Los nombres de los tests llevan el criterio:** `US-15 c3 · ...` o `(US-03 c1) [BUG-06]`. La matriz se armó buscando esos códigos (`grep "US-"`), no de memoria. Dos filas salen de leer tests de flujo que no llevan el código en el nombre: US-10 c6 (`project-workflows.test.ts:5`) y US-13 c3 (`task-workflows.test.ts:73`), que borran y esperan 204.
- **Conteo:** hay 46 tests de Jest, 18 E2E de historias y 3 contratos. Cada fila apunta a un `archivo:línea` que existe en `2ef43c6`.
- **Resultados copiados de la corrida:** los rojos de la matriz son exactamente los 3 de Jest y los 5 de Playwright. Cada uno tiene su bug e issue.
- **Para mantenerla al día:** cada historia nueva suma su fila antes de pasar a *Done* (regla de la clase 2), y cada test nuevo lleva `US-xx cN` en el título.
