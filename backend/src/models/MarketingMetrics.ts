import { pool } from '../db/connection';

export interface MarketingMetric {
  id: string;
  account_id: string;
  date: Date;
  channel: string;
  spend: number;
  revenue?: number;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  new_customers?: number;
  returning_customers?: number;
  created_at: Date;
  updated_at: Date;
}

export interface MetricInput {
  date: string;
  channel: string;
  spend: number;
  revenue?: number;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  new_customers?: number;
  returning_customers?: number;
}

export class MarketingMetricsModel {
  static async bulkInsert(accountId: string, metrics: MetricInput[]): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (const metric of metrics) {
        await client.query(
          `INSERT INTO marketing_daily_metrics 
           (account_id, date, channel, spend, revenue, impressions, clicks, conversions, new_customers, returning_customers)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (account_id, date, channel) 
           DO UPDATE SET
             spend = EXCLUDED.spend,
             revenue = EXCLUDED.revenue,
             impressions = EXCLUDED.impressions,
             clicks = EXCLUDED.clicks,
             conversions = EXCLUDED.conversions,
             new_customers = EXCLUDED.new_customers,
             returning_customers = EXCLUDED.returning_customers,
             updated_at = NOW()`,
          [
            accountId,
            metric.date,
            metric.channel,
            metric.spend,
            metric.revenue || null,
            metric.impressions || null,
            metric.clicks || null,
            metric.conversions || null,
            metric.new_customers || null,
            metric.returning_customers || null
          ]
        );
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getSummary(
    accountId: string,
    days: number = 90
  ): Promise<{
    total_spend: number;
    total_revenue: number;
    total_impressions: number;
    total_clicks: number;
    total_conversions: number;
    blended_roas: number;
    channels: Array<{
      channel: string;
      spend: number;
      revenue: number;
      roas: number;
    }>;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await pool.query(
      `SELECT 
        SUM(spend) as total_spend,
        SUM(revenue) as total_revenue,
        SUM(impressions) as total_impressions,
        SUM(clicks) as total_clicks,
        SUM(conversions) as total_conversions
       FROM marketing_daily_metrics
       WHERE account_id = $1 AND date >= $2`,
      [accountId, cutoffDate.toISOString().split('T')[0]]
    );

    const totals = result.rows[0];
    const totalSpend = parseFloat(totals.total_spend || '0');
    const totalRevenue = parseFloat(totals.total_revenue || '0');
    const blendedRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

    // Per-channel breakdown
    const channelResult = await pool.query(
      `SELECT 
        channel,
        SUM(spend) as spend,
        SUM(revenue) as revenue
       FROM marketing_daily_metrics
       WHERE account_id = $1 AND date >= $2
       GROUP BY channel
       ORDER BY spend DESC`,
      [accountId, cutoffDate.toISOString().split('T')[0]]
    );

    const channels = channelResult.rows.map((row: any) => ({
      channel: row.channel,
      spend: parseFloat(row.spend || '0'),
      revenue: parseFloat(row.revenue || '0'),
      roas: parseFloat(row.spend || '0') > 0 
        ? parseFloat(row.revenue || '0') / parseFloat(row.spend || '0')
        : 0
    }));

    return {
      total_spend: totalSpend,
      total_revenue: totalRevenue,
      total_impressions: parseInt(totals.total_impressions || '0', 10),
      total_clicks: parseInt(totals.total_clicks || '0', 10),
      total_conversions: parseInt(totals.total_conversions || '0', 10),
      blended_roas: blendedRoas,
      channels
    };
  }

  static async getTimeSeries(
    accountId: string,
    days: number = 90
  ): Promise<Array<{
    date: string;
    spend: number;
    revenue: number;
    channel: string;
  }>> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await pool.query(
      `SELECT date, channel, SUM(spend) as spend, SUM(revenue) as revenue
       FROM marketing_daily_metrics
       WHERE account_id = $1 AND date >= $2
       GROUP BY date, channel
       ORDER BY date ASC, channel ASC`,
      [accountId, cutoffDate.toISOString().split('T')[0]]
    );

    return result.rows.map((row: any) => ({
      date: row.date.toISOString().split('T')[0],
      spend: parseFloat(row.spend || '0'),
      revenue: parseFloat(row.revenue || '0'),
      channel: row.channel
    }));
  }
}

