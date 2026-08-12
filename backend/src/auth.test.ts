import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FastifyReply, FastifyRequest } from 'fastify';

// The auth helpers hit Postgres; mock the query layer so these stay unit tests.
vi.mock('./db', () => ({ query: vi.fn(), pool: {}, getClient: vi.fn() }));

import { query } from './db';
import {
  canManageSection,
  managedSectionIds,
  requireRole,
  cookieOptions,
  AUTH_COOKIE,
  type AuthUser,
} from './auth';

const admin: AuthUser = { id: 'a1', email: 'a@x', name: 'Admin', role: 'admin' };
const teacher: AuthUser = { id: 't1', email: 't@x', name: 'Teacher', role: 'teacher' };

function mockReply() {
  const reply = {
    statusCode: 200,
    payload: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    send(body: unknown) {
      this.payload = body;
      return this;
    },
  };
  return reply as unknown as FastifyReply & typeof reply;
}

beforeEach(() => vi.mocked(query).mockReset());

describe('canManageSection', () => {
  it('lets an admin manage any classroom without querying', async () => {
    expect(await canManageSection(admin, 'any-section')).toBe(true);
    expect(query).not.toHaveBeenCalled();
  });

  it('lets a teacher manage an assigned classroom', async () => {
    vi.mocked(query).mockResolvedValue({ rowCount: 1, rows: [{}] } as never);
    expect(await canManageSection(teacher, 'sec-6c')).toBe(true);
  });

  it('blocks a teacher from an unassigned classroom', async () => {
    vi.mocked(query).mockResolvedValue({ rowCount: 0, rows: [] } as never);
    expect(await canManageSection(teacher, 'sec-4a')).toBe(false);
  });

  // A null rowCount from pg must not be treated as "allowed".
  it('treats a null rowCount as no access', async () => {
    vi.mocked(query).mockResolvedValue({ rowCount: null, rows: [] } as never);
    expect(await canManageSection(teacher, 'sec-4a')).toBe(false);
  });
});

describe('managedSectionIds', () => {
  it('returns null for an admin, meaning "all classrooms"', async () => {
    expect(await managedSectionIds(admin)).toBeNull();
  });

  it('returns only the assigned ids for a teacher', async () => {
    vi.mocked(query).mockResolvedValue({
      rowCount: 2,
      rows: [{ section_id: 's1' }, { section_id: 's2' }],
    } as never);
    expect(await managedSectionIds(teacher)).toEqual(['s1', 's2']);
  });

  it('returns an empty list for a teacher with no classrooms', async () => {
    vi.mocked(query).mockResolvedValue({ rowCount: 0, rows: [] } as never);
    expect(await managedSectionIds(teacher)).toEqual([]);
  });
});

describe('requireRole', () => {
  it('allows a matching role through', async () => {
    const reply = mockReply();
    const req = { authUser: admin } as unknown as FastifyRequest;

    await requireRole('admin')(req, reply);
    expect(reply.statusCode).toBe(200);
  });

  it('rejects a non-matching role with 403', async () => {
    const reply = mockReply();
    const req = { authUser: teacher } as unknown as FastifyRequest;

    await requireRole('admin')(req, reply);
    expect(reply.statusCode).toBe(403);
  });

  it('rejects an unauthenticated request with 401', async () => {
    const reply = mockReply();
    const req = {} as unknown as FastifyRequest;

    await requireRole('admin')(req, reply);
    expect(reply.statusCode).toBe(401);
  });

  it('accepts any of several permitted roles', async () => {
    const reply = mockReply();
    const req = { authUser: teacher } as unknown as FastifyRequest;

    await requireRole('admin', 'teacher')(req, reply);
    expect(reply.statusCode).toBe(200);
  });
});

describe('session cookie', () => {
  it('is httpOnly and SameSite=Lax so scripts cannot read it', () => {
    const opts = cookieOptions();
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe('lax');
    expect(opts.path).toBe('/');
  });

  it('is not marked secure in development', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    expect(cookieOptions().secure).toBe(false);
    process.env.NODE_ENV = prev;
  });

  it('is marked secure in production', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    expect(cookieOptions().secure).toBe(true);
    process.env.NODE_ENV = prev;
  });

  describe('COOKIE_SECURE override', () => {
    const prevEnv = process.env.NODE_ENV;
    const prevOverride = process.env.COOKIE_SECURE;

    afterEach(() => {
      process.env.NODE_ENV = prevEnv;
      if (prevOverride === undefined) delete process.env.COOKIE_SECURE;
      else process.env.COOKIE_SECURE = prevOverride;
    });

    it('defaults to secure in production when unset', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.COOKIE_SECURE;
      expect(cookieOptions().secure).toBe(true);
    });

    // Needed for an HTTP-only deployment (no domain, so no TLS certificate).
    it('allows opting out so sessions work over plain HTTP', () => {
      process.env.NODE_ENV = 'production';
      process.env.COOKIE_SECURE = 'false';
      expect(cookieOptions().secure).toBe(false);
    });

    it('can force secure even outside production', () => {
      process.env.NODE_ENV = 'development';
      process.env.COOKIE_SECURE = 'true';
      expect(cookieOptions().secure).toBe(true);
    });

    it('never weakens the httpOnly protection', () => {
      process.env.NODE_ENV = 'production';
      process.env.COOKIE_SECURE = 'false';
      const opts = cookieOptions();
      // Dropping Secure is a deliberate trade-off; httpOnly must still hold so
      // injected scripts cannot read the session token.
      expect(opts.httpOnly).toBe(true);
      expect(opts.sameSite).toBe('lax');
    });
  });

  it('expires within a school day', () => {
    expect(cookieOptions().maxAge).toBeLessThanOrEqual(12 * 60 * 60);
  });

  it('uses a namespaced cookie name', () => {
    expect(AUTH_COOKIE).toBe('bq_session');
  });
});
