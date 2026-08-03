/**
 * Seed script: creates schema and inserts 1 section + 6 students
 * Run: npm run seed
 */

import 'dotenv/config';
import { pool } from './db';

async function seed() {
  console.log('🌱 Starting seed...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS sections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        current_mission_id TEXT,
        map_position INTEGER DEFAULT 0
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS students (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        avatar TEXT DEFAULT '',
        level INTEGER DEFAULT 1,
        total_xp INTEGER DEFAULT 0,
        coins INTEGER DEFAULT 0,
        gems INTEGER DEFAULT 0,
        badges JSONB DEFAULT '[]',
        last_turn_at TIMESTAMPTZ
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id UUID PRIMARY KEY,
        student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        question_id TEXT NOT NULL,
        correct BOOLEAN NOT NULL,
        xp_awarded INTEGER NOT NULL DEFAULT 0,
        answered_at TIMESTAMPTZ NOT NULL,
        synced_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Add indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_students_section ON students(section_id);
      CREATE INDEX IF NOT EXISTS idx_attempts_student ON quiz_attempts(student_id);
      CREATE INDEX IF NOT EXISTS idx_attempts_answered_at ON quiz_attempts(answered_at);
    `);

    console.log('✅ Tables created');

    // Insert section
    const sectionResult = await client.query<{ id: string }>(`
      INSERT INTO sections (name, current_mission_id, map_position)
      VALUES ('Grade 4 - A', 'mission_1', 0)
      ON CONFLICT DO NOTHING
      RETURNING id;
    `);

    let sectionId: string;
    if (sectionResult.rows.length === 0) {
      // Already seeded — fetch existing
      const existing = await client.query<{ id: string }>(
        "SELECT id FROM sections WHERE name = 'Grade 4 - A' LIMIT 1"
      );
      sectionId = existing.rows[0].id;
      console.log('ℹ️  Section already exists, using existing:', sectionId);
    } else {
      sectionId = sectionResult.rows[0].id;
      console.log('✅ Section created:', sectionId);
    }

    // Insert 6 students
    const students = [
      { name: 'Aarav Sharma', avatar: '🧑' },
      { name: 'Diya Patel', avatar: '👧' },
      { name: 'Rohan Mehta', avatar: '👦' },
      { name: 'Priya Nair', avatar: '👩' },
      { name: 'Karan Singh', avatar: '🧒' },
      { name: 'Meera Rao', avatar: '👧' },
    ];

    for (const student of students) {
      const exists = await client.query(
        'SELECT id FROM students WHERE section_id = $1 AND name = $2',
        [sectionId, student.name]
      );
      if (exists.rows.length === 0) {
        await client.query(
          `INSERT INTO students (section_id, name, avatar, level, total_xp, coins, gems, badges)
           VALUES ($1, $2, $3, 1, 0, 0, 0, '[]')`,
          [sectionId, student.name, student.avatar]
        );
        console.log(`✅ Student created: ${student.name}`);
      } else {
        console.log(`ℹ️  Student already exists: ${student.name}`);
      }
    }

    await client.query('COMMIT');
    console.log('\n🎉 Seed complete!');
    console.log(`\n📋 Section ID: ${sectionId}`);
    console.log('   Copy this to frontend/.env as VITE_DEFAULT_SECTION_ID (optional)');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Unhandled seed error:', err);
  process.exit(1);
});
