import request from 'supertest';
import { app, auth, createProject, createTask, registerUser } from './helpers';

/**
 * Comentarios de una tarea. Patrón AAA en cada test.
 * Se cubren el camino feliz y los casos negativos de autenticación (401),
 * autorización (403), recurso inexistente (404) y validación (400).
 */
describe('Comentarios', () => {
  it('agrega un comentario a una tarea y lo devuelve con autor y tarea', async () => {
    // Arrange
    const { token, id } = await registerUser('com1@test.com');
    const project = await createProject(token, 'Proyecto con comentarios');
    const task = await createTask(token, project.id, { title: 'Tarea comentada' });

    // Act
    const res = await request(app)
      .post(`/api/tasks/${task.id}/comments`)
      .set(auth(token))
      .send({ body: 'Revisado y aprobado' });

    // Assert
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: expect.stringMatching(/^comment-\d+$/),
      taskId: task.id,
      authorId: id,
      body: 'Revisado y aprobado',
    });
  });

  it('devuelve los comentarios de una tarea', async () => {
    // Arrange
    const { token, id } = await registerUser('com2@test.com');
    const project = await createProject(token, 'Proyecto con listado');
    const task = await createTask(token, project.id, { title: 'Otra tarea' });
    await request(app)
      .post(`/api/tasks/${task.id}/comments`)
      .set(auth(token))
      .send({ body: 'Primer comentario' });

    // Act
    const res = await request(app).get(`/api/tasks/${task.id}/comments`).set(auth(token));

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ taskId: task.id, authorId: id, body: 'Primer comentario' });
  });

  it('rechaza un comentario vacío con 400 VALIDATION_ERROR', async () => {
    // Arrange
    const { token } = await registerUser('com-vacio@test.com');
    const project = await createProject(token, 'Proyecto comentario vacío');
    const task = await createTask(token, project.id, { title: 'Tarea sin texto' });

    // Act
    const res = await request(app)
      .post(`/api/tasks/${task.id}/comments`)
      .set(auth(token))
      .send({ body: '' });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('impide comentar a un usuario que no es miembro del proyecto con 403 FORBIDDEN', async () => {
    // Arrange
    const owner = await registerUser('com-owner@test.com');
    const ajeno = await registerUser('com-ajeno@test.com');
    const project = await createProject(owner.token, 'Proyecto cerrado');
    const task = await createTask(owner.token, project.id, { title: 'Tarea privada' });

    // Act
    const res = await request(app)
      .post(`/api/tasks/${task.id}/comments`)
      .set(auth(ajeno.token))
      .send({ body: 'No debería poder' });

    // Assert
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('rechaza listar comentarios sin token con 401 UNAUTHORIZED', async () => {
    // Arrange
    const { token } = await registerUser('com-sin-token@test.com');
    const project = await createProject(token, 'Proyecto sin token');
    const task = await createTask(token, project.id, { title: 'Tarea pública no' });

    // Act
    const res = await request(app).get(`/api/tasks/${task.id}/comments`);

    // Assert
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('devuelve 404 NOT_FOUND al comentar una tarea inexistente', async () => {
    // Arrange
    const { token } = await registerUser('com-404@test.com');

    // Act
    const res = await request(app)
      .post('/api/tasks/task-999999/comments')
      .set(auth(token))
      .send({ body: 'Tarea fantasma' });

    // Assert
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
