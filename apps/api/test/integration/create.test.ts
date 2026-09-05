import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer } from '../helpers.js';

let tempDir: string;
let server: Awaited<ReturnType<typeof startServer>>;

before(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'incident-hub-create-'));
  server = await startServer({ sqlitePath: join(tempDir, 'incident-hub.db') });
});

after(async () => {
  await server.stop();
  await rm(tempDir, { recursive: true, force: true });
});

test('create incident validates user input and persists the record', async () => {
  const created = await fetch(`${server.baseUrl}/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'New incident', description: 'Some description', severity: 'Critical', owner: 'Ana' }),
  });
  assert.equal(created.status, 201);
  const payload = await created.json();
  assert.equal(payload.status, 'Open');
  const listResponse = await fetch(`${server.baseUrl}/incidents`);
  assert.equal(listResponse.status, 200);
  const list = await listResponse.json();
  assert.equal(list.length, 4);
  assert.ok(list.some((item: any) => item.title === 'New incident'));
});
