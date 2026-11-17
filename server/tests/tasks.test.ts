import request from 'supertest';
import { app, auth, createProject, createTask, registerUser } from './helpers';

/**
 * US-05 (crear tarea), US-06 (cambiar estado) y US-07 (filtros).
 * Patrón AAA en cada test. Los filtros combinados se derivan de la tabla de
 * decisión de la clase 5 (fila "A presente y B presente").
 */
describe('Tareas', () => {
  describe('POST /api/projects/:projectId/tasks', () => {
    it('crea una tarea y la devuelve con id, estado TODO y los datos enviados (US-05 c6)', async () => {
      // Arrange
      const { token } = await registerUser('task1@test.com');
      const project = await createProject(token, 'Proyecto de tareas');
      const payload = { title: 'Implementar login', priority: 'HIGH' };

      // Act
      const res = await request(app)
        .post(`/api/projects/${project.id}/tasks`)
        .set(auth(token))
        .send(payload);

      // Assert
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        ...payload,
        id: expect.stringMatching(/^task-\d+$/),
        projectId: project.id,
        status: 'TODO',
        assigneeId: null,
        dueDate: null,
      });
    });

    it('rechaza una tarea sin título con 400 VALIDATION_ERROR (US-05 c1)', async () => {
      // Arrange
      const { token } = await registerUser('task-sin-titulo@test.com');
      const project = await createProject(token, 'Proyecto sin título');

      // Act
      const res = await request(app)
        .post(`/api/projects/${project.id}/tasks`)
        .set(auth(token))
        .send({ description: 'Falta el título' });

      // Assert
      expect(res.status).toBe(400);
      expect(res.body.error).toMatchObject({ code: 'VALIDATION_ERROR', message: 'title is required' });
    });

    it('aplica los límites del título: 2 caracteres se rechaza y 3 se acepta (US-05 c1)', async () => {
      // Arrange
      const { token } = await registerUser('task-limites@test.com');
      const project = await createProject(token, 'Proyecto de límites');
      const url = `/api/projects/${project.id}/tasks`;

      // Act
      const corto = await request(app).post(url).set(auth(token)).send({ title: 'ab' });
      const minimo = await request(app).post(url).set(auth(token)).send({ title: 'abc' });

      // Assert
      expect(corto.status).toBe(400);
      expect(corto.body.error.code).toBe('VALIDATION_ERROR');
      expect(minimo.status).toBe(201);
      expect(minimo.body.title).toBe('abc');
    });

    it('rechaza una prioridad fuera de LOW/MEDIUM/HIGH/CRITICAL con 400 VALIDATION_ERROR (US-05 c2)', async () => {
      // Arrange
      const { token } = await registerUser('task-prioridad@test.com');
      const project = await createProject(token, 'Proyecto de prioridades');

      // Act
      const res = await request(app)
        .post(`/api/projects/${project.id}/tasks`)
        .set(auth(token))
        .send({ title: 'Prioridad inválida', priority: 'URGENTE' });

      // Assert
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('impide crear tareas a un usuario que no es miembro con 403 FORBIDDEN (US-05 c5)', async () => {
      // Arrange
      const owner = await registerUser('task-owner@test.com');
      const ajeno = await registerUser('task-ajeno@test.com');
      const project = await createProject(owner.token, 'Proyecto privado');

      // Act
      const res = await request(app)
        .post(`/api/projects/${project.id}/tasks`)
        .set(auth(ajeno.token))
        .send({ title: 'Tarea intrusa' });

      // Assert
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rechaza crear una tarea sin token con 401 UNAUTHORIZED', async () => {
      // Arrange
      const { token } = await registerUser('task-sin-token@test.com');
      const project = await createProject(token, 'Proyecto sin token');

      // Act
      const res = await request(app)
        .post(`/api/projects/${project.id}/tasks`)
        .send({ title: 'Sin autenticación' });

      // Assert
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    // ROJO a propósito: BUG-08 / hallazgo H-03 (docs/hallazgos-api.md).
    it('crea las tareas siempre con estado inicial TODO aunque el cliente envie otro estado (US-05 c3) [BUG-08]', async () => {
      // Arrange
      const { token } = await registerUser('task5@test.com');
      const project = await createProject(token, 'Proyecto de estado inicial');

      // Act
      const res = await request(app)
        .post(`/api/projects/${project.id}/tasks`)
        .set(auth(token))
        .send({ title: 'Nueva tarea', status: 'DONE' });

      // Assert
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('TODO');
    });
  });

  describe('PATCH /api/tasks/:taskId (estado)', () => {
    it('avanza una tarea de TODO a IN_PROGRESS (US-06 c1)', async () => {
      // Arrange
      const { token, id } = await registerUser('task2@test.com');
      const project = await createProject(token, 'Proyecto de estados');
      const task = await createTask(token, project.id, { title: 'Tarea con estados', assigneeId: id });

      // Act
      const res = await request(app)
        .patch(`/api/tasks/${task.id}`)
        .set(auth(token))
        .send({ status: 'IN_PROGRESS' });

      // Assert
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: task.id, status: 'IN_PROGRESS', title: 'Tarea con estados' });
    });

    it('rechaza salir de DONE con 422 INVALID_TRANSITION (US-06 c3)', async () => {
      // Arrange
      const { token, id } = await registerUser('task-done@test.com');
      const project = await createProject(token, 'Proyecto terminado');
      const task = await createTask(token, project.id, { title: 'Tarea terminada', assigneeId: id });
      const url = `/api/tasks/${task.id}`;
      await request(app).patch(url).set(auth(token)).send({ status: 'IN_PROGRESS' });
      await request(app).patch(url).set(auth(token)).send({ status: 'DONE' });

      // Act
      const res = await request(app).patch(url).set(auth(token)).send({ status: 'IN_PROGRESS' });

      // Assert
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('INVALID_TRANSITION');
    });
  });

  describe('GET /api/projects/:projectId/tasks (filtros)', () => {
    it('filtra las tareas por estado (US-07)', async () => {
      // Arrange
      const { token, id } = await registerUser('task3@test.com');
      const project = await createProject(token, 'Proyecto de filtros');
      const primera = await createTask(token, project.id, { title: 'Primera tarea' });
      const segunda = await createTask(token, project.id, { title: 'Segunda tarea' });
      const enCurso = await createTask(token, project.id, { title: 'Tarea en curso', assigneeId: id });
      await request(app)
        .patch(`/api/tasks/${enCurso.id}`)
        .set(auth(token))
        .send({ status: 'IN_PROGRESS' });

      // Act
      const res = await request(app)
        .get(`/api/projects/${project.id}/tasks?status=TODO`)
        .set(auth(token));

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.items.map((t: { id: string }) => t.id).sort()).toEqual([primera.id, segunda.id].sort());
      expect(res.body.items.every((t: { status: string }) => t.status === 'TODO')).toBe(true);
    });

    // ROJO a propósito: BUG-07 / hallazgo H-02 (docs/hallazgos-api.md).
    it('aplica status y priority simultaneamente al filtrar tareas (US-07 c5) [BUG-07]', async () => {
      // Arrange
      const { token, id } = await registerUser('task4@test.com');
      const project = await createProject(token, 'Proyecto de filtros combinados');
      const todoHigh = await createTask(token, project.id, { title: 'Tarea TODO alta', priority: 'HIGH' });
      await createTask(token, project.id, { title: 'Tarea TODO baja', priority: 'LOW' });
      const inProgressHigh = await createTask(token, project.id, {
        title: 'Tarea en progreso alta',
        priority: 'HIGH',
        assigneeId: id,
      });
      await request(app)
        .patch(`/api/tasks/${inProgressHigh.id}`)
        .set(auth(token))
        .send({ status: 'IN_PROGRESS' });

      // Act
      const res = await request(app)
        .get(`/api/projects/${project.id}/tasks?status=TODO&priority=HIGH`)
        .set(auth(token));

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toMatchObject({ id: todoHigh.id, status: 'TODO', priority: 'HIGH' });
    });
  });
});
