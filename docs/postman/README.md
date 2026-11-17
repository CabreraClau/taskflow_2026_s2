# Colección de Postman · Clase 5

Exploración manual de la API que precede a los tests automatizados de
`server/tests/` (flujo de la clase: primero Postman, después Supertest).

| Archivo | Contenido |
|---|---|
| `TaskFlow-clase5.postman_collection.json` | Colección v2.1 con *scripts* de test (`pm.test`) |
| `TaskFlow-local.postman_environment.json` | Entorno con `baseUrl = http://localhost:3000/api` |

## Cómo correrla

1. Levantar la API: `npm run dev:server` (desde la raíz).
2. En Postman: *Import* de los dos archivos, elegir el entorno **TaskFlow local**
   y ejecutar la colección completa con el *Collection Runner*, en orden.
   La carpeta `0 · Setup` registra dos usuarios nuevos (emails con marca de
   tiempo, así se puede repetir sin limpiar la base), crea un proyecto y agrega
   al segundo usuario como miembro.
3. Por consola, sin abrir Postman:

   ```sh
   npx newman run docs/postman/TaskFlow-clase5.postman_collection.json \
     -e docs/postman/TaskFlow-local.postman_environment.json \
     -r cli,json --reporter-json-export docs/evidence/clase5/newman-run.json
   ```

## Qué cubre

| Carpeta | Casos | Resultado esperado hoy |
|---|---|---|
| 0 · Setup | registro (201, token, sin `passwordHash`), proyecto (201, `proj-N`), miembro (201), listado sin token (401) | verde |
| H-01 · Nombre de proyecto inválido | `"a"`, `"ab"`, `""`, `"   "` → 400; `"abc"` → 201 | 4 rojos (BUG-06) |
| H-02 · Filtros combinados | tabla de decisión de la clase 5, fila "A y B presentes" | 2 rojos (BUG-07) |
| H-03 · Estado inicial | `status: "DONE"` al crear → debe quedar `TODO` | 1 rojo (BUG-08) |

Cada caso rojo tiene su test equivalente en Supertest, marcado con el id del
bug en el nombre (`npx jest -t "BUG-06"`).
