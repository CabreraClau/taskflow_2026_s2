import type { Locator, Page } from '@playwright/test';

/** Una tarjeta del tablero, reutilizada en las tres columnas de estado. */
export class TaskCard {
  readonly root: Locator;
  readonly title: Locator;
  readonly assignee: Locator;
  readonly status: Locator;

  constructor(page: Page, taskId: string) {
    // El id del enlace identifica la tarea incluso si varias tienen el mismo
    // título o si cambia de columna. No depende de posición ni clases de estilo.
    const taskLink = page.locator(`a[href$="/tasks/${encodeURIComponent(taskId)}"]`);
    this.root = page.getByTestId('task-card').filter({ has: taskLink });
    this.title = this.root.getByTestId('task-card-title');
    this.assignee = this.root.getByTestId('task-card-assignee');
    this.status = this.root.getByTestId('task-card-status-select');
  }

  async open(): Promise<void> {
    await this.title.click();
  }
}
