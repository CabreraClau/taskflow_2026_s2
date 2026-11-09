import fs from 'fs';
import path from 'path';

const TMP = path.join(__dirname, '.tmp');
const TEMPLATE_DB = path.join(TMP, 'template.db');

// Cada archivo de test corre contra su propia base SQLite.
const unique = `${path.basename(expect.getState().testPath ?? 'test')}-${process.pid}-${Date.now()}.db`;
const dbFile = path.join(TMP, unique);

fs.copyFileSync(TEMPLATE_DB, dbFile);
process.env.DATABASE_URL = `file:${dbFile.replace(/\\/g, '/')}`;
process.env.JWT_SECRET = 'test-secret';

afterAll(async () => {
  const { db } = await import('../src/lib/db');
  await db.$disconnect();
  fs.rmSync(dbFile, { force: true });
});
