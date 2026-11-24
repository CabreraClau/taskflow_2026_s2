# Seguridad: complemento del feedback de clase 11

Entrega del 23/11/2026 sobre `e2c578e`: [informe y cruce de hallazgos](../docs/clase12-m2-reporte.md), [HTML original de ZAP](../docs/zap-baseline-2026-11-23.html) y [evidencia nueva](../docs/evidence/m13/). Completa los dos pendientes de `Equipo_4_feedback.md`: CVSS de SEC-01/02 y baseline ZAP. Las remediaciones funcionales siguen propuestas.

## Verificar CVSS 3.1 con FIRST

Desde la raíz del repo, en PowerShell, descargar el motor oficial y ejecutar los dos vectores. El script verifica los resultados **4,3 / MEDIA** y **5,4 / MEDIA**; guarda fecha, versión de Node y SHA-256 del motor. No sobrescribe una salida existente.

```powershell
New-Item -ItemType Directory -Force .audit | Out-Null
Invoke-WebRequest 'https://www.first.org/cvss/calculator/cvsscalc31.js' -OutFile .audit/cvsscalc31.js
node security/verify-cvss.cjs .audit/cvsscalc31.js .audit/cvss-new-run.json
```

Los enlaces de las fichas SEC-01/02 abren la calculadora FIRST con cada vector. La [justificación](../docs/clase12-m2-reporte.md#justificación-de-cvss-31-para-sec-01-y-sec-02) separa impacto acreditado, severidad CVSS y prioridad contextual P1.

## Repetir el baseline ZAP en Windows

Requisitos: dependencias del repo instaladas (`npm ci --ignore-scripts`, `npm --prefix server ci`, `npm --prefix client ci`), ZAP 2.17.0 con los addons Automation Framework, Passive Scanner, Passive Scan Rules, Spider y Report Generation, y Java 21. En esta máquina ZAP/Java estaban disponibles como herramientas portables; no se requirió Docker. Versiones de la corrida: [environment.json](../docs/evidence/m13/environment.json).

Se usan puertos exclusivos **3101 / 5175** y una DB nueva, sin `db:reset` ni seed. Ejecutar desde la raíz en tres terminales; los servidores deben permanecer activos durante el escaneo. Si un puerto está ocupado, detener la preparación y elegir otro par, ajustando el plan.

Primera terminal: migrar una DB exclusiva y levantar la API enlazada sólo a loopback.

```powershell
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force .audit | Out-Null
$m13db = Join-Path $PWD ('.audit/m13-' + [guid]::NewGuid().ToString('N') + '.db')
New-Item -ItemType File -Path $m13db | Out-Null
$env:DATABASE_URL = 'file:' + ($m13db -replace '\\', '/')
$env:JWT_SECRET = [guid]::NewGuid().ToString('N')
$env:TZ = 'America/Montevideo'
node server/node_modules/prisma/build/index.js migrate deploy --schema server/prisma/schema.prisma
if ($LASTEXITCODE -ne 0) { throw 'Falló la migración; no levantar la API' }
Set-Location server
node -r ts-node/register/transpile-only -e 'require("./src/app").createApp().listen(3101,"127.0.0.1",()=>console.log("Audit API: 3101"))'
```

Segunda terminal: compilar y servir el frontend. Se usa preview del build para evitar que el reporte incluya el cliente de desarrollo de Vite.

```powershell
Set-Location client
node node_modules/typescript/bin/tsc
if ($LASTEXITCODE -ne 0) { throw 'Falló TypeScript' }
node node_modules/vite/bin/vite.js build
if ($LASTEXITCODE -ne 0) { throw 'Falló el build' }
$env:TASKFLOW_API_URL = 'http://127.0.0.1:3101'
node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 5175 --strictPort
```

Tercera terminal: adaptar las dos rutas de herramientas a la instalación local. Esta copia del plan envía las nuevas salidas a `.audit/` y conserva intactos los reportes de la entrega. El plan original ejecutado está en [zap-baseline.yaml](zap-baseline.yaml).

```powershell
$ErrorActionPreference = 'Stop'
$m13zap = 'C:\ruta\ZAP_2.17.0'
$m13java = 'C:\ruta\jdk-21\bin\java.exe'
$m13run = New-Item -ItemType Directory -Path ('.audit/zap-' + [guid]::NewGuid().ToString('N'))
$m13out = $m13run.FullName -replace '\\', '/'
$m13plan = Get-Content security/zap-baseline.yaml -Raw
$m13plan = $m13plan -replace '(?m)^      reportDir:.*$', ("      reportDir: '" + $m13out + "'")
$m13plan = $m13plan -replace 'zap-baseline-2026-11-23', 'zap-baseline'
$m13commit = git rev-parse --short HEAD
$m13plan = $m13plan -replace 'Base e2c578e', ("Base " + $m13commit)
$m13planPath = Join-Path $m13run.FullName 'plan.yaml'
$m13plan | Set-Content -Encoding utf8 $m13planPath
& $m13java '-Xmx512m' '-jar' "$m13zap\zap-2.17.0.jar" `
  '-installdir' $m13zap '-cmd' '-silent' '-notel' `
  '-dir' (Join-Path $m13run.FullName 'home') '-autorun' $m13planPath `
  2>&1 | Tee-Object -FilePath (Join-Path $m13run.FullName 'console.txt')
$m13exit = $LASTEXITCODE
$m13exit | Set-Content (Join-Path $m13run.FullName 'exit-code.txt')
```

El job `exitStatus` configura **1 ante High**, **2 ante Low/Medium**, **0 sin alertas de esos niveles**. ZAP también devuelve 1 por errores de ejecución: comprobar consola y generación de ambos reportes. La entrega devolvió 2 por alertas; no se ocultaron con `-I` ni filtros. El plan sólo ejecuta requestor GET, spider tradicional y análisis pasivo; no usa `activeScan`, formularios ni JWT. [Automation Framework oficial](https://www.zaproxy.org/docs/desktop/addons/automation-framework/).

Mientras la API descartable esté activa, se pueden repetir las pruebas manuales automatizadas, guardando una salida nueva. Este script sí crea cuentas y prueba los fallos de acceso/recuperación, por separado del baseline:

```powershell
node security/http-security-audit.cjs --isolated --base http://127.0.0.1:3101/api --with-reset --output .audit/http-m13-new-run.json
```

Al terminar, cerrar API y preview con Ctrl+C. Las DB y el home de ZAP permanecen sólo en `.audit/`, ignorado por Git.

## Verificar accesibilidad

`npm run test:a11y` usa las fixtures existentes, una SQLite temporal y sus propios puertos **3100 / 5174**. Instalar Chromium con `npx playwright install chromium` si falta. Las salidas actuales se escriben en `.audit/playwright/`; no reemplazan la evidencia histórica del fix `label`.

En esta máquina `ComSpec` apuntaba a una carpeta inexistente. Para la verificación se fijó una shell válida sólo en el proceso PowerShell:

```powershell
$env:ComSpec = "$env:SystemRoot\System32\cmd.exe"
$env:npm_config_script_shell = $env:ComSpec
npm run test:a11y
```
