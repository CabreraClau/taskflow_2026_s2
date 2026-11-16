import { expect, test } from '@playwright/test';
import { TaskCard } from './components/TaskCard';
import {
  abrirTarea,
  agregarMiembroAlProyecto,
  auth,
  crearProyectoYTarea,
  loginApi,
  registrarUsuarioNuevo,
  tokenActual,
} from './helpers';

/**
 * US-14 · Asignar tarea a un miembro
 * Criterios cubiertos: c1 (solo miembros del proyecto; si no, 400), c2
 * (reasignar a otro miembro y conservarlo tras recargar), c3
 * (desasignar con null), c4 (cualquier miembro puede asignar, no solo el
 * owner), c5 (la asignación no cambia el estado).
 */
test.describe('US-14 · Asignar tarea a un miembro', () => {
  test('US-14 c1/c5 · Asignar la tarea a un miembro la deja asignada sin cambiar el estado', async ({
    page,
  }) => {
    // Arrange
    await registrarUsuarioNuevo(page);
    const { taskId, taskTitle } = await crearProyectoYTarea(page, 'Tarea para asignar');
    await agregarMiembroAlProyecto(page, 'bob@test.com');
    const bob = await loginApi(page.request, 'bob@test.com');
    await abrirTarea(page, taskTitle, taskId);

    // Act
    const select = page.getByTestId('task-assignee-select');
    await select.selectOption({ label: 'bob@test.com' });
    const respuesta = page.waitForResponse(
      (r) => r.url().endsWith(`/api/tasks/${taskId}`) && r.request().method() === 'PATCH',
    );
    await page.getByTestId('task-save-button').click();
    const res = await respuesta;

    // Assert
    expect(res.status()).toBe(200);
    const body = (await res.json()) as {
      assigneeId: string | null;
      status: string;
    };
    expect(body.assigneeId).toBe(bob.userId);
    expect(body.status).toBe('TODO');
    await expect(select).toHaveValue(bob.userId);
  });

  test('US-14 c1 · Asignar la tarea a alguien ajeno al proyecto devuelve 400', async ({ page }) => {
    // Arrange: caro@test.com NO es miembro del proyecto recién creado
    await registrarUsuarioNuevo(page);
    const { taskId } = await crearProyectoYTarea(page, 'Tarea con asignado ajeno');
    const token = await tokenActual(page);
    const caro = await loginApi(page.request, 'caro@test.com');

    // Act
    const res = await page.request.patch(`/api/tasks/${taskId}`, {
      headers: auth(token),
      data: { assigneeId: caro.userId },
    });

    // Assert
    expect(res.status()).toBe(400);
  });

  test('US-14 c2/c5 · Reasignar por UI actualiza sólo la tarjeta elegida y persiste al recargar', async ({ page }) => {
    await registrarUsuarioNuevo(page);
    const title = 'Tarea con título repetido';
    const { taskId, taskTitle } = await crearProyectoYTarea(page, title);

    // Dos tarjetas con el mismo título impiden resolver el caso eligiendo el
    // primer texto coincidente: el Component Object debe usar el id de tarea.
    await page.getByTestId('task-create-title-input').fill(title);
    const secondCreated = page.waitForResponse(
      (r) => /\/api\/projects\/proj-\d+\/tasks$/.test(r.url()) && r.request().method() === 'POST',
    );
    await page.getByTestId('task-create-submit').click();
    const secondResponse = await secondCreated;
    expect(secondResponse.status()).toBe(201);
    const secondTask = (await secondResponse.json()) as { id: string };
    const untouchedCard = new TaskCard(page, secondTask.id);
    await expect(untouchedCard.title).toHaveText(title);

    await agregarMiembroAlProyecto(page, 'bob@test.com');
    await agregarMiembroAlProyecto(page, 'caro@test.com');
    await abrirTarea(page, taskTitle, taskId);
    const assignee = page.getByTestId('task-assignee-select');
    const save = page.getByTestId('task-save-button');

    // La tarea queda asignada a Bob antes de reasignarla a Caro. Ambas
    // operaciones se realizan mediante el formulario real.
    await assignee.selectOption({ label: 'bob@test.com' });
    const assigned = page.waitForResponse(
      (r) => r.url().endsWith(`/api/tasks/${taskId}`) && r.request().method() === 'PATCH',
    );
    await save.click();
    expect((await assigned).status()).toBe(200);
    await expect(save).toBeEnabled();

    await assignee.selectOption({ label: 'caro@test.com' });
    const caroId = await assignee.inputValue();
    const reassigned = page.waitForResponse(
      (r) => r.url().endsWith(`/api/tasks/${taskId}`) && r.request().method() === 'PATCH',
    );
    await save.click();
    const response = await reassigned;
    expect(response.status()).toBe(200);
    const updated = (await response.json()) as { assigneeId: string; status: string };
    expect(updated.assigneeId).toBe(caroId);
    expect(updated.status).toBe('TODO');
    await expect(save).toBeEnabled();

    await page.getByTestId('task-detail-back-link').click();
    await expect(page.getByTestId('board-page')).toBeVisible();
    await page.reload();
    await expect(page.getByTestId('board-page')).toBeVisible();

    const reassignedCard = new TaskCard(page, taskId);
    await expect(reassignedCard.assignee).toHaveText('caro@test.com');
    await expect(reassignedCard.status).toHaveValue('TODO');
    await expect(untouchedCard.assignee).toHaveText('Sin asignar');
    await expect(untouchedCard.status).toHaveValue('TODO');
  });

  test('US-14 c3 · Se puede desasignar la tarea dejando el asignado en nulo', async ({ page }) => {
    // Arrange
    await registrarUsuarioNuevo(page);
    const { taskId, taskTitle } = await crearProyectoYTarea(page, 'Tarea para desasignar');
    await agregarMiembroAlProyecto(page, 'bob@test.com');
    await abrirTarea(page, taskTitle, taskId);

    const select = page.getByTestId('task-assignee-select');
    await select.selectOption({ label: 'bob@test.com' });
    const asignar = page.waitForResponse(
      (r) => r.url().endsWith(`/api/tasks/${taskId}`) && r.request().method() === 'PATCH',
    );
    await page.getByTestId('task-save-button').click();
    expect((await asignar).status()).toBe(200);

    // Act: "Sin asignar" tiene value vacío
    await select.selectOption('');
    const desasignar = page.waitForResponse(
      (r) => r.url().endsWith(`/api/tasks/${taskId}`) && r.request().method() === 'PATCH',
    );
    await page.getByTestId('task-save-button').click();
    const res = await desasignar;

    // Assert
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { assigneeId: string | null };
    expect(body.assigneeId).toBeNull();
    await expect(select).toHaveValue('');
  });

  test('US-14 c4 · Un miembro que no es owner también puede asignar la tarea', async ({ page }) => {
    // Arrange: bob es miembro (no owner) del proyecto
    await registrarUsuarioNuevo(page);
    const { taskId } = await crearProyectoYTarea(page, 'Tarea asignable por miembro');
    await agregarMiembroAlProyecto(page, 'bob@test.com');
    const bob = await loginApi(page.request, 'bob@test.com');

    // Act: bob se asigna la tarea a sí mismo
    const res = await page.request.patch(`/api/tasks/${taskId}`, {
      headers: auth(bob.token),
      data: { assigneeId: bob.userId },
    });

    // Assert
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { assigneeId: string | null };
    expect(body.assigneeId).toBe(bob.userId);
  });
});
