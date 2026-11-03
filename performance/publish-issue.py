"""Publica el reporte en origin usando la credencial de Git, sin imprimirla.

Uso: python performance/publish-issue.py --check
     python performance/publish-issue.py --publish
"""
import argparse
import json
import os
import subprocess
from datetime import datetime, timezone
import urllib.error
import urllib.request
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--publish', action='store_true')
parser.add_argument('--check', action='store_true')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
remote = subprocess.check_output(['git', 'remote', 'get-url', 'origin'], cwd=root, text=True).strip()
prefix = 'https://github.com/'
if not remote.startswith(prefix):
    raise SystemExit('Se requiere un origin HTTPS de GitHub.')
repository = remote[len(prefix):].removesuffix('.git')
env = {**os.environ, 'GIT_TERMINAL_PROMPT': '0', 'GCM_INTERACTIVE': 'never'}
credential = subprocess.run(['git', 'credential', 'fill'], cwd=root,
    input='protocol=https\nhost=github.com\n\n', text=True, capture_output=True, env=env)
fields = dict(line.split('=', 1) for line in credential.stdout.splitlines() if '=' in line)
token = fields.get('password')
if not token:
    raise SystemExit('No hay credencial GitHub disponible en Git Credential Manager.')

def api(path, payload=None):
    req = urllib.request.Request('https://api.github.com' + path,
        data=json.dumps(payload).encode() if payload is not None else None,
        headers={'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json',
                 'User-Agent': 'TaskFlow-performance-practical', 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        raise SystemExit(f'GitHub devolvió HTTP {error.code}. No se publicó el issue.') from None

repo = api('/repos/' + repository)
status = {'repository': repository, 'issues_enabled': repo.get('has_issues'),
          'permissions': repo.get('permissions'),
          'checked_utc': datetime.now(timezone.utc).isoformat()}
(root / 'performance/results/github-status.json').write_text(
    json.dumps(status, indent=2) + '\n', encoding='utf-8')
print(json.dumps(status, indent=2))
if args.publish:
    if not repo.get('has_issues'):
        raise SystemExit('Issues está deshabilitado. Un administrador debe activarlo antes de publicar.')
    receipt = root / 'performance/results/github-issue.json'
    if receipt.exists():
        raise SystemExit('Ya existe un comprobante de publicación; no se crea un duplicado.')
    body = (root / 'performance/ISSUE-performance.md').read_text(encoding='utf-8')
    title, _, content = body.partition('\n')
    result = api('/repos/' + repository + '/issues', {'title': title.lstrip('# ').strip(), 'body': content.strip()})
    output = {'number': result['number'], 'url': result['html_url']}
    receipt.write_text(json.dumps(output, indent=2) + '\n', encoding='utf-8')
    print(output['url'])
