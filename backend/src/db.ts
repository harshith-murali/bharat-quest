import 'dotenv/config';
import { Pool, QueryResult, QueryResultRow } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const IS_PROD = process.env.NODE_ENV === 'production';

/**
 * RDS requires TLS. `rejectUnauthorized: false` accepts the AWS-managed
 * certificate chain without bundling the RDS CA; set PGSSL=disable for a
 * plain local Postgres.
 */
const ssl =
  process.env.PGSSL === 'disable'
    ? undefined
    : IS_PROD
    ? { rejectUnauthorized: false }
    : undefined;

export const pool = new Pool({
  connectionString,
  ssl,
  // Sized for a small ECS task. RDS has a hard max_connections, so keep this
  // low enough that (tasks × max) stays under it.
  max: parseInt(process.env.PG_POOL_MAX ?? '10', 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

// A pool error (e.g. RDS failover) must not take the process down.
pool.on('error', (err) => {
  console.error('Unexpected Postgres pool error:', err.message);
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

export async function getClient() {
  return pool.connect();
}
