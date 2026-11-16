# Verificación de contratos funcionales Pact

Fecha: 16 de noviembre de 2026, America/Montevideo.

Comando ejecutado: `npm --prefix server run test:pact`.

| Comprobación | Resultado |
| --- | --- |
| Consumers contra el mock HTTP usando el cliente real | 3 tests aprobados, 3 suites aprobadas |
| Provider contra la API real y SQLite temporal | 1 test aprobado; las 3 interacciones compatibles |
| Código de salida del comando completo | 0 |
| Interacciones en `server/pacts/TaskFlowWeb-TaskFlowAPI.json` | 3: login, proyectos y comentarios |
| Interacción original de proyectos | Conservada sin cambios frente al contrato anterior |
| Compilación TypeScript de consumers y provider | Aprobada, sin emitir archivos |

El login verificó credenciales correctas y respuesta HTTP 200 con identidad y
token. El listado de comentarios verificó HTTP 200, estructura e identificación
de comentarios con una membresía MEMBER válida, sin privilegios de dueño.

## Experimento puntual de incompatibilidad

Se derivó una copia temporal del contrato de login y se renombró únicamente el
campo esperado `token` a `sessionToken`, incluyendo su matcher. El mismo provider
se verificó contra esa copia, sin modificar el servidor ni el contrato entregable.

Resultado esperado y obtenido: código de salida 1 y diagnóstico exacto
`Actual map is missing the following keys: sessionToken`.

La comprobación exigió ambos resultados; un error de infraestructura o cualquier
otro rechazo no habría contado como detección correcta. La copia y el wrapper
del experimento se eliminaron. La suite normal conserva únicamente las pruebas
positivas y el contrato publicado continúa teniendo tres interacciones.

Este resumen reemplaza el log bruto de ejecución y no contiene JWT reales,
respuestas de autenticación ni rutas personales de la máquina.
