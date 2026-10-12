import { expect, test } from '@playwright/test';
import {
  abrirTarea,
  auth,
  crearProyectoYTarea,
  registrarUsuarioNuevo,
  tokenActual,
} from './helpers';

/**
 * US-16 · Fecha de vencimiento de tarea
 * Criterios cubiertos: c3 (la fecha vuelve igual, sin corrimiento por zona
 * horaria), c5 (se puede quitar la fecha), c6 (formato inválido devuelve 400),
 * c7 (se admite una fecha pasada).
 */
test.describe('US-16 · Fecha de vencimiento', () => {
  test('US-16 c2/c3 · La fecha cargada se devuelve igual, sin corrimiento por zona horaria', async ({
    page,
  }) => {
    // Arrange
    await registrarUsuarioNuevo(page);
    const { taskId, taskTitle } = await crearProyectoYTarea(page, 'Tarea con vencimiento');
    await abrirTarea(page, taskTitle, taskId);

    // Act
    await page.getByTestId('task-duedate-input').fill('2026-09-15');
    const respuesta = page.waitForResponse(
      (r) => r.url().endsWith(`/api/tasks/${taskId}`) && r.request().method() === 'PATCH',
    );
    await page.getByTestId('task-save-button').click();
    const res = await respuesta;

    // Assert: la fecha que devuelve la API y la que muestra la UI es la cargada
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { dueDate: string | null };
    expect(body.dueDate).toBe('2026-09-15');
    await expect(page.getByTestId('task-duedate-value')).toHaveText('2026-09-15');
  });

  test('US-16 c7 · Se admite cargar una fecha de vencimiento pasada', async ({ page }) => {
    // Arrange
    await registrarUsuarioNuevo(page);
    const { taskId, taskTitle } = await crearProyectoYTarea(page, 'Tarea con fecha pasada');
    await abrirTarea(page, taskTitle, taskId);

    // Act
    await page.getByTestId('task-duedate-input').fill('2020-01-01');
    const respuesta = page.waitForResponse(
      (r) => r.url().endsWith(`/api/tasks/${taskId}`) && r.request().method() === 'PATCH',
    );
    await page.getByTestId('task-save-button').click();
    const res = await respuesta;

    // Assert: no se rechaza y queda una fecha guardada
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { dueDate: string | null };
    expect(body.dueDate).not.toBeNull();
  });

  test('US-16 c5 · Se puede quitar la fecha de vencimiento enviándola vacía', async ({ page }) => {
    // Arrange
    await registrarUsuarioNuevo(page);
    const { taskId, taskTitle } = await crearProyectoYTarea(page, 'Tarea con fecha removible');
    await abrirTarea(page, taskTitle, taskId);

    // Act: primero asigno una fecha
    await page.getByTestId('task-duedate-input').fill('2026-09-15');
    const primera = page.waitForResponse(
      (r) => r.url().endsWith(`/api/tasks/${taskId}`) && r.request().method() === 'PATCH',
    );
    await page.getByTestId('task-save-button').click();
    expect((await primera).status()).toBe(200);

    // Act: ahora la quito dejando el campo vacío
    await page.getByTestId('task-duedate-input').fill('');
    const segunda = page.waitForResponse(
      (r) => r.url().endsWith(`/api/tasks/${taskId}`) && r.request().method() === 'PATCH',
    );
    await page.getByTestId('task-save-button').click();
    const res = await segunda;

    // Assert
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { dueDate: string | null };
    expect(body.dueDate).toBeNull();
    await expect(page.getByTestId('task-duedate-value')).toHaveText('—');
  });

  test('US-16 c6 · Una fecha con formato inválido devuelve 400', async ({ page }) => {
    // Arrange: la UI usa un <input type="date">, que no deja escribir un
    // formato inválido; por eso se ataca la API directamente, que es donde la
    // spec exige la validación.
    await registrarUsuarioNuevo(page);
    const { taskId } = await crearProyectoYTarea(page, 'Tarea con fecha inválida');
    const token = await tokenActual(page);

    // Act
    const res = await page.request.patch(`/api/tasks/${taskId}`, {
      headers: auth(token),
      data: { dueDate: '15/09/2026' },
    });

    // Assert
    expect(res.status()).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
