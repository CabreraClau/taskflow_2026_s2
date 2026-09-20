import request from 'supertest';
import { app, auth, registerUser } from './helpers';

describe('Proyectos', () => {
  it('crea un proyecto', async () => {
    const { token } = await registerUser('proj1@test.com');

    const res = await request(app)
      .post('/api/projects')
      .set(auth(token))
      .send({ name: 'Mi Proyecto', description: 'Descripción' });

    expect(res.status).toBe(201);
  });

  it('lista los proyectos del usuario', async () => {
    const { token } = await registerUser('proj2@test.com');
    await request(app).post('/api/projects').set(auth(token)).send({ name: 'Proyecto A' });
    await request(app).post('/api/projects').set(auth(token)).send({ name: 'Proyecto B' });

    const res = await request(app).get('/api/projects').set(auth(token));

    expect(res.body).toHaveLength(2);
  });

  it('rechaza crear un proyecto sin autenticación', async () => {
    const res = await request(app).post('/api/projects').send({ name: 'Sin token' });

    expect(res.status).toBe(401);
  });

  it('rechaza crear un proyecto con nombre demasiado corto', async () => {
    const { token } = await registerUser('proj3@test.com');

    const res = await request(app).post('/api/projects').set(auth(token)).send({ name: 'ab' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});
