import { once } from 'node:events';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createServer } from 'node:net';
import { join, resolve } from 'node:path';
import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

export interface ServerHandle {
  process: ChildProcessWithoutNullStreams;
  baseUrl: string;
  sqlitePath: string;
  stop(): Promise<void>;
}

export async function startServer(opts?: { sqlitePath?: string; port?: number }): Promise<ServerHandle> {
  const sqlitePath = opts?.sqlitePath ?? join(await mkdtemp(join(tmpdir(), 'incident-hub-')), 'incident-hub.db');
  const port = opts?.port ?? (await getFreePort());
  const env = {
    ...process.env,
    PORT: String(port),
    SQLITE_PATH: sqlitePath,
  };

  const child = spawn(process.execPath, ['--import', 'tsx', 'src/server.ts'], {
    cwd: resolve(process.cwd()),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const stderr: string[] = [];
  const stdout: string[] = [];
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => stdout.push(chunk));
  child.stderr.on('data', (chunk) => stderr.push(chunk));

  let resolved = false;
  let portAssigned = port;
  while (!resolved) {
    const health = await fetch(`http://127.0.0.1:${portAssigned}/health`).catch(() => null);
    if (health?.ok) {
      resolved = true;
      break;
    }
    if (child.exitCode !== null) {
      throw new Error(`Server exited before becoming ready.\nSTDOUT:\n${stdout.join('')}\nSTDERR:\n${stderr.join('')}`);
    }
    await delay(50);
  }

  const baseUrl = `http://127.0.0.1:${portAssigned}`;
  return {
    process: child,
    baseUrl,
    sqlitePath,
    async stop() {
      child.kill('SIGTERM');
      await once(child, 'exit').catch(() => undefined);
    },
  };
}

async function getFreePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Unable to determine a free port'));
        return;
      }
      const port = address.port;
      server.close(() => resolvePort(port));
    });
    server.on('error', reject);
  });
}
