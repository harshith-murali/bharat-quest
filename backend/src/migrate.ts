/**
 * Idempotent schema migration.
 *
 * Adds the tables introduced alongside the Facts / Talk / Admin features:
 *   - state_facts     : 5-10 teaching points per Quest state
 *   - chat_messages   : persisted Talk transcripts (teacher-reviewable)
 *   - quest_progress   : server-authoritative quest progression per section
 *
 * Safe to run repeatedly:  npm run migrate
 */

import 'dotenv/config';
import { pool } from './db';

export const MIGRATION_SQL = `
-- ─── Base tables ────────────────────────────────────────────────────────────
-- Created here (not only in seed.ts) so that a brand-new database — such as a
-- freshly provisioned RDS instance — can be migrated without first running the
-- demo seed. All statements are IF NOT EXISTS, so existing databases are
-- unaffected.
CREATE TABLE IF NOT EXISTS sections (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL,
  current_mission_id TEXT,
  map_position       INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS students (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id   UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  avatar       TEXT DEFAULT '🧑',
  level        INTEGER DEFAULT 1,
  total_xp     INTEGER DEFAULT 0,
  coins        INTEGER DEFAULT 0,
  gems         INTEGER DEFAULT 0,
  badges       JSONB DEFAULT '[]'::jsonb,
  last_turn_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  correct     BOOLEAN NOT NULL,
  xp_awarded  INTEGER NOT NULL DEFAULT 0,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at   TIMESTAMPTZ
);

-- Grade / section were previously encoded only in sections.name (e.g.
-- "Grade 4 - A"), which cannot be filtered on. Promote them to real columns
-- so the admin page can pick a class and a section independently.
ALTER TABLE sections ADD COLUMN IF NOT EXISTS grade INTEGER;
ALTER TABLE sections ADD COLUMN IF NOT EXISTS section_letter TEXT;

-- Backfill from the existing free-text name where possible.
UPDATE sections
   SET grade = COALESCE(grade, NULLIF(substring(name from '(?:Grade|Class)\\s*(\\d+)'), '')::int)
 WHERE grade IS NULL;

UPDATE sections
   SET section_letter = COALESCE(section_letter, upper(substring(name from '-\\s*([A-Da-d])\\s*$')))
 WHERE section_letter IS NULL;

-- One classroom per (grade, section) pair.
-- Unconditional (not partial) so it can serve as an ON CONFLICT arbiter;
-- Postgres treats NULLs as distinct, so legacy rows without a grade are fine.
CREATE UNIQUE INDEX IF NOT EXISTS uq_sections_grade_letter
  ON sections (grade, section_letter);

CREATE TABLE IF NOT EXISTS state_facts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_name   TEXT NOT NULL,
  fact         TEXT NOT NULL,
  category     TEXT NOT NULL DEFAULT 'General',
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_state_facts_state ON state_facts (state_name, sort_order);
-- One row per (state, fact) so re-seeding cannot duplicate content.
CREATE UNIQUE INDEX IF NOT EXISTS uq_state_facts_state_fact ON state_facts (state_name, fact);

CREATE TABLE IF NOT EXISTS chat_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id   TEXT NOT NULL,
  state_name   TEXT,
  role         TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content      TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_section_time ON chat_messages (section_id, created_at);

-- ─── Auth / RBAC ────────────────────────────────────────────────────────────
-- Staff accounts only. Students are never authenticated: the app runs on a
-- shared classroom smartboard and students are chosen by the turn spinner.
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'teacher')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

-- Case-insensitive uniqueness so Alice@x.com and alice@x.com cannot coexist.
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email ON users (lower(email));

-- Which classrooms a teacher may manage. An 'admin' ignores this table and
-- may manage every classroom.
CREATE TABLE IF NOT EXISTS user_sections (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, section_id)
);

CREATE TABLE IF NOT EXISTS quest_progress (
  section_id       TEXT PRIMARY KEY,
  unlocked_states  JSONB NOT NULL DEFAULT '["Ladakh"]'::jsonb,
  completed_states JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_state    TEXT NOT NULL DEFAULT 'Ladakh',
  state_quiz_progress JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

async function migrate() {
  console.log('🔧 Running migrations…');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(MIGRATION_SQL);
    await client.query('COMMIT');
    console.log('✅ Migrations applied.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
