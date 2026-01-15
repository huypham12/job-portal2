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
const REDIS_PASSWORD = envConfig.redis.password

// Redis client instance
let redisClient: Redis | null = null

// simple in-memory fallback
const localStore = new Map<string, CacheValue>()

// Track cache metrics
const cacheMetrics = {
  hits: 0,
  misses: 0,
  errors: 0
}

// Initialize Redis client if URL is provided
if (REDIS_URL && REDIS_URL !== 'redis://localhost:6379') {
  // Skip default localhost Redis
  try {
    redisClient = new Redis(REDIS_URL, {
      password: REDIS_PASSWORD,
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
      const value = localStore.get(key)
      if (value) {
        cacheMetrics.hits++
        return value
      }
      cacheMetrics.misses++
      return null
    }

    try {
      const value = await redisClient.get(key)
      if (value) {
        cacheMetrics.hits++
      } else {
        cacheMetrics.misses++
      }
      return value
    } catch (error) {
      cacheMetrics.errors++
      console.error('Redis GET error:', error)
      // Fallback to local store on Redis error
      const fallbackValue = localStore.get(key)
      if (fallbackValue) cacheMetrics.hits++
      else cacheMetrics.misses++
      return fallbackValue || null
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
  },

  /**
   * Invalidate all cache entries matching a pattern
   * Useful when jobs/companies are updated
   */
  async invalidatePattern(pattern: string): Promise<number> {
    if (!REDIS_URL || !redisClient) {
      // Clear matching keys from local store
      let count = 0
      for (const key of localStore.keys()) {
        if (key.includes(pattern.replace(/\*/g, ''))) {
          localStore.delete(key)
          count++
        }
      }
      return count
    }

    try {
      const keys = await redisClient.keys(pattern)
      if (keys.length === 0) return 0

      await redisClient.del(...keys)
      return keys.length
    } catch (error) {
      console.error('Redis invalidatePattern error:', error)
      return 0
    }
  },

  /**
   * Get multiple keys at once
   */
  async mget(keys: string[]): Promise<(string | null)[]> {
    if (!REDIS_URL || !redisClient) {
      return keys.map((key) => localStore.get(key) || null)
    }

    try {
      return await redisClient.mget(...keys)
    } catch (error) {
      console.error('Redis MGET error:', error)
      return keys.map((key) => localStore.get(key) || null)
    }
  },

  /**
   * Set multiple key-value pairs at once
   */
  async mset(entries: Array<{ key: string; value: string; ttl?: number }>): Promise<void> {
    if (!REDIS_URL || !redisClient) {
      entries.forEach(({ key, value, ttl }) => {
        localStore.set(key, value)
        if (ttl) {
          setTimeout(() => localStore.delete(key), ttl * 1000)
        }
      })
      return
    }

    try {
      const pipeline = redisClient.pipeline()

      entries.forEach(({ key, value, ttl }) => {
        if (ttl) {
          pipeline.setex(key, ttl, value)
        } else {
          pipeline.set(key, value)
        }
      })

      await pipeline.exec()
    } catch (error) {
      console.error('Redis MSET error:', error)
      // Fallback to local store
      entries.forEach(({ key, value, ttl }) => {
        localStore.set(key, value)
        if (ttl) {
          setTimeout(() => localStore.delete(key), ttl * 1000)
        }
      })
    }
  },

  /**
   * Delete multiple keys at once
   */
  async mdel(keys: string[]): Promise<void> {
    if (!REDIS_URL || !redisClient) {
      keys.forEach((key) => localStore.delete(key))
      return
    }

    try {
      if (keys.length > 0) {
        await redisClient.del(...keys)
      }
    } catch (error) {
      console.error('Redis MDEL error:', error)
      keys.forEach((key) => localStore.delete(key))
    }
  },

  /**
   * Get cache statistics
   */
  getMetrics(): { hits: number; misses: number; errors: number; hitRate: number } {
    const total = cacheMetrics.hits + cacheMetrics.misses
    return {
      ...cacheMetrics,
      hitRate: total > 0 ? (cacheMetrics.hits / total) * 100 : 0
    }
  },

  /**
   * Reset cache metrics
   */
  resetMetrics(): void {
    cacheMetrics.hits = 0
    cacheMetrics.misses = 0
    cacheMetrics.errors = 0
  },

  /**
   * Get cache info (memory usage, key count, etc.)
   */
  async getInfo(): Promise<Record<string, any>> {
    if (!REDIS_URL || !redisClient) {
      return {
        type: 'memory',
        keyCount: localStore.size,
        ...this.getMetrics()
      }
    }

    try {
      const info = await redisClient.info('stats')
      const dbSize = await redisClient.dbsize()

      return {
        type: 'redis',
        keyCount: dbSize,
        info: info,
        ...this.getMetrics()
      }
    } catch (error) {
      console.error('Redis INFO error:', error)
      return {
        type: 'redis',
        error: (error as Error).message,
        ...this.getMetrics()
      }
    }
  },

  /**
   * Pre-warm cache with popular searches
   * Call during startup or periodic background job
   */
  async warmCache(popularQueries: Array<{ key: string; ttl: number; fetcher: () => Promise<any> }>): Promise<void> {
    if (!REDIS_URL || !redisClient) return

    console.log(`🔥 Warming cache with ${popularQueries.length} popular queries...`)

    const results = await Promise.allSettled(
      popularQueries.map(async ({ key, ttl, fetcher }) => {
        try {
          const exists = await redisClient!.exists(key)
          if (!exists) {
            const data = await fetcher()
            await this.set(key, JSON.stringify(data), ttl)
            console.log(`✅ Warmed cache: ${key}`)
          }
        } catch (error) {
          console.warn(`⚠️ Failed to warm cache: ${key}`, error)
        }
      })
    )

    const successful = results.filter((r) => r.status === 'fulfilled').length
    console.log(`🔥 Cache warming complete: ${successful}/${popularQueries.length} successful`)
  }
}
