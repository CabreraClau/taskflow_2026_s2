import { expect, test } from '@playwright/test';
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
 * Criterios cubiertos: c1 (solo miembros del proyecto; si no, 400), c3
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
