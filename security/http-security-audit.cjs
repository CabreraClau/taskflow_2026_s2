#!/usr/bin/env node
'use strict';

// Local, isolated educational audit. No credentials or JWTs are persisted.
// Usage: node security/http-security-audit.cjs --isolated [--base http://127.0.0.1:3000/api] [--with-reset]
// The disposable database is prepared separately; this script never deletes it.
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const args = process.argv.slice(2);
function option(name, fallback) {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
}
if (!args.includes('--isolated')) {
  console.error('Refusing to run: prepare a disposable local database, then pass --isolated.');
  process.exit(1);
}
const base = new URL(option('--base', 'http://127.0.0.1:3000/api').replace(/\/$/, '') + '/');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname) || base.protocol !== 'http:') {
  console.error('Refusing to run: the API must be an HTTP loopback address.');
  process.exit(1);
}
const output = path.resolve(option('--output', 'security/http-results.json'));
const runId = `audit-${Date.now()}-${randomBytes(3).toString('hex')}`;
const password = `Audit7!${randomBytes(18).toString('hex')}`;
const evidence = {
  schemaVersion: 1,
  startedAt: new Date().toISOString(),
  baseUrl: base.href.replace(/\/$/, ''),
  runId,
  scope: 'Only disposable accounts/projects on a separately prepared isolated local database.',
  limits: [
    'HTTP observations describe this run only, not a complete security certification.',
    'An absent route (404 Endpoint not found) is not a successful authorization test.',
    'The bounded SQL injection is read-only and restricts results to the two synthetic project IDs.',
    'JWTs/passwords are generated in memory and redacted before persistence.',
    'Synthetic fixtures are retained until the isolated database is discarded.',
  ],
  fixtures: {},
  checks: [],
};

function sanitize(value, key = '') {
  if (/(token|password|secret|authorization|cookie)/i.test(key)) return '[REDACTED]';
  if (Array.isArray(value)) return value.map((item) => sanitize(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitize(v, k)]));
  }
  if (typeof value === 'string') {
    return value.replace(/eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g, '[REDACTED_JWT]');
  }
  return value;
}

async function request(method, relative, { token, body } = {}) {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const response = await fetch(new URL(relative.replace(/^\//, ''), base), {
    method, headers, redirect: 'error',
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(15000),
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return {
    status: response.status,
    data,
    record: {
      request: { method, path: `/api/${relative.replace(/^\//, '')}`, headers: sanitize(headers), body: sanitize(body) },
      response: { status: response.status, headers: sanitize(Object.fromEntries(response.headers)), body: sanitize(data) },
    },
  };
}

async function check(id, expectedBeforeExecution, action, evaluate) {
  const entry = { id, expectedBeforeExecution, startedAt: new Date().toISOString() };
  evidence.checks.push(entry);
  try {
    const result = await action();
    entry.http = result.record;
    Object.assign(entry, evaluate(result));
    return result;
  } catch (error) {
    entry.result = 'error';
    entry.observation = sanitize(error.message);
    throw error;
  }
}

function statusExpected(statuses, explanation) {
  return ({ status }) => ({
    result: statuses.includes(status) ? 'pass' : 'finding',
    observation: `${explanation} HTTP ${status}.`,
  });
}

function requireFixture(result, kind) {
  if (![200, 201].includes(result.status) || !result.data?.id && !result.data?.user?.id) {
    throw new Error(`Could not create ${kind}; see sanitized setup response.`);
  }
  return result.data;
}

function projectNumber(publicId) {
  if (!/^proj-[1-9][0-9]*$/.test(publicId)) throw new Error('Unexpected synthetic project ID.');
  return Number(publicId.slice(5));
}

async function main() {
  await check('headers-health', '200; inspect CSP, X-Content-Type-Options, frame protection, Referrer-Policy and disclosure headers.',
    () => request('GET', 'health'), ({ status, record }) => ({
      result: status === 200 ? 'observation' : 'error',
      observation: 'Header presence is evidence only; assess HTTP-local/HSTS and HTML/API context separately.',
      headersReviewed: record.response.headers,
    }));
  await check('projects-without-authentication', '401: unauthenticated requests must not list private projects.',
    () => request('GET', 'projects'), statusExpected([401], 'Unauthenticated project listing.'));

  const accounts = {};
  for (const label of ['A', 'B']) {
    const email = `${runId}-${label.toLowerCase()}@example.test`;
    const registration = await check(`setup-register-${label}`, '201; create a disposable account in the isolated database.',
      () => request('POST', 'auth/register', { body: { email, password, name: `Security audit ${label}` } }),
      statusExpected([201], `Disposable account ${label} registration.`));
    const registered = requireFixture(registration, `account ${label}`);
    accounts[label] = { ...registered.user, token: registered.token };
    const project = await check(`setup-project-${label}`, '201; each account owns a distinct project and is not a member of the other.',
      () => request('POST', 'projects', { token: registered.token, body: { name: `${runId}-${label}`, description: 'Disposable security audit fixture' } }),
      statusExpected([201], `Private synthetic project ${label} creation.`));
    accounts[label].project = requireFixture(project, `project ${label}`);
    const task = await check(`setup-task-${label}`, '201; each project contains a uniquely identifiable task.',
      () => request('POST', `projects/${project.data.id}/tasks`, { token: registered.token, body: { title: `${runId}-private-task-${label}`, description: `Synthetic private data ${label}` } }),
      statusExpected([201], `Private synthetic task ${label} creation.`));
    accounts[label].task = requireFixture(task, `task ${label}`);
    evidence.fixtures[label] = { userId: registered.user.id, email, projectId: project.data.id, taskId: task.data.id, taskTitle: task.data.title };
  }
  const { A, B } = accounts;

  for (const [label, user, other] of [['A', A, B], ['B', B, A]]) {
    await check(`projects-as-${label}`, '200; include the owned synthetic project and exclude the other user\'s private project.',
      () => request('GET', 'projects', { token: user.token }), ({ status, data }) => {
        const ids = Array.isArray(data) ? data.map((p) => p.id) : [];
        return { result: status === 200 && ids.includes(user.project.id) && !ids.includes(other.project.id) ? 'pass' : 'finding', observation: `Own project present: ${ids.includes(user.project.id)}; foreign project exposed: ${ids.includes(other.project.id)}.` };
      });
  }
  await check('get-project-route-applicability', 'GET /projects/:id is not implemented in this version; 404 Endpoint not found means not applicable.',
    () => request('GET', `projects/${A.project.id}`, { token: B.token }), ({ status, data }) => ({
      result: status === 404 && data?.error?.message === 'Endpoint not found' ? 'not-applicable' : 'observation',
      observation: 'This endpoint cannot validate object authorization; the implemented task routes are checked below.',
    }));
  await check('foreign-project-tasks', '403 or 404; B cannot list A\'s private tasks.',
    () => request('GET', `projects/${A.project.id}/tasks`, { token: B.token }), statusExpected([403, 404], 'Foreign task listing.'));
  await check('foreign-task-read', '403 or 404; B cannot read A\'s task directly.',
    () => request('GET', `tasks/${A.task.id}`, { token: B.token }), statusExpected([403, 404], 'Foreign task detail.'));
  await check('foreign-task-status', '403 or 404; B is neither a member/admin nor assignee of A\'s task.',
    () => request('PATCH', `tasks/${A.task.id}`, { token: B.token, body: { status: 'IN_PROGRESS' } }),
    statusExpected([403, 404], 'Foreign state transition.'));
  const changedTitle = `${runId}-changed-by-nonmember-B`;
  const change = await check('foreign-task-title', '403 or 404; non-members must not modify the title either.',
    () => request('PATCH', `tasks/${A.task.id}`, { token: B.token, body: { title: changedTitle } }),
    statusExpected([403, 404], 'Foreign task title update.'));
  await check('owner-verifies-foreign-title-update', '200 with original title and TODO state; verify persistence instead of relying on HTTP status alone.',
    () => request('GET', `tasks/${A.task.id}`, { token: A.token }), ({ status, data }) => ({
      result: status === 200 && data?.title === A.task.title && data?.status === 'TODO' ? 'pass' : 'finding',
      observation: `Foreign title persisted: ${data?.title === changedTitle}; current status: ${data?.status}.`,
    }));
  if (change.status === 200) {
    await check('restore-synthetic-title', '200; restore only the synthetic task owned by A.',
      () => request('PATCH', `tasks/${A.task.id}`, { token: A.token, body: { title: A.task.title } }),
      statusExpected([200], 'Synthetic task title restoration.'));
  }
  await check('assign-nonmember', '400; project owner cannot assign a task to user B who is not a project member.',
    () => request('PATCH', `tasks/${A.task.id}`, { token: A.token, body: { assigneeId: B.id } }),
    statusExpected([400], 'Non-member assignee validation.'));

  await check('sqli-classic-login', '401; the classic SQLi string must not authenticate without valid credentials.',
    () => request('POST', 'auth/login', { body: { email: "' OR 1=1 --", password: 'WrongPassword7!' } }),
    statusExpected([401], 'Classic login injection.'));
  await check('search-baseline-own-project', '200; a literal unique marker only returns A\'s own synthetic task.',
    () => request('GET', `projects/${A.project.id}/tasks?search=${encodeURIComponent(A.task.title)}`, { token: A.token }),
    ({ status, data }) => ({ result: status === 200 && Array.isArray(data?.items) && data.items.length === 1 && data.items[0].id === A.task.id ? 'pass' : 'finding', observation: 'Baseline literal search before injection.' }));
  await check('sqli-classic-search', 'Treat the input as literal text or reject with 4xx; a 500 is a robustness problem but does not alone prove a data leak.',
    () => request('GET', `projects/${A.project.id}/tasks?search=${encodeURIComponent("' OR 1=1 --")}`, { token: A.token }),
    ({ status, data }) => ({ result: status === 500 ? 'observation' : status === 200 && (data?.items ?? []).some((t) => t.projectId !== A.project.id) ? 'finding' : 'pass', observation: `Classic search injection produced HTTP ${status}; the bounded test determines cross-project impact.` }));
  const syntheticIds = [projectNumber(A.project.id), projectNumber(B.project.id)];
  const boundedPayload = `') > 0) AND 0 = 1 OR projectId IN (${syntheticIds.join(', ')}) --`;
  await check('sqli-bounded-cross-project-read', 'No rows from B; input must remain data. The payload restricts the SELECT to our synthetic A/B project IDs.',
    () => request('GET', `projects/${A.project.id}/tasks?search=${encodeURIComponent(boundedPayload)}`, { token: A.token }),
    ({ status, data }) => {
      const items = Array.isArray(data?.items) ? data.items : [];
      const leaked = items.some((t) => t.id === B.task.id && t.projectId === B.project.id);
      return { result: leaked ? 'finding' : [200, 400, 422].includes(status) ? 'pass' : 'observation', observation: `Synthetic task B read by A: ${leaked}; unrelated projects returned: ${items.some((t) => ![A.project.id, B.project.id].includes(t.projectId))}.`, boundedPayload };
    });

  const unsignedJwt = [
    Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify({ userId: Number(B.id.split('-').pop()), email: B.email, exp: Math.floor(Date.now() / 1000) + 300 })).toString('base64url'),
    '',
  ].join('.');
  await check('jwt-alg-none', '401; an unsigned alg=none token must be rejected.',
    () => request('GET', 'projects', { token: unsignedJwt }), statusExpected([401], 'Unsigned token validation.'));

  const lockAttempts = [];
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const result = await check(`lockout-failed-attempt-${attempt}`, '401; bounded five-attempt check on synthetic account B only.',
      () => request('POST', 'auth/login', { body: { email: B.email, password: 'Incorrect7!' } }),
      statusExpected([401], `Synthetic login failure ${attempt}.`));
    lockAttempts.push(result.status);
  }
  await check('lockout-valid-credentials-after-five-failures', '401 with temporary-lock message, even with the correct synthetic password.',
    () => request('POST', 'auth/login', { body: { email: B.email, password } }), ({ status, data }) => ({
      result: status === 401 && /temporarily locked/i.test(data?.error?.message ?? '') ? 'pass' : 'finding',
      observation: `Five failed requests: ${lockAttempts.join(', ')}; valid credentials after lock: HTTP ${status}. No waiting, concurrency or rate-limit bypass was tested.`,
    }));

  if (args.includes('--with-reset')) {
    const email = `${runId}-reset-only@example.test`;
    const initialPassword = `Initial7!${randomBytes(16).toString('hex')}`;
    const firstPassword = `First7!${randomBytes(16).toString('hex')}`;
    const secondPassword = `Second7!${randomBytes(16).toString('hex')}`;
    const registration = await check('setup-register-reset-only', '201; separate disposable account C, never a real user or a project owner from the earlier checks.',
      () => request('POST', 'auth/register', { body: { email, password: initialPassword, name: 'Security audit reset only' } }),
      statusExpected([201], 'Separate disposable password-recovery account registration.'));
    const registered = requireFixture(registration, 'password-recovery account C');
    evidence.fixtures.C = { userId: registered.user.id, email, purpose: 'Optional password-recovery test only; no project memberships.' };
    const forgot = await check('password-recovery-public-token-disclosure', '200 with a generic message, without recovery credentials in the public response; token should travel through a separate verified channel.',
      () => request('POST', 'auth/forgot-password', { body: { email } }), ({ status, data }) => ({
        result: status === 200 && typeof data?.token === 'string' ? 'finding' : status === 200 ? 'pass' : 'observation',
        observation: `Recovery credential disclosed in unauthenticated JSON response: ${typeof data?.token === 'string'}. The credential itself is redacted.`,
      }));
    if (forgot.status === 200 && typeof forgot.data?.token === 'string') {
      const resetToken = forgot.data.token;
      await check('password-reset-first-use', '200; first use of a fresh recovery token changes only the synthetic C account.',
        () => request('POST', 'auth/reset-password', { body: { token: resetToken, newPassword: firstPassword } }),
        statusExpected([200], 'First recovery-token use.'));
      await check('password-reset-same-token-reuse', '400 or 401; a used recovery token must not reset the password again.',
        () => request('POST', 'auth/reset-password', { body: { token: resetToken, newPassword: secondPassword } }),
        statusExpected([400, 401], 'Reusing the same recovery token.'));
      await check('password-reset-reuse-login-verification', '401; if reuse was rejected, the second password must not authenticate.',
        () => request('POST', 'auth/login', { body: { email, password: secondPassword } }),
        statusExpected([401], 'Verify whether the reused recovery token actually replaced the password.'));
    }
  }
}

main().catch((error) => {
  evidence.fatalError = sanitize(error.message);
  process.exitCode = 1;
}).finally(() => {
  evidence.completedAt = new Date().toISOString();
  evidence.summary = evidence.checks.reduce((totals, c) => ({ ...totals, [c.result ?? 'incomplete']: (totals[c.result ?? 'incomplete'] ?? 0) + 1 }), {});
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(sanitize(evidence), null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
  console.log(`Sanitized HTTP evidence written to ${output}`);
  console.log(JSON.stringify(evidence.summary));
});
