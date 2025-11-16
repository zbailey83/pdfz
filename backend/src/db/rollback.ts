import { pool } from './connection';

async function rollback() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Drop tables in reverse order
    await client.query('DROP TABLE IF EXISTS attribution_results CASCADE');
    await client.query('DROP TABLE IF EXISTS channel_normalization CASCADE');
    await client.query('DROP TABLE IF EXISTS csv_uploads CASCADE');
    await client.query('DROP TABLE IF EXISTS marketing_daily_metrics CASCADE');
    await client.query('DROP TABLE IF EXISTS accounts CASCADE');
    
    await client.query('COMMIT');
    console.log('✅ Rollback completed');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Rollback failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

rollback().catch(console.error);

