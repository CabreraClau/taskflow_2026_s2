# Resultado del práctico k6 — 2026-11-03

## Comparación solicitada

| Métrica | Seed chica: 1 VU, 30 s | Seed grande: 20 VUs, 1 min |
| --- | ---: | ---: |
| p95 (`http_req_duration`) | 102,5749 ms | 15.409,5012 ms |
| Error rate (`http_req_failed`) | 0 % (0/31 requests) | 0 % (0/82 requests) |
| Iteraciones por segundo | 0,933155 | 1,268773 |
| Iteraciones completadas | 29 | 80 |
| Checks aprobados | 30/30 | 81/81 |
| Umbral p95 < 500 ms | Pasa | Falla |
| Umbral errores < 1 % | Pasa | Pasa |
| Código de salida de k6 | 0 | 99 |

El perfil grande supera unas **30,82 veces** el límite de 500 ms. Aunque todas
las respuestas HTTP son exitosas, el objetivo de rendimiento no se cumple.
Los valores son los exportados por k6; no se sustituyeron por estimaciones.

## Entorno y datos

- Windows 10.0.26200, Intel Core i9-13900H, 20 procesadores lógicos, 31,71 GiB RAM.
- Node 20.17.0; k6 2.3.0; Prisma 6.19.3 y SQLite.
- Commit base: `0f9fc3896741c3d7289622447aaf483bfcd41136`.
- API y frontend mediante `npm run dev`, en la misma máquina que k6.
- API: `http://localhost:3000/api`; SQLite: `server/prisma/dev.db`.
- Seed chica: 3 usuarios, 3 proyectos, 12 tareas y 5 comentarios.
- Seed grande: agrega 200 proyectos, 5.000 tareas y 20.000 comentarios;
  totales 203 proyectos, 5.012 tareas y 20.005 comentarios.
- Las 5.000 tareas se concentran en `[Carga] Proyecto grande`, con asignado y
  cuatro comentarios cada una. Se verificó la segunda ejecución del generador:
  no aumentan los conteos y no quedan comentarios huérfanos.
- Proyecto chico medido: `proj-1` (6 tareas). Proyecto grande: `proj-204`
  (5.000 tareas; el ID cambia al repetir la seed).

## Hallazgos e hipótesis

1. **Latencia fuera de objetivo:** p95 de 15.409,50 ms con el perfil grande.
   Incumple Rendimiento, criterio 2, de la especificación: con 5.000 tareas y
   20.000 comentarios el p95 del listado no debe superar 500 ms.
2. **La paginación no se aplica:** el listado grande devuelve 5.000 elementos
   aunque declara `limit: 20`, `offset: 0` y `total: 5000`. El cuerpo mide
   1.873.537 bytes. Incumple Rendimiento, criterio 1, y US-07, criterio 7.
   El listado de proyectos también devuelve la colección completa (201 visibles).
3. **Consultas por cada tarea:** la lectura de `tasks.controller.ts`, función
   `listByProject`, muestra una consulta del asignado y un conteo de comentarios
   dentro de un bucle con `await`. `tasks.repository.ts` trae todas las tareas
   sin `take` ni `skip`. Esto contradice Rendimiento, criterio 3.

Hipótesis: el trabajo crece con el número de tareas del proyecto porque la API
recupera, enriquece y serializa toda la colección. Con todos los asignados
presentes, el código implica 10.000 operaciones adicionales de consulta por
listado de 5.000 tareas, además de las consultas iniciales. Esa cifra es una
inferencia del código, no un conteo SQL instrumentado. Bajo concurrencia,
la cola de consultas y las respuestas grandes probablemente agravan la latencia.
Para confirmar cuánto aporta cada factor haría falta perfilar consultas, CPU y
memoria. No se implementó la corrección opcional del material.

## Evidencia

- [Resumen chico](results/small-summary.json) y [salida chica](results/small-run.txt).
- [Resumen grande](results/large-summary.json), [salida grande](results/large-run.txt)
  y [comando, versión y código de salida](results/large-execution.json).
- [Datos chicos](results/small-data.json) y [datos grandes](results/large-data.json).
- [Entorno](results/environment.json).
- [Issue listo](ISSUE-performance.md) y [estado de GitHub](results/github-status.json).

El formato legacy de `--summary-export` representa un umbral cruzado con `true`
y uno no cruzado con `false`; interpretar esos booleanos junto con el log y el
código de salida. Se quitaron los tokens de `setup_data` antes de conservar los
archivos JSON.

## Límites de interpretación e incidencias

- El ejercicio cambia **volumen y concurrencia a la vez**. La comparación no
  permite atribuir todo el aumento únicamente al volumen de datos.
- `http_req_duration` incluye las dos requests de setup (login y proyectos),
  conforme al escenario original. No es un percentil aislado exclusivamente
  del endpoint de tareas. Los checks `status 200` sí corresponden al listado.
- El smoke tiene 29 iteraciones: es una muestra pequeña. No se hicieron pruebas
  de larga duración ni pruebas en infraestructura de producción.
- La duración configurada es 60 s; k6 deja finalizar iteraciones en curso durante
  su período de cierre. La ejecución final duró aproximadamente 63 s.
- La primera carga grande obtuvo p95 15.491,96 ms, pero el wrapper falló al
  imprimir caracteres Unicode. Se conserva en `large-first-attempt-*` solo
  como evidencia auxiliar. La tabla usa la repetición completa posterior a la
  corrección; en esta repetición no hubo inspecciones HTTP simultáneas.
- La inspección auxiliar mediante `urllib` sufrió resets al leer el cuerpo
  grande; se reemplazó por el cliente `fetch` de Node y se completó antes de la
  medición final. No se contabiliza esa inspección como tráfico de k6.
- La base previa fue respaldada localmente en `results/dev-before-k6.db`.

## Estado de publicación

Issues fue habilitado y el hallazgo se publicó el 2026-11-03:
[Issue #5 — Listado de 5.000 tareas alcanza p95 de 15,41 s con 20 usuarios y omite paginación](https://github.com/CabreraClau/taskflow_2026_s2/issues/5).

El comprobante está en `results/github-issue.json` y la verificación de acceso
en `results/github-status.json`.
