import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { startServer } from '../helpers.js';

let tempDir: string;
let server: Awaited<ReturnType<typeof startServer>>;

before(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'incident-hub-comments-'));
  server = await startServer({ sqlitePath: join(tempDir, 'incident-hub.db') });
});

after(async () => {
  await server.stop();
  await rm(tempDir, { recursive: true, force: true });
});

async function createIncident(severity = 'High') {
  const res = await fetch(`${server.baseUrl}/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Comment target',
      description: 'Incident used to exercise comments',
      severity,
      owner: 'Ana',
    }),
  });
  assert.equal(res.status, 201);
  return res.json();
}

async function postComment(incidentId: number, body: unknown) {
  return fetch(`${server.baseUrl}/incidents/${incidentId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('comments require author and content, and rejections persist nothing', async () => {
  const incident = await createIncident();

  const invalidBodies = [
    { author: '', content: 'Provider contacted.' },
    { author: '   ', content: 'Provider contacted.' },
    { author: 'Ana', content: '' },
    { author: 'Ana', content: '   ' },
    { author: 'Ana' },
    { content: 'Provider contacted.' },
  ];

  for (const body of invalidBodies) {
    const res = await postComment(incident.id, body);
    assert.equal(res.status, 400, `deveria recusar ${JSON.stringify(body)}`);
    const payload = await res.json();
    assert.match(payload.error, /autor|conteúdo/i);
  }

  const detail = await (await fetch(`${server.baseUrl}/incidents/${incident.id}`)).json();
  assert.deepEqual(detail.comments, [], 'nenhuma recusa pode ter gravado comentário');
  assert.deepEqual(detail.timeline, [], 'timeline deve permanecer vazia');
});

test('comment on an unknown incident returns 404 without creating anything', async () => {
  const res = await postComment(999999, { author: 'Ana', content: 'Provider contacted.' });
  assert.equal(res.status, 404);
  assert.match((await res.json()).error, /não encontrado/i);
});

test('a valid comment is stored with trimmed fields and a server-side timestamp', async () => {
  const incident = await createIncident();

  const res = await postComment(incident.id, {
    author: '  Ana  ',
    content: '  Provider contacted.  ',
    createdAt: '2000-01-01T00:00:00.000Z',
    id: 999,
  });
  assert.equal(res.status, 201);

  const comment = await res.json();
  assert.equal(comment.author, 'Ana');
  assert.equal(comment.content, 'Provider contacted.');
  assert.equal(comment.incidentId, incident.id);
  assert.equal(comment.id === 999, false, 'id enviado pelo cliente deve ser ignorado');
  assert.ok(Number.isFinite(Date.parse(comment.createdAt)));
  assert.equal(new Date(comment.createdAt).getUTCFullYear() === 2000, false, 'data do cliente deve ser ignorada');
});

test('an incident accepts multiple comments without replacing previous ones', async () => {
  const incident = await createIncident();

  for (const content of ['primeiro', 'segundo', 'terceiro']) {
    const res = await postComment(incident.id, { author: 'Ana', content });
    assert.equal(res.status, 201);
    await delay(2);
  }

  const detail = await (await fetch(`${server.baseUrl}/incidents/${incident.id}`)).json();
  assert.deepEqual(
    detail.comments.map((item: any) => item.content),
    ['primeiro', 'segundo', 'terceiro'],
  );
});

test('commenting changes neither the status nor the status history', async () => {
  const incident = await createIncident();

  const before = await (await fetch(`${server.baseUrl}/incidents/${incident.id}`)).json();
  await postComment(incident.id, { author: 'Ana', content: 'Provider contacted.' });
  const after = await (await fetch(`${server.baseUrl}/incidents/${incident.id}`)).json();

  assert.equal(after.status, before.status);
  assert.equal(after.updatedAt, before.updatedAt, 'comentar não move updatedAt');
  assert.deepEqual(after.history, [], 'comentar não gera histórico de status');
});

test('the timeline merges status changes and comments in chronological order', async () => {
  const incident = await createIncident('Critical');

  await postComment(incident.id, { author: 'Ana', content: 'Investigando com o provedor.' });
  await delay(2);

  await fetch(`${server.baseUrl}/incidents/${incident.id}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'In Progress' }),
  });
  await delay(2);

  await postComment(incident.id, { author: 'Bruno', content: 'Provider contacted.' });
  await delay(2);

  await fetch(`${server.baseUrl}/incidents/${incident.id}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Resolved' }),
  });

  const detail = await (await fetch(`${server.baseUrl}/incidents/${incident.id}`)).json();

  assert.deepEqual(
    detail.timeline.map((event: any) =>
      event.type === 'status' ? `status:${event.fromStatus}->${event.toStatus}` : `comment:${event.author}`,
    ),
    ['comment:Ana', 'status:Open->In Progress', 'comment:Bruno', 'status:In Progress->Resolved'],
  );

  const timestamps = detail.timeline.map((event: any) => Date.parse(event.at));
  const sorted = [...timestamps].sort((a, b) => a - b);
  assert.deepEqual(timestamps, sorted, 'a timeline deve estar em ordem cronológica crescente');

  // A ordenação precisa ser estável entre requisições (SC-004).
  const second = await (await fetch(`${server.baseUrl}/incidents/${incident.id}`)).json();
  assert.deepEqual(second.timeline, detail.timeline);
});

test('comments and their timeline order survive a real server restart', async () => {
  const restartDir = await mkdtemp(join(tmpdir(), 'incident-hub-comments-restart-'));
  const sqlitePath = join(restartDir, 'incident-hub.db');
  const first = await startServer({ sqlitePath });

  let expectedTimeline: unknown;
  try {
    const create = await fetch(`${first.baseUrl}/incidents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Survives restart',
        description: 'Comment persistence',
        severity: 'High',
        owner: 'Ana',
      }),
    });
    const incident = await create.json();

    await fetch(`${first.baseUrl}/incidents/${incident.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author: 'Ana', content: 'Antes do reinício.' }),
    });
    await delay(2);
    await fetch(`${first.baseUrl}/incidents/${incident.id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Resolved' }),
    });

    expectedTimeline = (await (await fetch(`${first.baseUrl}/incidents/${incident.id}`)).json()).timeline;
    await first.stop();

    const second = await startServer({ sqlitePath });
    try {
      const persisted = await (await fetch(`${second.baseUrl}/incidents/${incident.id}`)).json();
      assert.equal(persisted.comments.length, 1);
      assert.equal(persisted.comments[0].content, 'Antes do reinício.');
      assert.deepEqual(persisted.timeline, expectedTimeline, 'a timeline deve sobreviver intacta ao reinício');
    } finally {
      await second.stop();
    }
  } finally {
    await first.stop();
    await rm(restartDir, { recursive: true, force: true });
  }
});
