import path from 'path';
import { MatchersV3, PactV3 } from '@pact-foundation/pact';
import type { Project } from '../../../client/src/types';
import { api, withBrowserApi } from './browser-api';

const { like, eachLike } = MatchersV3;

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
      await withBrowserApi(mockServer.url, 'token-de-prueba', async () => {
        const projects = await api<Project[]>('/projects');
        expect(projects.length).toBeGreaterThan(0);
        expect(projects[0]).toHaveProperty('name');
      });
    });
  });
});
