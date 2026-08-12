import { FastifyPluginAsync } from 'fastify';
import { query } from '../db';

interface FactRow {
  id: string;
  state_name: string;
  fact: string;
  category: string;
  sort_order: number;
}

export const factsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /facts/:stateName — all facts for one state
  fastify.get<{ Params: { stateName: string } }>('/:stateName', async (request, reply) => {
    const stateName = decodeURIComponent(request.params.stateName);

    const result = await query<FactRow>(
      `SELECT id, state_name, fact, category, sort_order
         FROM state_facts
        WHERE state_name = $1
        ORDER BY sort_order, created_at`,
      [stateName]
    );

    return reply.send(result.rows);
  });

  // GET /facts — every state's facts, grouped (used by the admin page)
  fastify.get('/', async (_request, reply) => {
    const result = await query<FactRow>(
      `SELECT id, state_name, fact, category, sort_order
         FROM state_facts
        ORDER BY state_name, sort_order`
    );

    const grouped: Record<string, FactRow[]> = {};
    for (const row of result.rows) {
      (grouped[row.state_name] ??= []).push(row);
    }
    return reply.send(grouped);
  });
};
