import { Server } from 'http';
import { AddressInfo } from 'net';
import path from 'path';
import bcrypt from 'bcryptjs';
import { Verifier } from '@pact-foundation/pact';
import { createApp } from '../../src/app';
import { db } from '../../src/lib/db';
import { toPublicId } from '../../src/lib/ids';
import { signToken } from '../../src/middleware/auth';

let server: Server;
let baseUrl: string;
let token = '';

beforeAll(async () => {
  server = createApp().listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  if (server?.listening) {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});

describe('Verificación del provider: TaskFlowAPI', () => {
  it('cumple el contrato con TaskFlowWeb', async () => {
    await new Verifier({
      provider: 'TaskFlowAPI',
      providerBaseUrl: baseUrl,
      pactUrls: [path.resolve(__dirname, '../../pacts/TaskFlowWeb-TaskFlowAPI.json')],
      // Sustituye únicamente tokens presentes en la solicitud del contrato.
      requestFilter: (req, _res, next) => {
        if (req.headers['authorization']) {
          req.headers['authorization'] = `Bearer ${token}`;
        }
        next();
      },
      stateHandlers: {
        'ana tiene credenciales válidas': async () => {
          token = '';
          const passwordHash = await bcrypt.hash('Password1', 10);
          await db.user.upsert({
            where: { email: 'ana.contract@test.com' },
            create: {
              email: 'ana.contract@test.com',
              name: 'Ana',
              passwordHash,
            },
            update: {
              name: 'Ana',
              passwordHash,
              failedAttempts: 0,
              lockedUntil: null,
            },
          });
        },
        'ana tiene un proyecto': async () => {
          const ana = await db.user.create({
            data: { email: `ana-${Date.now()}@test.com`, name: 'Ana', passwordHash: 'x' },
          });
          const project = await db.project.create({
            data: {
              name: 'Rediseño del sitio',
              description: 'Renovación completa del sitio',
              ownerId: ana.id,
            },
          });
          await db.projectMember.create({
            data: { projectId: project.id, userId: ana.id, role: 'OWNER' },
          });
          token = signToken({ userId: ana.id, email: ana.email });
        },
        'ana es miembro de una tarea con comentarios': async () => {
          const owner = await db.user.create({
            data: { email: `owner-comments-${Date.now()}@test.com`, passwordHash: 'x' },
          });
          const ana = await db.user.create({
            data: { email: `ana-comments-${Date.now()}@test.com`, name: 'Ana', passwordHash: 'x' },
          });
          const project = await db.project.create({
            data: { name: 'Proyecto con comentarios', ownerId: owner.id },
          });
          await db.projectMember.create({
            data: { projectId: project.id, userId: ana.id, role: 'MEMBER' },
          });
          const task = await db.task.create({
            data: { projectId: project.id, title: 'Tarea del contrato de comentarios' },
          });
          await db.comment.create({
            data: {
              taskId: task.id,
              authorId: ana.id,
              body: 'Revisar los criterios de aceptación.',
            },
          });
          token = signToken({ userId: ana.id, email: ana.email });
          // El generador de la ruta evita depender de IDs o del orden de ejecución.
          return { taskId: toPublicId('task', task.id) };
        },
      },
    }).verifyProvider();
  });
});
