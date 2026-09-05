import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
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
  const executeSeed = () => spawnSync(process.execPath, ['--import', 'tsx', 'src/seed.ts'], {
    cwd: process.cwd(),
    env: { ...process.env, SQLITE_PATH: server.sqlitePath },
    encoding: 'utf8',
  });

  assert.equal(executeSeed().status, 0);
  assert.equal(executeSeed().status, 0);

  const incidents = await fetch(`${server.baseUrl}/incidents`);
  assert.equal(incidents.status, 200);
  const payload = await incidents.json();
  assert.equal(payload.length, 3);
  for (const incident of payload) {
    const detail = await fetch(`${server.baseUrl}/incidents/${incident.id}`);
    assert.equal(detail.status, 200);
    assert.deepEqual((await detail.json()).history, []);
  }
});
