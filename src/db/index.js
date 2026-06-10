import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Neon requiere SSL obligatorio para conectar
  }
});


export const db = drizzle(pool);