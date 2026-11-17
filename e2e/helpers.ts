import { expect, type Page } from '@playwright/test';
import { TaskCard } from './components/TaskCard';
import { projectData, taskData, TEST_PASSWORD, type Priority } from './data/test-data';

/**
 * Acciones de UI compartidas. Las fixtures preparan las cuentas y la sesión;
 * los helpers mantienen visibles las operaciones funcionales de cada historia.
 */

/** Arrange: inicia sesión con un usuario existente y espera /projects. */
export async function login(page: Page, email: string, password: string = TEST_PASSWORD): Promise<void> {
  await page.goto('/login');
  await page.getByTestId('login-email-input').fill(email);
  await page.getByTestId('login-password-input').fill(password);
  const respuesta = page.waitForResponse(
    (r) => r.url().includes('/api/auth/login') && r.request().method() === 'POST',
  );
  await page.getByTestId('login-submit').click();
  expect((await respuesta).status()).toBe(200);
  await expect(page.getByTestId('projects-page')).toBeVisible();
}

export interface ProyectoYTarea {
  projectId: string;
  projectName: string;
  taskId: string;
  taskTitle: string;
}

/**
 * Arrange: desde /projects crea un proyecto nuevo, entra al tablero y crea una
 * tarea. Devuelve los ids/nombres para usar en el Act/Assert.
 */
export async function crearProyectoYTarea(
  page: Page,
  tituloTarea: string,
  prioridad?: Priority,
): Promise<ProyectoYTarea> {
  await expect(page.getByTestId('projects-page')).toBeVisible();

  const { name: projectName } = projectData();
  const task = taskData({ title: tituloTarea, priority: prioridad });
  await page.getByTestId('project-name-input').fill(projectName);
  const respuestaProyecto = page.waitForResponse(
    (r) => /\/api\/projects$/.test(r.url()) && r.request().method() === 'POST',
  );
  await page.getByTestId('project-create-submit').click();
  const resProyecto = await respuestaProyecto;
  expect(resProyecto.status()).toBe(201);
  const proyecto = (await resProyecto.json()) as { id: string };

  await page.getByTestId('project-card-name').filter({ hasText: projectName }).click();
  await expect(page.getByTestId('board-page')).toBeVisible();

  await page.getByTestId('task-create-title-input').fill(task.title);
  if (task.priority) {
    await page.getByTestId('task-create-priority-select').selectOption(task.priority);
  }
  const respuestaTarea = page.waitForResponse(
    (r) => /\/api\/projects\/proj-\d+\/tasks$/.test(r.url()) && r.request().method() === 'POST',
  );
  await page.getByTestId('task-create-submit').click();
  const resTarea = await respuestaTarea;
  expect(resTarea.status()).toBe(201);
  const tarea = (await resTarea.json()) as { id: string };

  const card = new TaskCard(page, tarea.id);
  await expect(card.root).toBeVisible();
  await expect(card.title).toHaveText(tituloTarea);
  return { projectId: proyecto.id, projectName, taskId: tarea.id, taskTitle: tituloTarea };
}

/**
 * Act: abre el detalle de una tarea desde el tablero y espera a que el
 * formulario quede estable.
 *
 * En desarrollo React StrictMode ejecuta los efectos dos veces, por lo que el
 * detalle de la tarea dispara dos `GET /api/tasks/:id`. La segunda respuesta
 * vuelve a sincronizar el formulario (`syncForm`) y pisaría lo que escribimos
 * justo después. Esperamos a que termine la segunda carga antes de devolver el
 * control al test.
 */
export async function abrirTarea(page: Page, titulo: string, taskId: string): Promise<void> {
  let cargas = 0;
  let resolverSegunda: () => void = () => undefined;
  const segundaCarga = new Promise<void>((resolve) => {
    resolverSegunda = resolve;
  });

  const onResponse = (r: import('@playwright/test').Response): void => {
    if (r.request().method() === 'GET' && r.url().endsWith(`/api/tasks/${taskId}`)) {
      cargas += 1;
      if (cargas >= 2) {
        page.off('response', onResponse);
        resolverSegunda();
      }
    }
  };
  page.on('response', onResponse);

  const card = new TaskCard(page, taskId);
  await expect(card.title).toHaveText(titulo);
  await card.open();
  await expect(page.getByTestId('task-detail-page')).toBeVisible();

  // En un build de producción sólo hay una carga: no esperamos para siempre.
  await Promise.race([segundaCarga, page.waitForTimeout(2000)]);
  page.off('response', onResponse);
  // Dejamos que React aplique el último `syncForm`.
  await page.waitForTimeout(100);
}

/** Act: agrega un miembro existente (por email) desde el tablero y vuelve al tablero. */
export async function agregarMiembroAlProyecto(page: Page, email: string): Promise<void> {
  await page.getByTestId('board-members-link').click();
  await expect(page.getByTestId('members-page')).toBeVisible();

  await page.getByTestId('member-email-input').fill(email);
  const respuesta = page.waitForResponse(
    (r) => /\/api\/projects\/proj-\d+\/members$/.test(r.url()) && r.request().method() === 'POST',
  );
  await page.getByTestId('member-add-button').click();
  expect((await respuesta).status()).toBe(201);

  await page.getByTestId('members-board-link').click();
  await expect(page.getByTestId('board-page')).toBeVisible();
}

/** Devuelve el JWT guardado en localStorage por el cliente. */
export async function tokenActual(page: Page): Promise<string> {
  const token = await page.evaluate(() => localStorage.getItem('taskflow_token'));
  if (!token) throw new Error('No hay token en localStorage: se esperaba una sesión iniciada');
  return token;
}

export function auth(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
