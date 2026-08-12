import { FastifyPluginAsync } from 'fastify';
import { query } from '../db';

/**
 * Server-authoritative quest progression.
 *
 * Postgres is the source of truth; the frontend keeps an IndexedDB copy purely
 * as an offline cache and pushes here whenever it is online.
 */

interface ProgressRow {
  section_id: string;
  unlocked_states: string[];
  completed_states: string[];
  current_state: string;
  state_quiz_progress: Record<string, unknown>;
  updated_at: string;
}

interface PutBody {
  unlocked_states: string[];
  completed_states: string[];
  current_state: string;
  state_quiz_progress?: Record<string, unknown>;
}

export const progressRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /progress/:sectionId
  fastify.get<{ Params: { sectionId: string } }>('/:sectionId', async (request, reply) => {
    const { sectionId } = request.params;

    const result = await query<ProgressRow>(
      `SELECT section_id, unlocked_states, completed_states, current_state,
              state_quiz_progress, updated_at
         FROM quest_progress
        WHERE section_id = $1`,
      [sectionId]
    );

    if (result.rowCount === 0) {
      // A section that has never played starts at Ladakh.
      return reply.send({
        section_id: sectionId,
        unlocked_states: ['Ladakh'],
        completed_states: [],
        current_state: 'Ladakh',
        state_quiz_progress: {},
      });
    }

    return reply.send(result.rows[0]);
  });

  // PUT /progress/:sectionId — upsert the whole progression object
  fastify.put<{ Params: { sectionId: string }; Body: PutBody }>(
    '/:sectionId',
    async (request, reply) => {
      const { sectionId } = request.params;
      const body = request.body ?? ({} as PutBody);

      if (
        !Array.isArray(body.unlocked_states) ||
        !Array.isArray(body.completed_states) ||
        typeof body.current_state !== 'string'
      ) {
        return reply.status(400).send({ error: 'Invalid progression payload' });
      }

      const result = await query<ProgressRow>(
        `INSERT INTO quest_progress
           (section_id, unlocked_states, completed_states, current_state, state_quiz_progress, updated_at)
         VALUES ($1, $2::jsonb, $3::jsonb, $4, $5::jsonb, now())
         ON CONFLICT (section_id) DO UPDATE SET
           unlocked_states     = EXCLUDED.unlocked_states,
           completed_states    = EXCLUDED.completed_states,
           current_state       = EXCLUDED.current_state,
           state_quiz_progress = EXCLUDED.state_quiz_progress,
           updated_at          = now()
         RETURNING *`,
        [
          sectionId,
          JSON.stringify(body.unlocked_states),
          JSON.stringify(body.completed_states),
          body.current_state,
          JSON.stringify(body.state_quiz_progress ?? {}),
        ]
      );

      return reply.send(result.rows[0]);
    }
  );
};
