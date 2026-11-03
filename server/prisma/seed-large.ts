import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const PREFIX = '[Carga] ';
const BIG_PROJECT_NAME = `${PREFIX}Proyecto grande`;
const PROJECTS = 200;
const TASKS = 5000;
const COMMENTS_PER_TASK = 4;

async function main() {
  const users = await db.user.findMany({
    where: { email: { in: ['ana@test.com', 'bob@test.com', 'caro@test.com'] } },
  });
  const ana = users.find((user) => user.email === 'ana@test.com');
  if (!ana || users.length !== 3) {
    throw new Error('Faltan usuarios de prueba. Ejecutá primero npm run db:reset.');
  }

  await db.$transaction(async (tx) => {
    // Comment y TaskHistory no tienen FK a Task: se eliminan explícitamente.
    // Solo se reemplazan los proyectos reservados para este generador.
    const previousProjects = await tx.project.findMany({
      where: { ownerId: ana.id, name: { startsWith: PREFIX } },
      select: { id: true },
    });
    const previousIds = previousProjects.map((project) => project.id);
    const previousTasks = await tx.task.findMany({
      where: { projectId: { in: previousIds } }, select: { id: true },
    });
    for (let offset = 0; offset < previousTasks.length; offset += 500) {
      const ids = previousTasks.slice(offset, offset + 500).map((task) => task.id);
      await tx.comment.deleteMany({ where: { taskId: { in: ids } } });
      await tx.taskHistory.deleteMany({ where: { taskId: { in: ids } } });
    }
    await tx.project.deleteMany({ where: { id: { in: previousIds } } });

    await tx.project.createMany({
      data: Array.from({ length: PROJECTS }, (_, index) => ({
        name: index === 0 ? BIG_PROJECT_NAME : `${PREFIX}Proyecto ${index + 1}`,
        description: 'Datos sintéticos del práctico de performance k6.',
        ownerId: ana.id,
      })),
    });
    const projects = await tx.project.findMany({
      where: { ownerId: ana.id, name: { startsWith: PREFIX } },
    });
    const big = projects.find((project) => project.name === BIG_PROJECT_NAME)!;
    for (const user of users) {
      await tx.projectMember.createMany({
        data: projects.map((project) => ({
          projectId: project.id, userId: user.id,
          role: user.id === ana.id ? 'OWNER' : 'MEMBER',
        })),
      });
    }

    // La presentación pide 5.000 tareas en un proyecto, no repartidas en 200.
    const statuses = ['TODO', 'IN_PROGRESS', 'DONE'];
    const priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    for (let offset = 0; offset < TASKS; offset += 500) {
      await tx.task.createMany({
        data: Array.from({ length: Math.min(500, TASKS - offset) }, (_, index) => ({
          projectId: big.id,
          title: `Tarea de carga ${offset + index + 1}`,
          description: 'Tarea sintética para medir el listado con volumen y concurrencia.',
          status: statuses[(offset + index) % statuses.length],
          priority: priorities[(offset + index) % priorities.length],
          assigneeId: users[(offset + index) % users.length].id,
        })),
      });
    }
    const tasks = await tx.task.findMany({ where: { projectId: big.id }, select: { id: true } });
    for (let offset = 0; offset < tasks.length; offset += 100) {
      await tx.comment.createMany({
        data: tasks.slice(offset, offset + 100).flatMap((task) =>
          Array.from({ length: COMMENTS_PER_TASK }, (_, index) => ({
            taskId: task.id, authorId: users[index % users.length].id,
            body: `Comentario de carga ${index + 1} para la tarea ${task.id}.`,
          }))),
      });
    }
    const commentCount = await tx.comment.count({ where: { taskId: { in: tasks.map((task) => task.id) } } });
    if (projects.length !== PROJECTS || tasks.length !== TASKS || commentCount !== 20000) {
      throw new Error('El volumen generado no coincide con el práctico. Se revierte la transacción.');
    }
    console.log(`Seed grande: ${projects.length} proyectos de carga, ${tasks.length} tareas y ${commentCount} comentarios.`);
    console.log(`Proyecto a medir: proj-${big.id} (${BIG_PROJECT_NAME}). La seed chica se conserva.`);
  }, { maxWait: 10000, timeout: 120000 });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => db.$disconnect());
