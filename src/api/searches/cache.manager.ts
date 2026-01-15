import { redisService } from '../../config/redis.service'
import type { SearchResponse, SuggestResponse } from '../../config/elasticsearch.service'

/**
 * Centralized cache key generation and management
 * Implements Single Responsibility Principle for cache operations
 */
export const cacheKeys = {
  searchJobs: (context: any, recruiterId?: string) =>
    `search:jobs:v3:${JSON.stringify(context)}:r:${recruiterId || 'public'}`,

  searchJobsLegacy: (query: any, from: number, size: number, sort: any, recruiterId?: string, userCtx?: any) =>
    `search:jobs:legacy:${JSON.stringify(query)}:from:${from}:size:${size}:sort:${sort}:r:${recruiterId || 'public'}:ctx:${JSON.stringify(userCtx || {})}`,

  dbFallback: (baseKey: string) => `${baseKey}:db_fallback`,

  suggest: (index: string, query: string, size: number, context?: any) =>
    `search:suggest:v3:${index}:${query}:${size}:${JSON.stringify(context || {})}`,

  suggestSkills: (q: string, size: number, context?: any) =>
    `search:suggest:skills:v2:${q}:${size}:${JSON.stringify(context || {})}`,

  suggestCompanies: (q: string, size: number, context?: any) =>
    `search:suggest:companies:v2:${q}:${size}:${JSON.stringify(context || {})}`,

  suggestCategories: (q: string, size: number, context?: any) =>
    `search:suggest:categories:v2:${q}:${size}:${JSON.stringify(context || {})}`,

  profilesForJob: (jobPayload: any, topN: number) =>
    `search:profiles_for_job:v3:${JSON.stringify(jobPayload)}:n:${topN}`,

  jobsForProfile: (profilePayload: any, topN: number) =>
    `search:jobs_for_profile:v3:${JSON.stringify(profilePayload)}:n:${topN}`,

  // Entity cache keys
  company: (companyId: string) => `entity:company:${companyId}`,
  job: (jobId: string) => `entity:job:${jobId}`,
  profile: (profileId: string) => `entity:profile:${profileId}`,

  // Invalidation patterns
  patterns: {
    allSearches: 'search:*',
    jobSearches: 'search:*jobs*',
    profileSearches: 'search:*profiles*',
    suggestions: 'search:suggest:*',
    byJob: (jobId: string) => `*jobId:${jobId}*`,
    byCompany: (companyId: string) => `*company*${companyId}*`,
    byRecruiter: (recruiterId: string) => `*:r:${recruiterId}:*`
  }
}

/**
 * Cache wrapper with automatic invalidation tracking
 * Provides centralized cache-aside pattern implementation
 */
export class CacheManager {
  /**
   * Generic cache-aside pattern wrapper
   */
  async withCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 60,
    parser?: (raw: string) => T
  ): Promise<T> {
    // Try cache first
    const cached = await redisService.get(key)
    if (cached) {
      try {
        return parser ? parser(cached) : JSON.parse(cached)
      } catch (e) {
        console.warn(`Cache parse error for key=${key}`, e)
      }
    }

    // Cache miss - fetch from source
    const result = await fetcher()

    // Update cache (non-blocking)
    this.updateCache(key, result, ttl).catch((e) => {
      console.warn(`Cache update failed for key=${key}`, e)
    })

    return result
  }

  /**
   * Cache search response with standardized format
   */
  async withSearchCache(
    key: string,
    fetcher: () => Promise<SearchResponse>,
    ttl: number = 30
  ): Promise<SearchResponse> {
    const startTime = performance.now()

    // Try cache first
    const cached = await redisService.getSearchResponse(key)
    if (cached) {
      const cacheLookupMs = Math.round(performance.now() - startTime)
      console.debug(`[cache] hit for key=${key} (total=${cached?.total ?? 'unknown'}, lookup=${cacheLookupMs}ms)`)

      // Return cached result with updated timing metadata
      return {
        ...cached,
        cache_hit: true,
        total_took_ms: cacheLookupMs,
        cached_at: cached.cached_at || new Date().toISOString()
      }
    }

    // Cache miss - fetch from source
    const fetchStartTime = performance.now()
    const result = await fetcher()
    const fetchDuration = Math.round(performance.now() - fetchStartTime)
    const totalDuration = Math.round(performance.now() - startTime)

    // Add cache metadata to response
    const enrichedResult: SearchResponse = {
      ...result,
      cache_hit: false,
      es_took_ms: result.took, // Original ES time
      total_took_ms: totalDuration,
      cached_at: new Date().toISOString()
    }

    // Update cache (non-blocking) - store with metadata
    this.updateCache(key, enrichedResult, ttl).catch((e) => {
      console.warn(`Search cache update failed for key=${key}`, e)
    })

    return enrichedResult
  }

  /**
   * Cache suggestion response
   */
  async withSuggestCache(
    key: string,
    fetcher: () => Promise<SuggestResponse>,
    ttl: number = 20
  ): Promise<SuggestResponse> {
    const cached = await redisService.getSuggestResponse(key)
    if (cached) return cached

    const result = await fetcher()

    await redisService.setSuggestResponse(key, result, ttl).catch((e) => {
      console.warn(`Suggest cache update failed for key=${key}`, e)
    })

    return result
  }

  /**
   * Update cache (non-blocking helper)
   */
  private async updateCache(key: string, value: any, ttl: number): Promise<void> {
    if (typeof value === 'object') {
      await redisService.setSearchResponse(key, value, ttl)
    } else {
      await redisService.set(key, JSON.stringify(value), ttl)
    }
  }

  /**
   * Invalidate job-related caches
   */
  async invalidateJobCache(jobId: string): Promise<void> {
    await Promise.all([
      redisService.invalidatePattern(cacheKeys.patterns.jobSearches),
      redisService.invalidatePattern(cacheKeys.patterns.byJob(jobId)),
      redisService.del(cacheKeys.job(jobId))
    ])
  }

  /**
   * Invalidate company-related caches
   */
  async invalidateCompanyCache(companyId: string): Promise<void> {
    await Promise.all([
      redisService.invalidatePattern(cacheKeys.patterns.byCompany(companyId)),
      redisService.invalidatePattern(cacheKeys.patterns.suggestions),
      redisService.del(cacheKeys.company(companyId))
    ])
  }

  /**
   * Invalidate recruiter-specific caches
   */
  async invalidateRecruiterCache(recruiterId: string): Promise<void> {
    await redisService.invalidatePattern(cacheKeys.patterns.byRecruiter(recruiterId))
  }

  /**
   * Invalidate all search caches
   */
  async invalidateAllSearches(): Promise<void> {
    await redisService.invalidatePattern(cacheKeys.patterns.allSearches)
  }
}

export const cacheManager = new CacheManager()
