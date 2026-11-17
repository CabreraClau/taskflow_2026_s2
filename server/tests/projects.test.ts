import request from 'supertest';
import { app, auth, registerUser } from './helpers';

/**
 * US-03 (crear proyecto) y US-04 (listar proyectos).
 * Patrón AAA en cada test. Los límites del nombre (3..100) se prueban con
 * valores límite: 2 (inválido), 3 (válido), 100 (válido) y 101 (inválido).
 */
describe('Proyectos', () => {
  describe('POST /api/projects', () => {
    it('crea un proyecto y lo devuelve con id, owner y fecha (US-03 c3, c5)', async () => {
      // Arrange
      const { token, id } = await registerUser('proj1@test.com');
      const payload = { name: 'Mi Proyecto', description: 'Descripción' };

      // Act
      const res = await request(app).post('/api/projects').set(auth(token)).send(payload);

      // Assert
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        ...payload,
        id: expect.stringMatching(/^proj-\d+$/),
        ownerId: id,
        archived: false,
      });
      expect(new Date(res.body.createdAt).toISOString()).toBe(res.body.createdAt);
    });

    it('acepta los límites válidos del nombre: 3 y 100 caracteres (US-03 c1)', async () => {
      // Arrange
      const { token } = await registerUser('proj-limites@test.com');
      const minimo = 'abc';
      const maximo = 'x'.repeat(100);

      // Act
      const resMin = await request(app).post('/api/projects').set(auth(token)).send({ name: minimo });
      const resMax = await request(app).post('/api/projects').set(auth(token)).send({ name: maximo });

      // Assert
      expect(resMin.status).toBe(201);
      expect(resMin.body.name).toBe(minimo);
      expect(resMax.status).toBe(201);
      expect(resMax.body.name).toBe(maximo);
    });

    it('rechaza un nombre de 101 caracteres con 400 VALIDATION_ERROR (US-03 c1)', async () => {
      // Arrange
      const { token } = await registerUser('proj-largo@test.com');

      // Act
      const res = await request(app)
        .post('/api/projects')
        .set(auth(token))
        .send({ name: 'x'.repeat(101) });

      // Assert
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    // ROJO a propósito: BUG-06 / hallazgo H-01 (docs/hallazgos-api.md).
    it('rechaza crear un proyecto con nombre demasiado corto (US-03 c1) [BUG-06]', async () => {
      // Arrange
      const { token } = await registerUser('proj3@test.com');

      // Act
      const res = await request(app).post('/api/projects').set(auth(token)).send({ name: 'ab' });

      // Assert
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rechaza una descripción de más de 500 caracteres con 400 VALIDATION_ERROR (US-03 c2)', async () => {
      // Arrange
      const { token } = await registerUser('proj-desc@test.com');
      const payload = { name: 'Descripción larga', description: 'd'.repeat(501) };

      // Act
      const res = await request(app).post('/api/projects').set(auth(token)).send(payload);

      // Assert
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rechaza un segundo proyecto con el mismo nombre con 409 CONFLICT (US-03 c4)', async () => {
      // Arrange
      const { token } = await registerUser('proj-dup@test.com');
      await request(app).post('/api/projects').set(auth(token)).send({ name: 'Duplicado' });

      // Act
      const res = await request(app).post('/api/projects').set(auth(token)).send({ name: 'Duplicado' });

      // Assert
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('rechaza crear un proyecto sin token con 401 UNAUTHORIZED (US-03 c6)', async () => {
      // Arrange
      const payload = { name: 'Sin token' };

      // Act
      const res = await request(app).post('/api/projects').send(payload);

      // Assert
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rechaza un token inválido con 401 UNAUTHORIZED (convenciones de autenticación)', async () => {
      // Arrange
      const headers = { Authorization: 'Bearer token-invalido' };

      // Act
      const res = await request(app).post('/api/projects').set(headers).send({ name: 'Token roto' });

      // Assert
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/projects', () => {
    it('lista solo los proyectos del usuario (US-04 c1, c3)', async () => {
      // Arrange
      const { token } = await registerUser('proj2@test.com');
      const otro = await registerUser('proj2-otro@test.com');
      await request(app).post('/api/projects').set(auth(token)).send({ name: 'Proyecto A' });
      await request(app).post('/api/projects').set(auth(token)).send({ name: 'Proyecto B' });
      await request(app).post('/api/projects').set(auth(otro.token)).send({ name: 'Proyecto ajeno' });

      // Act
      const res = await request(app).get('/api/projects').set(auth(token));

      // Assert
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body.map((p: { name: string }) => p.name).sort()).toEqual(['Proyecto A', 'Proyecto B']);
      for (const project of res.body) {
        expect(project).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            description: null,
            createdAt: expect.any(String),
          }),
        );
      }
    });

    it('devuelve un array vacío si el usuario no tiene proyectos (US-04 c4)', async () => {
      // Arrange
      const { token } = await registerUser('proj-vacio@test.com');

      // Act
      const res = await request(app).get('/api/projects').set(auth(token));

      // Assert
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });
});
