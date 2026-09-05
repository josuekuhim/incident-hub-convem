import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { startServer } from '../helpers.js';

let tempDir: string;
let server: Awaited<ReturnType<typeof startServer>>;

before(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'incident-hub-list-'));
  server = await startServer({ sqlitePath: join(tempDir, 'incident-hub.db') });
});

after(async () => {
  await server.stop();
  await rm(tempDir, { recursive: true, force: true });
});

test('GET /incidents returns the seeded incidents and empty state when no seed is present', async () => {
  const response = await fetch(`${server.baseUrl}/incidents`);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.length, 3);
  assert.deepEqual(payload.map((item: any) => item.title), [
    'Incorrect customer notification',
    'Reconciliation delay',
    'Payment API instability',
  ]);
  assert.deepEqual(payload.map((item: any) => item.status), ['Resolved', 'In Progress', 'Open']);
});
