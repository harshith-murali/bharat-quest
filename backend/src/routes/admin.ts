import { FastifyPluginAsync } from 'fastify';
import { query } from '../db';
import { requireAuth, canManageSection, managedSectionIds } from '../auth';

/**
 * Admin CRUD for students.
 *
 * Every route requires a signed-in staff account (see auth.ts):
 *   admin   — may manage students in any classroom.
 *   teacher — may manage students only in their assigned classrooms.
 */

interface StudentRow {
  id: string;
  section_id: string;
  name: string;
  avatar: string;
  level: number;
  total_xp: number;
  coins: number;
  gems: number;
  badges: unknown[];
  last_turn_at: string | null;
}

interface CreateBody {
  section_id: string;
  name: string;
  avatar?: string;
}

interface UpdateBody {
  name?: string;
  avatar?: string;
  total_xp?: number;
  level?: number;
}

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  // Everything under /admin requires a signed-in staff account.
  fastify.addHook('preHandler', requireAuth);

  /** Resolve the section a student belongs to (for permission checks). */
  async function sectionOfStudent(studentId: string): Promise<string | null> {
    const r = await query<{ section_id: string }>(
      'SELECT section_id FROM students WHERE id = $1',
      [studentId]
    );
    return r.rows[0]?.section_id ?? null;
  }

  // GET /admin/students?section_id=...
  fastify.get<{ Querystring: { section_id?: string } }>('/students', async (request, reply) => {
    const { section_id } = request.query;
    const user = request.authUser!;

    if (section_id) {
      if (!(await canManageSection(user, section_id))) {
        return reply.status(403).send({ error: 'You do not manage that classroom' });
      }
      const result = await query<StudentRow>(
        `SELECT * FROM students WHERE section_id = $1 ORDER BY name`,
        [section_id]
      );
      return reply.send(result.rows);
    }

    // No filter: admins see everyone, teachers only their classrooms.
    const allowed = await managedSectionIds(user);
    if (allowed === null) {
      const result = await query<StudentRow>(`SELECT * FROM students ORDER BY section_id, name`);
      return reply.send(result.rows);
    }
    if (allowed.length === 0) return reply.send([]);

    const result = await query<StudentRow>(
      `SELECT * FROM students WHERE section_id = ANY($1::uuid[]) ORDER BY section_id, name`,
      [allowed]
    );
    return reply.send(result.rows);
  });

  // POST /admin/students
  fastify.post<{ Body: CreateBody }>('/students', async (request, reply) => {
    const { section_id, name, avatar } = request.body ?? ({} as CreateBody);

    if (!section_id || !name?.trim()) {
      return reply.status(400).send({ error: 'section_id and name are required' });
    }
    if (!(await canManageSection(request.authUser!, section_id))) {
      return reply.status(403).send({ error: 'You do not manage that classroom' });
    }

    const result = await query<StudentRow>(
      `INSERT INTO students (section_id, name, avatar)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [section_id, name.trim(), avatar || '🧑']
    );

    return reply.status(201).send(result.rows[0]);
  });

  // PATCH /admin/students/:id
  fastify.patch<{ Params: { id: string }; Body: UpdateBody }>(
    '/students/:id',
    async (request, reply) => {
      const { id } = request.params;
      const body = request.body ?? {};

      const sectionId = await sectionOfStudent(id);
      if (!sectionId) return reply.status(404).send({ error: 'Student not found' });
      if (!(await canManageSection(request.authUser!, sectionId))) {
        return reply.status(403).send({ error: 'You do not manage that classroom' });
      }

      // Build a partial update from only the provided fields.
      const allowed: Array<keyof UpdateBody> = ['name', 'avatar', 'total_xp', 'level'];
      const sets: string[] = [];
      const values: unknown[] = [];

      for (const field of allowed) {
        if (body[field] !== undefined) {
          values.push(body[field]);
          sets.push(`${field} = $${values.length}`);
        }
      }

      if (sets.length === 0) {
        return reply.status(400).send({ error: 'No updatable fields provided' });
      }

      values.push(id);
      const result = await query<StudentRow>(
        `UPDATE students SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
        values
      );

      if (result.rowCount === 0) {
        return reply.status(404).send({ error: 'Student not found' });
      }
      return reply.send(result.rows[0]);
    }
  );

  // DELETE /admin/students/:id
  fastify.delete<{ Params: { id: string } }>('/students/:id', async (request, reply) => {
    const { id } = request.params;

    const sectionId = await sectionOfStudent(id);
    if (!sectionId) return reply.status(404).send({ error: 'Student not found' });
    if (!(await canManageSection(request.authUser!, sectionId))) {
      return reply.status(403).send({ error: 'You do not manage that classroom' });
    }

    const result = await query(`DELETE FROM students WHERE id = $1 RETURNING id`, [id]);

    if (result.rowCount === 0) {
      return reply.status(404).send({ error: 'Student not found' });
    }
    return reply.send({ deleted: id });
  });

  // GET /admin/sections — classroom picker (grade + section) for the admin UI
  fastify.get('/sections', async (request, reply) => {
    const allowed = await managedSectionIds(request.authUser!);

    // Teachers only see the classrooms they are assigned to.
    const result =
      allowed === null
        ? await query(
            `SELECT s.id, s.name, s.grade, s.section_letter,
                    (SELECT COUNT(*) FROM students st WHERE st.section_id = s.id)::int AS student_count
               FROM sections s
              ORDER BY s.grade NULLS LAST, s.section_letter NULLS LAST, s.name`
          )
        : await query(
            `SELECT s.id, s.name, s.grade, s.section_letter,
                    (SELECT COUNT(*) FROM students st WHERE st.section_id = s.id)::int AS student_count
               FROM sections s
              WHERE s.id = ANY($1::uuid[])
              ORDER BY s.grade NULLS LAST, s.section_letter NULLS LAST, s.name`,
            [allowed]
          );

    return reply.send(result.rows);
  });

  // GET /admin/sections/lookup?grade=4&section_letter=A
  // Resolves a classroom by grade + section so the admin page can address a
  // classroom by what the teacher actually picks, not an opaque UUID.
  fastify.get<{ Querystring: { grade?: string; section_letter?: string } }>(
    '/sections/lookup',
    async (request, reply) => {
      const grade = parseInt(request.query.grade ?? '', 10);
      const letter = (request.query.section_letter ?? '').toUpperCase();

      if (!Number.isFinite(grade) || !letter) {
        return reply.status(400).send({ error: 'grade and section_letter are required' });
      }

      const result = await query(
        `SELECT id, name, grade, section_letter FROM sections
          WHERE grade = $1 AND section_letter = $2`,
        [grade, letter]
      );

      if (result.rowCount === 0) {
        return reply.status(404).send({ error: 'Classroom not found' });
      }
      return reply.send(result.rows[0]);
    }
  );
};
