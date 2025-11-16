import { describe, it, expect } from '@jest/globals';
import { validateDateRange, validateMinimumDataDays, csvRowSchema } from '../utils/validation';

describe('Validation Utils', () => {
  describe('validateDateRange', () => {
    it('should accept valid dates within range', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const result = validateDateRange(yesterday.toISOString().split('T')[0]);
      expect(result.valid).toBe(true);
    });

    it('should reject future dates', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const result = validateDateRange(tomorrow.toISOString().split('T')[0]);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('future');
    });

    it('should reject dates too far in the past', () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 3);
      const result = validateDateRange(oldDate.toISOString().split('T')[0], 730);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateMinimumDataDays', () => {
    it('should accept data with 60+ unique dates', () => {
      const dates: string[] = [];
      for (let i = 0; i < 60; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
      }
      const result = validateMinimumDataDays('test-account', dates);
      expect(result.valid).toBe(true);
    });

    it('should reject data with less than 60 days', () => {
      const dates: string[] = [];
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
      }
      const result = validateMinimumDataDays('test-account', dates);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('60');
    });
  });

  describe('csvRowSchema', () => {
    it('should validate correct CSV row', () => {
      const validRow = {
        date: '2025-01-15',
        channel: 'Google Ads',
        spend: '100.50',
        revenue: '250.00',
        impressions: '1000',
        clicks: '50',
        conversions: '5'
      };
      const result = csvRowSchema.safeParse(validRow);
      expect(result.success).toBe(true);
    });

    it('should reject invalid date format', () => {
      const invalidRow = {
        date: '01/15/2025',
        channel: 'Google Ads',
        spend: '100.50'
      };
      const result = csvRowSchema.safeParse(invalidRow);
      expect(result.success).toBe(false);
    });

    it('should reject negative spend', () => {
      const invalidRow = {
        date: '2025-01-15',
        channel: 'Google Ads',
        spend: '-100.50'
      };
      const result = csvRowSchema.safeParse(invalidRow);
      expect(result.success).toBe(false);
    });
  });
});

