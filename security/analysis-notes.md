# Revisión de seguridad: notas para el informe

Revisión estática contrastada con [la evidencia HTTP saneada](results/http-results.json), ejecución `audit-1794183487998-cb04fb`, realizada el **8/11/2026 a las 21:18, America/Montevideo** (9/11 00:18 UTC), sobre `http://127.0.0.1:3000/api` y la DB local aislada `audit-m2.db`. Commit base: `75254f76e008ec91e4b493cc2860a866265819fc`. Se usaron exclusivamente cuentas/proyectos de prueba; las contraseñas y tokens están redactados.

Resultado de las 34 comprobaciones: **25 pass, 6 finding, 2 observation y 1 no aplicable**. Los `pass` incluyen preparación y restauración de fixtures. Los seis resultados `finding` son comprobaciones fallidas que se agrupan en los problemas descritos abajo; no equivalen a seis vulnerabilidades independientes. Para las dos fichas principales de la actividad se recomienda **SEC-01 SQLi y SEC-02 IDOR**, ambas demostradas con HTTP y verificación del resultado.

## Matriz HTTP resumida

Todos los IDs de esta matriz corresponden a entradas de `checks` en [http-results.json](results/http-results.json).

| Comprobación | Esperado antes de ejecutar | Resultado observado | Interpretación |
| --- | --- | --- | --- |
| `projects-without-authentication` | 401 | 401 | Autenticación requerida. |
| `projects-as-A`, `projects-as-B` | Ver sólo proyecto propio | 200, sin proyecto del otro | Control de lista correcto para estos fixtures. |
| `get-project-route-applicability` | Ruta inexistente | 404 `Endpoint not found` | No aplicable; no demuestra autorización. |
| `foreign-project-tasks`, `foreign-task-read`, `foreign-task-status` | 403/404 | 403 en los tres | Listado, lectura y transición ajenos rechazados. |
| `foreign-task-title`, `owner-verifies-foreign-title-update` | Rechazar cambio y conservar título | 200 y título ajeno persistido | **SEC-02 confirmado**; se restauró después con 200. |
| `assign-nonmember` | 400 | 400 | No se pudo asignar a un no miembro. |
| `sqli-classic-login` | 401 | 401 | Payload clásico no autenticó. |
| `search-baseline-own-project` | Sólo tarea A | 200, sólo `task-14` | Control de búsqueda literal. |
| `sqli-classic-search` | Literal/4xx, sin fallo interno | 500 genérico | Error de robustez; por sí solo no demuestra filtración. |
| `sqli-bounded-cross-project-read` | Ninguna tarea B | 200 con `task-15` de `proj-6` bajo sesión A | **SEC-01 confirmado**, sólo A/B devueltos. |
| `jwt-alg-none` | 401 | 401 | JWT sin firma rechazado. |
| `lockout-valid-credentials-after-five-failures` | Bloqueo tras cinco fallos | 401 `Account temporarily locked` aun con clave válida | Bloqueo confirmado en cuenta B; no se probó expiración ni bypass. |
| `password-recovery-public-token-disclosure` | Mensaje sin token público | 200 con token en JSON | **Extra SEC-04 confirmado** sobre cuenta C. |
| `password-reset-same-token-reuse`, `password-reset-reuse-login-verification` | 400/401 al reutilizar; segunda clave inválida | 200 al reutilizar y 200 al entrar con segunda clave | **Extra SEC-05 confirmado**; caducidad no probada. |

## Adaptación a esta versión de TaskFlow

- API: `server/`, puerto local 3000, prefijo `/api`.
- Cliente: `client/`. Persistencia: SQLite mediante Prisma.
- La versión examinada no implementa `GET /api/projects/:projectId`: `server/src/modules/projects/projects.routes.ts:10–18` sólo registra creación, lista, edición, eliminación y membresías. Un `404 Endpoint not found` para esa URL es **no aplicable**, no evidencia de autorización correcta.

## Fichas principales: hallazgos confirmados

### SEC-01: SQL injection en búsqueda permite leer tareas de otro proyecto

- Ubicación: `server/src/modules/tasks/tasks.repository.ts:28–52`, particularmente `$queryRawUnsafe` en :33 e interpolación directa de `term` en :49.
- Causa: el parámetro HTTP `search` se inserta en una cadena SQL dentro de `instr(...)`.
- Precondición: usuario A (`user-5`) pertenece sólo a `proj-5`; B (`user-6`) posee `proj-6`. Cada proyecto tiene una tarea privada, `task-14` y `task-15` respectivamente.
- Reproducción ejecutada: A hizo una búsqueda literal de su título (200, sólo `task-14`), y después `GET /api/projects/proj-5/tasks?search=...` con el valor `') > 0) AND 0 = 1 OR projectId IN (5, 6) --`, codificado como query HTTP.
- Esperado: ninguna fila de `proj-6`; el texto debe tratarse como dato o rechazarse.
- Actual: **200 con dos tareas**, incluida `task-15`, `projectId: proj-6`, descripción `Synthetic private data B`, bajo el token de A. No devolvió otros proyectos.
- Impacto confirmado: pérdida de confidencialidad entre proyectos privados pese a la comprobación de membresía en la ruta. Esta prueba no demuestra escritura, extracción de usuarios ni acceso al sistema operativo.
- Evidencia: checks `search-baseline-own-project` y `sqli-bounded-cross-project-read` en [http-results.json](results/http-results.json). El payload es read-only y se limitó a los IDs sintéticos A/B.
- Observación separada: `' OR 1=1 --` produjo 500 genérico en `sqli-classic-search`, coherente con el contexto `instr`; ese error aislado no se tomó como prueba de lectura cruzada.
- Remediación: usar Prisma `contains` con `projectId` permanente o `$queryRaw` con parámetros; no concatenar entradas. Agregar test de regresión que confirme que una búsqueda maliciosa no altera el alcance del proyecto.
- Clasificación: CWE-89, OWASP A03:2021 Injection. **Severidad: alta; prioridad P1**, por lectura privada cruzada demostrada.

### SEC-02: autorización de objeto omitida al modificar tareas

- Ubicación: `server/src/modules/tasks/tasks.routes.ts:14–15`; `PATCH` y `DELETE` no incorporan `requireTaskProjectMember`, a diferencia de `GET` (:11).
- En `server/src/modules/tasks/tasks.service.ts:87–174`, la actualización de título/descripción/prioridad/fecha no comprueba membresía. Sólo el bloque de `status` (:133–154) tiene autorización interna.
- Precondición: B (`user-6`) no es miembro ni asignado de la tarea `task-14` perteneciente a A (`proj-5`).
- Reproducción ejecutada: B solicitó `PATCH /api/tasks/task-14` con `{"status":"IN_PROGRESS"}` (403) y luego con `{"title":"audit-1794183487998-cb04fb-changed-by-nonmember-B"}`.
- Esperado: 403/404 en ambas actualizaciones y conservación del título original.
- Actual: el cambio de título devolvió **200**; un `GET` posterior hecho por A mostró el título alterado y estado `TODO`. La alteración persistió; A restauró el título original con 200.
- Impacto confirmado: modificación no autorizada de contenido de otro proyecto con sólo una cuenta válida y el ID del objeto. El 403 del estado no protege el resto de campos.
- Evidencia: `foreign-task-status`, `foreign-task-title`, `owner-verifies-foreign-title-update` y `restore-synthetic-title` en [http-results.json](results/http-results.json).
- Límite: la omisión del middleware también afecta estáticamente a `DELETE`, pero no se ejecutó eliminación ajena; no se presenta como explotación demostrada.
- Remediación: exigir membresía antes de todos los handlers de tarea y definir permisos de escritura/eliminación en servicio; agregar tests de lectura, edición y eliminación por no miembro.
- Clasificación: CWE-862/CWE-639, IDOR, OWASP A01:2021 Broken Access Control. **Severidad: alta; prioridad P1**, por modificación persistente entre proyectos demostrada.

## Hallazgos y observaciones adicionales

### SEC-03: encabezados defensivos ausentes y divulgación del framework

- Ubicación: `server/src/app.ts:9–24`; sólo se instalan `cors()` y `express.json()`, sin Helmet ni desactivación explícita de `X-Powered-By`.
- Confirmado en `/api/health` (200) y `/api/projects` autenticado (200): `X-Powered-By: Express`, `Access-Control-Allow-Origin: *`; no figuran `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options` ni `Referrer-Policy`. Evidencia: `headers-health`, `projects-as-A` en [http-results.json](results/http-results.json).
- Remediación: configurar encabezados según el recurso, ocultar `X-Powered-By`, revisar `X-Content-Type-Options`, protección de frames y Referrer-Policy. Evaluar CSP principalmente sobre el documento HTML del cliente.
- Límite: HSTS requiere HTTPS y su ausencia en HTTP local no demuestra una mala configuración del despliegue. CORS `*` con bearer tokens no demuestra por sí solo acceso anónimo ni robo de tokens.
- Severidad orientativa baja/informativa para identificación del framework; `X-Powered-By: Express` no revela su versión. Valorar cada encabezado según contexto.

### SEC-04: recuperación de contraseña expone credencial de recuperación (extra confirmado)

- Probado exclusivamente sobre cuenta sintética C (`user-7`), creada para recuperación y sin membresías; no se alteraron cuentas ajenas.
- `server/src/modules/auth/auth.service.ts:87–110`: el endpoint público `forgot-password` devuelve el token en la respuesta (:110), explicitado como atajo de la aplicación educativa.
- Esperado: respuesta genérica sin credencial de recuperación; entrega por canal fuera de banda.
- Actual: `POST /api/auth/forgot-password` **sin Authorization** devolvió 200 y un `token`. El mismo flujo sin autenticar permitió cambiar la contraseña de C y autenticarse con la nueva.
- Evidencia: `password-recovery-public-token-disclosure`, `password-reset-first-use` y `password-reset-reuse-login-verification` en [http-results.json](results/http-results.json), con tokens/contraseñas redactados.
- Impacto confirmado local: toma de una cuenta sintética conociendo únicamente su email, sin demostrar posesión del correo. **Impacto potencial crítico si este flujo educativo se expone con cuentas reales**; no afirmar compromiso de producción ni de usuarios reales. La diferencia 200/404 para emails existentes/inexistentes surge de revisión estática, no se probó en esta corrida.
- Remediación: respuesta uniforme y envío del token por canal fuera de banda; no incluir el token en el JSON HTTP ni en logs; límites de frecuencia.
- Clasificación: CWE-640, OWASP A07:2021 Identification and Authentication Failures. **Severidad alta en el laboratorio; prioridad P1**. Antes de cualquier despliegue con datos reales es imprescindible eliminar esta devolución de tokens de desarrollo.

### SEC-05: reset de contraseña permite reutilizar token (extra confirmado)

- Esperado: la segunda utilización del token devuelve 400/401 y no cambia la contraseña.
- Actual: sobre C, el primer reset devolvió 200; se reutilizó el mismo token con una segunda contraseña, devolvió **200**, y un login con esa segunda contraseña también devolvió **200**. Se confirma reutilización con efecto persistente.
- Evidencia: `password-reset-first-use`, `password-reset-same-token-reuse` y `password-reset-reuse-login-verification` en [http-results.json](results/http-results.json).
- `server/src/modules/auth/auth.service.ts:113–129`: sólo exige que exista el token (:117–118); no comprueba `record.expiresAt` ni `record.usedAt` y no lo marca usado después de cambiar la contraseña.
- Impacto demostrado: una credencial de recuperación ya utilizada permite volver a cambiar la contraseña. La omisión de `expiresAt` y `usedAt` surge de revisión estática; no se esperó el vencimiento ni se probó duración indefinida.
- Remediación: verificar expiración y ausencia de uso y consumir el token de forma atómica al cambiar la contraseña, invalidando el resto de tokens vigentes y evaluando revocación de sesiones.
- Clasificación: CWE-640. **Severidad alta, prioridad P1**, agravada por SEC-04. Presentar SEC-04/05 como un flujo de recuperación inseguro relacionado, no como tres vulnerabilidades por los tres checks fallidos.

### SEC-06: secreto JWT de desarrollo como fallback

- **Condicional, revisión estática**: `server/src/middleware/auth.ts:5` usa `taskflow-dev-secret` cuando falta `JWT_SECRET`. `jwt.verify` (:32) sí verifica la firma con jsonwebtoken 9.0.2.
- La prueba `jwt-alg-none` devolvió **401**: se rechazó el token sin firma. No inferir que el fallback fue usado sólo por leer el código; este hallazgo sigue siendo condicional a una configuración sin `JWT_SECRET`.
- Remediación: exigir secreto fuerte explícito en entornos desplegados, fallar al iniciar si falta, documentar rotación y algoritmo permitido.

## Controles y límites para registrar

- Lista de proyectos filtra por owner/membresía en `server/src/modules/projects/projects.controller.ts:52–70`.
- `requireProjectMember` protege lista/creación de tareas (`tasks.project-routes.ts:8`).
- `requireTaskProjectMember` protege detalle/historial/tags; no cubre todos los verbos.
- Asignación valida membresía en `tasks.service.ts:48–54` y :114–127.
- Login utiliza `db.user.findUnique({ where: { email } })` en `auth.service.ts:61`: el SQLi clásico en email no demuestra una vulnerabilidad de login.
- Login bloquea tras cinco intentos en :70–75. El contador no se reinicia tras login exitoso (:79–81 sólo limpia `lockedUntil`), pero es una observación estática adicional, no prueba de fuerza bruta exitosa.
- Una suite funcional verde no certifica seguridad: estos casos requieren pruebas de autorización e input adversario específicas.

## Reproducción de evidencia HTTP

Con servidor separado y DB descartable ya listos, desde la raíz del repo:

```powershell
node security/http-security-audit.cjs --isolated --with-reset --base http://127.0.0.1:3000/api --output security/results/http-results-nueva-ejecucion.json
```

Requiere Node 20+. Se niega a usar hosts remotos y no sobrescribe evidencia existente. El comando usa un nombre de salida nuevo para preservar [la corrida original](results/http-results.json). El resultado contiene estado HTTP, respuestas y encabezados saneados, expectativas previas y verificaciones de persistencia. No contiene JWTs ni contraseñas. Se crean dos usuarios, dos proyectos y dos tareas descartables; con `--with-reset` se agrega una tercera cuenta C para recuperación. No se eliminan recursos ni se toca la base de trabajo. En una reejecución los IDs serán nuevos: tomarlos de `fixtures` y no reutilizar ciegamente los IDs 5/6/14/15 de este informe.
