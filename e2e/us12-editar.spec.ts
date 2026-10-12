import { expect, test } from '@playwright/test';
import {
  abrirTarea,
  auth,
  crearProyectoYTarea,
  loginApi,
  registrarUsuarioNuevo,
  tokenActual,
} from './helpers';

/**
 * US-12 · Editar tarea
 * Criterios cubiertos: c1 (editar título/descripción/prioridad), c2 (título
 * entre 3 y 200 caracteres), c5 (solo miembros pueden editar; HTTP 403), c6
 * (los campos ausentes conservan su valor).
 */
test.describe('US-12 · Editar tarea', () => {
  test('US-12 c1 · Editar el título de una tarea lo actualiza', async ({ page }) => {
    // Arrange
    await registrarUsuarioNuevo(page);
    const { taskId, taskTitle } = await crearProyectoYTarea(page, 'Tarea original');
    await abrirTarea(page, taskTitle, taskId);

    // Act
    const nuevoTitulo = 'Implementar login con OAuth';
    await page.getByTestId('task-title-input').fill(nuevoTitulo);
    const respuesta = page.waitForResponse(
      (r) => r.url().endsWith(`/api/tasks/${taskId}`) && r.request().method() === 'PATCH',
    );
    await page.getByTestId('task-save-button').click();
    const res = await respuesta;

    // Assert
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { title: string };
    expect(body.title).toBe(nuevoTitulo);
    await expect(page.getByTestId('task-title-input')).toHaveValue(nuevoTitulo);
  });

  test('US-12 c2 · Un título de menos de 3 caracteres devuelve 400', async ({ page }) => {
    // Arrange
    await registrarUsuarioNuevo(page);
    const { taskId, taskTitle } = await crearProyectoYTarea(page, 'Tarea con título corto');
    await abrirTarea(page, taskTitle, taskId);

    // Act
    await page.getByTestId('task-title-input').fill('ab');
    const respuesta = page.waitForResponse(
      (r) => r.url().endsWith(`/api/tasks/${taskId}`) && r.request().method() === 'PATCH',
    );
    await page.getByTestId('task-save-button').click();
    const res = await respuesta;

    // Assert
    expect(res.status()).toBe(400);
    await expect(
      page.getByTestId('task-edit-form').getByTestId('error-message'),
    ).toBeVisible();
  });

  test('US-12 c6 · Editar solo la descripción conserva el título y la prioridad', async ({
    page,
  }) => {
    // Arrange: la tarea arranca con prioridad HIGH
    await registrarUsuarioNuevo(page);
    const { taskId, taskTitle } = await crearProyectoYTarea(page, 'Tarea con prioridad', 'HIGH');
    await abrirTarea(page, taskTitle, taskId);

    // Act: cambio únicamente la descripción
    await page.getByTestId('task-description-input').fill('Descripción agregada');
    const respuesta = page.waitForResponse(
      (r) => r.url().endsWith(`/api/tasks/${taskId}`) && r.request().method() === 'PATCH',
    );
    await page.getByTestId('task-save-button').click();
    const res = await respuesta;

    // Assert
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { title: string; priority: string };
    expect(body.title).toBe(taskTitle);
    expect(body.priority).toBe('HIGH');
    await expect(page.getByTestId('task-priority-select')).toHaveValue('HIGH');
  });

  test('US-12 c5 · Un usuario ajeno al proyecto no puede editar la tarea (403)', async ({
    page,
  }) => {
    // Arrange: caro@test.com NO es miembro del proyecto
    await registrarUsuarioNuevo(page);
    const { taskId } = await crearProyectoYTarea(page, 'Tarea protegida');
    const caro = await loginApi(page.request, 'caro@test.com');

    // Act
    const res = await page.request.patch(`/api/tasks/${taskId}`, {
      headers: auth(caro.token),
      data: { title: 'Cambiado por un ajeno' },
    });

    // Assert: la spec US-12 c5 exige 403
    expect(res.status()).toBe(403);
  });
});
