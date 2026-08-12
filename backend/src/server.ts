import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import { randomUUID } from 'node:crypto';

import { sectionsRoutes } from './routes/sections';
import { syncRoutes } from './routes/sync';
import { factsRoutes } from './routes/facts';
import { chatRoutes } from './routes/chat';
import { adminRoutes } from './routes/admin';
import { progressRoutes } from './routes/progress';
import { authRoutes } from './routes/auth';
import { AUTH_COOKIE } from './auth';
import { pool } from './db';

const IS_PROD = process.env.NODE_ENV === 'production';
const PORT = parseInt(process.env.PORT ?? '3001', 10);

// Comma-separated list so an ALB/CloudFront origin and a custom domain can
// both be allowed, e.g. "https://app.example.com,https://www.example.com".
const CORS_ORIGINS = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// ─── Required configuration ─────────────────────────────────────────────────
// Fail fast at boot rather than 500-ing on the first request in production.
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} environment variable is required in production`);
  return value;
}

if (IS_PROD) {
  requireEnv('DATABASE_URL');
  requireEnv('JWT_SECRET');
}

const JWT_SECRET = process.env.JWT_SECRET ?? '';
const RESOLVED_JWT_SECRET = JWT_SECRET || 'dev-only-insecure-secret-change-me';
if (!JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET not set — using an insecure development secret.');
}

// Loudly flag a production deployment that is knowingly serving session
// cookies over plain HTTP, so this temporary setting is not forgotten.
if (IS_PROD && (process.env.COOKIE_SECURE ?? '').toLowerCase() === 'false') {
  console.warn(
    '⚠️  COOKIE_SECURE=false — session cookies will be sent over plain HTTP.\n' +
      '    Anyone on the network path can read a staff session and impersonate them.\n' +
      '    Acceptable only on a trusted LAN or for a short demo. Remove once HTTPS is enabled.'
  );
}

export async function build() {
  const fastify = Fastify({
    // Structured JSON logs in production (CloudWatch-friendly);
    // human-readable colours in development.
    logger: IS_PROD
      ? { level: process.env.LOG_LEVEL ?? 'info' }
      : {
          level: process.env.LOG_LEVEL ?? 'info',
          transport: { target: 'pino-pretty', options: { colorize: true } },
        },
    // Correlate every log line for a request; honours an upstream header so
    // traces survive across the ALB.
    genReqId: (req) => (req.headers['x-request-id'] as string) ?? randomUUID(),
    // Behind an ALB/CloudFront, trust X-Forwarded-* so request.ip is the real
    // client (rate limiting depends on this) and protocol detection is correct.
    trustProxy: IS_PROD,
  });

  // Security headers.
  await fastify.register(helmet, {
    // The API serves JSON only; CSP belongs on the frontend host.
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'same-site' },
  });

  // Blanket rate limit as a DoS backstop. Per-route limits (login, chat)
  // remain stricter and are enforced inside those routes.
  await fastify.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX ?? '300', 10),
    timeWindow: '1 minute',
  });

  // CORS — credentials:true so the httpOnly session cookie is sent.
  await fastify.register(cors, {
    origin: CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Auth: session cookie + JWT
  await fastify.register(cookie);
  await fastify.register(jwt, {
    secret: RESOLVED_JWT_SECRET,
    cookie: { cookieName: AUTH_COOKIE, signed: false },
  });

  // Echo the request id so clients/logs can be correlated.
  fastify.addHook('onSend', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });

  // Routes
  await fastify.register(sectionsRoutes, { prefix: '/sections' });
  await fastify.register(syncRoutes, { prefix: '/sections' });
  await fastify.register(factsRoutes, { prefix: '/facts' });
  await fastify.register(chatRoutes, { prefix: '/chat' });
  await fastify.register(adminRoutes, { prefix: '/admin' });
  await fastify.register(progressRoutes, { prefix: '/progress' });
  await fastify.register(authRoutes, { prefix: '/auth' });

  // Liveness — cheap, no dependencies. Use for the container health check.
  fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // Readiness — verifies the database is actually reachable. Use for the ALB
  // target group so traffic is not routed to an instance that cannot serve.
  fastify.get('/ready', async (_request, reply) => {
    try {
      await pool.query('SELECT 1');
      return reply.send({ status: 'ready' });
    } catch {
      return reply.status(503).send({ status: 'not-ready', reason: 'database unreachable' });
    }
  });

  return fastify;
}

async function start() {
  const fastify = await build();

  // ─── Graceful shutdown ────────────────────────────────────────────────────
  // ECS/ALB sends SIGTERM before stopping a task. Draining in-flight requests
  // and closing the pool avoids dropped connections during a deploy.
  let shuttingDown = false;
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, async () => {
      if (shuttingDown) return;
      shuttingDown = true;
      fastify.log.info({ signal }, 'Shutting down…');
      try {
        await fastify.close();
        await pool.end();
        process.exit(0);
      } catch (err) {
        fastify.log.error({ err }, 'Error during shutdown');
        process.exit(1);
      }
    });
  }

  process.on('unhandledRejection', (err) => {
    fastify.log.error({ err }, 'Unhandled rejection');
  });

  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    fastify.log.info(`🚀 Bharat Quest backend listening on :${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
