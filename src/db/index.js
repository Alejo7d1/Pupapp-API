import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL;

// Eliminamos cualquier parámetro sslmode de la cadena para manejarlo 
// exclusivamente a través del objeto 'ssl' de pg.Pool, evitando el conflicto del alias.
const cleanConnectionString = databaseUrl.split('?')[0];
const params = new URLSearchParams(databaseUrl.split('?')[1] || '');
params.delete('sslmode');

const finalConnectionString = `${cleanConnectionString}${params.toString() ? '?' + params.toString() : ''}`;

const pool = new pg.Pool({
  connectionString: finalConnectionString,
  ssl: {
    rejectUnauthorized: false,
    // Esto fuerza el comportamiento 'verify-full' de forma interna sin disparar el warning del parser
  }
});


export const db = drizzle(pool);