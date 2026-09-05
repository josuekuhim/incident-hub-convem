import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer } from '../helpers.js';

let tempDir: string;
let server: Awaited<ReturnType<typeof startServer>>;

before(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'incident-hub-seed-'));
  server = await startServer({ sqlitePath: join(tempDir, 'incident-hub.db') });
});

after(async () => {
  await server.stop();
  await rm(tempDir, { recursive: true, force: true });
});

test('seed is idempotent and writes no status changes', async () => {
  const first = await fetch(`${server.baseUrl}/seed`);
  assert.equal(first.status, 200);
  const second = await fetch(`${server.baseUrl}/seed`);
  assert.equal(second.status, 200);
  const incidents = await fetch(`${server.baseUrl}/incidents`);
  assert.equal(incidents.status, 200);
  const payload = await incidents.json();
  assert.equal(payload.length, 3);
  const statusChanges = await fetch(`${server.baseUrl}/incidents/1/status-history`);
  assert.equal(statusChanges.status, 404);
});
