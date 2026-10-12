BUG-06 - Se crean proyectos con un nombre inválido (hallazgo preexistente H-01)

- Descripción del problema: `POST /api/projects` acepta nombres nulos, vacíos,
  compuestos sólo por espacios, de menos de tres caracteres o de tipo numérico;
  en varios de esos casos crea un proyecto con nombre vacío. `create`
  (`server/src/modules/projects/projects.controller.ts:27`) sólo valida
  `name.length > 100`, nunca el mínimo de 3 ni que el nombre sea no vacío.
  (Hallazgo preexistente reportado como H-01 en el laboratorio de hallazgos.)

- Pasos exactos para reproducirlo:
  1. Registrar un usuario y obtener su JWT.
  2. Enviar `POST /api/projects` con `Authorization: Bearer <jwt>` y cuerpo
     `{ "name": "a" }`.
  3. Repetir con `{ "name": "" }` y `{ "name": "   " }`.

- Qué esperaba según la especificación: US-03 c1 exige un nombre obligatorio de
  entre 3 y 100 caracteres; todos esos valores deben responder `400`
  `VALIDATION_ERROR`.

- Qué obtuvo realmente: el servicio respondió `201` y creó el proyecto (con
  nombre vacío cuando el valor era una cadena de espacios).

- Severidad: MEDIA.
