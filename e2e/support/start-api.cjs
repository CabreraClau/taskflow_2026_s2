// Servidor exclusivo de E2E: nunca recibe DATABASE_URL del entorno de desarrollo.
const { spawn, spawnSync } = require('node:child_process');
const { mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');

const serverDir = path.resolve(__dirname, '../../server');
const temporaryDir = mkdtempSync(path.join(tmpdir(), 'taskflow-e2e-'));
const databaseFile = path.join(temporaryDir, 'e2e.db');
writeFileSync(databaseFile, ''); // Prisma/SQLite requiere el archivo en algunos entornos.
const env = {
  ...process.env,
  DATABASE_URL: `file:${databaseFile.replace(/\\/g, '/')}`,
  JWT_SECRET: 'taskflow-e2e-only',
  PORT: '3100',
  TZ: 'America/Montevideo',
};

process.once('exit', () => rmSync(temporaryDir, { recursive: true, force: true }));
const migration = spawnSync(process.execPath, [
  require.resolve('prisma/build/index.js', { paths: [serverDir] }), 'migrate', 'deploy',
], { cwd: serverDir, env, stdio: 'inherit' });
if (migration.error || migration.status !== 0) {
  console.error(migration.error || 'No se pudo preparar la base E2E');
  process.exit(migration.status || 1);
}

console.log('E2E: SQLite temporal preparada con migraciones, sin seed.');
const api = spawn(process.execPath, [
  '-r', require.resolve('ts-node/register/transpile-only', { paths: [serverDir] }),
  'src/index.ts',
], { cwd: serverDir, env, stdio: 'inherit' });
api.once('error', (error) => { console.error(error); process.exit(1); });
api.once('exit', (code, signal) => process.exit(signal === 'SIGTERM' ? 0 : (code ?? 1)));
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.once(signal, () => api.kill(signal));
}
