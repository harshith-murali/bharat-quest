import { FastifyPluginAsync } from 'fastify';
import { query } from '../db';

interface SectionRow {
  id: string;
  name: string;
  current_mission_id: string | null;
  map_position: number;
}

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

export const sectionsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /sections — list all sections
  fastify.get('/', async (_request, reply) => {
    const result = await query<SectionRow>(
      'SELECT id, name, current_mission_id, map_position FROM sections ORDER BY name'
    );
    return reply.send(result.rows);
  });

  // GET /sections/:id — section + students
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;

    const sectionResult = await query<SectionRow>(
      'SELECT id, name, current_mission_id, map_position FROM sections WHERE id = $1',
      [id]
    );

    if (sectionResult.rows.length === 0) {
      return reply.status(404).send({ error: 'Section not found' });
    }

    const studentsResult = await query<StudentRow>(
      `SELECT id, section_id, name, avatar, level, total_xp, coins, gems, badges, last_turn_at
       FROM students
       WHERE section_id = $1
       ORDER BY name`,
      [id]
    );

    return reply.send({
      section: sectionResult.rows[0],
      students: studentsResult.rows,
    });
  });
};
