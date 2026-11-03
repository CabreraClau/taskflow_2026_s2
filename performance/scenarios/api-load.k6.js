// Basado en K6.txt del material del curso. Ejecutar desde la raíz del repo.
// k6 run -e VUS=1 -e DURATION=30s performance/scenarios/api-load.k6.js
// k6 run -e VUS=20 -e DURATION=1m performance/scenarios/api-load.k6.js
import http from 'k6/http';
import { check, fail, sleep } from 'k6';

const BASE = (__ENV.BASE_URL || 'http://localhost:3000/api').replace(/\/$/, '');
const BIG_PROJECT_NAME = '[Carga] Proyecto grande';

export const options = {
  vus: Number(__ENV.VUS || 1),
  duration: __ENV.DURATION || '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  const login = http.post(`${BASE}/auth/login`, JSON.stringify({
    email: 'ana@test.com', password: 'Password1',
  }), { headers: { 'Content-Type': 'application/json' } });
  if (!check(login, { 'login 200': (res) => res.status === 200 })) {
    fail('Falló el login. Cargá la seed chica antes de ejecutar k6.');
  }
  const body = login.json();
  const token = body.token || body.accessToken;
  if (!token) fail('El login no devolvió token.');
  const headers = { Authorization: `Bearer ${token}` };

  let projectId = __ENV.PROJECT_ID;
  if (!projectId) {
    const res = http.get(`${BASE}/projects`, { headers });
    if (res.status !== 200) fail(`No se pudieron listar los proyectos: ${res.status}`);
    const list = res.json();
    if (!Array.isArray(list)) fail('El listado de proyectos no es un array.');
    const big = list.find((project) => project.name && project.name.startsWith(BIG_PROJECT_NAME));
    projectId = big ? big.id : (list.length ? list[0].id : undefined);
  }
  if (!projectId) fail('No hay un proyecto para medir. Cargá la seed chica.');
  console.log(`Proyecto medido: ${projectId}; VUS=${options.vus}; duración=${options.duration}`);
  return { headers, url: `${BASE}/projects/${projectId}/tasks` };
}

export default function (data) {
  const res = http.get(data.url, { headers: data.headers });
  check(res, { 'status 200': (response) => response.status === 200 });
  sleep(1);
}
