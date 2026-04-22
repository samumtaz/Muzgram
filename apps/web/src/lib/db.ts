import { Pool } from 'pg';
import { cache } from 'react';

// Read-only Supabase direct connection — no PgBouncer (RSCs hold connections)
// Docs/25 §1.2: separate read-only role, max 10 connections
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 8_000,
});

// React cache() deduplicates identical queries within a single RSC render tree
export const query = cache(async <T = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
): Promise<T[]> => {
  const { rows } = await pool.query(sql, params);
  return rows as T[];
});

export const queryOne = cache(async <T = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
): Promise<T | null> => {
  const { rows } = await pool.query(sql, params);
  return (rows[0] as T) ?? null;
});
