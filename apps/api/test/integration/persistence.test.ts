import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { startServer } from '../helpers.js';

test('incidents and status history survive a real server restart', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'incident-hub-persistence-'));
  const sqlitePath = join(tempDir, 'incident-hub.db');
  let firstServer = await startServer({ sqlitePath });

  try {
    const create = await fetch(`${firstServer.baseUrl}/incidents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Persists after restart',
        description: 'Created before stopping the process',
        severity: 'High',
        owner: 'Ana',
      }),
    });
    assert.equal(create.status, 201);
    const created = await create.json();

    const transition = await fetch(`${firstServer.baseUrl}/incidents/${created.id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Resolved' }),
    });
    assert.equal(transition.status, 200);
    await firstServer.stop();

    const secondServer = await startServer({ sqlitePath });
    try {
      const detail = await fetch(`${secondServer.baseUrl}/incidents/${created.id}`);
      assert.equal(detail.status, 200);
      const persisted = await detail.json();
      assert.equal(persisted.title, 'Persists after restart');
      assert.equal(persisted.status, 'Resolved');
      assert.deepEqual(persisted.history.map((entry: any) => [entry.fromStatus, entry.toStatus]), [
        ['Open', 'Resolved'],
      ]);
    } finally {
      await secondServer.stop();
    }
  } finally {
    await firstServer.stop();
    await rm(tempDir, { recursive: true, force: true });
  }
});