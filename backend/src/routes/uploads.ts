import express from 'express';
import multer from 'multer';
import { S3 } from 'aws-sdk';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import { authenticate, AuthRequest, requirePremium } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { pool } from '../db/connection';
import { MarketingMetricsModel, MetricInput } from '../models/MarketingMetrics';
import { normalizeChannel } from '../utils/channelNormalization';
import { invalidatePattern } from '../services/redis';
import { validateDateRange, validateMinimumDataDays, csvRowSchema } from '../utils/validation';

const router = express.Router();

interface FileRequest extends AuthRequest {
  file?: Express.Multer.File;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const s3 = new S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const CSV_SCHEMA = z.object({
  date: z.string(),
  channel: z.string(),
  spend: z.coerce.number().nonnegative(),
  revenue: z.coerce.number().nonnegative().optional(),
  impressions: z.coerce.number().int().nonnegative().optional(),
  clicks: z.coerce.number().int().nonnegative().optional(),
  conversions: z.coerce.number().int().nonnegative().optional(),
  new_customers: z.coerce.number().int().nonnegative().optional(),
  returning_customers: z.coerce.number().int().nonnegative().optional()
});

// POST /api/v1/uploads/csv
router.post('/csv', authenticate, upload.single('file'), async (req: FileRequest, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded'
      });
    }

    if (!req.accountId) {
      throw new AppError('Unauthorized', 401);
    }

    // Check free tier limits
    if (req.tier === 'free') {
      const rowCount = req.file.buffer.toString().split('\n').length - 1;
      if (rowCount > 500) {
        return res.status(403).json({
          status: 'error',
          message: 'Free tier limit: 500 rows per month. Please upgrade to Premium.'
        });
      }
    }

    // Parse CSV
    const records = parse(req.file.buffer.toString(), {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    // Validate and normalize
    const metrics: MetricInput[] = [];
    const errors: string[] = [];
    const dates: string[] = [];

    for (let i = 0; i < records.length; i++) {
      try {
        // Use the validation schema
        const row = csvRowSchema.parse(records[i]);
        const normalizedChannel = await normalizeChannel(req.accountId, row.channel);
        
        // Validate date range (free tier: last 2 years = 730 days)
        const maxDaysBack = req.tier === 'free' ? 730 : 3650; // 10 years for premium
        const dateValidation = validateDateRange(row.date, maxDaysBack);
        if (!dateValidation.valid) {
          errors.push(`Row ${i + 2}: ${dateValidation.error}`);
          continue;
        }

        dates.push(row.date);

        metrics.push({
          date: row.date,
          channel: normalizedChannel,
          spend: row.spend,
          revenue: row.revenue,
          impressions: row.impressions,
          clicks: row.clicks,
          conversions: row.conversions,
          new_customers: row.new_customers,
          returning_customers: row.returning_customers
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          errors.push(`Row ${i + 2}: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
        } else {
          errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    // Validate minimum data days requirement
    if (metrics.length > 0) {
      const existingCount = await pool.query(
        'SELECT COUNT(DISTINCT date) as count FROM marketing_daily_metrics WHERE account_id = $1',
        [req.accountId]
      );
      const existingDays = parseInt(existingCount.rows[0]?.count || '0', 10);
      const allDates = [...new Set([...dates, ...Array(existingDays).fill('')])];
      
      const minDaysValidation = validateMinimumDataDays(req.accountId, allDates.filter(Boolean));
      if (!minDaysValidation.valid && existingDays < 60) {
        errors.push(`Warning: ${minDaysValidation.error}. Attribution models require at least 60 days of data.`);
      }
    }

    if (errors.length > 0 && metrics.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'CSV validation failed',
        errors
      });
    }

    // Upload to S3
    const s3Key = `uploads/${req.accountId}/${Date.now()}-${req.file.originalname}`;
    await s3.putObject({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: s3Key,
      Body: req.file.buffer,
      ContentType: 'text/csv'
    }).promise();

    // Save upload record
    const uploadResult = await pool.query(
      `INSERT INTO csv_uploads (account_id, s3_key, filename, row_count, status)
       VALUES ($1, $2, $3, $4, 'processing')
       RETURNING id`,
      [req.accountId, s3Key, req.file.originalname, metrics.length]
    );

    const uploadId = uploadResult.rows[0].id;

      // Insert metrics
    try {
      await MarketingMetricsModel.bulkInsert(req.accountId, metrics);
      
      await pool.query(
        'UPDATE csv_uploads SET status = $1 WHERE id = $2',
        ['completed', uploadId]
      );

      // Invalidate cache for this account's data
      await invalidatePattern(`data:summary:${req.accountId}:*`);
      await invalidatePattern(`data:timeseries:${req.accountId}:*`);
    } catch (error) {
      await pool.query(
        'UPDATE csv_uploads SET status = $1, error_message = $2 WHERE id = $3',
        ['failed', error instanceof Error ? error.message : 'Unknown error', uploadId]
      );
      throw error;
    }

    res.json({
      status: 'success',
      data: {
        upload_id: uploadId,
        rows_processed: metrics.length,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/uploads/:id
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.accountId) {
      throw new AppError('Unauthorized', 401);
    }

    const result = await pool.query(
      'SELECT * FROM csv_uploads WHERE id = $1 AND account_id = $2',
      [req.params.id, req.accountId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Upload not found'
      });
    }

    res.json({
      status: 'success',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

export default router;

