import { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import { query } from '../db';
import {
  AUTH_COOKIE,
  cookieOptions,
  requireAuth,
  requireRole,
  Role,
} from '../auth';

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  password_hash: string;
  is_active: boolean;
}

// Simple per-IP throttle on login to slow credential stuffing.
const LOGIN_MAX = 10;
const LOGIN_WINDOW_MS = 5 * 60_000;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function loginAllowed(ip: string): boolean {
  const now = Date.now();
  const b = loginAttempts.get(ip);
  if (!b || now > b.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return true;
  }
  if (b.count >= LOGIN_MAX) return false;
  b.count++;
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of loginAttempts) if (now > v.resetAt) loginAttempts.delete(k);
}, LOGIN_WINDOW_MS).unref();

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /auth/login
  fastify.post<{ Body: { email?: string; password?: string } }>('/login', async (request, reply) => {
    const { email, password } = request.body ?? {};

    if (!loginAllowed(request.ip)) {
      return reply.status(429).send({ error: 'Too many attempts. Try again in a few minutes.' });
    }
    if (!email?.trim() || !password) {
      return reply.status(400).send({ error: 'Email and password are required' });
    }

    const result = await query<UserRow>(
      'SELECT id, email, name, role, password_hash, is_active FROM users WHERE lower(email) = lower($1)',
      [email.trim()]
    );
    const user = result.rows[0];

    // Always run a comparison so a missing account and a wrong password take
    // similar time, avoiding user enumeration via timing.
    const hash = user?.password_hash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva';
    const ok = await bcrypt.compare(password, hash);

    if (!user || !ok || !user.is_active) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    await query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);

    const token = fastify.jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      { expiresIn: '12h' }
    );

    reply.setCookie(AUTH_COOKIE, token, cookieOptions());
    return reply.send({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  });

  // POST /auth/logout
  fastify.post('/logout', async (_request, reply) => {
    reply.clearCookie(AUTH_COOKIE, { path: '/' });
    return reply.send({ ok: true });
  });

  // GET /auth/me — who am I? Used by the frontend to restore a session.
  fastify.get('/me', { preHandler: requireAuth }, async (request, reply) => {
    return reply.send({ user: request.authUser });
  });

  // ─── Admin-only staff management ──────────────────────────────────────────

  // GET /auth/users
  fastify.get(
    '/users',
    { preHandler: [requireAuth, requireRole('admin')] },
    async (_request, reply) => {
      const result = await query(
        `SELECT u.id, u.email, u.name, u.role, u.is_active, u.last_login_at,
                COALESCE(
                  (SELECT json_agg(us.section_id) FROM user_sections us WHERE us.user_id = u.id),
                  '[]'::json
                ) AS section_ids
           FROM users u
          ORDER BY u.role, u.name`
      );
      return reply.send(result.rows);
    }
  );

  // POST /auth/users — create a staff account
  fastify.post<{
    Body: { email?: string; password?: string; name?: string; role?: Role; section_ids?: string[] };
  }>('/users', { preHandler: [requireAuth, requireRole('admin')] }, async (request, reply) => {
    const { email, password, name, role, section_ids } = request.body ?? {};

    if (!email?.trim() || !password || !name?.trim() || !role) {
      return reply.status(400).send({ error: 'email, password, name and role are required' });
    }
    if (role !== 'admin' && role !== 'teacher') {
      return reply.status(400).send({ error: 'role must be admin or teacher' });
    }
    if (password.length < 8) {
      return reply.status(400).send({ error: 'Password must be at least 8 characters' });
    }

    const exists = await query('SELECT 1 FROM users WHERE lower(email) = lower($1)', [email.trim()]);
    if (exists.rowCount) {
      return reply.status(409).send({ error: 'An account with that email already exists' });
    }

    const hash = await bcrypt.hash(password, 12);
    const created = await query<{ id: string }>(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [email.trim(), hash, name.trim(), role]
    );
    const userId = created.rows[0].id;

    for (const sid of section_ids ?? []) {
      await query(
        `INSERT INTO user_sections (user_id, section_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [userId, sid]
      );
    }

    return reply.status(201).send({ id: userId, email, name, role });
  });

  // PATCH /auth/users/:id — update role, active flag, assigned classrooms, password
  fastify.patch<{
    Params: { id: string };
    Body: { role?: Role; is_active?: boolean; section_ids?: string[]; password?: string };
  }>('/users/:id', { preHandler: [requireAuth, requireRole('admin')] }, async (request, reply) => {
    const { id } = request.params;
    const { role, is_active, section_ids, password } = request.body ?? {};

    // Never let an admin lock everyone out by demoting/deactivating the last one.
    if (role === 'teacher' || is_active === false) {
      const target = await query<{ role: Role }>('SELECT role FROM users WHERE id = $1', [id]);
      if (target.rows[0]?.role === 'admin') {
        const admins = await query<{ c: number }>(
          "SELECT COUNT(*)::int AS c FROM users WHERE role = 'admin' AND is_active = true"
        );
        if ((admins.rows[0]?.c ?? 0) <= 1) {
          return reply.status(400).send({ error: 'Cannot remove the last active admin' });
        }
      }
    }

    if (role) await query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);
    if (is_active !== undefined) {
      await query('UPDATE users SET is_active = $1 WHERE id = $2', [is_active, id]);
    }
    if (password) {
      if (password.length < 8) {
        return reply.status(400).send({ error: 'Password must be at least 8 characters' });
      }
      await query('UPDATE users SET password_hash = $1 WHERE id = $2', [
        await bcrypt.hash(password, 12),
        id,
      ]);
    }
    if (section_ids) {
      await query('DELETE FROM user_sections WHERE user_id = $1', [id]);
      for (const sid of section_ids) {
        await query(
          `INSERT INTO user_sections (user_id, section_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [id, sid]
        );
      }
    }

    const updated = await query(
      'SELECT id, email, name, role, is_active FROM users WHERE id = $1',
      [id]
    );
    if (updated.rowCount === 0) return reply.status(404).send({ error: 'User not found' });
    return reply.send(updated.rows[0]);
  });

  // DELETE /auth/users/:id
  fastify.delete<{ Params: { id: string } }>(
    '/users/:id',
    { preHandler: [requireAuth, requireRole('admin')] },
    async (request, reply) => {
      const { id } = request.params;

      if (request.authUser?.id === id) {
        return reply.status(400).send({ error: 'You cannot delete your own account' });
      }

      const target = await query<{ role: Role }>('SELECT role FROM users WHERE id = $1', [id]);
      if (target.rows[0]?.role === 'admin') {
        const admins = await query<{ c: number }>(
          "SELECT COUNT(*)::int AS c FROM users WHERE role = 'admin' AND is_active = true"
        );
        if ((admins.rows[0]?.c ?? 0) <= 1) {
          return reply.status(400).send({ error: 'Cannot delete the last active admin' });
        }
      }

      const res = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
      if (res.rowCount === 0) return reply.status(404).send({ error: 'User not found' });
      return reply.send({ deleted: id });
    }
  );
};
