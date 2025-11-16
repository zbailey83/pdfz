import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = createClient({
  url: redisUrl
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('✅ Redis connected');
});

// Connect on module load
if (!redisClient.isOpen) {
  redisClient.connect().catch(console.error);
}

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
}

export async function setCached(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    console.error('Redis set error:', error);
  }
}

export async function deleteCached(key: string): Promise<void> {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    await redisClient.del(key);
  } catch (error) {
    console.error('Redis delete error:', error);
  }
}

export async function invalidatePattern(pattern: string): Promise<void> {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    console.error('Redis invalidate pattern error:', error);
  }
}

