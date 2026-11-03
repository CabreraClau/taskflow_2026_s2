// Solo guarda metadatos de la respuesta; nunca devuelve el token de sesión.
(async () => {
  const base = 'http://localhost:3000/api';
  const login = await fetch(`${base}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ana@test.com', password: 'Password1' }),
  });
  if (!login.ok) throw new Error(`Login: HTTP ${login.status}`);
  const { token } = await login.json();
  const headers = { Authorization: `Bearer ${token}` };
  const projectsResponse = await fetch(`${base}/projects`, { headers });
  if (!projectsResponse.ok) throw new Error(`Proyectos: HTTP ${projectsResponse.status}`);
  const projects = await projectsResponse.json();
  const project = projects.find((p) => p.name === '[Carga] Proyecto grande') || projects[0];
  const response = await fetch(`${base}/projects/${project.id}/tasks`, { headers });
  if (!response.ok) throw new Error(`Tareas: HTTP ${response.status}`);
  const text = await response.text();
  const page = JSON.parse(text);
  console.log(JSON.stringify({
    project_id: project.id, project_name: project.name,
    projects_returned: projects.length, tasks_returned: page.items.length,
    total: page.total, limit: page.limit, offset: page.offset,
    response_bytes: Buffer.byteLength(text),
  }));
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
