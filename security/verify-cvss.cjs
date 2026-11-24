#!/usr/bin/env node
'use strict';

// Verifica los vectores con el motor de la calculadora oficial FIRST.
// Descargar previamente https://www.first.org/cvss/calculator/cvsscalc31.js
// Uso: node security/verify-cvss.cjs .audit/cvsscalc31.js [salida.json]
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

if (!process.argv[2]) throw new Error('Indicar la ruta del cvsscalc31.js oficial de FIRST.');
const source = fs.readFileSync(process.argv[2]);
const context = {};
vm.runInNewContext(source.toString('utf8'), context, { timeout: 1000 });
const findings = [
  { id: 'SEC-01', vector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:N/A:N', expected: 4.3 },
  { id: 'SEC-02', vector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:L/A:N', expected: 5.4 },
].map(({ id, vector, expected }) => {
  const result = context.CVSS31.calculateCVSSFromVector(vector);
  assert.equal(result.success, true, `${id}: vector inválido`);
  assert.equal(Number(result.baseMetricScore), expected, `${id}: puntaje inesperado`);
  assert.equal(result.baseSeverity, 'Medium');
  return { id, vector, baseScore: Number(result.baseMetricScore), severity: result.baseSeverity,
    calculator: `https://www.first.org/cvss/calculator/3.1#${vector}` };
});
const evidence = {
  calculatedAt: new Date().toISOString(),
  engine: 'FIRST CVSS 3.1 calculator, calculateCVSSFromVector',
  source: 'https://www.first.org/cvss/calculator/cvsscalc31.js',
  sourceSha256: createHash('sha256').update(source).digest('hex'),
  nodeVersion: process.version,
  scope: 'Puntajes base del impacto acreditado; sin métricas temporales ni ambientales.',
  findings,
};
const output = process.argv[3];
if (output) {
  fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(evidence, null, 2) + '\n', { flag: 'wx' });
}
console.log(JSON.stringify(evidence, null, 2));
