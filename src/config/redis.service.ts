import type { SearchResponse, SuggestResponse } from './elasticsearch.service'

/**
 * Redis cache wrapper sketch.
 * - Exposes minimal methods used by services: get, set, del.
 * - If REDIS_URL not configured, falls back to in-memory Map for local dev.
 *
 * NOTE: This is a lightweight integration sketch — replace with `ioredis` or `redis` client in production.
 */
type CacheValue = string

const REDIS_URL = process.env.REDIS_URL

// simple in-memory fallback
const localStore = new Map<string, CacheValue>()

export const redisService = {
  async get(key: string): Promise<string | null> {
    if (!REDIS_URL) {
      return localStore.has(key) ? (localStore.get(key) as string) : null
    }
    // TODO: use real Redis client e.g. ioredis.get(key)
    throw new Error('redisService.get not implemented for production Redis')
  },
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!REDIS_URL) {
      localStore.set(key, value)
      if (ttlSeconds) {
        setTimeout(() => localStore.delete(key), ttlSeconds * 1000)
      }
      return
    }
    // TODO: use real Redis client e.g. ioredis.set(key, value, 'EX', ttlSeconds)
    throw new Error('redisService.set not implemented for production Redis')
  },
  async del(key: string): Promise<void> {
    if (!REDIS_URL) {
      localStore.delete(key)
      return
    }
    // TODO: use real Redis client e.g. ioredis.del(key)
    throw new Error('redisService.del not implemented for production Redis')
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
}


