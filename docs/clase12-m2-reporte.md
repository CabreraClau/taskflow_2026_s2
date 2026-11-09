# Reporte de seguridad y accesibilidad de TaskFlow

Fecha: 8 de noviembre de 2026, America/Montevideo. Base analizada: `75254f7` de `CabreraClau/taskflow_2026_s2`. Herramientas: Node 22.19.0, npm 10.9.3, Playwright 1.65.0, axe-core 4.14.0 y Chromium.

Se confirmaron dos fallos principales de seguridad: lectura de tareas de otro proyecto por SQL injection y edición de títulos por un usuario sin membresía. También se confirmó un flujo de recuperación de contraseña inseguro sobre una tercera cuenta descartable. En accesibilidad se documentaron tres problemas y se corrigieron los campos sin nombre accesible. La verificación de esa corrección pasó de rojo a verde.

## Alcance y adaptación de la guía

La guía corresponde a otra organización de TaskFlow. Se conservaron los objetivos y pruebas, adaptando sus rutas a este fork:

| Guía | Este repositorio |
| --- | --- |
| `apps/api/`, PostgreSQL, `:3001` | `server/`, SQLite, `:3000/api` |
| `apps/web/` | `client/`, Vite en `:5173` |
| `/health`, `/auth/login`, `/projects` | `/api/health`, `/api/auth/login`, `/api/projects` |
| Alice y Bob del seed | Cuentas A y B descartables, sin membresía entre sus proyectos |
| Registro separado | Modo Registro dentro de `/login` |
| Detalle de proyecto | Tablero `/projects/:projectId` |

Se auditaron Login, Registro, Proyectos y Detalle de proyecto; se añadió Detalle de tarea para analizar sus formularios. La base `audit-m2.db` es nueva y exclusiva de estas pruebas. Las cuentas y los proyectos de la evidencia son sintéticos. No se probó ningún despliegue público ni datos reales.

El archivo `a11y.spec.ts` del aula no venía adjunto. Se creó un equivalente adaptado en [e2e/playwright/tests/a11y.spec.ts](../e2e/playwright/tests/a11y.spec.ts), con informe WCAG A/AA, configuración `VERIFICAR`, aserción de la regla corregida y comprobaciones complementarias. El informe por sí solo es informativo; la verificación de `label` sí falla cuando reaparece ese problema.

## Auditoría de dependencias

Este proyecto no usa npm workspaces: auditar sólo la raíz deja fuera los árboles de `server/` y `client/`. Se ejecutaron las dos variantes en los tres directorios:

```powershell
npm audit --json --package-lock-only
npm audit --json --package-lock-only --omit=dev
```

| Árbol | Auditoría completa | Sólo producción |
| --- | --- | --- |
| Raíz | 1 CRITICAL | 0 |
| Servidor | 7 LOW, 1 MODERATE, 7 HIGH | 1 MODERATE, 6 HIGH |
| Cliente | 1 MODERATE, 5 HIGH | 3 HIGH |

Los valores son paquetes señalados por npm, incluyendo dependientes; no son cantidades de CVE diferentes y no se suman entre alcances. El código de salida 1 de `npm audit` indica vulnerabilidades, no un fallo de la consulta. [JSON y análisis completo](../security/dependency-notes.md).

### Dos avisos seleccionados

| Aviso | ¿Llega a producción? | Aplicabilidad y arreglo |
| --- | --- | --- |
| `body-parser@1.20.3`, GHSA-27r3-jxmh-p828, HIGH | Sí, vía `express@4.21.2`; también figura con `--omit=dev` | El servidor usa `express.json()` con descompresión predeterminada. El aviso describe una posible caída con un cuerpo comprimido malformado. No se provocó una caída. npm propone Express 4.22.3, sin salto mayor; verificar que resuelva body-parser >=1.20.9. |
| `shell-quote@1.10.0`, GHSA-pqg4-j6r4-53mv, CRITICAL según npm | No, transitivo de `concurrently@9.1.0`, herramienta de desarrollo | Su explotación requiere entrada no confiable en `quote()` y ejecución del resultado en una shell. No se demostró ese flujo en TaskFlow. El parche >=1.11.0 cabe en el rango del padre. El mantenedor clasifica el aviso HIGH/CVSS 8.1; se distingue de la clasificación recibida de npm. |

Fuentes: [aviso de body-parser](https://github.com/expressjs/body-parser/security/advisories/GHSA-27r3-jxmh-p828), [aviso de shell-quote](https://github.com/ljharb/shell-quote/security/advisories/GHSA-pqg4-j6r4-53mv), [clasificación de GitHub](https://github.com/advisories/GHSA-pqg4-j6r4-53mv).

También se revisó el HIGH de React Router GHSA-2w69-qvjg-hvjx. Está en el árbol de producción, pero [el mantenedor excluye BrowserRouter](https://github.com/remix-run/react-router/security/advisories/GHSA-2w69-qvjg-hvjx), que usa este cliente. No se presenta ese aviso como XSS explotable en esta configuración. No se ejecutó `npm audit fix`; las actualizaciones de seguridad quedan propuestas.

## Headers de seguridad

Se ejecutó `curl.exe -I` sobre `/api/health` y sobre `/api/projects` con una sesión válida. Ambos respondieron 200. [Salida HEAD real](evidence/m2/headers-head.txt).

| Header | Valor observado en ambos endpoints | Interpretación |
| --- | --- | --- |
| `Content-Security-Policy` | Ausente | Evaluar especialmente en el documento HTML del frontend; su ausencia en JSON no prueba XSS. |
| `Strict-Transport-Security` | Ausente | HTTP local no permite comprobar una política HSTS del despliegue HTTPS. Verificación pendiente para producción. |
| `X-Frame-Options` | Ausente | Revisar protección de frames del documento frontend. |
| `X-Content-Type-Options` | Ausente | Proponer `nosniff` para evitar interpretación alternativa del contenido. |
| `X-Powered-By` | `Express` | Expone el framework, sin revelar versión. Desactivarlo. |
| `Access-Control-Allow-Origin` | `*` | Política de navegador permisiva. Revisar orígenes permitidos; no elimina por sí sola la autenticación bearer ni demuestra robo de tokens. |

## Pruebas de control de acceso e inputs

Las expectativas se registran antes de cada solicitud en `expectedBeforeExecution` de [http-results.json](../security/results/http-results.json). El script usa sólo loopback y restringe el payload SQL a los dos proyectos sintéticos.

| Prueba | Esperado | Obtenido |
| --- | --- | --- |
| Proyectos sin JWT | 401 | 401 |
| Listar proyectos como A/B | Sólo el proyecto propio | 200, sin el proyecto del otro |
| B lista tareas de A o lee su tarea | 403/404 | 403 en ambos |
| B cambia estado de tarea de A | 403/404 | 403 |
| B cambia título de tarea de A | 403/404, sin alteración | 200 y cambio persistente, SEC-02 |
| SQLi clásico en email de login | No autenticar | 401 |
| SQLi clásico en `search` | Tratar como dato o rechazar con 4xx | 500 genérico; no demuestra filtración por sí solo |
| SQLi adaptado al contexto `instr` | Ninguna tarea de B | 200 con tarea privada B, SEC-01 |
| JWT `alg: none`, sin firma | 401 | 401 |
| XSS `<img src=x onerror=alert(1)>`, creado por UI | Texto literal, sin `img` ni ejecución | Texto literal en tablero y detalle, 0 imágenes inyectadas y 0 diálogos |

La guía usa el texto `' OR '1'='1' --`; en la ejecución se usó su variante tautológica equivalente `' OR 1=1 --`. Para confirmar el impacto del buscador, además se adaptó un payload a su expresión SQL concreta. No se asumió que un 500 equivalía a una explotación exitosa.

`GET /api/projects/:id` devuelve `404 Endpoint not found`: la ruta no existe en este fork. Se registró como **no aplicable**, no como un control de autorización que haya resistido. La lectura protegida se comprobó mediante las rutas implementadas de tareas.

## Hallazgos de seguridad

### SEC-01 SQL injection permite leer tareas de otro proyecto

**Severidad:** HIGH. **Ubicación:** `server/src/modules/tasks/tasks.repository.ts`, `findTasks`, líneas 28–52, interpolación de `term` en `$queryRawUnsafe`.

**Descripción:** `search` se concatena dentro del SQL. Una entrada puede cerrar la expresión de búsqueda y alterar el filtro de proyecto, aunque el usuario tenga permiso sobre el proyecto de la URL.

**Pasos de reproducción:**

1. Registrar A y B. Crear un proyecto privado por cuenta, sin membresías cruzadas, y una tarea por proyecto. En esta corrida fueron `proj-5/task-14` y `proj-6/task-15`.
2. Con la sesión de A, buscar el título literal en `GET /api/projects/proj-5/tasks?search=...`: devuelve sólo `task-14`.
3. En la misma ruta y sesión enviar, codificado como query, `') > 0) AND 0 = 1 OR projectId IN (5, 6) --`.
4. Observar 200 y la tarea `task-15` del proyecto B, incluida su descripción. Los IDs cambian en cada ejecución; tomarlos de `fixtures` de la evidencia.

**Impacto:** lectura privada entre proyectos demostrada. Esta prueba no acredita modificación SQL ni extracción de otras tablas. El payload usado limitó el SELECT a los dos proyectos de prueba.

**Remediación propuesta:** usar consultas parametrizadas o filtros Prisma con `projectId` y `contains`, sin concatenar entrada. Agregar una regresión que compruebe que una búsqueda adversaria no amplía el alcance del proyecto.

**Evidencia:** `search-baseline-own-project` y `sqli-bounded-cross-project-read` en [HTTP JSON](../security/results/http-results.json). **Estado:** documentado, pendiente de corrección.

### SEC-02 Un no miembro puede editar el título de una tarea ajena

**Severidad:** HIGH. **Ubicación:** `server/src/modules/tasks/tasks.routes.ts:14` y `tasks.service.ts`, `updateTask`, líneas 87–178.

**Descripción:** la ruta PATCH no exige membresía. El servicio autoriza los cambios de estado, pero no exige autorización equivalente para título, descripción y otros campos editables.

**Pasos de reproducción:**

1. Usar las cuentas A/B anteriores. B no pertenece al proyecto de `task-14`.
2. Como B, enviar `PATCH /api/tasks/task-14` con `{"status":"IN_PROGRESS"}`: 403.
3. Como B, enviar el mismo PATCH con `{"title":"Título alterado por no miembro"}`: 200.
4. Leer la tarea como A: el título alterado persiste. En la prueba se restauró el título original.

**Impacto:** modificación no autorizada de datos ajenos con una cuenta válida y un identificador conocido. El rechazo de `status` no protege los demás campos. DELETE también omite el middleware en el código, pero no se ejecutó una eliminación ajena.

**Remediación propuesta:** comprobar membresía en la ruta y permisos de escritura en el servicio antes de modificar cualquier campo. Cubrir lectura, edición y eliminación con tests de usuarios ajenos.

**Evidencia:** `foreign-task-title`, `owner-verifies-foreign-title-update` y `restore-synthetic-title` en [HTTP JSON](../security/results/http-results.json). **Estado:** documentado, pendiente de corrección.

### Hallazgo adicional Recuperación de contraseña insegura

**Severidad:** HIGH en este laboratorio; impacto potencial CRITICAL si se expone el atajo educativo con cuentas reales. **Ubicación:** `server/src/modules/auth/auth.service.ts`, `forgotPassword` y `resetPassword`, líneas 89–129.

**Descripción y reproducción:** sobre una tercera cuenta C descartable, se solicitó recuperación sin Authorization. La API devolvió un token en el JSON, permitió cambiar la contraseña y aceptó otra vez el mismo token con una segunda contraseña. El login con esa segunda contraseña devolvió 200. Esto combina divulgación de la credencial de recuperación y falta de consumo de uso único.

**Impacto:** toma y nueva modificación de una cuenta sintética conociendo su email. No se comprometió ninguna cuenta real. El código no comprueba expiración, pero no se esperó el vencimiento para probarlo dinámicamente.

**Remediación:** respuesta genérica sin token público, entrega por un canal de correo verificado y consumo atómico de token vigente/no usado al modificar la contraseña. Detalles y evidencias adicionales: [notas de seguridad](../security/analysis-notes.md).

## Control de seguridad verificado

**Qué se probó:** una llamada a `GET /api/projects` con JWT fabricado con `alg: none`, payload de un usuario y firma vacía.

**Resultado esperado:** 401 sin datos privados.

**Resultado obtenido:** 401 con error de autenticación; no se devolvieron proyectos. [Comprobación `jwt-alg-none`](../security/results/http-results.json).

**Código que lo explica:** `server/src/middleware/auth.ts` usa `jwt.verify` y transforma una verificación inválida en 401. jsonwebtoken 9.0.2 no acepta este JWT sin firma en la configuración probada. Se definió un secreto exclusivo de la instancia local. Esto no acredita seguridad de todos los algoritmos, secretos o despliegues.

Otros controles que resistieron: listado/lectura ajenos, transición de estado ajena, asignación a no miembro (400), bloqueo de cuenta B tras cinco intentos fallidos y el XSS de título en la UI. El bloqueo se probó con una cuenta descartable; no se evaluaron su expiración ni resistencia a ataques distribuidos.

## Hallazgos de accesibilidad

### ACC-01 Campos de etiquetas y comentarios sin nombre accesible

- **SC WCAG 2.1:** 4.1.2 Name Role Value. **Nivel:** A. **Principio POUR:** Robusto.
- **Detección:** axe-core, regla `label`, impacto `critical` sobre dos controles. El impacto de axe no es el nivel de conformidad WCAG.
- **Vista:** Detalle de tarea. Selectores: `[data-testid="tag-add-input"]` y `[data-testid="comment-add-input"]`.
- **Descripción:** el input y el textarea no tenían label ni nombre ARIA. Los encabezados de sección y botones cercanos no les asignaban nombre programático.
- **Fix aplicado:** etiquetas visibles “Nueva etiqueta” y “Comentario” envolviendo cada control en `<label className="field">`, conservando sus `data-testid` y comportamiento.
- **Estado:** corregido y verificado. Ubicación: `client/src/pages/TaskDetailPage.tsx`, formularios de etiquetas y comentarios. [Referencia W3C](https://www.w3.org/WAI/WCAG21/Techniques/failures/F68).

### ACC-02 Borde de campos vacíos con contraste insuficiente

- **SC WCAG 2.1:** 1.4.11 Non text Contrast. **Nivel:** AA. **Principio POUR:** Perceptible.
- **Detección:** revisión manual del CSS y contraste calculado a partir de colores del DOM; axe no lo señaló.
- **Vista:** Login y controles equivalentes. Caso revisado: Email vacío, habilitado y sin foco.
- **Descripción:** `client/src/styles.css:35` define borde `#9aa0a6` sobre blanco. La relación es **2,64:1**, inferior a **3:1**. El borde es la señal que delimita el campo vacío. El hallazgo no se extiende a controles deshabilitados ni a todos los botones.
- **Fix propuesto:** oscurecer ese borde, por ejemplo a `#767676`, con contraste 4,54:1 sobre blanco, y revisar sus estados.
- **Estado:** pendiente. [Colores obtenidos](evidence/m2/manual-before.json), [criterio W3C](https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html).

### ACC-03 Propósito de datos personales sin metadatos

- **SC WCAG 2.1:** 1.3.5 Identify Input Purpose. **Nivel:** AA. **Principio POUR:** Perceptible.
- **Detección:** inspección manual del formulario/DOM, apoyada por extracción automatizada de atributos.
- **Vistas:** Login y Registro, `client/src/pages/LoginPage.tsx`, campos nombre, email y contraseña.
- **Descripción:** los cinco casos de campo/modo examinados no tienen `autocomplete`; tampoco existe otro mecanismo que indique su propósito personal. Tener label o que Chrome infiera un autocompletado no sustituye estos metadatos.
- **Fix propuesto:** `autoComplete="name"` para nombre; `username` para el email identificador del login; `email` para email de registro; `current-password` y `new-password` según modo. `type="email"` puede complementar, no sustituye el propósito.
- **Estado:** pendiente. Los `null` de [manual-before.json](evidence/m2/manual-before.json) significan atributo ausente. [Criterio W3C](https://www.w3.org/WAI/WCAG21/Understanding/identify-input-purpose.html).

### Revisión de teclado idioma y errores

Se llegó al enlace de proyecto con seis pulsaciones Tab y se abrió el tablero con Enter. Esa navegación fue automatizada con eventos de teclado; no se presenta como una prueba humana con lector de pantalla. La interpretación manual de CSS y semántica sustenta ACC-02/03. `<html lang="es">` y `role="alert"` ya estaban presentes. El error de credenciales se muestra en inglés; no se afirma haber probado su pronunciación con tecnologías de asistencia.

### Evidencia de la corrección

| Vista | Reglas WCAG violadas antes | Después |
| --- | ---: | ---: |
| Login | 0 | 0 |
| Registro | 0 | 0 |
| Proyectos | 0 | 0 |
| Detalle de proyecto | 0 | 0 |
| Detalle de tarea | 1 (`label`, dos elementos) | 0 |

Antes: **3 tests pasaron y 1 falló**, específicamente la aserción de `label`. Después: **4 tests pasaron**, incluidos informe, verificación con nombres accesibles, revisión complementaria y XSS. [Informe antes](evidence/m2/a11y-before.json), [verificación roja](evidence/m2/verification-before.json), [informe después](evidence/m2/a11y-after.json), [verificación verde](evidence/m2/verification-after.json), [salida de ejecución](evidence/m2/a11y-after-run.txt).

Capturas: [antes](evidence/m2/a11y-before-detail.png) y [después](evidence/m2/a11y-after-detail.png). Cero violaciones automáticas no equivale a conformidad WCAG total: ACC-02/03 siguen pendientes.

## User stories de remediación

### US de seguridad Recuperación de cuenta por canal verificado

**Como** titular de una cuenta, **quiero** que sólo quien demuestra acceso a mi correo pueda cambiar mi contraseña, **para** impedir que otra persona tome mi cuenta conociendo mi email. Se prioriza el flujo adicional de recuperación por su potencial de toma de cuentas antes de cualquier exposición con usuarios reales.

- **CA-01:** POST `/api/auth/forgot-password`, exista o no el email, devuelve el mismo 200/mensaje genérico y nunca incluye un token de recuperación en el cuerpo o logs. Un doble del servicio de correo verifica su entrega únicamente para el destinatario registrado.
- **CA-02:** un token vigente entregado por ese canal permite un único reset; repetirlo devuelve 400 y no cambia el hash de contraseña, comprobado por test de integración y login con la primera clave.
- **CA-03:** con reloj controlado, un token con `expiresAt <= now` devuelve 400 y conserva la contraseña. Dos resets concurrentes con el mismo token producen exactamente un éxito y un rechazo, comprobando consumo atómico.

### US de accesibilidad Formularios de tarea identificables

**Como** persona que usa lector de pantalla o control por voz, **quiero** que los campos de etiquetas y comentarios tengan nombres accesibles claros, **para** distinguir dónde ingresar cada contenido.

- **CA-01:** el input `tag-add-input` tiene nombre accesible “Nueva etiqueta” y un label visible asociado, verificado por Playwright.
- **CA-02:** el textarea `comment-add-input` tiene nombre accesible “Comentario” y un label visible asociado, verificado por Playwright.
- **CA-03:** axe no reporta la regla `label` en Detalle de tarea y los tests existentes de edición y límites de etiquetas conservan su resultado verde.

Esta US de accesibilidad quedó implementada. Las remediaciones de seguridad y los otros dos hallazgos de accesibilidad quedan como trabajo propuesto.

## Reproducción y validación

Preparar una DB exclusiva antes de levantar la app; las variables de esta sesión prevalecen sobre `.env`. El seed vacía la base seleccionada, por eso se usa una ruta nueva dentro de `.audit`, nunca la base de trabajo:

```powershell
npm ci --ignore-scripts
npm --prefix server ci
npm --prefix client ci
npx playwright install chromium
New-Item -ItemType Directory -Force .audit | Out-Null
$m2db = Join-Path $PWD '.audit/m2-reproduction.db'
if (Test-Path -LiteralPath $m2db) { throw 'Elegir una ruta nueva para la DB descartable' }
New-Item -ItemType File -Path $m2db | Out-Null
$env:DATABASE_URL = 'file:' + ($m2db -replace '\\', '/')
$env:JWT_SECRET = [guid]::NewGuid().ToString('N')
npm run db:setup
npm run dev
```

Desde otra terminal en la raíz, mientras esa instancia está activa:

```powershell
curl.exe -I http://localhost:3000/api/health
npm run test:security -- --isolated --with-reset --output .audit/http-new-run.json
npm run test:a11y
npm run build:client
npm test
```

`test:security` sólo usa hosts locales, genera cuentas propias y no sobrescribe evidencia existente. Los JWT/contraseñas no se guardan. `test:a11y` guarda evidencia de la nueva corrida; conservar la carpeta versionada antes de regenerarla si se necesita comparar con esta entrega.

### Estado de la suite existente

La preparación de Jest no llegaba a ejecutar casos en Windows. Se corrigió el helper de pruebas para precrear el archivo SQLite, normalizar la URI y ejecutar la CLI local de Prisma mediante Node, sin `npx` ni pérdida de diagnósticos. Ese ajuste no cambia las reglas de negocio.

La suite general terminó con **11 tests verdes y 3 rojos preexistentes**: nombre de proyecto corto (espera 400, obtiene 201), filtros status/priority simultáneos (espera una tarea, obtiene dos) y estado inicial TODO (obtiene DONE). Corresponden a los bugs ya documentados [BUG-06](bugs/BUG-06-proyecto-nombre-invalido.md), [BUG-07](bugs/BUG-07-filtros-no-combinables.md) y [BUG-08](bugs/BUG-08-tarea-estado-inicial.md). El código productivo del servidor y esos tests permanecen iguales a `75254f7`. [Ejecución Jest](evidence/m2/jest-run.txt).

El build del cliente pasó. También pasaron tres E2E existentes de edición y límites de etiquetas, conservando los selectores utilizados. [Build](evidence/m2/build-client.txt), [regresión E2E](evidence/m2/e2e-regression.txt). No se afirma que toda la suite histórica esté verde.

## Checklist de la actividad

- [x] App levantada en la API real de este fork, `:3000/api`, y frontend `:5173`.
- [x] Auditorías completas y producción en los tres árboles, con dos avisos HIGH/CRITICAL analizados.
- [x] Headers inspeccionados con `curl.exe -I`, registrando valores.
- [x] Control de acceso probado con dos cuentas sin membresía cruzada.
- [x] SQLi, XSS y JWT sin firma probados con expectativas previas.
- [x] Dos hallazgos principales con severidad, reproducción, impacto y remediación; un control verificado.
- [x] axe y Playwright instalados desde raíz; test en `e2e/playwright/tests/a11y.spec.ts`.
- [x] Cuatro vistas de la guía auditadas y detalle de tarea adicional.
- [x] Tres hallazgos WCAG 2.1 A/AA, incluyendo revisión manual.
- [x] Una corrección de accesibilidad aplicada y verificada en verde.
- [x] Dos user stories con tres criterios de aceptación testables cada una.
- [x] Reporte, scripts, resultados y corrección preparados para versionar en el repositorio.
