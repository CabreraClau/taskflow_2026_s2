import path from 'path';
import { MatchersV3, PactV3 } from '@pact-foundation/pact';
import type { User } from '../../../client/src/types';
import { api, withBrowserApi } from './browser-api';

const { like, regex } = MatchersV3;
const EMAIL = 'ana.contract@test.com';
const JWT_PATTERN = '^[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$';

interface AuthResponse {
  user: User;
  token: string;
}

const pact = new PactV3({
  consumer: 'TaskFlowWeb',
  provider: 'TaskFlowAPI',
  dir: path.resolve(__dirname, '../../pacts'),
});

describe('Contrato: login válido', () => {
  it('devuelve la identidad y un token al enviar credenciales correctas', async () => {
    pact
      .given('ana tiene credenciales válidas')
      .uponReceiving('un POST válido a /api/auth/login')
      .withRequest({
        method: 'POST',
        path: '/api/auth/login',
        headers: { 'Content-Type': 'application/json' },
        body: { email: EMAIL, password: 'Password1' },
      })
      .willRespondWith({
        status: 200,
        body: {
          user: {
            id: regex('^user-\\d+$', 'user-1'),
            email: EMAIL,
            name: like('Ana'),
          },
          token: regex(JWT_PATTERN, 'header.payload.signature'),
        },
      });

    await pact.executeTest(async (mockServer) => {
      await withBrowserApi(mockServer.url, null, async () => {
        // La misma petición que realiza AuthProvider, sin montar React.
        const response = await api<AuthResponse>('/auth/login', {
          method: 'POST',
          body: { email: EMAIL, password: 'Password1' },
        });
        expect(response.user.email).toBe(EMAIL);
        expect(response.user.id).toMatch(/^user-\d+$/);
        expect(response.token).toMatch(new RegExp(JWT_PATTERN));
      });
    });
  });
});
