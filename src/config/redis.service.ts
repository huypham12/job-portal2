import type { SearchResponse, SuggestResponse } from './elasticsearch.service'
import { envConfig } from './getEnvConfig'
import Redis from 'ioredis'

/**
 * Redis cache wrapper sketch.
 * - Exposes minimal methods used by services: get, set, del.
 * - If REDIS_URL not configured, falls back to in-memory Map for local dev.
 *
 * NOTE: This is a lightweight integration sketch — replace with `ioredis` or `redis` client in production.
 */
type CacheValue = string

const REDIS_URL = envConfig.redis.url

// Redis client instance
let redisClient: Redis | null = null

// simple in-memory fallback
const localStore = new Map<string, CacheValue>()

// Initialize Redis client if URL is provided
if (REDIS_URL && REDIS_URL !== 'redis://localhost:6379') {
  // Skip default localhost Redis
  try {
    redisClient = new Redis(REDIS_URL, {
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 10000
    })

    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully')
    })

    redisClient.on('error', (err) => {
      console.error('❌ Redis connection error:', err.message)
    })

    redisClient.on('ready', () => {
      console.log('✅ Redis client ready')
    })
  } catch (error) {
    console.error('❌ Failed to initialize Redis client:', error)
    redisClient = null
  }
} else {
  console.log('📝 Redis not configured or using localhost default - using local memory cache')
}

export const redisService = {
  async get(key: string): Promise<string | null> {
    if (!REDIS_URL || !redisClient) {
      return localStore.has(key) ? (localStore.get(key) as string) : null
    }

    try {
      return await redisClient.get(key)
    } catch (error) {
      console.error('Redis GET error:', error)
      // Fallback to local store on Redis error
      return localStore.has(key) ? (localStore.get(key) as string) : null
    }
  },
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!REDIS_URL || !redisClient) {
      localStore.set(key, value)
      if (ttlSeconds) {
        setTimeout(() => localStore.delete(key), ttlSeconds * 1000)
      }
      return
    }

    try {
      if (ttlSeconds) {
        await redisClient.setex(key, ttlSeconds, value)
      } else {
        await redisClient.set(key, value)
      }
    } catch (error) {
      console.error('Redis SET error:', error)
      // Fallback to local store on Redis error
      localStore.set(key, value)
      if (ttlSeconds) {
        setTimeout(() => localStore.delete(key), ttlSeconds * 1000)
      }
    }
  },
  async del(key: string): Promise<void> {
    if (!REDIS_URL || !redisClient) {
      localStore.delete(key)
      return
    }

    try {
      await redisClient.del(key)
    } catch (error) {
      console.error('Redis DEL error:', error)
      // Fallback to local store on Redis error
      localStore.delete(key)
    }
  },
  // Convenience: cache wrapper for search responses
  async getSearchResponse(key: string): Promise<SearchResponse | null> {
    const raw = await this.get(key)
    if (!raw) return null
    try {
      return JSON.parse(raw) as SearchResponse
    } catch (e) {
      return null
    }
  },
  async setSearchResponse(key: string, resp: SearchResponse, ttlSeconds = 60): Promise<void> {
    await this.set(key, JSON.stringify(resp), ttlSeconds)
  },
  async getSuggestResponse(key: string): Promise<SuggestResponse | null> {
    const raw = await this.get(key)
    if (!raw) return null
    try {
      return JSON.parse(raw) as SuggestResponse
    } catch (e) {
      return null
    }
  },
  async setSuggestResponse(key: string, resp: SuggestResponse, ttlSeconds = 30): Promise<void> {
    await this.set(key, JSON.stringify(resp), ttlSeconds)
  },

  // Graceful shutdown
  async disconnect(): Promise<void> {
    if (redisClient) {
      await redisClient.quit()
      redisClient = null
      console.log('✅ Redis client disconnected')
    }
  },

  // Health check
  async ping(): Promise<boolean> {
    if (!REDIS_URL || !redisClient) {
      return false
    }

    try {
      const result = await redisClient.ping()
      return result === 'PONG'
    } catch (error) {
      console.error('Redis PING error:', error)
      return false
    }
  }
}
