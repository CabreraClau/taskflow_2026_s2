import AxeBuilder from '@axe-core/playwright';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// Adaptación para este fork: Login y Registro comparten /login; el detalle
// de proyecto es el tablero /projects/:id. Extendemos a Detalle de tarea,
// donde se encontró la regla label. No se necesita una cuenta del seed.
const VERIFICAR = { regla: 'label', vistas: ['Detalle de tarea'] };
const phase = process.env.A11Y_PHASE === 'before' ? 'before' : 'after';
const evidenceDir = path.resolve('docs/evidence/m2');
const password = 'Password1';

function evidence(file: string, data: unknown) {
  mkdirSync(evidenceDir, { recursive: true });
  writeFileSync(path.join(evidenceDir, file), JSON.stringify(data, null, 2) + '\n');
}

async function fixture(request: APIRequestContext) {
  const email = `a11y-${randomUUID()}@example.test`;
  const registration = await request.post('/api/auth/register', {
    data: { email, password, name: 'Auditoría accesibilidad' },
  });
  expect(registration.status()).toBe(201);
  const { token } = await registration.json();
  const headers = { Authorization: `Bearer ${token}` };
  const projectResponse = await request.post('/api/projects', {
    headers, data: { name: `Proyecto accesibilidad ${randomUUID()}` },
  });
  expect(projectResponse.status()).toBe(201);
  const project = await projectResponse.json();
  const taskResponse = await request.post(`/api/projects/${project.id}/tasks`, {
    headers, data: { title: 'Tarea para auditoría de accesibilidad' },
  });
  expect(taskResponse.status()).toBe(201);
  const task = await taskResponse.json();
  return { email, project, task };
}

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByTestId('login-email-input').fill(email);
  await page.getByTestId('login-password-input').fill(password);
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('projects-page')).toBeVisible();
}

async function detail(page: Page, f: Awaited<ReturnType<typeof fixture>>) {
  await page.goto(`/projects/${f.project.id}/tasks/${f.task.id}`);
  await expect(page.getByTestId('task-detail-page')).toBeVisible();
  await expect(page.getByTestId('tag-add-input')).toBeVisible();
  await expect(page.getByTestId('comment-add-input')).toBeVisible();
  await expect(page.getByTestId('loading')).toHaveCount(0);
}

test('a11y informe WCAG 2.1 A y AA en cinco vistas', async ({ page, request }) => {
  const f = await fixture(request);
  const views: unknown[] = [];
  async function scan(name: string) {
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const violations = result.violations.map(({ id, impact, help, helpUrl, tags, nodes }) => ({
      id, impact, help, helpUrl, tags,
      nodes: nodes.map(({ target, html, failureSummary }) => ({ target, html, failureSummary })),
    }));
    views.push({ name, violations, incompleteRules: result.incomplete.map((r) => r.id) });
    console.log(`${name}: ${violations.length} regla(s) WCAG violada(s)`);
    for (const rule of violations) {
      console.log(`[${rule.impact}] ${rule.id}: ${rule.tags.filter((tag) => tag.startsWith('wcag')).join(', ')}; ${rule.nodes.length} elemento(s)`);
    }
  }
  await page.goto('/login');
  await scan('Login');
  await page.getByTestId('login-mode-toggle').click();
  await expect(page.getByTestId('login-name-input')).toBeVisible();
  await scan('Registro');
  await login(page, f.email);
  await expect(page.getByTestId('project-card-name')).toHaveCount(1);
  await scan('Proyectos');
  await page.getByTestId('project-card-name').click();
  await expect(page.getByTestId('board-page')).toBeVisible();
  await expect(page.getByTestId('task-card')).toHaveCount(1);
  await scan('Detalle de proyecto');
  await detail(page, f);
  await scan('Detalle de tarea');
  await page.screenshot({ path: path.join(evidenceDir, `a11y-${phase}-detail.png`), fullPage: true });
  evidence(`a11y-${phase}.json`, { phase, engine: 'axe-core', scope: 'WCAG 2.1 A/AA', views });
  // El informe no afirma conformidad: se complementa con revisión manual.
});

test('a11y verificación de la corrección label en detalle de tarea', async ({ page, request }) => {
  const f = await fixture(request);
  await login(page, f.email);
  await detail(page, f);
  const result = await new AxeBuilder({ page }).withRules([VERIFICAR.regla]).analyze();
  evidence(`verification-${phase}.json`, {
    rule: VERIFICAR.regla, views: VERIFICAR.vistas,
    violations: result.violations,
  });
  expect(result.violations, 'Los controles de etiquetas y comentarios deben tener nombre accesible').toEqual([]);
  await expect(page.getByTestId('tag-add-input')).toHaveAccessibleName('Nueva etiqueta');
  await expect(page.getByTestId('comment-add-input')).toHaveAccessibleName('Comentario');
});

test('a11y revisión complementaria de teclado idioma errores y CSS', async ({ page, request }) => {
  const f = await fixture(request);
  await page.goto('/login');
  const input = page.getByTestId('login-email-input');
  const css = await input.evaluate((element) => {
    const style = getComputedStyle(element);
    return { border: style.borderTopColor, background: style.backgroundColor };
  });
  const purposes = {
    loginEmail: await input.getAttribute('autocomplete'),
    loginPassword: await page.getByTestId('login-password-input').getAttribute('autocomplete'),
    registerName: null as string | null,
    registerEmail: null as string | null,
    registerPassword: null as string | null,
  };
  await page.getByTestId('login-mode-toggle').click();
  purposes.registerName = await page.getByTestId('login-name-input').getAttribute('autocomplete');
  purposes.registerEmail = await input.getAttribute('autocomplete');
  purposes.registerPassword = await page.getByTestId('login-password-input').getAttribute('autocomplete');
  await page.getByTestId('login-mode-toggle').click();
  await input.fill(f.email);
  await page.getByTestId('login-password-input').fill('Incorrecta7!');
  await page.getByTestId('login-submit').click();
  const alert = page.getByRole('alert');
  await expect(alert).toBeVisible();
  const error = { text: await alert.innerText(), role: await alert.getAttribute('role') };
  const language = await page.locator('html').getAttribute('lang');
  await login(page, f.email);
  // Una navegación nueva deja el foco inicial en el documento; sólo Tab y
  // Enter se usan para alcanzar y activar el proyecto desde aquí.
  await page.goto('/projects');
  await expect(page.getByTestId('project-card-name')).toHaveCount(1);
  let tabs = 0;
  let reached = false;
  while (tabs < 30 && !reached) {
    await page.keyboard.press('Tab');
    tabs++;
    reached = await page.getByTestId('project-card-name').evaluate((el) => document.activeElement === el);
  }
  expect(reached).toBe(true);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('board-page')).toBeVisible();
  evidence(`manual-${phase}.json`, {
    method: 'Revisión del DOM y CSS, con navegación Tab/Enter automatizada; no se simuló un lector de pantalla',
    css, purposes, language, error,
    keyboard: { reachedProjectWithTab: reached, tabCount: tabs, enterOpenedBoard: true },
  });
});

test('seguridad XSS almacenado se representa como texto en tablero y detalle', async ({ page, request }) => {
  const f = await fixture(request);
  const payload = '<img src=x onerror=alert(1)>';
  const dialogs: string[] = [];
  page.on('dialog', async (dialog) => { dialogs.push(dialog.message()); await dialog.dismiss(); });
  await login(page, f.email);
  await page.getByTestId('project-card-name').click();
  await expect(page.getByTestId('board-page')).toBeVisible();
  await page.getByTestId('task-create-title-input').fill(payload);
  const created = page.waitForResponse((response) => response.url().endsWith(`/api/projects/${f.project.id}/tasks`) && response.request().method() === 'POST');
  await page.getByTestId('task-create-submit').click();
  expect((await created).status()).toBe(201);
  const card = page.getByTestId('task-card-title').filter({ hasText: payload });
  await expect(card).toHaveText(payload);
  await expect(card.locator('img')).toHaveCount(0);
  await card.click();
  await expect(page.getByTestId('task-detail-page')).toBeVisible();
  await expect(page.getByTestId('task-title-input')).toHaveValue(payload);
  await expect(page.locator('img[onerror]')).toHaveCount(0);
  expect(dialogs).toEqual([]);
  evidence('xss-ui.json', { expectedBeforeExecution: 'React debe representar el título como texto; no insertar una imagen ni ejecutar alert', payload, boardShowsLiteral: true, detailShowsLiteral: true, injectedImages: 0, dialogs });
});
