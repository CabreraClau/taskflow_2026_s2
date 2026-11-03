# Práctico de performance con k6

Implementa «Instrucciones practico K6.docx». El escenario parte del `K6.txt`
entregado; se agregaron mensajes y validaciones de setup para evitar medir una URL
inválida si el login o la selección del proyecto fallan. Los perfiles, la pausa de
1 segundo y los umbrales son los del material.

El archivo original `seed-large.ts` no estaba entre los materiales disponibles:
se implementó un generador equivalente a los volúmenes indicados. Crea 200
proyectos de carga, concentra las 5.000 tareas en `[Carga] Proyecto grande` y
crea cuatro comentarios por tarea (20.000). Las tareas tienen asignados y se
distribuyen entre estados y prioridades. Conserva la seed chica: los totales de
la base son 203 proyectos, 5.012 tareas y 20.005 comentarios. Una segunda
ejecución reemplaza únicamente los proyectos `[Carga] ` de Ana y sus datos,
incluidos comentarios e historial sin FK; todo ocurre en una transacción.

## Reproducir desde la raíz del repositorio

Requisitos: dependencias npm instaladas, `server/.env` configurado, Node y k6.
En Windows: `winget install k6 --source winget` y luego `k6 version`.
Si la terminal no reconoce k6, volver a abrirla o usar
`& 'C:\Program Files\k6\k6.exe'` en PowerShell.

```bash
# Borra la base de desarrollo y carga la seed chica.
npm run db:reset
npm run dev
```

En otra terminal, sin reiniciar la API entre los dos perfiles:

```bash
k6 run -e VUS=1 -e DURATION=30s performance/scenarios/api-load.k6.js
npm --prefix server run db:seed:large
k6 run -e VUS=20 -e DURATION=1m performance/scenarios/api-load.k6.js
```

Para conservar logs, JSON y códigos de salida, usar estos comandos en lugar de
los `k6 run` anteriores (requieren Python 3.9+):

```bash
python performance/run-k6.py small
npm --prefix server run db:seed:large
python performance/run-k6.py large
```

El runner elimina el token JWT del `setup_data` que exporta k6. Un código de
salida distinto de cero al exceder los umbrales es un hallazgo del práctico,
no una razón para aumentar los límites. Los resultados se guardan en `results/`.

Para inspeccionar conteos y tamaño de respuesta, ejecutar fuera de las ventanas
de medición:

```bash
python -X utf8 performance/inspect-data.py
```

Variables del escenario: `BASE_URL` (incluye `/api`, por defecto
`http://localhost:3000/api`), `PROJECT_ID`, `VUS` y `DURATION`. El setup inicia
sesión una sola vez como `ana@test.com` / `Password1` y elige el proyecto grande
si existe; de lo contrario usa el primero de la seed chica.

## Entregables

- `REPORT.md`: tabla comparativa, interpretación y limitaciones.
- `ISSUE-performance.md`: issue con criterio, entorno, pasos, evidencia e hipótesis.
- `results/`: evidencia de las ejecuciones y del volumen de datos.
- `../server/prisma/seed-large.ts`: generador idempotente.

La copia previa de la base queda localmente en `results/dev-before-k6.db`,
excluida de Git por la regla `*.db`. El práctico deja la base con datos grandes.
Para volver a la seed chica, ejecutar `npm run db:reset`.

Para publicar el issue con la credencial existente de Git Credential Manager:

```bash
python performance/publish-issue.py --check
python performance/publish-issue.py --publish
```

El repositorio debe tener habilitado Issues. El script guarda el enlace y evita
publicaciones duplicadas cuando ya existe `results/github-issue.json`.

Referencias oficiales consultadas:
[instalación de k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) y
[resultados](https://grafana.com/docs/k6/latest/get-started/results-output/).
