import { z } from 'zod';

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

export const channelSchema = z.string().min(1, 'Channel name is required').max(100, 'Channel name too long');

export const spendSchema = z.coerce.number().nonnegative('Spend must be non-negative').finite();

export const revenueSchema = z.coerce.number().nonnegative('Revenue must be non-negative').finite().optional();

export const integerSchema = z.coerce.number().int('Must be an integer').nonnegative('Must be non-negative').optional();

export function validateDateRange(date: string, maxDaysBack: number = 730): { valid: boolean; error?: string } {
  const dateObj = new Date(date);
  const now = new Date();
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() - maxDaysBack);

  if (isNaN(dateObj.getTime())) {
    return { valid: false, error: 'Invalid date format' };
  }

  if (dateObj > now) {
    return { valid: false, error: 'Date cannot be in the future' };
  }

  if (dateObj < maxDate) {
    return { valid: false, error: `Date must be within last ${maxDaysBack} days` };
  }

  return { valid: true };
}

export function validateMinimumDataDays(accountId: string, dates: string[]): { valid: boolean; error?: string } {
  if (dates.length < 60) {
    return { valid: false, error: 'Minimum 60 days of data required for attribution' };
  }

  const uniqueDates = new Set(dates);
  if (uniqueDates.size < 60) {
    return { valid: false, error: 'Minimum 60 unique days of data required' };
  }

  return { valid: true };
}

export const csvRowSchema = z.object({
  date: dateSchema,
  channel: channelSchema,
  spend: spendSchema,
  revenue: revenueSchema,
  impressions: integerSchema,
  clicks: integerSchema,
  conversions: integerSchema,
  new_customers: integerSchema,
  returning_customers: integerSchema
});

export type CSVRow = z.infer<typeof csvRowSchema>;

