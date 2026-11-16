import request from 'supertest';
import { app, auth, createProject, registerUser } from './helpers';

describe('Administración de proyectos', () => {
  it('el propietario edita el proyecto y el cambio se refleja en el listado', async () => {
    const { token, id } = await registerUser('titular-edicion@example.com');
    const project = await createProject(token, 'Preparación');
    const update = { name: 'Lanzamiento', description: 'Preparar la entrega' };

    const edited = await request(app).patch(`/api/projects/${project.id}`)
      .set(auth(token)).send(update).expect(200);
    expect(edited.body).toMatchObject({ ...update, id: project.id, ownerId: id });

    const list = await request(app).get('/api/projects').set(auth(token)).expect(200);
    expect(list.body).toEqual([edited.body]);

    await request(app).delete(`/api/projects/${project.id}`).set(auth(token)).expect(204);
    await request(app).get('/api/projects').set(auth(token)).expect(200, []);
  });

  it('rechaza renombrar un proyecto con el nombre de otro del mismo propietario', async () => {
    const { token } = await registerUser('titular-nombres@example.com');
    const first = await createProject(token, 'Diseño');
    const second = await createProject(token, 'Desarrollo');

    const duplicate = await request(app).patch(`/api/projects/${second.id}`)
      .set(auth(token)).send({ name: first.name }).expect(409);
    expect(duplicate.body.error.code).toBe('CONFLICT');

    const projects = await request(app).get('/api/projects').set(auth(token)).expect(200);
    expect(projects.body).toHaveLength(2);
    expect(projects.body).toEqual(expect.arrayContaining([first, second]));
  });

  it('agregar y quitar un miembro cambia los proyectos que figuran en su listado', async () => {
    const owner = await registerUser('titular-equipo@example.com');
    const email = 'integrante-equipo@example.com';
    const member = await registerUser(email);
    const project = await createProject(owner.token, 'Proyecto compartido');
    const membersUrl = `/api/projects/${project.id}/members`;

    const added = await request(app).post(membersUrl).set(auth(owner.token)).send({ email }).expect(201);
    expect(added.body).toMatchObject({ projectId: project.id, userId: member.id, role: 'MEMBER' });
    await request(app).get('/api/projects').set(auth(member.token)).expect(200, [project]);

    const duplicate = await request(app).post(membersUrl).set(auth(owner.token)).send({ email }).expect(409);
    expect(duplicate.body.error.code).toBe('CONFLICT');

    await request(app).delete(`${membersUrl}/${member.id}`).set(auth(owner.token)).expect(204);
    await request(app).get('/api/projects').set(auth(member.token)).expect(200, []);
  });
});
