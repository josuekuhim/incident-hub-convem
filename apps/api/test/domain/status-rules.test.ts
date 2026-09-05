import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avaliarTransicao } from '../../src/domain/status-rules.js';

const severities = ['Low', 'Medium', 'High', 'Critical'] as const;
const statuses = ['Open', 'In Progress', 'Resolved'] as const;

test('avaliarTransicao covers the full 4x3x3 matrix', () => {
  const expected = [
    { severity: 'Low', from: 'Open', to: 'Open', allowed: false, reason: 'o incidente já está em Open' },
    { severity: 'Low', from: 'Open', to: 'In Progress', allowed: true },
    { severity: 'Low', from: 'Open', to: 'Resolved', allowed: true },
    { severity: 'Low', from: 'In Progress', to: 'Open', allowed: true },
    { severity: 'Low', from: 'In Progress', to: 'In Progress', allowed: false, reason: 'o incidente já está em In Progress' },
    { severity: 'Low', from: 'In Progress', to: 'Resolved', allowed: true },
    { severity: 'Low', from: 'Resolved', to: 'Open', allowed: true },
    { severity: 'Low', from: 'Resolved', to: 'In Progress', allowed: true },
    { severity: 'Low', from: 'Resolved', to: 'Resolved', allowed: false, reason: 'o incidente já está em Resolved' },
    { severity: 'Medium', from: 'Open', to: 'Open', allowed: false, reason: 'o incidente já está em Open' },
    { severity: 'Medium', from: 'Open', to: 'In Progress', allowed: true },
    { severity: 'Medium', from: 'Open', to: 'Resolved', allowed: true },
    { severity: 'Medium', from: 'In Progress', to: 'Open', allowed: true },
    { severity: 'Medium', from: 'In Progress', to: 'In Progress', allowed: false, reason: 'o incidente já está em In Progress' },
    { severity: 'Medium', from: 'In Progress', to: 'Resolved', allowed: true },
    { severity: 'Medium', from: 'Resolved', to: 'Open', allowed: true },
    { severity: 'Medium', from: 'Resolved', to: 'In Progress', allowed: true },
    { severity: 'Medium', from: 'Resolved', to: 'Resolved', allowed: false, reason: 'o incidente já está em Resolved' },
    { severity: 'High', from: 'Open', to: 'Open', allowed: false, reason: 'o incidente já está em Open' },
    { severity: 'High', from: 'Open', to: 'In Progress', allowed: true },
    { severity: 'High', from: 'Open', to: 'Resolved', allowed: true },
    { severity: 'High', from: 'In Progress', to: 'Open', allowed: true },
    { severity: 'High', from: 'In Progress', to: 'In Progress', allowed: false, reason: 'o incidente já está em In Progress' },
    { severity: 'High', from: 'In Progress', to: 'Resolved', allowed: true },
    { severity: 'High', from: 'Resolved', to: 'Open', allowed: true },
    { severity: 'High', from: 'Resolved', to: 'In Progress', allowed: true },
    { severity: 'High', from: 'Resolved', to: 'Resolved', allowed: false, reason: 'o incidente já está em Resolved' },
    { severity: 'Critical', from: 'Open', to: 'Open', allowed: false, reason: 'o incidente já está em Open' },
    { severity: 'Critical', from: 'Open', to: 'In Progress', allowed: true },
    { severity: 'Critical', from: 'Open', to: 'Resolved', allowed: false, reason: 'incidentes Critical precisam passar por In Progress antes de serem resolvidos' },
    { severity: 'Critical', from: 'In Progress', to: 'Open', allowed: true },
    { severity: 'Critical', from: 'In Progress', to: 'In Progress', allowed: false, reason: 'o incidente já está em In Progress' },
    { severity: 'Critical', from: 'In Progress', to: 'Resolved', allowed: true },
    { severity: 'Critical', from: 'Resolved', to: 'Open', allowed: true },
    { severity: 'Critical', from: 'Resolved', to: 'In Progress', allowed: true },
    { severity: 'Critical', from: 'Resolved', to: 'Resolved', allowed: false, reason: 'o incidente já está em Resolved' },
  ] as const;

  let index = 0;
  for (const severity of severities) {
    for (const from of statuses) {
      for (const to of statuses) {
        const result = avaliarTransicao(severity, from, to);
        const expectation = expected[index];
        assert.equal(result.permitido, expectation.allowed, `${severity} ${from} -> ${to}`);
        if (expectation.allowed) {
          assert.equal(result.permitido, true);
        } else {
          assert.equal(result.motivo, expectation.reason);
        }
        index += 1;
      }
    }
  }
});
