/**
 * Seeds state_facts from src/data/stateFacts.ts.
 *
 * Idempotent: relies on the unique (state_name, fact) index, so re-running
 * updates ordering/category without creating duplicates.
 *
 * Run: npm run seed:facts
 */

import 'dotenv/config';
import { pool } from './db';
import { STATE_FACTS } from './data/stateFacts';

async function seedFacts() {
  console.log('🌱 Seeding state facts…');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let inserted = 0;
    for (const [stateName, facts] of Object.entries(STATE_FACTS)) {
      for (let i = 0; i < facts.length; i++) {
        const { fact, category } = facts[i];
        await client.query(
          `INSERT INTO state_facts (state_name, fact, category, sort_order)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (state_name, fact)
           DO UPDATE SET category = EXCLUDED.category, sort_order = EXCLUDED.sort_order`,
          [stateName, fact, category, i]
        );
        inserted++;
      }
    }

    await client.query('COMMIT');
    console.log(`✅ Seeded ${inserted} facts across ${Object.keys(STATE_FACTS).length} states.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Fact seed failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seedFacts();
