import { FastifyPluginAsync } from 'fastify';
import { query, getClient } from '../db';

interface QuizAttemptPayload {
  id: string;           // client-generated UUID
  student_id: string;
  question_id: string;
  correct: boolean;
  xp_awarded: number;
  answered_at: string;  // ISO timestamp
}

interface SyncBody {
  attempts: QuizAttemptPayload[];
}

interface StudentRow {
  id: string;
  name: string;
  avatar: string;
  level: number;
  total_xp: number;
  coins: number;
  gems: number;
  badges: unknown[];
  last_turn_at: string | null;
}

interface LeaderboardRow {
  student_id: string;
  name: string;
  avatar: string;
  weekly_xp: number;
  rank: number;
}

/** Compute level from XP: every 100 XP = 1 level, minimum level 1 */
function computeLevel(xp: number): number {
  return Math.max(1, Math.floor(xp / 100) + 1);
}

export const syncRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /sections/:id/sync-attempts
  fastify.post<{ Params: { id: string }; Body: SyncBody }>(
    '/:id/sync-attempts',
    async (request, reply) => {
      const { id: sectionId } = request.params;
      const { attempts } = request.body;

      if (!Array.isArray(attempts) || attempts.length === 0) {
        return reply.status(400).send({ error: 'attempts must be a non-empty array' });
      }

      const client = await getClient();
      try {
        await client.query('BEGIN');

        // Deduplicate: insert only attempts not already in DB (by UUID)
        for (const attempt of attempts) {
          await client.query(
            `INSERT INTO quiz_attempts (id, student_id, question_id, correct, xp_awarded, answered_at, synced_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())
             ON CONFLICT (id) DO NOTHING`,
            [
              attempt.id,
              attempt.student_id,
              attempt.question_id,
              attempt.correct,
              attempt.xp_awarded,
              attempt.answered_at,
            ]
          );
        }

        // Recompute total_xp for each affected student from quiz_attempts
        const studentIds = [...new Set(attempts.map((a) => a.student_id))];

        for (const studentId of studentIds) {
          // Recompute total XP from all attempts
          const xpResult = await client.query<{ total: string }>(
            `SELECT COALESCE(SUM(xp_awarded), 0) AS total
             FROM quiz_attempts
             WHERE student_id = $1 AND correct = true`,
            [studentId]
          );
          const totalXp = parseInt(xpResult.rows[0].total, 10);
          const level = computeLevel(totalXp);

          // Find the latest answered_at for this student among synced attempts
          const latestAttempt = attempts
            .filter((a) => a.student_id === studentId)
            .sort((a, b) => new Date(b.answered_at).getTime() - new Date(a.answered_at).getTime())[0];

          // Update last_turn_at only if the new timestamp is newer
          await client.query(
            `UPDATE students
             SET total_xp = $1,
                 level = $2,
                 last_turn_at = CASE
                   WHEN last_turn_at IS NULL OR last_turn_at < $3::timestamptz
                   THEN $3::timestamptz
                   ELSE last_turn_at
                 END
             WHERE id = $4`,
            [totalXp, level, latestAttempt.answered_at, studentId]
          );
        }

        await client.query('COMMIT');

        // Return updated student records for the whole section
        const studentsResult = await client.query<StudentRow>(
          `SELECT id, name, avatar, level, total_xp, coins, gems, badges, last_turn_at
           FROM students
           WHERE section_id = $1
           ORDER BY name`,
          [sectionId]
        );

        return reply.send({
          synced: attempts.length,
          students: studentsResult.rows,
        });
      } catch (err) {
        await client.query('ROLLBACK');
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Sync failed', details: String(err) });
      } finally {
        client.release();
      }
    }
  );

  // GET /sections/:id/leaderboard?week=current
  fastify.get<{ Params: { id: string }; Querystring: { week?: string } }>(
    '/:id/leaderboard',
    async (request, reply) => {
      const { id: sectionId } = request.params;

      // Compute Monday 00:00:00 of current week in UTC
      const now = new Date();
      const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(now);
      monday.setUTCDate(now.getUTCDate() - daysFromMonday);
      monday.setUTCHours(0, 0, 0, 0);

      const result = await query<LeaderboardRow>(
        `SELECT
           s.id AS student_id,
           s.name,
           s.avatar,
           COALESCE(SUM(qa.xp_awarded), 0) AS weekly_xp,
           RANK() OVER (ORDER BY COALESCE(SUM(qa.xp_awarded), 0) DESC) AS rank
         FROM students s
         LEFT JOIN quiz_attempts qa
           ON qa.student_id = s.id
           AND qa.correct = true
           AND qa.answered_at >= $1
         WHERE s.section_id = $2
         GROUP BY s.id, s.name, s.avatar
         ORDER BY weekly_xp DESC, s.name`,
        [monday.toISOString(), sectionId]
      );

      return reply.send({
        week_start: monday.toISOString(),
        leaderboard: result.rows,
      });
    }
  );
};
