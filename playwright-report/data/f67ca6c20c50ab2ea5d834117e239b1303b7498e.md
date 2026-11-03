# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: us12-editar.spec.ts >> US-12 · Editar tarea >> US-12 c5 · Un usuario ajeno al proyecto no puede editar la tarea (403)
- Location: e2e\us12-editar.spec.ts:85:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 403
Received: 200
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - link "TaskFlow" [ref=e5] [cursor=pointer]:
      - /url: /projects
    - generic [ref=e6]:
      - generic [ref=e7]: e2e-1792534177866-296376@test.com
      - button "Salir" [ref=e8] [cursor=pointer]
  - main [ref=e9]:
    - generic [ref=e10]:
      - generic [ref=e11]:
        - heading "Proyecto E2E 1792534178409-850584" [level=1] [ref=e12]
        - link "Miembros" [ref=e13] [cursor=pointer]:
          - /url: /projects/proj-7/members
      - generic [ref=e14]:
        - generic [ref=e15]:
          - generic [ref=e16]: Título
          - textbox "Título" [ref=e17]
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
            - option "user-7"
        - generic [ref=e27]:
          - generic [ref=e28]: Vencimiento
          - textbox "Vencimiento" [ref=e29]
        - button "Crear tarea" [ref=e30] [cursor=pointer]
      - generic [ref=e31]:
        - generic [ref=e32]:
          - generic [ref=e33]: Prioridad
          - combobox "Prioridad" [ref=e34]:
            - option "Todas" [selected]
            - option "LOW"
            - option "MEDIUM"
            - option "HIGH"
            - option "CRITICAL"
        - generic [ref=e35]:
          - generic [ref=e36]: Asignado
          - combobox "Asignado" [ref=e37]:
            - option "Todos" [selected]
            - option "user-7"
        - generic [ref=e38]:
          - generic [ref=e39]: Buscar
          - textbox "Buscar" [ref=e40]
        - button "Aplicar" [ref=e41] [cursor=pointer]
        - button "Limpiar" [ref=e42] [cursor=pointer]
      - paragraph [ref=e43]: "Total: 1"
      - generic [ref=e44]:
        - generic [ref=e45]:
          - heading "Por hacer (1)" [level=2] [ref=e46]:
            - text: Por hacer
            - generic [ref=e47]: (1)
          - list [ref=e48]:
            - listitem [ref=e49]:
              - link "Tarea protegida" [ref=e50] [cursor=pointer]:
                - /url: /projects/proj-7/tasks/task-16
              - generic [ref=e51]:
                - generic [ref=e52]: MEDIUM
                - generic [ref=e53]: Sin asignar
              - generic [ref=e54]:
                - generic [ref=e55]: —
                - generic [ref=e56]: 0 comentarios
              - generic [ref=e57]:
                - generic [ref=e58]: Estado
                - combobox "Estado" [ref=e59]:
                  - option "TODO" [selected]
                  - option "IN_PROGRESS"
                  - option "DONE"
        - generic [ref=e60]:
          - heading "En progreso (0)" [level=2] [ref=e61]:
            - text: En progreso
            - generic [ref=e62]: (0)
          - list [ref=e63]
        - generic [ref=e64]:
          - heading "Hecho (0)" [level=2] [ref=e65]:
            - text: Hecho
            - generic [ref=e66]: (0)
          - list [ref=e67]
```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test';
  2   | import {
  3   |   abrirTarea,
  4   |   auth,
  5   |   crearProyectoYTarea,
  6   |   loginApi,
  7   |   registrarUsuarioNuevo,
  8   |   tokenActual,
  9   | } from './helpers';
  10  | 
  11  | /**
  12  |  * US-12 · Editar tarea
  13  |  * Criterios cubiertos: c1 (editar título/descripción/prioridad), c2 (título
  14  |  * entre 3 y 200 caracteres), c5 (solo miembros pueden editar; HTTP 403), c6
  15  |  * (los campos ausentes conservan su valor).
  16  |  */
  17  | test.describe('US-12 · Editar tarea', () => {
  18  |   test('US-12 c1 · Editar el título de una tarea lo actualiza', async ({ page }) => {
  19  |     // Arrange
  20  |     await registrarUsuarioNuevo(page);
  21  |     const { taskId, taskTitle } = await crearProyectoYTarea(page, 'Tarea original');
  22  |     await abrirTarea(page, taskTitle, taskId);
  23  | 
  24  |     // Act
  25  |     const nuevoTitulo = 'Implementar login con OAuth';
  26  |     await page.getByTestId('task-title-input').fill(nuevoTitulo);
  27  |     const respuesta = page.waitForResponse(
  28  |       (r) => r.url().endsWith(`/api/tasks/${taskId}`) && r.request().method() === 'PATCH',
  29  |     );
  30  |     await page.getByTestId('task-save-button').click();
  31  |     const res = await respuesta;
  32  | 
  33  |     // Assert
  34  |     expect(res.status()).toBe(200);
  35  |     const body = (await res.json()) as { title: string };
  36  |     expect(body.title).toBe(nuevoTitulo);
  37  |     await expect(page.getByTestId('task-title-input')).toHaveValue(nuevoTitulo);
  38  |   });
  39  | 
  40  |   test('US-12 c2 · Un título de menos de 3 caracteres devuelve 400', async ({ page }) => {
  41  |     // Arrange
  42  |     await registrarUsuarioNuevo(page);
  43  |     const { taskId, taskTitle } = await crearProyectoYTarea(page, 'Tarea con título corto');
  44  |     await abrirTarea(page, taskTitle, taskId);
  45  | 
  46  |     // Act
  47  |     await page.getByTestId('task-title-input').fill('ab');
  48  |     const respuesta = page.waitForResponse(
  49  |       (r) => r.url().endsWith(`/api/tasks/${taskId}`) && r.request().method() === 'PATCH',
  50  |     );
  51  |     await page.getByTestId('task-save-button').click();
  52  |     const res = await respuesta;
  53  | 
  54  |     // Assert
  55  |     expect(res.status()).toBe(400);
  56  |     await expect(
  57  |       page.getByTestId('task-edit-form').getByTestId('error-message'),
  58  |     ).toBeVisible();
  59  |   });
  60  | 
  61  |   test('US-12 c6 · Editar solo la descripción conserva el título y la prioridad', async ({
  62  |     page,
  63  |   }) => {
  64  |     // Arrange: la tarea arranca con prioridad HIGH
  65  |     await registrarUsuarioNuevo(page);
  66  |     const { taskId, taskTitle } = await crearProyectoYTarea(page, 'Tarea con prioridad', 'HIGH');
  67  |     await abrirTarea(page, taskTitle, taskId);
  68  | 
  69  |     // Act: cambio únicamente la descripción
  70  |     await page.getByTestId('task-description-input').fill('Descripción agregada');
  71  |     const respuesta = page.waitForResponse(
  72  |       (r) => r.url().endsWith(`/api/tasks/${taskId}`) && r.request().method() === 'PATCH',
  73  |     );
  74  |     await page.getByTestId('task-save-button').click();
  75  |     const res = await respuesta;
  76  | 
  77  |     // Assert
  78  |     expect(res.status()).toBe(200);
  79  |     const body = (await res.json()) as { title: string; priority: string };
  80  |     expect(body.title).toBe(taskTitle);
  81  |     expect(body.priority).toBe('HIGH');
  82  |     await expect(page.getByTestId('task-priority-select')).toHaveValue('HIGH');
  83  |   });
  84  | 
  85  |   test('US-12 c5 · Un usuario ajeno al proyecto no puede editar la tarea (403)', async ({
  86  |     page,
  87  |   }) => {
  88  |     // Arrange: caro@test.com NO es miembro del proyecto
  89  |     await registrarUsuarioNuevo(page);
  90  |     const { taskId } = await crearProyectoYTarea(page, 'Tarea protegida');
  91  |     const caro = await loginApi(page.request, 'caro@test.com');
  92  | 
  93  |     // Act
  94  |     const res = await page.request.patch(`/api/tasks/${taskId}`, {
  95  |       headers: auth(caro.token),
  96  |       data: { title: 'Cambiado por un ajeno' },
  97  |     });
  98  | 
  99  |     // Assert: la spec US-12 c5 exige 403
> 100 |     expect(res.status()).toBe(403);
      |                          ^ Error: expect(received).toBe(expected) // Object.is equality
  101 |   });
  102 | });
  103 | 
```