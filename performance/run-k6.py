"""Ejecuta un perfil del práctico y conserva salida, resumen y código de salida."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
from datetime import datetime, timezone

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

parser = argparse.ArgumentParser()
parser.add_argument('profile', choices=['small', 'large'])
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
results = root / 'performance/results'
results.mkdir(exist_ok=True)
k6 = shutil.which('k6')
if not k6 and os.name == 'nt':
    candidate = Path(os.environ.get('ProgramFiles', 'C:/Program Files')) / 'k6/k6.exe'
    if candidate.exists():
        k6 = str(candidate)
if not k6:
    raise SystemExit('Instalá k6 y agregalo al PATH.')
vus, duration = ('1', '30s') if args.profile == 'small' else ('20', '1m')
command = [k6, 'run', '--no-color', '--quiet', '--summary-export',
           f'performance/results/{args.profile}-summary.json', '-e', f'VUS={vus}',
           '-e', f'DURATION={duration}', 'performance/scenarios/api-load.k6.js']
started = datetime.now(timezone.utc).isoformat()
with (results / f'{args.profile}-run.txt').open('w', encoding='utf-8') as log:
    process = subprocess.Popen(command, cwd=root, stdout=subprocess.PIPE,
                               stderr=subprocess.STDOUT, text=True, encoding='utf-8', errors='replace')
    for line in process.stdout:
        log.write(line)
        log.flush()
        print(line, end='', flush=True)
    code = process.wait()
# k6 incluye setup_data en el formato de exportación: nunca conservar el JWT.
summary_path = results / f'{args.profile}-summary.json'
if summary_path.exists():
    summary = json.loads(summary_path.read_text(encoding='utf-8'))
    if 'setup_data' in summary:
        summary['setup_data'].pop('headers', None)
    summary_path.write_text(json.dumps(summary, indent=2) + '\n', encoding='utf-8')
(results / f'{args.profile}-exit-code.txt').write_text(str(code) + '\n', encoding='utf-8')
(results / f'{args.profile}-execution.json').write_text(json.dumps({
    'started_utc': started, 'finished_utc': datetime.now(timezone.utc).isoformat(),
    'command': command, 'exit_code': code,
    'k6_version': subprocess.check_output([k6, 'version'], text=True).strip(),
}, indent=2) + '\n', encoding='utf-8')
sys.exit(code)
