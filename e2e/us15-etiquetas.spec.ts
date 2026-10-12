import { expect, test } from '@playwright/test';
import { abrirTarea, crearProyectoYTarea, registrarUsuarioNuevo } from './helpers';

/**
 * US-15 · Etiquetar tareas
 * Criterios cubiertos: c1 (normalización a minúsculas y trim), c2 (sin
 * distinción de mayúsculas), c3 (sin duplicados / devuelve 200), c4 (1 a 30
 * caracteres), c5 (máximo 10 etiquetas).
 */
test.describe('US-15 · Etiquetar tareas', () => {
  test('US-15 c1 · Al agregar la etiqueta "Backend" se guarda normalizada a minúsculas', async ({
    page,
  }) => {
    // Arrange
    await registrarUsuarioNuevo(page);
    const { taskId, taskTitle } = await crearProyectoYTarea(page, 'Tarea para etiquetar');
    await abrirTarea(page, taskTitle, taskId);

    // Act
    await page.getByTestId('tag-add-input').fill('Backend');
    const respuesta = page.waitForResponse(
      (r) => r.url().endsWith(`/api/tasks/${taskId}/tags`) && r.request().method() === 'POST',
    );
    await page.getByTestId('tag-add-button').click();
    const res = await respuesta;

    // Assert
    expect(res.status()).toBe(201);
    await expect(page.getByTestId('tag-chip')).toHaveCount(1);
    await expect(page.getByTestId('tag-chip-name')).toHaveText('backend');
  });

  test('US-15 c2 · Agregar "Bug" y luego "BUG" no crea dos etiquetas distintas', async ({
    page,
  }) => {
    // Arrange
    await registrarUsuarioNuevo(page);
    const { taskId, taskTitle } = await crearProyectoYTarea(page, 'Tarea con etiquetas');
    await abrirTarea(page, taskTitle, taskId);

    await page.getByTestId('tag-add-input').fill('Bug');
    const primera = page.waitForResponse(
      (r) => r.url().endsWith(`/api/tasks/${taskId}/tags`) && r.request().method() === 'POST',
    );
    await page.getByTestId('tag-add-button').click();
    expect((await primera).status()).toBe(201);

    // Act: misma etiqueta con otra capitalización
    await page.getByTestId('tag-add-input').fill('BUG');
    const segunda = page.waitForResponse(
      (r) => r.url().endsWith(`/api/tasks/${taskId}/tags`) && r.request().method() === 'POST',
    );
    await page.getByTestId('tag-add-button').click();
    await segunda;

    // Assert: sigue habiendo exactamente una etiqueta y se llama "bug"
    await expect(page.getByTestId('tag-chip')).toHaveCount(1);
    await expect(page.getByTestId('tag-chip-name')).toHaveText('bug');
  });

  test('US-15 c3 · Agregar la misma etiqueta dos veces devuelve 200 y no genera duplicados', async ({
    page,
  }) => {
    // Arrange
    await registrarUsuarioNuevo(page);
    const { taskId, taskTitle } = await crearProyectoYTarea(page, 'Tarea con duplicados');
    await abrirTarea(page, taskTitle, taskId);

    await page.getByTestId('tag-add-input').fill('bug');
    const primera = page.waitForResponse(
      (r) => r.url().endsWith(`/api/tasks/${taskId}/tags`) && r.request().method() === 'POST',
    );
    await page.getByTestId('tag-add-button').click();
    expect((await primera).status()).toBe(201);

    // Act: se repite la misma etiqueta
    await page.getByTestId('tag-add-input').fill('bug');
    const segunda = page.waitForResponse(
      (r) => r.url().endsWith(`/api/tasks/${taskId}/tags`) && r.request().method() === 'POST',
    );
    await page.getByTestId('tag-add-button').click();
    const res = await segunda;

    // Assert: no se duplica la etiqueta y la API responde 200
    await expect(page.getByTestId('tag-chip')).toHaveCount(1);
    expect(res.status()).toBe(200);
  });

  test('US-15 c4 · Una etiqueta de más de 30 caracteres devuelve 400 y no se agrega', async ({
    page,
  }) => {
    // Arrange
    await registrarUsuarioNuevo(page);
    const { taskId, taskTitle } = await crearProyectoYTarea(page, 'Tarea con etiqueta larga');
    await abrirTarea(page, taskTitle, taskId);

    // Act: 31 caracteres supera el máximo de 30
    await page.getByTestId('tag-add-input').fill('a'.repeat(31));
    const respuesta = page.waitForResponse(
      (r) => r.url().endsWith(`/api/tasks/${taskId}/tags`) && r.request().method() === 'POST',
    );
    await page.getByTestId('tag-add-button').click();
    const res = await respuesta;

    // Assert
    expect(res.status()).toBe(400);
    await expect(
      page.getByTestId('task-tags-section').getByTestId('error-message'),
    ).toBeVisible();
    await expect(page.getByTestId('tag-chip')).toHaveCount(0);
  });

  test('US-15 c5 · La tarea admite 10 etiquetas y la número 11 devuelve 400', async ({ page }) => {
    // Arrange
    await registrarUsuarioNuevo(page);
    const { taskId, taskTitle } = await crearProyectoYTarea(page, 'Tarea con 10 etiquetas');
    await abrirTarea(page, taskTitle, taskId);

    // Act: agrego las 10 etiquetas permitidas
    for (let i = 1; i <= 10; i += 1) {
      await page.getByTestId('tag-add-input').fill(`tag${String(i).padStart(2, '0')}`);
      const respuesta = page.waitForResponse(
        (r) => r.url().endsWith(`/api/tasks/${taskId}/tags`) && r.request().method() === 'POST',
      );
      await page.getByTestId('tag-add-button').click();
      expect((await respuesta).status()).toBe(201);
    }
    await expect(page.getByTestId('tag-chip')).toHaveCount(10);

    // Act: la número 11 debe rechazarse
    await page.getByTestId('tag-add-input').fill('tag11');
    const respuestaOnce = page.waitForResponse(
      (r) => r.url().endsWith(`/api/tasks/${taskId}/tags`) && r.request().method() === 'POST',
    );
    await page.getByTestId('tag-add-button').click();
    const res = await respuestaOnce;

    // Assert
    expect(res.status()).toBe(400);
    await expect(
      page.getByTestId('task-tags-section').getByTestId('error-message'),
    ).toBeVisible();
    await expect(page.getByTestId('tag-chip')).toHaveCount(10);
  });
});
