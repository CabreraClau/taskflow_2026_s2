import request from 'supertest';
import { app, auth, createProject, createTask, registerUser } from './helpers';

describe('Trabajo sobre una tarea', () => {
  it('el responsable completa la tarea y el historial registra cada transición una sola vez', async () => {
    const owner = await registerUser('titular-flujo@example.com');
    const email = 'responsable-flujo@example.com';
    const member = await registerUser(email);
    const project = await createProject(owner.token, 'Desarrollo');
    await request(app).post(`/api/projects/${project.id}/members`)
      .set(auth(owner.token)).send({ email }).expect(201);
    const task = await createTask(owner.token, project.id, { title: 'Preparar la versión' });
    await createTask(owner.token, project.id, { title: 'Redactar el anuncio' });
    const url = `/api/tasks/${task.id}`;

    const assigned = await request(app).patch(url).set(auth(owner.token))
      .send({ assigneeId: member.id, priority: 'HIGH' }).expect(200);
    expect(assigned.body).toMatchObject({ assigneeId: member.id, priority: 'HIGH' });
    const assignedTasks = await request(app).get(`/api/projects/${project.id}/tasks`)
      .query({ assignedTo: member.id }).set(auth(member.token)).expect(200);
    expect(assignedTasks.body.items).toEqual([
      expect.objectContaining({ id: task.id, assignee: { id: member.id, email } }),
    ]);

    for (const status of ['IN_PROGRESS', 'DONE', 'DONE']) {
      const changed = await request(app).patch(url).set(auth(member.token)).send({ status }).expect(200);
      expect(changed.body.status).toBe(status);
    }
    const rejected = await request(app).patch(url).set(auth(member.token))
      .send({ status: 'TODO' }).expect(422);
    expect(rejected.body.error.code).toBe('INVALID_TRANSITION');

    const history = await request(app).get(`${url}/history`).set(auth(member.token)).expect(200);
    expect(history.body).toEqual([
      expect.objectContaining({ taskId: task.id, changedBy: owner.id, fromStatus: null, toStatus: 'TODO' }),
      expect.objectContaining({ taskId: task.id, changedBy: member.id, fromStatus: 'TODO', toStatus: 'IN_PROGRESS' }),
      expect.objectContaining({ taskId: task.id, changedBy: member.id, fromStatus: 'IN_PROGRESS', toStatus: 'DONE' }),
    ]);
  });

  it('rechaza un vencimiento mal formateado y permite quitar el vencimiento y el responsable', async () => {
    const { token, id } = await registerUser('titular-fechas@example.com');
    const project = await createProject(token, 'Planificación');
    const tasksUrl = `/api/projects/${project.id}/tasks`;
    const taskData = { title: 'Revisar el plan', assigneeId: id };

    const invalid = await request(app).post(tasksUrl).set(auth(token))
      .send({ ...taskData, dueDate: '30/06/2027' }).expect(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
    const listing = await request(app).get(tasksUrl).set(auth(token)).expect(200);
    expect(listing.body.items).toEqual([]);

    const task = await request(app).post(tasksUrl).set(auth(token))
      .send({ ...taskData, dueDate: '2027-06-30' }).expect(201);
    expect(task.body).toMatchObject({ assigneeId: id, dueDate: expect.any(String) });
    const url = `/api/tasks/${task.body.id}`;
    const badUpdate = await request(app).patch(url).set(auth(token)).send({ dueDate: 'junio' }).expect(400);
    expect(badUpdate.body.error.code).toBe('VALIDATION_ERROR');
    const beforeClearing = await request(app).get(url).set(auth(token)).expect(200);
    expect(beforeClearing.body.dueDate).toBe(task.body.dueDate);

    const update = {
      title: 'Revisar el plan final',
      description: 'Acordar los cambios',
      dueDate: null,
      assigneeId: null,
    };
    await request(app).patch(url).set(auth(token)).send(update).expect(200);
    const detail = await request(app).get(url).set(auth(token)).expect(200);
    expect(detail.body).toMatchObject(update);
  });

  it('muestra y quita etiquetas en el detalle de la tarea', async () => {
    const { token } = await registerUser('titular-etiquetas@example.com');
    const project = await createProject(token, 'Etiquetado');
    const task = await createTask(token, project.id, { title: 'Revisar requisitos' });
    const url = `/api/tasks/${task.id}`;

    const tag = await request(app).post(`${url}/tags`).set(auth(token)).send({ name: 'revision' }).expect(201);
    expect(tag.body).toMatchObject({ name: 'revision', id: expect.stringMatching(/^tag-\d+$/) });
    const detail = await request(app).get(url).set(auth(token)).expect(200);
    expect(detail.body.tags).toEqual([tag.body]);

    await request(app).delete(`${url}/tags/${tag.body.id}`).set(auth(token)).expect(204);
    const updated = await request(app).get(url).set(auth(token)).expect(200);
    expect(updated.body.tags).toEqual([]);

    await request(app).delete(url).set(auth(token)).expect(204);
    const listing = await request(app).get(`/api/projects/${project.id}/tasks`).set(auth(token)).expect(200);
    expect(listing.body.items).toEqual([]);
  });

  it('el autor agrega y borra su comentario, y se rechazan los cuerpos fuera de límite', async () => {
    const { token, id } = await registerUser('autor-comentario@example.com');
    const project = await createProject(token, 'Revisión de comentarios');
    const task = await createTask(token, project.id, { title: 'Solicitar revisión' });
    const url = `/api/tasks/${task.id}/comments`;

    for (const body of ['   ', 'a'.repeat(1001)]) {
      const invalid = await request(app).post(url).set(auth(token)).send({ body }).expect(400);
      expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
    }
    const comment = await request(app).post(url).set(auth(token)).send({ body: '  Revisado  ' }).expect(201);
    expect(comment.body).toMatchObject({ authorId: id, taskId: task.id, body: 'Revisado' });
    await request(app).get(url).set(auth(token)).expect(200, [comment.body]);

    await request(app).delete(`/api/comments/${comment.body.id}`).set(auth(token)).expect(204);
    await request(app).get(url).set(auth(token)).expect(200, []);
  });
});
