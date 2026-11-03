import path from 'path';
import { MatchersV3, PactV3 } from '@pact-foundation/pact';

const { like, eachLike } = MatchersV3;

// Reproduce api<Project[]>('/projects'): el helper del navegador depende
// de localStorage y de una URL relativa, por lo que no corre en Node.
async function getProjects(baseUrl: string, token: string) {
  const res = await fetch(`${baseUrl}/api/projects`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return {
    status: res.status,
    body: (await res.json()) as Array<{ name: string }>,
  };
}

const pact = new PactV3({
  consumer: 'TaskFlowWeb',
  provider: 'TaskFlowAPI',
  dir: path.resolve(__dirname, '../../pacts'),
});

describe('Contrato: lista de proyectos', () => {
  it('devuelve los proyectos del usuario', async () => {
    pact
      .given('ana tiene un proyecto')
      .uponReceiving('un GET a /api/projects')
      .withRequest({
        method: 'GET',
        path: '/api/projects',
        headers: { Authorization: like('Bearer abc') },
      })
      .willRespondWith({
        status: 200,
        // Solo los campos que consume ProjectsPage.tsx.
        body: eachLike({
          id: like('proj-1'),
          name: like('Rediseño del sitio'),
          description: like('Renovación completa del sitio'),
          archived: like(false),
        }),
      });

    await pact.executeTest(async (mockServer) => {
      const { status, body } = await getProjects(mockServer.url, 'token-de-prueba');
      expect(status).toBe(200);
      expect(body.length).toBeGreaterThan(0);
      expect(body[0]).toHaveProperty('name');
    });
  });
});
