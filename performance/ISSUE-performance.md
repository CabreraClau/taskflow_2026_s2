# [Performance] Listado de 5.000 tareas alcanza p95 de 15,41 s con 20 usuarios y omite paginación

## Criterio violado

Fuente: `taskflow_especificacion_requerimientos.docx`, sección
**Requerimientos no funcionales → Rendimiento**:

1. «Todo endpoint de listado devuelve resultados paginados; ningún endpoint
   devuelve una colección completa sin límite».
2. «Con un volumen de 5.000 tareas y 20.000 comentarios, el tiempo de respuesta
   del listado de tareas (percentil 95) no supera los 500 ms».
3. «El número de consultas a la base de datos por request no depende de la
   cantidad de resultados devueltos».

También US-07, criterio 7: listado paginado, 20 tareas por defecto, `limit` y
`offset` configurables y máximo de 100 tareas por página.

## Entorno

- Fecha: 2026-11-03. Windows 10.0.26200; Intel Core i9-13900H; 20 procesadores
  lógicos; RAM 31,71 GiB.
- Node 20.17.0; k6 2.3.0; Prisma 6.19.3; SQLite.
- Commit base `0f9fc3896741c3d7289622447aaf483bfcd41136`.
- API y frontend ejecutados con `npm run dev`; k6 en el mismo equipo.
- API `http://localhost:3000/api`; base `server/prisma/dev.db`.
- Usuario de prueba `ana@test.com`, miembro y owner del proyecto medido.

## Pasos para reproducir

1. Instalar dependencias, configurar `server/.env` e instalar k6.
2. Desde la raíz ejecutar `npm run db:reset` (borra los datos de desarrollo).
3. Levantar `npm run dev` y dejarlo corriendo.
4. En otra terminal ejecutar:

   ```bash
   k6 run -e VUS=1 -e DURATION=30s performance/scenarios/api-load.k6.js
   ```

5. Ejecutar `npm --prefix server run db:seed:large`. Confirmar 200 proyectos de
   carga, 5.000 tareas y 20.000 comentarios. No reiniciar ni resetear la API.
6. Ejecutar:

   ```bash
   k6 run -e VUS=20 -e DURATION=1m performance/scenarios/api-load.k6.js
   ```

7. Fuera de la ventana de carga, ejecutar `python performance/inspect-data.py`
   para comprobar el número de elementos y el tamaño de la respuesta.

El setup del escenario inicia sesión una vez y selecciona automáticamente
`[Carga] Proyecto grande`. Repite GET `/api/projects/:id/tasks` con pausa de 1 s.

## Esperado vs obtenido

| Aspecto | Esperado | Obtenido |
| --- | --- | --- |
| p95 con volumen grande | ≤ 500 ms; escenario usa `<500` | 15.409,50 ms |
| Tasa de fallos HTTP | < 1 % según el kit k6 | 0 %: cumple |
| Paginación por defecto | Hasta 20 tareas | 5.000 tareas con `limit: 20` |
| Consultas por request | Independientes de la cantidad devuelta | Bucle con consultas por cada tarea |

Comparación completa:

| Métrica | Seed chica, 1 VU / 30 s | Seed grande, 20 VUs / 1 min |
| --- | ---: | ---: |
| p95 `http_req_duration` | 102,5749 ms | 15.409,5012 ms |
| `http_req_failed` | 0 % | 0 % |
| Iteraciones/s | 0,933155 | 1,268773 |
| Iteraciones | 29 | 80 |
| Checks aprobados | 30/30 | 81/81 |
| Código de salida | 0 | 99 |

## Evidencia

Salida de k6 de la ejecución final:

```text
http_req_duration: p(95)=15.4s
  'p(95)<500': FAILED
http_req_failed: 0.00% (0 out of 82)
iterations: 80 (1.268773/s)
thresholds on metrics 'http_req_duration' have been crossed
exit_code: 99
```

Inspección del proyecto grande `proj-204`:

```json
{
  "tasks_returned": 5000,
  "total": 5000,
  "limit": 20,
  "offset": 0,
  "response_bytes": 1873537
}
```

Los conteos reales son 200 proyectos de carga, 5.000 tareas de carga y 20.000
comentarios de carga, sin comentarios huérfanos. Se conserva además la seed
chica: 203 proyectos, 5.012 tareas y 20.005 comentarios en total.

Archivos preparados en el repositorio local:
`performance/results/small-summary.json`, `large-summary.json`, `small-run.txt`,
`large-run.txt`, `large-execution.json`, `small-data.json`, `large-data.json`
y `environment.json`. Este issue incluye las cifras clave para poder revisarlo
sin depender de que esos archivos ya estén publicados en GitHub.

## Hipótesis

`server/src/modules/tasks/tasks.repository.ts`, función `findTasks`, consulta
todas las tareas sin `take`/`skip`. `tasks.controller.ts`, `listByProject`, lee
`limit`/`offset`, pero no los aplica y recorre todas las filas. Por cada tarea
consulta el usuario asignado y cuenta comentarios, con `await` secuencial.

Esto implica trabajo proporcional al total de tareas y respuestas grandes.
Para las 5.000 tareas asignadas de la seed, se infieren 10.000 consultas
adicionales dentro del bucle por listado; no es un conteo SQL instrumentado.
La concurrencia probablemente amplifica las esperas. Se propone confirmar con
perfilado de consultas y recursos antes de atribuir porcentajes a cada causa.

La prueba cambia datos y VUs simultáneamente; no aísla ambos factores.
El percentil global incluye login y listado de proyectos del setup, siguiendo
el script del kit. Los 80 checks del listado fueron exitosos: el defecto
observado es de latencia y paginación, aunque las respuestas tengan HTTP 200.
