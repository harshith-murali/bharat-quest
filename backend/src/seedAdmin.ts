/**
 * Creates the first admin account so someone can sign in and manage the rest.
 *
 * Credentials come from the environment — nothing is hard-coded, so a default
 * password can never ship to production:
 *
 *   ADMIN_EMAIL=head@school.test ADMIN_PASSWORD='…' npm run seed:admin
 *
 * Idempotent: if the email already exists the account is left untouched.
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from './db';

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? 'Head Teacher';

  if (!email || !password) {
    console.error('❌ ADMIN_EMAIL and ADMIN_PASSWORD must be set.');
    console.error("   e.g. ADMIN_EMAIL=head@school.test ADMIN_PASSWORD='…' npm run seed:admin");
    process.exitCode = 1;
    return;
  }
  if (password.length < 8) {
    console.error('❌ ADMIN_PASSWORD must be at least 8 characters.');
    process.exitCode = 1;
    return;
  }

  const client = await pool.connect();
  try {
    const existing = await client.query('SELECT id FROM users WHERE lower(email) = lower($1)', [
      email,
    ]);

    if (existing.rowCount) {
      console.log(`ℹ️  ${email} already exists — leaving it unchanged.`);
      return;
    }

    const hash = await bcrypt.hash(password, 12);
    await client.query(
      `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, 'admin')`,
      [email, hash, name]
    );

    console.log(`✅ Admin created: ${email}`);
  } catch (err) {
    console.error('❌ Admin seed failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seedAdmin();
