# Detección de código pestilente en TaskFlow

## Objetivo y criterio de análisis

Este documento registra cinco *code smells* encontrados en TaskFlow sin modificar el comportamiento de la aplicación. Un *code smell* no implica necesariamente un error funcional: señala una decisión de diseño que dificulta entender, probar o mantener el código.

Los hallazgos se relacionan con los contenidos de la Clase 3: funciones pequeñas, SRP, DRY y dependencia de abstracciones (DIP). Los nombres "números mágicos" y "componente grande" describen manifestaciones concretas de los mismos principios de código limpio.

## Resumen

| # | Smell | Ubicación principal | Principio relacionado |
|---|---|---|---|
| 1 | Método largo / múltiples responsabilidades | `server/src/modules/tasks/tasks.service.ts`, `updateTask`, líneas 87-178 | SRP y funciones pequeñas |
| 2 | Código duplicado | Validación de email en tres archivos del servidor | DRY |
| 3 | Acoplamiento fuerte con la base de datos | `server/src/modules/projects/projects.controller.ts`, líneas 27-192 | DIP y SRP |
| 4 | Números mágicos | `server/src/modules/auth/auth.service.ts`, líneas 48, 72-73, 100-105 y 123 | Nombres significativos y mantenibilidad |
| 5 | Componente grande | `client/src/pages/TaskDetailPage.tsx`, líneas 18-405 | SRP y funciones/componentes pequeños |

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

**Estado:** documentado, sin refactorizar.

## 5. Componente grande

**Dónde:** `client/src/pages/TaskDetailPage.tsx`, componente `TaskDetailPage`, líneas 18-405.

**Evidencia:** un único componente mantiene el estado de la tarea, formulario, miembros, comentarios, historial, etiquetas y errores. También carga datos y contiene handlers para guardar, cambiar estado, agregar o quitar etiquetas, agregar o borrar comentarios y eliminar la tarea. Finalmente renderiza toda la pantalla.

**Por qué es un problema:** el componente tiene muchas razones para cambiar y mezcla coordinación de datos con presentación. Un cambio en comentarios, historial o edición obliga a trabajar en el mismo archivo, aumenta la carga cognitiva y dificulta escribir tests focalizados.

**Cómo mejorarlo:** extraer componentes como `TaskEditForm`, `TaskStatusForm`, `TaskTags`, `TaskComments` y `TaskHistory`. La carga y las mutaciones pueden separarse en hooks específicos para mantener las reglas de sincronización fuera de la vista.

**Estado:** documentado, sin refactorizar.

## Observación sobre la lista inicial

Los condicionales anidados de `updateTask` constituyen evidencia válida de código difícil de leer, pero no se cuentan como un sexto hallazgo ni como uno separado del método largo porque comparten ubicación, causa y propuesta de mejora. Separarlos habría duplicado el mismo problema. El acoplamiento del controlador de proyectos con Prisma aporta un hallazgo independiente y se relaciona directamente con DIP, visto en clase.

## Verificación

No se cambió código productivo ni se realizó un refactor, por lo que no corresponde adjuntar una captura posterior a un cambio. Se intentó ejecutar `npm test` como control de línea base. Jest no llegó a ejecutar casos porque su `globalSetup` no pudo crear la base SQLite temporal mediante Prisma en el entorno aislado usado para este análisis. Esto es una limitación de la ejecución, no evidencia de un test funcional fallido.
