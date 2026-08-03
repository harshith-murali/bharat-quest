import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { sectionsRoutes } from './routes/sections';
import { syncRoutes } from './routes/sync';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

async function build() {
  const fastify = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: { colorize: true },
      },
    },
  });

  // CORS
  await fastify.register(cors, {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST', 'OPTIONS'],
  });

  // Routes
  await fastify.register(sectionsRoutes, { prefix: '/sections' });
  await fastify.register(syncRoutes, { prefix: '/sections' });

  // Health check
  fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  return fastify;
}

async function start() {
  const fastify = await build();

  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🚀 Bharat Quest backend running on http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
