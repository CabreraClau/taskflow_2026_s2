# Actualiza los issues #10 a #17 con la plantilla de la clase 8.
# Ya se aplicó el 17/11/2026 desde la web; sirve para volver a sincronizar si se editan los .md.
# Requisitos: GitHub CLI (winget install GitHub.cli) y "gh auth login".
# Uso, desde la raíz del repo:  powershell -ExecutionPolicy Bypass -File docs/bugs/actualizar-issues.ps1
$ErrorActionPreference = "Stop"
$repo = "CabreraClau/taskflow_2026_s2"
$issues = @(
  @{ n = 10; sev = "media"; title = "BUG-01 [Etiquetas] Una etiqueta con mayúsculas se guarda sin normalizar a minúsculas al agregarla a una tarea" },
  @{ n = 11; sev = "media"; title = "BUG-02 [Etiquetas] Agregar la misma etiqueta con otra capitalización ('Bug' y 'BUG') crea dos etiquetas distintas en la tarea" },
  @{ n = 12; sev = "media"; title = "BUG-03 [Etiquetas] Volver a agregar una etiqueta que la tarea ya tiene la duplica y responde 201 en vez de 200" },
  @{ n = 13; sev = "alta"; title = "BUG-04 [Vencimiento] La fecha de vencimiento guardada vuelve un día antes cuando la API corre en UTC−3" },
  @{ n = 14; sev = "alta"; title = "BUG-05 [Permisos] Un usuario ajeno al proyecto puede editar una tarea con PATCH /api/tasks/:id y recibe 200 en vez de 403" },
  @{ n = 15; sev = "media"; title = "BUG-06 [Proyectos] POST /api/projects crea proyectos con nombre vacío o de menos de 3 caracteres en vez de responder 400" },
  @{ n = 16; sev = "alta"; title = "BUG-07 [Listado de tareas] GET /api/projects/:id/tasks aplica sólo el último de status, priority y assignedTo en vez de combinarlos" },
  @{ n = 17; sev = "alta"; title = "BUG-08 [Tareas] POST /api/projects/:id/tasks respeta el status que envía el cliente y crea tareas directamente en DONE" }
)
foreach ($i in $issues) {
  $body = "docs/bugs/issues/issue-$($i.n).md"
  gh issue edit $i.n --repo $repo --title $i.title --body-file $body --add-label "bug,$($i.sev)"
  Write-Host "Issue #$($i.n) actualizado"
}
