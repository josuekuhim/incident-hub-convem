import Fastify from 'fastify';
import './db/sqlite.js';
import { registerIncidentRoutes } from './routes/incidents.js';
import { seedDatabase } from './seed.js';

const app = Fastify({ logger: false });
registerIncidentRoutes(app);

seedDatabase();

const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: '0.0.0.0' });
