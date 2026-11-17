# Detección de código pestilente en TaskFlow

## Objetivo y criterio de análisis

Este documento registra cinco *code smells* encontrados en TaskFlow sin modificar el comportamiento de la aplicación. Un *code smell* no implica necesariamente un error funcional: señala una decisión de diseño que dificulta entender, probar o mantener el código.

Actualización del 17 de noviembre de 2026: se refactorizó el hallazgo 4 (números mágicos de autenticación), con pruebas de caracterización ejecutadas antes y después. Los otros cuatro hallazgos conservan su estado de diagnóstico. Las líneas citadas en el diagnóstico corresponden al código anterior al refactor, base `eac188c2`.

Los hallazgos se relacionan con los contenidos de la Clase 3: funciones pequeñas, SRP, DRY y dependencia de abstracciones (DIP). Los nombres "números mágicos" y "componente grande" describen manifestaciones concretas de los mismos principios de código limpio.

## Resumen

| # | Smell | Ubicación principal | Principio relacionado | Estado |
|---|---|---|---|---|
| 1 | Método largo / múltiples responsabilidades | `server/src/modules/tasks/tasks.service.ts`, `updateTask`, líneas 87-178 | SRP y funciones pequeñas | Documentado |
| 2 | Código duplicado | Validación de email en tres archivos del servidor | DRY | Documentado |
| 3 | Acoplamiento fuerte con la base de datos | `server/src/modules/projects/projects.controller.ts`, líneas 27-192 | DIP y SRP | Documentado |
| 4 | Números mágicos | `server/src/modules/auth/auth.service.ts`, líneas 48, 72-73, 100-105 y 123 | Nombres significativos y mantenibilidad | Refactorizado y verificado |
| 5 | Componente grande | `client/src/pages/TaskDetailPage.tsx`, líneas 18-405 | SRP y funciones/componentes pequeños | Documentado |

## 1. Método largo / múltiples responsabilidades

**Dónde:** `server/src/modules/tasks/tasks.service.ts`, función `updateTask`, líneas 87-178. Los condicionales más anidados están en las líneas 115-153.

**Evidencia:** la misma función obtiene la tarea, valida los campos editables, comprueba si el nuevo asignado pertenece al proyecto, autoriza el cambio de estado, valida la transición, actualiza la tarea y registra su historial. El bloque de asignación y permisos contiene varios niveles de `if`, `else` y `else if`.

**Por qué es un problema:** la función tiene varias razones para cambiar. Por ejemplo, una modificación en las reglas de fechas, membresía, permisos o historial obliga a editar el mismo bloque. Esto viola SRP y dificulta probar cada regla por separado. La Clase 3 usa precisamente `updateTask` como ejemplo de una función con cuatro responsabilidades.

**Cómo mejorarlo:** extraer funciones con una responsabilidad clara, por ejemplo `buildTaskChanges`, `parseAssigneeChange`, `authorizeStatusChange` y `recordStatusChange`. Las validaciones puras podrían probarse sin base de datos. Los casos inválidos deberían resolverse con cláusulas de guarda para reducir el anidamiento.

**Estado:** documentado, sin refactorizar.

## 2. Código duplicado

**Dónde:**

- `server/src/lib/validation.ts`, `EMAIL_RE` y `assertEmail`, líneas 3-13.
- `server/src/modules/auth/auth.service.ts`, `EMAIL_PATTERN` y `checkEmail`, líneas 9-16.
- `server/src/modules/projects/projects.controller.ts`, `EMAIL_CHECK`, líneas 7 y 143-144.

**Evidencia:** la regla "qué formato de email aceptamos" tiene tres representaciones. Dos expresiones regulares coinciden entre sí y la de autenticación es diferente.

**Por qué es un problema:** la misma regla de negocio puede evolucionar de manera distinta según el flujo. Una dirección podría aceptarse al agregar un miembro pero rechazarse al registrar una cuenta. Es el ejemplo de incumplimiento de DRY presentado en la Clase 3.

**Cómo mejorarlo:** eliminar `EMAIL_PATTERN`, `EMAIL_CHECK` y `checkEmail`; reutilizar `assertEmail` como único punto de validación y normalización. Agregar tests unitarios de casos límite para fijar el contrato.

**Estado:** documentado, sin refactorizar.

## 3. Acoplamiento fuerte con la base de datos

**Dónde:** `server/src/modules/projects/projects.controller.ts`, funciones `create`, `list`, `update`, `remove`, `addMember` y `removeMember`, líneas 27-192.

**Evidencia:** el controlador importa el cliente global `db` y realiza directamente consultas, escrituras, validaciones de negocio, autorización y serialización. En otros módulos ya existe una separación entre servicio y repositorio, por ejemplo en comentarios, pero proyectos concentra todas las capas en el controlador.

**Por qué es un problema:** para probar las reglas del controlador hay que preparar o simular Prisma. La lógica de alto nivel depende de una implementación concreta de persistencia, lo que contradice DIP. Además, el controlador tiene más de una razón para cambiar: HTTP, permisos, reglas del proyecto y almacenamiento.

**Cómo mejorarlo:** mover las reglas de negocio a `projects.service.ts`, encapsular Prisma en `projects.repository.ts` y hacer que el servicio reciba una interfaz de repositorio. El controlador debería limitarse a traducir la petición HTTP y la respuesta.

**Estado:** documentado, sin refactorizar.

## 4. Números mágicos

**Dónde:** `server/src/modules/auth/auth.service.ts`.

**Evidencia:**

- Líneas 48 y 123: `10` representa el costo de `bcrypt`.
- Línea 72: `5` representa la cantidad máxima de intentos fallidos.
- Línea 73: `15 * 60 * 1000` representa quince minutos de bloqueo.
- Líneas 100 y 105: `24` representa el tamaño aleatorio del token y `60 * 60 * 1000` su vigencia de una hora.

**Por qué es un problema:** los valores no explican por sí mismos la política de seguridad que representan. Si cambia una regla, resulta fácil modificar una aparición y olvidar otra, especialmente el costo de `bcrypt`, que aparece dos veces.

**Cómo mejorarlo:** declarar constantes cercanas al inicio del módulo, por ejemplo `PASSWORD_HASH_ROUNDS`, `MAX_FAILED_ATTEMPTS`, `ACCOUNT_LOCK_MS`, `RESET_TOKEN_BYTES` y `RESET_TOKEN_TTL_MS`. Las políticas que puedan variar por ambiente podrían pasar a configuración validada.

**Refactor aplicado:** se declararon esas cinco constantes privadas al inicio de [auth.service.ts](../server/src/modules/auth/auth.service.ts) y se reemplazaron sus seis usos, incluidos los dos hashes de contraseña. Se mantuvieron los valores originales: costo 10, cinco intentos, quince minutos, 24 bytes y una hora. Se preservaron las condiciones, respuestas y orden de operaciones. No se agregó configuración por ambiente.

**Estado:** refactorizado y verificado con cuatro pruebas de caracterización sobre la API y SQLite. La comprobación de una hora corresponde a la fecha de expiración almacenada; la validación del vencimiento y del uso único del token sigue pendiente, como documenta el [reporte de seguridad](clase12-m2-reporte.md).

## 5. Componente grande

**Dónde:** `client/src/pages/TaskDetailPage.tsx`, componente `TaskDetailPage`, líneas 18-405.

**Evidencia:** un único componente mantiene el estado de la tarea, formulario, miembros, comentarios, historial, etiquetas y errores. También carga datos y contiene handlers para guardar, cambiar estado, agregar o quitar etiquetas, agregar o borrar comentarios y eliminar la tarea. Finalmente renderiza toda la pantalla.

**Por qué es un problema:** el componente tiene muchas razones para cambiar y mezcla coordinación de datos con presentación. Un cambio en comentarios, historial o edición obliga a trabajar en el mismo archivo, aumenta la carga cognitiva y dificulta escribir tests focalizados.

**Cómo mejorarlo:** extraer componentes como `TaskEditForm`, `TaskStatusForm`, `TaskTags`, `TaskComments` y `TaskHistory`. La carga y las mutaciones pueden separarse en hooks específicos para mantener las reglas de sincronización fuera de la vista.

**Estado:** documentado, sin refactorizar.

## Observación sobre la lista inicial

Los condicionales anidados de `updateTask` constituyen evidencia válida de código difícil de leer, pero no se cuentan como un sexto hallazgo ni como uno separado del método largo porque comparten ubicación, causa y propuesta de mejora. Separarlos habría duplicado el mismo problema. El acoplamiento del controlador de proyectos con Prisma aporta un hallazgo independiente y se relaciona directamente con DIP, visto en clase.

## Verificación

### Refactor del 17 de noviembre de 2026

| Smell | Refactor | Prueba | Commit |
|---|---|---|---|
| Números mágicos de autenticación | Cinco constantes con los valores originales, reutilizadas en seis lugares | [Cuatro caracterizaciones](../server/tests/auth-policy.characterization.test.ts), escritas y aprobadas antes de editar producción | Pruebas: `f1198df`; refactor: `7c63662` |

Las pruebas comprueban el hash bcrypt al registrar y restablecer una contraseña, el bloqueo al quinto fallo y su duración, y el tamaño y vencimiento almacenado del token. Hacen solicitudes HTTP con Supertest y consultan la base real. No importan las constantes productivas ni simulan Prisma o bcrypt. El caso de bloqueo desplaza `Date.now` manteniendo el tiempo en movimiento y los temporizadores reales; restaura el reloj al finalizar cada caso.

Se midieron tres estados consecutivos:

| Estado | Caracterizaciones nuevas | Suite completa | Líneas cubiertas | Ramas cubiertas |
|---|---|---|---|---|
| Original, `eac188c2`, antes de agregar pruebas | Aún no existían | 18 aprobadas, 3 fallidas | 85,41 % (539/631) | 50,20 % (120/239) |
| Pruebas nuevas, producción original | 4 de 4 aprobadas | 22 aprobadas, 3 fallidas | 87,95 % (555/631) | 52,30 % (125/239) |
| Mismas pruebas después del refactor | 4 de 4 aprobadas | 22 aprobadas, 3 fallidas | 88,05 % (560/636) | 52,30 % (125/239) |

La mejora de ramas proviene de las pruebas nuevas y ya estaba presente antes del refactor. Las cinco declaraciones de constantes explican el aumento de cinco líneas ejecutables y cubiertas después. Se cumplen los umbrales existentes de Jest: 70 % de líneas y 40 % de ramas.

Los tres fallos son exactamente los mismos en las tres mediciones: [BUG-06, nombre de proyecto corto](bugs/BUG-06-proyecto-nombre-invalido.md), [BUG-07, filtros simultáneos](bugs/BUG-07-filtros-no-combinables.md) y [BUG-08, estado inicial](bugs/BUG-08-tarea-estado-inicial.md). La suite completa devuelve código 1 por esos defectos. Ningún test existente se modificó, omitió ni cambió su expectativa. Compilación del servidor y lint terminaron con código 0.

**Entorno:** macOS 26.6 arm64, Node 24.22.1, npm 10.9.3, Jest 29.7.0, Prisma 6.19.3, zona `America/Montevideo`. Se usaron las dependencias del lockfile, sin actualizarlas. `tests/globalSetup.ts` prepara una plantilla SQLite y `tests/setup.ts` crea una base temporal por archivo dentro de `server/tests/.tmp`; no se usa la base de desarrollo. Esta verificación es local; no es una nueva ejecución de GitHub Actions (que usa Node 22).

**Evidencia:** [medición original](evidence/refactor-auth/baseline-original.txt), [antes del refactor](evidence/refactor-auth/before-refactor.txt), [después del refactor](evidence/refactor-auth/after-refactor.txt), [compilación](evidence/refactor-auth/build.txt) y [lint](evidence/refactor-auth/lint.txt). El [resumen JSON](evidence/refactor-auth/results.json) conserva conteos, cobertura, casos nuevos, fallos y hashes SHA-256 de los archivos probados: el código productivo coincide entre las dos primeras mediciones y el test es idéntico antes y después del refactor. Las rutas personales de los logs se sustituyeron por `<repo>` y `<home>`.

Para reproducir, desde `server/`, con Node y npm disponibles:

```sh
npm ci
npx prisma generate
npm test -- --runTestsByPath tests/auth-policy.characterization.test.ts
npm run test:coverage
npm run build
npm run lint
```

La prueba específica debe aprobar sus cuatro casos; la cobertura completa conserva los tres fallos documentados mientras sus correcciones estén pendientes. Para comparar el antes y después, usar copias separadas de los commits `f1198df` y `7c63662` y ejecutar los mismos comandos.

Los commits publicados se crearon desde el editor de GitHub. Se verificó que sus árboles Git coinciden exactamente con los commits locales probados: `f1198df` con `d7e9664` y `7c63662` con `a577383`. El resumen JSON conserva los identificadores locales y la correspondencia de publicación.

### Antecedente del diagnóstico inicial

En el análisis original no se había refactorizado código y el intento de ejecutar `npm test` no había superado la preparación de SQLite en el entorno aislado. Esa limitación histórica no representaba un fallo funcional; la medición actual de arriba sí ejecutó las pruebas.
