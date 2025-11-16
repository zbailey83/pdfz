import { pool } from '../db/connection';

const CHANNEL_MAP: Record<string, string> = {
  'fb ads': 'Facebook Ads',
  'facebook ads': 'Facebook Ads',
  'fb': 'Facebook Ads',
  'google ads': 'Google Ads',
  'google': 'Google Ads',
  'gads': 'Google Ads',
  'linkedin': 'LinkedIn Ads',
  'linkedin ads': 'LinkedIn Ads',
  'twitter': 'Twitter Ads',
  'twitter ads': 'Twitter Ads',
  'x': 'Twitter Ads',
  'instagram': 'Instagram Ads',
  'instagram ads': 'Instagram Ads',
  'tiktok': 'TikTok Ads',
  'tiktok ads': 'TikTok Ads',
  'snapchat': 'Snapchat Ads',
  'snapchat ads': 'Snapchat Ads',
  'pinterest': 'Pinterest Ads',
  'pinterest ads': 'Pinterest Ads',
  'bing': 'Bing Ads',
  'bing ads': 'Bing Ads',
  'email': 'Email Marketing',
  'email marketing': 'Email Marketing',
  'seo': 'SEO',
  'organic': 'Organic',
  'direct': 'Direct',
  'referral': 'Referral'
};

export async function normalizeChannel(accountId: string, rawChannel: string): Promise<string> {
  const normalized = rawChannel.trim().toLowerCase();
  
  // Check account-specific mapping first
  const accountMap = await pool.query(
    'SELECT normalized_name FROM channel_normalization WHERE account_id = $1 AND raw_name = $2',
    [accountId, normalized]
  );

  if (accountMap.rows.length > 0) {
    return accountMap.rows[0].normalized_name;
  }

  // Check global map
  if (CHANNEL_MAP[normalized]) {
    return CHANNEL_MAP[normalized];
  }

  // Default: capitalize first letter of each word
  return rawChannel
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

