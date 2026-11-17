import bcrypt from 'bcryptjs';
import request from 'supertest';
import { db } from '../src/lib/db';
import { app, registerUser } from './helpers';

// Valores observados antes del refactor; no se importan las constantes del servicio.
// La base SQLite ya se aísla por archivo mediante tests/setup.ts.
describe('Caracterización de la política de autenticación', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('registra contraseñas con un hash bcrypt de costo 10', async () => {
    // Arrange
    const email = 'policy-register@test.com';
    const password = 'Password1';

    // Act
    const { res } = await registerUser(email, password);
    const user = await db.user.findUniqueOrThrow({ where: { email } });

    // Assert
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email, id: `user-${user.id}` });
    expect(res.body.token).toEqual(expect.any(String));
    expect(user.passwordHash).not.toBe(password);
    expect(bcrypt.getRounds(user.passwordHash)).toBe(10);
    expect(await bcrypt.compare(password, user.passwordHash)).toBe(true);
  });

  it('bloquea al quinto fallo durante quince minutos y permite entrar al vencer', async () => {
    // Arrange: el reloj sigue avanzando para conservar los temporizadores de bcrypt.
    const email = 'policy-lockout@test.com';
    const password = 'Password1';
    const { res } = await registerUser(email, password);
    expect(res.status).toBe(201);
    const realNow = Date.now.bind(Date);
    let offset = 0;
    jest.spyOn(Date, 'now').mockImplementation(() => realNow() + offset);

    // Act / Assert: los primeros cuatro errores no bloquean la cuenta.
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const failed = await request(app).post('/api/auth/login').send({ email, password: 'Wrongpass9' });
      expect(failed.status).toBe(401);
      expect(failed.body.error.message).toBe('Invalid credentials');
    }
    const beforeLock = await db.user.findUniqueOrThrow({ where: { email } });
    expect(beforeLock.failedAttempts).toBe(4);
    expect(beforeLock.lockedUntil).toBeNull();

    // El quinto error fija un bloqueo de 900.000 ms en la base real.
    const fifthStartedAt = Date.now();
    const fifth = await request(app).post('/api/auth/login').send({ email, password: 'Wrongpass9' });
    const fifthEndedAt = Date.now();
    const locked = await db.user.findUniqueOrThrow({ where: { email } });
    expect(fifth.status).toBe(401);
    expect(fifth.body.error.message).toBe('Invalid credentials');
    expect(locked.failedAttempts).toBe(5);
    expect(locked.lockedUntil).not.toBeNull();
    const deadline = locked.lockedUntil!.getTime();
    expect(deadline).toBeGreaterThanOrEqual(fifthStartedAt + 900_000);
    expect(deadline).toBeLessThanOrEqual(fifthEndedAt + 900_000);

    // Una clave correcta sigue rechazada un minuto antes del vencimiento.
    offset = deadline - realNow() - 60_000;
    const blocked = await request(app).post('/api/auth/login').send({ email, password });
    expect(blocked.status).toBe(401);
    expect(blocked.body.error.message).toBe('Account temporarily locked. Try again later.');

    // Después del vencimiento vuelve a permitir el acceso y limpia el bloqueo.
    offset = deadline - realNow() + 1_000;
    const allowed = await request(app).post('/api/auth/login').send({ email, password });
    expect(allowed.status).toBe(200);
    expect(allowed.body.user.email).toBe(email);
    const unlocked = await db.user.findUniqueOrThrow({ where: { email } });
    expect(unlocked.lockedUntil).toBeNull();
  });

  it('genera un token de 24 bytes y almacena una vigencia de una hora', async () => {
    // Arrange
    const email = 'policy-recovery@test.com';
    const { res } = await registerUser(email);
    expect(res.status).toBe(201);
    const user = await db.user.findUniqueOrThrow({ where: { email } });

    // Act
    const startedAt = Date.now();
    const recovery = await request(app).post('/api/auth/forgot-password').send({ email });
    const endedAt = Date.now();

    // Assert: se caracteriza la vigencia almacenada, no su validación al usar el token.
    expect(recovery.status).toBe(200);
    expect(recovery.body.message).toBe('Password reset requested');
    expect(recovery.body.token).toMatch(/^[0-9a-f]{48}$/);
    expect(Buffer.from(recovery.body.token, 'hex')).toHaveLength(24);
    const record = await db.passwordResetToken.findUniqueOrThrow({ where: { token: recovery.body.token } });
    expect(record.userId).toBe(user.id);
    expect(record.usedAt).toBeNull();
    expect(record.expiresAt.getTime()).toBeGreaterThanOrEqual(startedAt + 3_600_000);
    expect(record.expiresAt.getTime()).toBeLessThanOrEqual(endedAt + 3_600_000);
  });

  it('restablece la contraseña conservando el costo 10 de bcrypt', async () => {
    // Arrange
    const email = 'policy-reset@test.com';
    const oldPassword = 'Password1';
    const newPassword = 'Changedpass2';
    const { res } = await registerUser(email, oldPassword);
    expect(res.status).toBe(201);
    const before = await db.user.findUniqueOrThrow({ where: { email } });
    const recovery = await request(app).post('/api/auth/forgot-password').send({ email });
    expect(recovery.status).toBe(200);

    // Act
    const reset = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: recovery.body.token, newPassword });
    const after = await db.user.findUniqueOrThrow({ where: { email } });

    // Assert
    expect(reset.status).toBe(200);
    expect(reset.body).toEqual({ message: 'Password updated' });
    expect(after.passwordHash).not.toBe(before.passwordHash);
    expect(bcrypt.getRounds(after.passwordHash)).toBe(10);
    expect(await bcrypt.compare(newPassword, after.passwordHash)).toBe(true);
    const oldLogin = await request(app).post('/api/auth/login').send({ email, password: oldPassword });
    expect(oldLogin.status).toBe(401);
    const newLogin = await request(app).post('/api/auth/login').send({ email, password: newPassword });
    expect(newLogin.status).toBe(200);
    expect(newLogin.body.user.email).toBe(email);
  });
});
