import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const TMP = path.join(__dirname, '.tmp');
export const TEMPLATE_DB = path.join(TMP, 'template.db');

export default function globalSetup(): void {
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(TMP, { recursive: true });
  // Precrear el archivo evita el error del motor de Prisma observado en Windows.
  fs.writeFileSync(TEMPLATE_DB, '');

  execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'db', 'push', '--skip-generate'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: `file:${TEMPLATE_DB.replace(/\\/g, '/')}` },
    stdio: 'inherit',
  });
}
