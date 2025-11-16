import { describe, it, expect, beforeEach } from '@jest/globals';
import { AccountModel } from '../models/Account';

// Mock database connection
jest.mock('../db/connection', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('AccountModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an account with hashed password', async () => {
      const { pool } = require('../db/connection');
      const mockAccount = {
        id: 'test-id',
        email: 'test@example.com',
        tier: 'free',
        created_at: new Date(),
        updated_at: new Date()
      };

      pool.query.mockResolvedValueOnce({ rows: [mockAccount] });

      const result = await AccountModel.create({
        email: 'test@example.com',
        password: 'password123'
      });

      expect(result.email).toBe('test@example.com');
      expect(result.tier).toBe('free');
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO accounts'),
        expect.arrayContaining(['test@example.com', expect.any(String)])
      );
    });
  });

  describe('findByEmail', () => {
    it('should find account by email', async () => {
      const { pool } = require('../db/connection');
      const mockAccount = {
        id: 'test-id',
        email: 'test@example.com',
        password_hash: 'hashed',
        tier: 'free'
      };

      pool.query.mockResolvedValueOnce({ rows: [mockAccount] });

      const result = await AccountModel.findByEmail('test@example.com');

      expect(result).not.toBeNull();
      expect(result?.email).toBe('test@example.com');
    });

    it('should return null if account not found', async () => {
      const { pool } = require('../db/connection');
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await AccountModel.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });
});

