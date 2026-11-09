# Auditoría de dependencias npm

Fecha: **8 de noviembre de 2026**, America/Montevideo. Herramientas: Node.js `v22.19.0`, npm `10.9.3`. Fuente: endpoint oficial de auditoría de npm, consultado sobre los archivos `package-lock.json` del repositorio. Las seis consultas produjeron JSON válidos: cinco finalizaron con código `1` por vulnerabilidades y la raíz con `--omit=dev` finalizó con código `0`.

## Método y resultados

En la raíz, `server/` y `client/` se ejecutó:

```powershell
npm.cmd audit --json --package-lock-only
npm.cmd audit --json --package-lock-only --omit=dev
```

`--package-lock-only` permite inspeccionar el árbol fijado sin instalar paquetes ni ejecutar sus scripts. `--omit=dev` distingue el árbol de producción según npm; no demuestra por sí solo que una vulnerabilidad pueda explotarse en esta aplicación. Los resultados no contienen credenciales ni rutas personales: `nodes` identifica ubicaciones relativas del árbol npm.

| Proyecto / alcance | Info | Low | Moderate | High | Critical | Total | Evidencia |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Raíz, completo | 0 | 0 | 0 | 0 | 1 | 1 | [audit-root.json](results/audit-root.json) |
| Raíz, producción | 0 | 0 | 0 | 0 | 0 | 0 | [audit-root-production.json](results/audit-root-production.json) |
| Servidor, completo | 0 | 7 | 1 | 7 | 0 | 15 | [audit-server.json](results/audit-server.json) |
| Servidor, producción | 0 | 0 | 1 | 6 | 0 | 7 | [audit-server-production.json](results/audit-server-production.json) |
| Cliente, completo | 0 | 0 | 1 | 5 | 0 | 6 | [audit-client.json](results/audit-client.json) |
| Cliente, producción | 0 | 0 | 0 | 3 | 0 | 3 | [audit-client-production.json](results/audit-client-production.json) |

Los totales corresponden a paquetes señalados por npm, incluyendo efectos propagados a sus dependientes; no equivalen a una cantidad de CVE distintos. No se suman entre proyectos ni entre alcances. Los resultados representan esta fecha: un advisory nuevo puede cambiar el total sin modificar el código.

La auditoría de raíz se tomó después de instalar la infraestructura final de pruebas: `@axe-core/playwright@4.14.0`, `@playwright/test@1.65.0` y `concurrently@9.1.0`, todas dependencias de desarrollo.

## Aviso 1: denegación de servicio en body-parser

- **Identificador y severidad:** `GHSA-27r3-jxmh-p828` / `CVE-2026-111181`, **HIGH**, CVSS 7.5.
- **Cadena real:** `taskflow-server` → `express@4.21.2` → `body-parser@1.20.3`, verificada en `server/package-lock.json`. Está presente también en la auditoría `--omit=dev`.
- **Problema:** una solicitud comprimida con bytes sobrantes puede provocar una excepción sin capturar y finalizar el proceso. No requiere autenticación. La rama 1.x queda corregida desde `1.20.9`. [Aviso del mantenedor](https://github.com/expressjs/body-parser/security/advisories/GHSA-27r3-jxmh-p828).
- **Aplicabilidad:** `server/src/app.ts:13` instala `express.json()` globalmente y conserva sus opciones predeterminadas. Por ello el código usa el parser y la descompresión afectados. Se confirmó la condición por inspección; no se ejecutó un ataque de caída.
- **Arreglo propuesto:** actualizar la dependencia directa Express y verificar que el lock resuelva `body-parser >=1.20.9`. El JSON recomienda `express@4.22.3` con `isSemVerMajor: false`; no implica salto de versión mayor. Como mitigación, el mantenedor permite `inflate: false` si la API no necesita cuerpos comprimidos. Deben validarse compatibilidad y tests después de aplicar el cambio.

## Aviso 2: XSS por redirecciones en React Router

- **Identificador y severidad:** `GHSA-2w69-qvjg-hvjx` / `CVE-2026-22029`, **HIGH**, CVSS 8.0.
- **Cadena real:** `taskflow-client` → `react-router-dom@6.28.0` → `@remix-run/router@1.21.0` (también vía `react-router@6.28.0`), verificada en `client/package-lock.json`. Sigue reportada con `--omit=dev`.
- **Problema y condiciones:** redirecciones de loaders/actions que incorporan destinos no confiables pueden ejecutar JavaScript en el navegador. Afecta a `@remix-run/router <=1.23.1`; el parche comienza en `1.23.2`. El mantenedor excluye expresamente el modo declarativo con `BrowserRouter`. [Aviso del mantenedor](https://github.com/remix-run/react-router/security/advisories/GHSA-2w69-qvjg-hvjx).
- **Aplicabilidad:** `client/src/main.tsx:10` utiliza `BrowserRouter`. La versión vulnerable forma parte del árbol de producción, pero **este CVE no afecta al modo de uso actual**, según el alcance publicado. No se presenta como un XSS explotable ni se confunde con la prueba de XSS almacenado de comentarios.
- **Arreglo propuesto:** actualizar la dependencia directa `react-router-dom` y regenerar el lock. npm propone `6.30.6` con `isSemVerMajor: false`, manteniendo la versión mayor 6. Comprobar navegación, login y nuevas auditorías. Esto corrige el aviso seleccionado; no se afirma que elimine todos los avisos actuales.

## Aviso adicional de raíz: inyección de comandos en shell-quote

- **Identificador y severidad:** `GHSA-pqg4-j6r4-53mv` / `CVE-2026-102422`. npm y su base de avisos lo clasifican **CRITICAL**; el aviso del mantenedor muestra HIGH con CVSS v3.1 de 8.1. Se conservó en la tabla la clasificación recibida de npm.
- **Cadena real:** `taskflow` → `concurrently@9.1.0` → `shell-quote@1.10.0`, confirmada en el lock y mediante `npm.cmd ls shell-quote --all --package-lock-only`.
- **Problema:** `quote()` puede producir una orden insegura si recibe un token de comentario seguido de texto no confiable con un terminador de línea y el resultado se ejecuta en una shell. [Aviso del mantenedor](https://github.com/ljharb/shell-quote/security/advisories/GHSA-pqg4-j6r4-53mv), [clasificación de GitHub Advisory Database](https://github.com/advisories/GHSA-pqg4-j6r4-53mv).
- **Aplicabilidad:** aparece únicamente en desarrollo; `audit-root-production.json` informa cero vulnerabilidades. No se demostró un flujo de entrada atacante hasta `quote()` ni se presenta como ejecución remota desde la API.
- **Arreglo propuesto:** actualizar el transitivo a `shell-quote >=1.11.0`, que entra en el rango `^1.8.1` declarado por Concurrently. npm informa `fixAvailable: true`; no requiere cambiar la versión mayor del padre. El parche rechaza ciertas entradas con `TypeError`, comportamiento que conviene comprobar en los scripts de desarrollo.

## Alcance de esta entrega

Se documentaron dos avisos HIGH reales y, además, el CRITICAL hallado en la raíz. La auditoría no ejecutó `npm audit fix` ni modificó manifiestos o locks para corregir estos avisos. Las recomendaciones quedan pendientes de implementación y de verificación posterior; no representan vulnerabilidades ya corregidas.
