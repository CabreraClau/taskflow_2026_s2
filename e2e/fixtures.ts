import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { projectData, taskData, userData, type UserData } from './data/test-data';

interface PublicUser {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

export interface TestAccount extends UserData {
  token: string;
  user: PublicUser;
  userId: string;
}

export interface AccessibilityScenario {
  email: string;
  password: string;
  project: { id: string; name: string };
  task: { id: string; title: string };
}

type Fixtures = {
  owner: TestAccount;
  member: TestAccount;
  secondMember: TestAccount;
  outsider: TestAccount;
  authenticatedPage: Page;
  accessibilityScenario: AccessibilityScenario;
  evidence: (name: string, data: unknown) => Promise<void>;
};

async function registerAccount(request: APIRequestContext, role: string): Promise<TestAccount> {
  const data = userData(role);
  const response = await request.post('/api/auth/register', { data });
  expect(response.status(), `Preparar usuario ${role}`).toBe(201);
  const { token, user } = await response.json() as { token: string; user: PublicUser };
  return { ...data, token, user, userId: user.id };
}

// Fixtures de alcance test, creadas sólo cuando se piden. Ninguna cuenta viene del seed.
// member y secondMember son candidatos: cada caso los incorpora a SU proyecto por UI.
export const test = base.extend<Fixtures>({
  owner: async ({ request }, use) => {
    await use(await registerAccount(request, 'owner'));
  },
  member: async ({ request }, use) => {
    await use(await registerAccount(request, 'member'));
  },
  secondMember: async ({ request }, use) => {
    await use(await registerAccount(request, 'second-member'));
  },
  outsider: async ({ request }, use) => {
    await use(await registerAccount(request, 'outsider'));
  },
  authenticatedPage: async ({ page, owner }, use) => {
    // El token proviene de la API real. El estado sólo vive en el contexto de este test.
    await page.goto('/login');
    await page.evaluate(({ token, user }) => {
      localStorage.setItem('taskflow_token', token);
      localStorage.setItem('taskflow_user', JSON.stringify(user));
    }, { token: owner.token, user: owner.user });
    await page.goto('/projects');
    await expect(page.getByTestId('projects-page')).toBeVisible();
    await use(page);
    // Playwright cierra page/context; start-api.cjs elimina la base temporal al terminar.
  },
  accessibilityScenario: async ({ request, owner }, use) => {
    const headers = { Authorization: `Bearer ${owner.token}` };
    const projectResponse = await request.post('/api/projects', {
      headers, data: projectData(),
    });
    expect(projectResponse.status()).toBe(201);
    const project = await projectResponse.json() as AccessibilityScenario['project'];
    const taskResponse = await request.post(`/api/projects/${project.id}/tasks`, {
      headers, data: taskData({ title: 'Tarea para auditoría de accesibilidad' }),
    });
    expect(taskResponse.status()).toBe(201);
    const task = await taskResponse.json() as AccessibilityScenario['task'];
    await use({ email: owner.email, password: owner.password, project, task });
  },
  evidence: async ({}, use, testInfo) => {
    await use(async (name, data) => {
      const file = testInfo.outputPath(name);
      writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
      await testInfo.attach(name, { path: file, contentType: 'application/json' });
    });
  },
});

export { expect };
