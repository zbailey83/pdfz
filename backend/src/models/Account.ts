import { pool } from '../db/connection';
import bcrypt from 'bcrypt';

export interface Account {
  id: string;
  email: string;
  password_hash: string;
  tier: 'free' | 'premium';
  created_at: Date;
  updated_at: Date;
}

export interface CreateAccountInput {
  email: string;
  password: string;
}

export class AccountModel {
  static async create(input: CreateAccountInput): Promise<Account> {
    const passwordHash = await bcrypt.hash(input.password, 10);
    
    const result = await pool.query(
      `INSERT INTO accounts (email, password_hash, tier)
       VALUES ($1, $2, 'free')
       RETURNING id, email, tier, created_at, updated_at`,
      [input.email, passwordHash]
    );
    
    return result.rows[0];
  }

  static async findByEmail(email: string): Promise<Account | null> {
    const result = await pool.query(
      'SELECT * FROM accounts WHERE email = $1',
      [email]
    );
    
    return result.rows[0] || null;
  }

  static async findById(id: string): Promise<Account | null> {
    const result = await pool.query(
      'SELECT * FROM accounts WHERE id = $1',
      [id]
    );
    
    return result.rows[0] || null;
  }

  static async verifyPassword(account: Account, password: string): Promise<boolean> {
    return bcrypt.compare(password, account.password_hash);
  }

  static async upgradeToPremium(accountId: string): Promise<void> {
    await pool.query(
      'UPDATE accounts SET tier = $1, updated_at = NOW() WHERE id = $2',
      ['premium', accountId]
    );
  }

  static async delete(accountId: string): Promise<void> {
    await pool.query('DELETE FROM accounts WHERE id = $1', [accountId]);
  }
}

