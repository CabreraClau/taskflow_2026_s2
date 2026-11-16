import path from 'path';
import { MatchersV3, PactV3 } from '@pact-foundation/pact';
import type { Comment } from '../../../client/src/types';
import { api, withBrowserApi } from './browser-api';

const { eachLike, fromProviderState, iso8601DateTimeWithMillis, like, regex } = MatchersV3;

const pact = new PactV3({
  consumer: 'TaskFlowWeb',
  provider: 'TaskFlowAPI',
  dir: path.resolve(__dirname, '../../pacts'),
});

describe('Contrato: comentarios de una tarea', () => {
  it('devuelve los comentarios a un miembro autorizado del proyecto', async () => {
    pact
      .given('ana es miembro de una tarea con comentarios')
      .uponReceiving('un GET autorizado a los comentarios de una tarea')
      .withRequest({
        method: 'GET',
        path: fromProviderState('/api/tasks/${taskId}/comments', '/api/tasks/task-1/comments'),
        headers: { Authorization: like('Bearer abc') },
      })
      .willRespondWith({
        status: 200,
        body: eachLike({
          id: regex('^comment-\\d+$', 'comment-1'),
          taskId: regex('^task-\\d+$', 'task-1'),
          authorId: regex('^user-\\d+$', 'user-1'),
          body: like('Revisar los criterios de aceptación.'),
          createdAt: iso8601DateTimeWithMillis('2026-11-16T12:00:00.000Z'),
        }),
      });

    await pact.executeTest(async (mockServer) => {
      await withBrowserApi(mockServer.url, 'token-de-prueba', async () => {
        const comments = await api<Comment[]>('/tasks/task-1/comments');
        expect(comments.length).toBeGreaterThan(0);
        expect(comments[0].taskId).toBe('task-1');
        expect(comments[0].body).toBe('Revisar los criterios de aceptación.');
        expect(Number.isNaN(Date.parse(comments[0].createdAt))).toBe(false);
      });
    });
  });
});
