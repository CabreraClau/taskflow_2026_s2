import { randomUUID } from 'node:crypto';

export interface UserData {
  email: string;
  password: string;
  name: string;
}

export interface ProjectData {
  name: string;
  description?: string;
}

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface TaskData {
  title: string;
  priority?: Priority;
}

// Sólo datos sintéticos. Cada llamada crea una identidad nueva, incluso en reintentos.
export const TEST_PASSWORD = 'Password1';

export function userData(role: string): UserData {
  return {
    email: `e2e-${role}-${randomUUID()}@example.test`,
    password: TEST_PASSWORD,
    name: `Usuario E2E ${role}`,
  };
}

export function projectData(overrides: Partial<ProjectData> = {}): ProjectData {
  return { name: `Proyecto E2E ${randomUUID()}`, ...overrides };
}

export function taskData(overrides: Partial<TaskData> = {}): TaskData {
  return { title: `Tarea E2E ${randomUUID()}`, priority: 'MEDIUM', ...overrides };
}
