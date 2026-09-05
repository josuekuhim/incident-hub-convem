import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateCreateBody, validateFilterValue, validateStatusValue } from '../../src/http/validation.js';

test('validateCreateBody accepts a complete incident and trims required text fields', () => {
  const result = validateCreateBody({
    title: ' Payment API instability ',
    description: ' Intermittent failures ',
    severity: 'Critical',
    owner: ' Ana ',
  });

  assert.deepEqual(result, {
    title: 'Payment API instability',
    description: 'Intermittent failures',
    severity: 'Critical',
    owner: 'Ana',
  });
});

test('validateCreateBody rejects each required field and invalid severities', () => {
  const valid = { title: 'Title', description: 'Description', severity: 'Low', owner: 'Owner' };
  const cases = [
    { body: { ...valid, title: '' }, message: 'título' },
    { body: { ...valid, description: '   ' }, message: 'descrição' },
    { body: { ...valid, owner: undefined }, message: 'responsável' },
    { body: { ...valid, severity: 'Urgent' }, message: 'severidade' },
    { body: null, message: 'título' },
  ];

  for (const { body, message } of cases) {
    assert.throws(() => validateCreateBody(body), new RegExp(message, 'i'));
  }
});

test('validateStatusValue accepts only canonical status values', () => {
  for (const status of ['Open', 'In Progress', 'Resolved']) {
    assert.equal(validateStatusValue(status), status);
  }

  for (const invalid of ['open', 'Archived', '', undefined]) {
    assert.throws(() => validateStatusValue(invalid), /status/i);
  }
});

test('validateFilterValue accepts canonical values, ignores empty filters, and rejects invalid values', () => {
  assert.equal(validateFilterValue('Open', 'status'), 'Open');
  assert.equal(validateFilterValue('Critical', 'severity'), 'Critical');
  assert.equal(validateFilterValue('', 'status'), null);
  assert.equal(validateFilterValue('   ', 'severity'), null);
  assert.throws(() => validateFilterValue('Archived', 'status'), /filtro status/i);
  assert.throws(() => validateFilterValue('Urgent', 'severity'), /filtro severity/i);
});