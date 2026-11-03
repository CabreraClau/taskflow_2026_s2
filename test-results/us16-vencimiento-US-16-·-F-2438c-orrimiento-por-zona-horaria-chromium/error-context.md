# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: us16-vencimiento.spec.ts >> US-16 · Fecha de vencimiento >> US-16 c2/c3 · La fecha cargada se devuelve igual, sin corrimiento por zona horaria
- Location: e2e\us16-vencimiento.spec.ts:17:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "2026-09-15"
Received: "2026-09-14"
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - link "TaskFlow" [ref=e5] [cursor=pointer]:
      - /url: /projects
    - generic [ref=e6]:
      - generic [ref=e7]: e2e-1792534291783-713793@test.com
      - button "Salir" [ref=e8] [cursor=pointer]
  - main [ref=e9]:
    - generic [ref=e10]:
      - generic [ref=e11]:
        - link "← Volver al tablero" [ref=e12] [cursor=pointer]:
          - /url: /projects/proj-21
        - generic [ref=e13]: task-30
      - generic [ref=e14]:
        - generic [ref=e15]:
          - generic [ref=e16]: Título
          - textbox "Título" [ref=e17]: Tarea con vencimiento
        - generic [ref=e18]:
          - generic [ref=e19]: Descripción
          - textbox "Descripción" [ref=e20]
        - generic [ref=e21]:
          - generic [ref=e22]: Prioridad
          - combobox "Prioridad" [ref=e23]:
            - option "LOW"
            - option "MEDIUM" [selected]
            - option "HIGH"
            - option "CRITICAL"
        - generic [ref=e24]:
          - generic [ref=e25]: Asignado
          - combobox "Asignado" [ref=e26]:
            - option "Sin asignar" [selected]
            - option "user-21"
        - generic [ref=e27]:
          - generic [ref=e28]: Vencimiento
          - textbox "Vencimiento" [ref=e29]: 2026-09-14
        - paragraph [ref=e30]: "Vencimiento actual: 2026-09-14"
        - generic [ref=e31]:
          - button "Guardar" [ref=e32] [cursor=pointer]
          - button "Borrar tarea" [ref=e33] [cursor=pointer]
      - generic [ref=e34]:
        - generic [ref=e35]:
          - generic [ref=e36]: Estado
          - combobox "Estado" [ref=e37]:
            - option "TODO" [selected]
            - option "IN_PROGRESS"
            - option "DONE"
        - button "Cambiar estado" [ref=e38] [cursor=pointer]
        - generic [ref=e39]: TODO
      - generic [ref=e40]:
        - heading "Etiquetas" [level=2] [ref=e41]
        - list
        - generic [ref=e42]:
          - textbox [ref=e43]
          - button "Agregar etiqueta" [ref=e44] [cursor=pointer]
      - generic [ref=e45]:
        - heading "Comentarios" [level=2] [ref=e46]
        - generic [ref=e47]:
          - textbox [ref=e48]
          - button "Comentar" [ref=e49] [cursor=pointer]
        - list
      - generic [ref=e50]:
        - heading "Historial de estados" [level=2] [ref=e51]
        - list [ref=e52]:
          - listitem [ref=e53]: — → TODO · 2026-10-20T22:11:32.654Z
```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test';
  2   | import {
  3   |   abrirTarea,
  4   |   auth,
  5   |   crearProyectoYTarea,
  6   |   registrarUsuarioNuevo,
  7   |   tokenActual,
  8   | } from './helpers';
  9   | 
  10  | /**
  11  |  * US-16 · Fecha de vencimiento de tarea
  12  |  * Criterios cubiertos: c3 (la fecha vuelve igual, sin corrimiento por zona
  13  |  * horaria), c5 (se puede quitar la fecha), c6 (formato inválido devuelve 400),
  14  |  * c7 (se admite una fecha pasada).
  15  |  */
  16  | test.describe('US-16 · Fecha de vencimiento', () => {
  17  |   test('US-16 c2/c3 · La fecha cargada se devuelve igual, sin corrimiento por zona horaria', async ({
  18  |     page,
  19  |   }) => {
  20  |     // Arrange
  21  |     await registrarUsuarioNuevo(page);
  22  |     const { taskId, taskTitle } = await crearProyectoYTarea(page, 'Tarea con vencimiento');
  23  |     await abrirTarea(page, taskTitle, taskId);
  24  | 
  25  |     // Act
  26  |     await page.getByTestId('task-duedate-input').fill('2026-09-15');
  27  |     const respuesta = page.waitForResponse(
  28  |       (r) => r.url().endsWith(`/api/tasks/${taskId}`) && r.request().method() === 'PATCH',
  29  |     );
  30  |     await page.getByTestId('task-save-button').click();
  31  |     const res = await respuesta;
  32  | 
  33  |     // Assert: la fecha que devuelve la API y la que muestra la UI es la cargada
  34  |     expect(res.status()).toBe(200);
  35  |     const body = (await res.json()) as { dueDate: string | null };
> 36  |     expect(body.dueDate).toBe('2026-09-15');
      |                          ^ Error: expect(received).toBe(expected) // Object.is equality
  37  |     await expect(page.getByTestId('task-duedate-value')).toHaveText('2026-09-15');
  38  |   });
  39  | 
  40  |   test('US-16 c7 · Se admite cargar una fecha de vencimiento pasada', async ({ page }) => {
  41  |     // Arrange
  42  |     await registrarUsuarioNuevo(page);
  43  |     const { taskId, taskTitle } = await crearProyectoYTarea(page, 'Tarea con fecha pasada');
  44  |     await abrirTarea(page, taskTitle, taskId);
  45  | 
  46  |     // Act
  47  |     await page.getByTestId('task-duedate-input').fill('2020-01-01');
  48  |     const respuesta = page.waitForResponse(
  49  |       (r) => r.url().endsWith(`/api/tasks/${taskId}`) && r.request().method() === 'PATCH',
  50  |     );
  51  |     await page.getByTestId('task-save-button').click();
  52  |     const res = await respuesta;
  53  | 
  54  |     // Assert: no se rechaza y queda una fecha guardada
  55  |     expect(res.status()).toBe(200);
  56  |     const body = (await res.json()) as { dueDate: string | null };
  57  |     expect(body.dueDate).not.toBeNull();
  58  |   });
  59  | 
  60  |   test('US-16 c5 · Se puede quitar la fecha de vencimiento enviándola vacía', async ({ page }) => {
  61  |     // Arrange
  62  |     await registrarUsuarioNuevo(page);
  63  |     const { taskId, taskTitle } = await crearProyectoYTarea(page, 'Tarea con fecha removible');
  64  |     await abrirTarea(page, taskTitle, taskId);
  65  | 
  66  |     // Act: primero asigno una fecha
  67  |     await page.getByTestId('task-duedate-input').fill('2026-09-15');
  68  |     const primera = page.waitForResponse(
  69  |       (r) => r.url().endsWith(`/api/tasks/${taskId}`) && r.request().method() === 'PATCH',
  70  |     );
  71  |     await page.getByTestId('task-save-button').click();
  72  |     expect((await primera).status()).toBe(200);
  73  | 
  74  |     // Act: ahora la quito dejando el campo vacío
  75  |     await page.getByTestId('task-duedate-input').fill('');
  76  |     const segunda = page.waitForResponse(
  77  |       (r) => r.url().endsWith(`/api/tasks/${taskId}`) && r.request().method() === 'PATCH',
  78  |     );
  79  |     await page.getByTestId('task-save-button').click();
  80  |     const res = await segunda;
  81  | 
  82  |     // Assert
  83  |     expect(res.status()).toBe(200);
  84  |     const body = (await res.json()) as { dueDate: string | null };
  85  |     expect(body.dueDate).toBeNull();
  86  |     await expect(page.getByTestId('task-duedate-value')).toHaveText('—');
  87  |   });
  88  | 
  89  |   test('US-16 c6 · Una fecha con formato inválido devuelve 400', async ({ page }) => {
  90  |     // Arrange: la UI usa un <input type="date">, que no deja escribir un
  91  |     // formato inválido; por eso se ataca la API directamente, que es donde la
  92  |     // spec exige la validación.
  93  |     await registrarUsuarioNuevo(page);
  94  |     const { taskId } = await crearProyectoYTarea(page, 'Tarea con fecha inválida');
  95  |     const token = await tokenActual(page);
  96  | 
  97  |     // Act
  98  |     const res = await page.request.patch(`/api/tasks/${taskId}`, {
  99  |       headers: auth(token),
  100 |       data: { dueDate: '15/09/2026' },
  101 |     });
  102 | 
  103 |     // Assert
  104 |     expect(res.status()).toBe(400);
  105 |     const body = (await res.json()) as { error: { code: string } };
  106 |     expect(body.error.code).toBe('VALIDATION_ERROR');
  107 |   });
  108 | });
  109 | 
```