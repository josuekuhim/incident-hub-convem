import { dbPath, db } from './db/sqlite.js';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const seedRecords = [
  {
    seed_key: 'seed-1',
    title: 'Payment API instability',
    description: 'The payments endpoint is intermittently failing.',
    severity: 'Critical',
    owner: 'Ana',
    status: 'Open',
    created_at: Date.now(),
    updated_at: Date.now(),
  },
  {
    seed_key: 'seed-2',
    title: 'Reconciliation delay',
    description: 'The nightly reconciliation is taking longer than expected.',
    severity: 'High',
    owner: 'Bruno',
    status: 'In Progress',
    created_at: Date.now(),
    updated_at: Date.now(),
  },
  {
    seed_key: 'seed-3',
    title: 'Incorrect customer notification',
    description: 'Customers are receiving the wrong notification message.',
    severity: 'Medium',
    owner: 'Carla',
    status: 'Resolved',
    created_at: Date.now(),
    updated_at: Date.now(),
  },
] as const;

export function seedDatabase() {
  mkdirSync(dirname(dbPath), { recursive: true });

  for (const incident of seedRecords) {
    db.prepare(`
      INSERT OR IGNORE INTO incidents (title, description, severity, owner, status, created_at, updated_at, seed_key)
      VALUES (@title, @description, @severity, @owner, @status, @created_at, @updated_at, @seed_key)
    `).run({
      ...incident,
      created_at: Date.now(),
      updated_at: Date.now(),
    });
  }
}

if (process.argv[1]?.endsWith('seed.ts')) {
  seedDatabase();
  console.log('Seed completed');
}
