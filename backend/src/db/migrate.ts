import { readFileSync } from 'fs';
import { join } from 'path';
import { pool } from './connection';

async function migrate() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Read migration files in order
    const migrationFiles = [
      '001_initial_schema.sql'
    ];
    
    for (const file of migrationFiles) {
      const sql = readFileSync(join(__dirname, 'migrations', file), 'utf-8');
      await client.query(sql);
      console.log(`✅ Applied migration: ${file}`);
    }
    
    await client.query('COMMIT');
    console.log('✅ All migrations completed');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);

