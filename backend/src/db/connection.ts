import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test connection
pool.query('SELECT NOW()', (err: Error | null, res?: any) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('✅ Database connected');
  }
});

