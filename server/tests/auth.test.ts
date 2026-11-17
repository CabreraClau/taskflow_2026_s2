import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from './helpers';

/**
 * US-01 (registro) y US-02 (login).
 * Cada test sigue el patrón AAA: Arrange (preparar datos), Act (una sola
 * request bajo prueba) y Assert (status + cuerpo + código de error).
 */
describe('Auth', () => {
  describe('POST /api/auth/register', () => {
    it('registra un usuario nuevo y devuelve 201 con el usuario y un token (US-01 c5, c7)', async () => {
      // Arrange
      const credentials = { email: 'ana@test.com', password: 'Password1' };

      // Act
      const res = await request(app).post('/api/auth/register').send(credentials);

      // Assert
      expect(res.status).toBe(201);
      expect(res.body.user).toMatchObject({
        id: expect.stringMatching(/^user-\d+$/),
        email: 'ana@test.com',
      });
      expect(typeof res.body.token).toBe('string');
      expect(res.body.user).not.toHaveProperty('password');
      expect(res.body.user).not.toHaveProperty('passwordHash');
    });

    it('guarda el email normalizado en minúsculas (US-01 c2)', async () => {
      // Arrange
      const credentials = { email: 'Mixto@Test.com', password: 'Password1' };

      // Act
      const res = await request(app).post('/api/auth/register').send(credentials);

      // Assert
      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe('mixto@test.com');
    });

    it('rechaza un email ya registrado con 409 CONFLICT (US-01 c4)', async () => {
      // Arrange
      const credentials = { email: 'repetido@test.com', password: 'Password1' };
      await request(app).post('/api/auth/register').send(credentials);

      // Act
      const res = await request(app).post('/api/auth/register').send(credentials);

      // Assert
      expect(res.status).toBe(409);
      expect(res.body.error).toMatchObject({
        code: 'CONFLICT',
        message: 'Email already registered',
      });
    });

    it('rechaza una contraseña débil con 400 VALIDATION_ERROR (US-01 c3, c6)', async () => {
      // Arrange
      const credentials = { email: 'debil@test.com', password: 'abc' };

      // Act
      const res = await request(app).post('/api/auth/register').send(credentials);

      // Assert
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toMatch(/8 characters/);
    });

    it('rechaza un email sin dominio con 400 VALIDATION_ERROR (US-01 c1)', async () => {
      // Arrange
      const credentials = { email: 'sin-dominio', password: 'Password1' };

      // Act
      const res = await request(app).post('/api/auth/register').send(credentials);

      // Assert
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/login', () => {
    it('inicia sesión con credenciales válidas y devuelve un JWT de 24 h con el userId (US-02 c1, c7)', async () => {
      // Arrange
      const credentials = { email: 'login@test.com', password: 'Password1' };
      const registered = await request(app).post('/api/auth/register').send(credentials);

      // Act
      const res = await request(app).post('/api/auth/login').send(credentials);

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({ id: registered.body.user.id, email: 'login@test.com' });
      const payload = jwt.decode(res.body.token) as { userId: number; iat: number; exp: number };
      expect(payload.userId).toBeDefined();
      expect(payload.exp - payload.iat).toBe(24 * 60 * 60);
    });

    it('rechaza el login con contraseña incorrecta con 401 UNAUTHORIZED (US-02 c2)', async () => {
      // Arrange
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'wrong@test.com', password: 'Password1' });

      // Act
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'wrong@test.com', password: 'Otracosa9' });

      // Assert
      expect(res.status).toBe(401);
      expect(res.body.error).toMatchObject({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });
      expect(res.body).not.toHaveProperty('token');
    });

    it('devuelve el mismo error para un email inexistente que para una contraseña incorrecta (US-02 c3)', async () => {
      // Arrange
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'existe@test.com', password: 'Password1' });
      const wrongPassword = await request(app)
        .post('/api/auth/login')
        .send({ email: 'existe@test.com', password: 'Otracosa9' });

      // Act
      const unknownEmail = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nadie@test.com', password: 'Otracosa9' });

      // Assert
      expect(unknownEmail.status).toBe(401);
      expect(unknownEmail.body).toEqual(wrongPassword.body);
    });
  });
});
