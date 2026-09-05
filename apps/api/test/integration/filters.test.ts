import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer } from '../helpers.js';

let tempDir: string;
let server: Awaited<ReturnType<typeof startServer>>;

before(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'incident-hub-filters-'));
  server = await startServer({ sqlitePath: join(tempDir, 'incident-hub.db') });
});

after(async () => {
  await server.stop();
  await rm(tempDir, { recursive: true, force: true });
});

test('filters combine as an intersection and invalid values are rejected', async () => {
  const response = await fetch(`${server.baseUrl}/incidents?status=Open&severity=Critical`);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.length, 1);
  assert.equal(payload[0].title, 'Payment API instability');

  const invalid = await fetch(`${server.baseUrl}/incidents?status=Archived`);
  assert.equal(invalid.status, 400);
});
