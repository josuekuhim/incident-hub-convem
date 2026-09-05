import Fastify from 'fastify';
import cors from '@fastify/cors';
import { desc } from 'drizzle-orm';
import { db, schema } from './db/index.js';

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

app.get('/health', async () => ({ status: 'ok' }));

app.get('/incidents', async () => {
  return db.select().from(schema.incidents).orderBy(desc(schema.incidents.createdAt));
});

app.post('/incidents', async (request, reply) => {
  const { title, description = '', severity = 'medium' } = request.body as {
    title?: string;
    description?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  };
  if (!title || typeof title !== 'string') {
    return reply.code(400).send({ error: 'title is required' });
  }
  const [incident] = await db
    .insert(schema.incidents)
    .values({ title, description, severity })
    .returning();
  return reply.code(201).send(incident);
});

const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: '0.0.0.0' });
