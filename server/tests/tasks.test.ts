import request from 'supertest';
import { app, auth, createProject, registerUser } from './helpers';

describe('Tareas', () => {
  it('crea una tarea en un proyecto', async () => {
    const { token } = await registerUser('task1@test.com');
    const project = await createProject(token, 'Proyecto de tareas');

    const res = await request(app)
      .post(`/api/projects/${project.id}/tasks`)
      .set(auth(token))
      .send({ title: 'Implementar login', priority: 'HIGH' });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('TODO');
  });

  it('avanza una tarea de TODO a IN_PROGRESS', async () => {
    const { token, id } = await registerUser('task2@test.com');
    const project = await createProject(token, 'Proyecto de estados');
    const task = (
      await request(app)
        .post(`/api/projects/${project.id}/tasks`)
        .set(auth(token))
        .send({ title: 'Tarea con estados', assigneeId: id })
    ).body;

    const res = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set(auth(token))
      .send({ status: 'IN_PROGRESS' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('IN_PROGRESS');
  });

  it('filtra las tareas por estado', async () => {
    const { token } = await registerUser('task3@test.com');
    const project = await createProject(token, 'Proyecto de filtros');
    await request(app)
      .post(`/api/projects/${project.id}/tasks`)
      .set(auth(token))
      .send({ title: 'Primera tarea' });
    await request(app)
      .post(`/api/projects/${project.id}/tasks`)
      .set(auth(token))
      .send({ title: 'Segunda tarea' });

    const res = await request(app)
      .get(`/api/projects/${project.id}/tasks?status=TODO`)
      .set(auth(token));

    expect(res.body.items).toHaveLength(2);
  });

  it('aplica status y priority simultaneamente al filtrar tareas', async () => {
    const { token, id } = await registerUser('task4@test.com');
    const project = await createProject(token, 'Proyecto de filtros combinados');

    const todoHigh = (
      await request(app)
        .post(`/api/projects/${project.id}/tasks`)
        .set(auth(token))
        .send({ title: 'Tarea TODO alta', priority: 'HIGH' })
    ).body;

    await request(app)
      .post(`/api/projects/${project.id}/tasks`)
      .set(auth(token))
      .send({ title: 'Tarea TODO baja', priority: 'LOW' });

    const inProgressHigh = (
      await request(app)
        .post(`/api/projects/${project.id}/tasks`)
        .set(auth(token))
        .send({ title: 'Tarea en progreso alta', priority: 'HIGH', assigneeId: id })
    ).body;

    await request(app)
      .patch(`/api/tasks/${inProgressHigh.id}`)
      .set(auth(token))
      .send({ status: 'IN_PROGRESS' });

    const res = await request(app)
      .get(`/api/projects/${project.id}/tasks?status=TODO&priority=HIGH`)
      .set(auth(token));

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].id).toBe(todoHigh.id);
  });

  it('crea las tareas siempre con estado inicial TODO aunque el cliente envie otro estado', async () => {
    const { token } = await registerUser('task5@test.com');
    const project = await createProject(token, 'Proyecto de estado inicial');

    const res = await request(app)
      .post(`/api/projects/${project.id}/tasks`)
      .set(auth(token))
      .send({ title: 'Nueva tarea', status: 'DONE' });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('TODO');
  });
});
