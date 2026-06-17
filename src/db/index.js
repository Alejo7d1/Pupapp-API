import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL;


const cleanConnectionString = databaseUrl.split('?')[0];
const params = new URLSearchParams(databaseUrl.split('?')[1] || '');
params.delete('sslmode');

const finalConnectionString = `${cleanConnectionString}${params.toString() ? '?' + params.toString() : ''}`;

const pool = new pg.Pool({
  connectionString: finalConnectionString,
  ssl: {
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 10000, // 10 segundos para fallar si no hay respuesta
  idleTimeoutMillis: 30000, // cerrar conexiones inactivas después de 30s
});


export const db = drizzle(pool);