import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer } from '../helpers.js';

let tempDir: string;
let server: Awaited<ReturnType<typeof startServer>>;

before(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'incident-hub-acceptance-'));
  server = await startServer({ sqlitePath: join(tempDir, 'incident-hub.db') });
});

after(async () => {
  await server.stop();
  await rm(tempDir, { recursive: true, force: true });
});

test('Incident Hub fulfills creation, transition, history, filters, and dashboard contracts', async () => {
  const initialList = await fetch(`${server.baseUrl}/incidents`);
  const seeded = await initialList.json();
  assert.equal(initialList.status, 200);
  assert.equal(seeded.length, 3);
  assert.ok(seeded.every((incident: any) => Number.isFinite(Date.parse(incident.createdAt)) && Number.isFinite(Date.parse(incident.updatedAt))));

  const invalidCreate = await fetch(`${server.baseUrl}/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '', description: 'Description', severity: 'Critical', owner: 'Ana' }),
  });
  assert.equal(invalidCreate.status, 400);
  assert.match((await invalidCreate.json()).error, /título/i);

  const create = await fetch(`${server.baseUrl}/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 999,
      title: 'Critical acceptance incident',
      description: 'Exercises the complete workflow',
      severity: 'Critical',
      owner: 'Ana',
      status: 'Resolved',
      createdAt: '2000-01-01T00:00:00.000Z',
    }),
  });
  const incident = await create.json();
  assert.equal(create.status, 201);
  assert.equal(incident.status, 'Open');
  assert.equal(incident.id === 999, false);
  assert.equal(incident.createdAt, incident.updatedAt);

  const forbidden = await fetch(`${server.baseUrl}/incidents/${incident.id}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Resolved' }),
  });
  assert.equal(forbidden.status, 422);
  assert.match((await forbidden.json()).error, /passar por In Progress/i);

  const untouchedDetail = await fetch(`${server.baseUrl}/incidents/${incident.id}`);
  const untouched = await untouchedDetail.json();
  assert.equal(untouched.status, 'Open');
  assert.equal(untouched.history.length, 0);
  assert.equal(untouched.updatedAt, incident.updatedAt);

  for (const target of ['In Progress', 'Resolved']) {
    const transition = await fetch(`${server.baseUrl}/incidents/${incident.id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: target }),
    });
    assert.equal(transition.status, 200);
    assert.equal((await transition.json()).status, target);
  }

  const detailResponse = await fetch(`${server.baseUrl}/incidents/${incident.id}`);
  const detail = await detailResponse.json();
  assert.equal(detailResponse.status, 200);
  assert.equal(detail.status, 'Resolved');
  assert.equal(detail.history.length, 2);
  assert.deepEqual(detail.history.map((entry: any) => [entry.fromStatus, entry.toStatus]), [
    ['Open', 'In Progress'],
    ['In Progress', 'Resolved'],
  ]);
  assert.ok(detail.history.every((entry: any) => Number.isFinite(Date.parse(entry.changedAt))));

  const criticalResolved = await fetch(`${server.baseUrl}/incidents?status=Resolved&severity=Critical`);
  const filtered = await criticalResolved.json();
  assert.equal(criticalResolved.status, 200);
  assert.ok(filtered.some((item: any) => item.id === incident.id));

  const invalidFilter = await fetch(`${server.baseUrl}/incidents?severity=Urgent`);
  assert.equal(invalidFilter.status, 400);
  assert.match((await invalidFilter.json()).error, /filtro severity/i);

  const dashboard = await fetch(`${server.baseUrl}/dashboard`);
  assert.deepEqual(await dashboard.json(), { open: 1, criticalUnresolved: 1, resolved: 2 });
});