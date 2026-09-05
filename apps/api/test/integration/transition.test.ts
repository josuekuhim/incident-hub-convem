import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer } from '../helpers.js';

let tempDir: string;
let server: Awaited<ReturnType<typeof startServer>>;

before(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'incident-hub-transition-'));
  server = await startServer({ sqlitePath: join(tempDir, 'incident-hub.db') });
});

after(async () => {
  await server.stop();
  await rm(tempDir, { recursive: true, force: true });
});

test('accepted and rejected transitions persist the correct history and data', async () => {
  const create = await fetch(`${server.baseUrl}/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Transition test', description: 'desc', severity: 'Critical', owner: 'Ana' }),
  });
  const incident = await create.json();

  const reject = await fetch(`${server.baseUrl}/incidents/${incident.id}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Resolved' }),
  });
  const rejectPayload = await reject.json();
  assert.equal(reject.status, 422);
  assert.match(rejectPayload.error, /In Progress/);

  const accept = await fetch(`${server.baseUrl}/incidents/${incident.id}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'In Progress' }),
  });
  const acceptedPayload = await accept.json();
  assert.equal(acceptedPayload.status, 'In Progress');

  const detail = await fetch(`${server.baseUrl}/incidents/${incident.id}`);
  const detailPayload = await detail.json();
  assert.equal(detailPayload.history.length, 1);
  assert.equal(detailPayload.history[0].toStatus, 'In Progress');
});
