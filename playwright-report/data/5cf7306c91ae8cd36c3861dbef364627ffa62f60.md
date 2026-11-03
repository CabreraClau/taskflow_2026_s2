# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: us15-etiquetas.spec.ts >> US-15 · Etiquetar tareas >> US-15 c3 · Agregar la misma etiqueta dos veces devuelve 200 y no genera duplicados
- Location: e2e\us15-etiquetas.spec.ts:61:7

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByTestId('tag-chip')
Expected: 1
Received: 2
Timeout:  10000ms

Call log:
  - Expect "toHaveCount" getByTestId('tag-chip') with timeout 10000ms
  - waiting for getByTestId('tag-chip')
    2 × locator resolved to 0 elements
      - unexpected value "0"
    21 × locator resolved to 2 elements
       - unexpected value "2"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - link "TaskFlow" [ref=e5] [cursor=pointer]:
      - /url: /projects
    - generic [ref=e6]:
      - generic [ref=e7]: e2e-1792534255305-828937@test.com
      - button "Salir" [ref=e8] [cursor=pointer]
  - main [ref=e9]:
    - generic [ref=e10]:
      - generic [ref=e11]:
        - link "← Volver al tablero" [ref=e12] [cursor=pointer]:
          - /url: /projects/proj-17
        - generic [ref=e13]: task-26
      - generic [ref=e14]:
        - generic [ref=e15]:
          - generic [ref=e16]: Título
          - textbox "Título" [ref=e17]: Tarea con duplicados
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
            - option "user-17"
        - generic [ref=e27]:
          - generic [ref=e28]: Vencimiento
          - textbox "Vencimiento" [ref=e29]
        - paragraph [ref=e30]: "Vencimiento actual: —"
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
        - list [ref=e42]:
          - listitem [ref=e43]:
            - generic [ref=e44]: bug
            - button "×" [ref=e45] [cursor=pointer]
          - listitem [ref=e46]:
            - generic [ref=e47]: bug
            - button "×" [ref=e48] [cursor=pointer]
        - generic [ref=e49]:
          - textbox [ref=e50]
          - button "Agregar etiqueta" [ref=e51] [cursor=pointer]
      - generic [ref=e52]:
        - heading "Comentarios" [level=2] [ref=e53]
        - generic [ref=e54]:
          - textbox [ref=e55]
          - button "Comentar" [ref=e56] [cursor=pointer]
        - list
      - generic [ref=e57]:
        - heading "Historial de estados" [level=2] [ref=e58]
        - list [ref=e59]:
          - listitem [ref=e60]: — → TODO · 2026-10-20T22:10:56.608Z
```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test';
  2   | import { abrirTarea, crearProyectoYTarea, registrarUsuarioNuevo } from './helpers';
  3   | 
  4   | /**
  5   |  * US-15 · Etiquetar tareas
  6   |  * Criterios cubiertos: c1 (normalización a minúsculas y trim), c2 (sin
  7   |  * distinción de mayúsculas), c3 (sin duplicados / devuelve 200), c4 (1 a 30
  8   |  * caracteres), c5 (máximo 10 etiquetas).
  9   |  */
  10  | test.describe('US-15 · Etiquetar tareas', () => {
  11  |   test('US-15 c1 · Al agregar la etiqueta "Backend" se guarda normalizada a minúsculas', async ({
  12  |     page,
  13  |   }) => {
  14  |     // Arrange
  15  |     await registrarUsuarioNuevo(page);
  16  |     const { taskId, taskTitle } = await crearProyectoYTarea(page, 'Tarea para etiquetar');
  17  |     await abrirTarea(page, taskTitle, taskId);
  18  | 
  19  |     // Act
  20  |     await page.getByTestId('tag-add-input').fill('Backend');
  21  |     const respuesta = page.waitForResponse(
  22  |       (r) => r.url().endsWith(`/api/tasks/${taskId}/tags`) && r.request().method() === 'POST',
  23  |     );
  24  |     await page.getByTestId('tag-add-button').click();
  25  |     const res = await respuesta;
  26  | 
  27  |     // Assert
  28  |     expect(res.status()).toBe(201);
  29  |     await expect(page.getByTestId('tag-chip')).toHaveCount(1);
  30  |     await expect(page.getByTestId('tag-chip-name')).toHaveText('backend');
  31  |   });
  32  | 
  33  |   test('US-15 c2 · Agregar "Bug" y luego "BUG" no crea dos etiquetas distintas', async ({
  34  |     page,
  35  |   }) => {
  36  |     // Arrange
  37  |     await registrarUsuarioNuevo(page);
  38  |     const { taskId, taskTitle } = await crearProyectoYTarea(page, 'Tarea con etiquetas');
  39  |     await abrirTarea(page, taskTitle, taskId);
  40  | 
  41  |     await page.getByTestId('tag-add-input').fill('Bug');
  42  |     const primera = page.waitForResponse(
  43  |       (r) => r.url().endsWith(`/api/tasks/${taskId}/tags`) && r.request().method() === 'POST',
  44  |     );
  45  |     await page.getByTestId('tag-add-button').click();
  46  |     expect((await primera).status()).toBe(201);
  47  | 
  48  |     // Act: misma etiqueta con otra capitalización
  49  |     await page.getByTestId('tag-add-input').fill('BUG');
  50  |     const segunda = page.waitForResponse(
  51  |       (r) => r.url().endsWith(`/api/tasks/${taskId}/tags`) && r.request().method() === 'POST',
  52  |     );
  53  |     await page.getByTestId('tag-add-button').click();
  54  |     await segunda;
  55  | 
  56  |     // Assert: sigue habiendo exactamente una etiqueta y se llama "bug"
  57  |     await expect(page.getByTestId('tag-chip')).toHaveCount(1);
  58  |     await expect(page.getByTestId('tag-chip-name')).toHaveText('bug');
  59  |   });
  60  | 
  61  |   test('US-15 c3 · Agregar la misma etiqueta dos veces devuelve 200 y no genera duplicados', async ({
  62  |     page,
  63  |   }) => {
  64  |     // Arrange
  65  |     await registrarUsuarioNuevo(page);
  66  |     const { taskId, taskTitle } = await crearProyectoYTarea(page, 'Tarea con duplicados');
  67  |     await abrirTarea(page, taskTitle, taskId);
  68  | 
  69  |     await page.getByTestId('tag-add-input').fill('bug');
  70  |     const primera = page.waitForResponse(
  71  |       (r) => r.url().endsWith(`/api/tasks/${taskId}/tags`) && r.request().method() === 'POST',
  72  |     );
  73  |     await page.getByTestId('tag-add-button').click();
  74  |     expect((await primera).status()).toBe(201);
  75  | 
  76  |     // Act: se repite la misma etiqueta
  77  |     await page.getByTestId('tag-add-input').fill('bug');
  78  |     const segunda = page.waitForResponse(
  79  |       (r) => r.url().endsWith(`/api/tasks/${taskId}/tags`) && r.request().method() === 'POST',
  80  |     );
  81  |     await page.getByTestId('tag-add-button').click();
  82  |     const res = await segunda;
  83  | 
  84  |     // Assert: no se duplica la etiqueta y la API responde 200
> 85  |     await expect(page.getByTestId('tag-chip')).toHaveCount(1);
      |                                                ^ Error: expect(locator).toHaveCount(expected) failed
  86  |     expect(res.status()).toBe(200);
  87  |   });
  88  | 
  89  |   test('US-15 c4 · Una etiqueta de más de 30 caracteres devuelve 400 y no se agrega', async ({
  90  |     page,
  91  |   }) => {
  92  |     // Arrange
  93  |     await registrarUsuarioNuevo(page);
  94  |     const { taskId, taskTitle } = await crearProyectoYTarea(page, 'Tarea con etiqueta larga');
  95  |     await abrirTarea(page, taskTitle, taskId);
  96  | 
  97  |     // Act: 31 caracteres supera el máximo de 30
  98  |     await page.getByTestId('tag-add-input').fill('a'.repeat(31));
  99  |     const respuesta = page.waitForResponse(
  100 |       (r) => r.url().endsWith(`/api/tasks/${taskId}/tags`) && r.request().method() === 'POST',
  101 |     );
  102 |     await page.getByTestId('tag-add-button').click();
  103 |     const res = await respuesta;
  104 | 
  105 |     // Assert
  106 |     expect(res.status()).toBe(400);
  107 |     await expect(
  108 |       page.getByTestId('task-tags-section').getByTestId('error-message'),
  109 |     ).toBeVisible();
  110 |     await expect(page.getByTestId('tag-chip')).toHaveCount(0);
  111 |   });
  112 | 
  113 |   test('US-15 c5 · La tarea admite 10 etiquetas y la número 11 devuelve 400', async ({ page }) => {
  114 |     // Arrange
  115 |     await registrarUsuarioNuevo(page);
  116 |     const { taskId, taskTitle } = await crearProyectoYTarea(page, 'Tarea con 10 etiquetas');
  117 |     await abrirTarea(page, taskTitle, taskId);
  118 | 
  119 |     // Act: agrego las 10 etiquetas permitidas
  120 |     for (let i = 1; i <= 10; i += 1) {
  121 |       await page.getByTestId('tag-add-input').fill(`tag${String(i).padStart(2, '0')}`);
  122 |       const respuesta = page.waitForResponse(
  123 |         (r) => r.url().endsWith(`/api/tasks/${taskId}/tags`) && r.request().method() === 'POST',
  124 |       );
  125 |       await page.getByTestId('tag-add-button').click();
  126 |       expect((await respuesta).status()).toBe(201);
  127 |     }
  128 |     await expect(page.getByTestId('tag-chip')).toHaveCount(10);
  129 | 
  130 |     // Act: la número 11 debe rechazarse
  131 |     await page.getByTestId('tag-add-input').fill('tag11');
  132 |     const respuestaOnce = page.waitForResponse(
  133 |       (r) => r.url().endsWith(`/api/tasks/${taskId}/tags`) && r.request().method() === 'POST',
  134 |     );
  135 |     await page.getByTestId('tag-add-button').click();
  136 |     const res = await respuestaOnce;
  137 | 
  138 |     // Assert
  139 |     expect(res.status()).toBe(400);
  140 |     await expect(
  141 |       page.getByTestId('task-tags-section').getByTestId('error-message'),
  142 |     ).toBeVisible();
  143 |     await expect(page.getByTestId('tag-chip')).toHaveCount(10);
  144 |   });
  145 | });
  146 | 
```