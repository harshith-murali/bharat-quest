/**
 * Ensures a section row exists for every classroom the login screen offers
 * (Class 3-7 x Section A-D).
 *
 * Without these the admin page has nothing to pick from, and logging into a
 * classroom that has no section row leaves the teacher with an empty roster.
 *
 * Idempotent — safe to re-run.  Run: npm run seed:classrooms
 */

import 'dotenv/config';
import { pool } from './db';

const GRADES = [3, 4, 5, 6, 7];
const LETTERS = ['A', 'B', 'C', 'D'];

async function seedClassrooms() {
  console.log('🏫 Seeding classrooms…');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let created = 0;
    for (const grade of GRADES) {
      for (const letter of LETTERS) {
        const name = `Grade ${grade} - ${letter}`;
        const res = await client.query(
          `INSERT INTO sections (name, grade, section_letter, map_position)
           VALUES ($1, $2, $3, 0)
           ON CONFLICT (grade, section_letter) DO NOTHING
           RETURNING id`,
          [name, grade, letter]
        );
        if (res.rowCount) created++;
      }
    }

    await client.query('COMMIT');
    console.log(`✅ Classrooms ready (${created} created, ${GRADES.length * LETTERS.length} total).`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Classroom seed failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seedClassrooms();
