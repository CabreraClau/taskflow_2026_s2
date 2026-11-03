"""Guarda conteos SQLite y verifica paginación sin guardar tokens ni cuerpos grandes."""
import json
import sqlite3
import sys
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[1]
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
with sqlite3.connect(f"file:{(root / 'server/prisma/dev.db').as_posix()}?mode=ro", uri=True) as db:
    counts = {table: db.execute(f'SELECT COUNT(*) FROM {table}').fetchone()[0]
              for table in ('users', 'projects', 'tasks', 'comments')}
    load = db.execute("SELECT id FROM projects WHERE name = '[Carga] Proyecto grande'").fetchone()
    counts['load_projects'] = db.execute("SELECT COUNT(*) FROM projects WHERE name LIKE '[Carga] %'").fetchone()[0]
    counts['load_tasks'] = db.execute('SELECT COUNT(*) FROM tasks WHERE projectId = ?', load).fetchone()[0] if load else 0
    counts['load_comments'] = db.execute('SELECT COUNT(*) FROM comments WHERE taskId IN (SELECT id FROM tasks WHERE projectId = ?)', load).fetchone()[0] if load else 0
    counts['orphan_comments'] = db.execute('SELECT COUNT(*) FROM comments WHERE taskId NOT IN (SELECT id FROM tasks)').fetchone()[0]

metadata = json.loads(subprocess.check_output(
    ['node', str(root / 'performance/inspect-api.cjs')], encoding='utf-8', timeout=120))
print(json.dumps({'counts': counts, **metadata}, indent=2, ensure_ascii=False))
