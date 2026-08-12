import { FastifyReply, FastifyRequest } from 'fastify';
import { query } from './db';

/**
 * Authentication & RBAC helpers.
 *
 * Model: staff-only auth. Students are never authenticated — the app runs on a
 * shared classroom smartboard and students take turns via the spinner.
 *
 * Roles:
 *   admin   — full access; manages every classroom and all staff accounts.
 *   teacher — manages students only within their assigned classrooms.
 *
 * The JWT lives in an httpOnly cookie so injected scripts cannot read it.
 */

export type Role = 'admin' | 'teacher';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export const AUTH_COOKIE = 'bq_session';

/** Cookie options. `secure` is enabled outside development. */
export function cookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';

  // `Secure` cookies are only stored by browsers over HTTPS. A production
  // deployment that is still on plain HTTP (e.g. an IP address with no domain,
  // so no TLS certificate yet) therefore cannot hold a session at all and
  // staff sign-in silently fails.
  //
  // COOKIE_SECURE lets that be controlled independently of NODE_ENV:
  //   unset / "auto"  → secure in production (the safe default)
  //   "false"         → allow sign-in over plain HTTP (see the warning below)
  //   "true"          → force secure
  const override = (process.env.COOKIE_SECURE ?? 'auto').toLowerCase();
  const secure = override === 'auto' ? isProd : override === 'true';

  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
    maxAge: 60 * 60 * 12, // 12h — a school day
  };
}

/**
 * Verifies the session cookie and attaches the user to the request.
 * Use as a preHandler. Responds 401 when unauthenticated.
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    // @fastify/jwt reads the token from the cookie (configured in server.ts).
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ error: 'Authentication required' });
  }

  const payload = request.user as Partial<AuthUser> | undefined;
  if (!payload?.id) {
    return reply.status(401).send({ error: 'Authentication required' });
  }

  // Re-read the user each request so a deactivated or role-changed account
  // loses access immediately rather than at token expiry.
  const result = await query<{ id: string; email: string; name: string; role: Role; is_active: boolean }>(
    'SELECT id, email, name, role, is_active FROM users WHERE id = $1',
    [payload.id]
  );

  const user = result.rows[0];
  if (!user || !user.is_active) {
    return reply.status(401).send({ error: 'Account is no longer active' });
  }

  request.authUser = { id: user.id, email: user.email, name: user.name, role: user.role };
}

/** Requires one of the given roles. Must run after requireAuth. */
export function requireRole(...roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.authUser;
    if (!user) return reply.status(401).send({ error: 'Authentication required' });
    if (!roles.includes(user.role)) {
      return reply.status(403).send({ error: 'You do not have permission to do that' });
    }
  };
}

/**
 * True when the user may manage the given classroom.
 * Admins may manage all; teachers only their assigned sections.
 */
export async function canManageSection(user: AuthUser, sectionId: string): Promise<boolean> {
  if (user.role === 'admin') return true;

  const result = await query(
    'SELECT 1 FROM user_sections WHERE user_id = $1 AND section_id = $2',
    [user.id, sectionId]
  );
  return (result.rowCount ?? 0) > 0;
}

/** Section IDs a user may manage; `null` means "all" (admin). */
export async function managedSectionIds(user: AuthUser): Promise<string[] | null> {
  if (user.role === 'admin') return null;
  const result = await query<{ section_id: string }>(
    'SELECT section_id FROM user_sections WHERE user_id = $1',
    [user.id]
  );
  return result.rows.map((r) => r.section_id);
}

// Augment Fastify's request with our resolved user.
declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AuthUser;
  }
}
