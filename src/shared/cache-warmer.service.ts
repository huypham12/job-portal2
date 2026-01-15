/**
 * Cache Warming Service
 *
 * Pre-loads popular search queries into cache during startup
 * and periodically refreshes them to maintain performance
 */

import { searchRepo } from '../api/searches/search.repo'
import { redisService } from '../config/redis.service'
import { searchService } from '../api/searches/search.service'

export const cacheWarmerService = {
  /**
   * Warm cache with popular search queries from database
   */
  async warmPopularSearches(limit: number = 50): Promise<void> {
    console.log(`🔥 Starting cache warming for top ${limit} popular searches...`)

    try {
      // Get popular queries from search history
      const popularQueries = await searchRepo.getPopularSearchQueries(limit)

      if (!popularQueries.length) {
        console.log('⚠️ No popular search queries found - using defaults')
        await this.warmDefaultSearches()
        return
      }

      console.log(`📊 Found ${popularQueries.length} popular queries to warm`)

      // Warm cache with each popular query
      const results = await Promise.allSettled(
        popularQueries.map(async (query) => {
          try {
            // Execute search to warm cache (cast to any to bypass strict type check)
            await searchService.searchJobs({
              q: query.q,
              location: query.location,
              locationId: query.locationId,
              page: 1,
              size: 20
            } as any)

            return { success: true, query: query.q || query.location }
          } catch (error) {
            console.warn(`⚠️ Failed to warm cache for query:`, query, error)
            return { success: false, query: query.q || query.location }
          }
        })
      )

      const successful = results.filter((r) => r.status === 'fulfilled' && r.value.success).length
      console.log(`✅ Cache warming complete: ${successful}/${popularQueries.length} queries warmed`)
    } catch (error) {
      console.error('❌ Cache warming failed:', error)
      // Fallback to default warming
      await this.warmDefaultSearches()
    }
  },

  /**
   * Warm cache with default/hardcoded popular searches
   */
  async warmDefaultSearches(): Promise<void> {
    console.log('🔥 Warming cache with default popular searches...')

    const defaultSearches = [
      // Popular locations
      { q: '', location: 'Hà Nội' },
      { q: '', location: 'Hồ Chí Minh' },
      { q: '', location: 'Đà Nẵng' },

      // Popular job types
      { q: 'JavaScript', location: '' },
      { q: 'Python', location: '' },
      { q: 'Java', location: '' },
      { q: 'React', location: '' },
      { q: 'Node.js', location: '' },

      // Combined popular searches
      { q: 'JavaScript', location: 'Hà Nội' },
      { q: 'Python', location: 'Hồ Chí Minh' },
      { q: 'React', location: 'Hà Nội' }
    ]

    const results = await Promise.allSettled(
      defaultSearches.map(async (search) => {
        try {
          await searchService.searchJobs({
            q: search.q || undefined,
            location: search.location || undefined,
            page: 1,
            size: 20
          } as any)
          return { success: true, search }
        } catch (error) {
          return { success: false, search }
        }
      })
    )

    const successful = results.filter((r) => r.status === 'fulfilled' && r.value.success).length
    console.log(`✅ Default cache warming complete: ${successful}/${defaultSearches.length} searches warmed`)
  },

  /**
   * Warm top companies cache
   */
  async warmTopCompanies(limit: number = 100): Promise<void> {
    console.log(`🔥 Warming cache for top ${limit} companies...`)

    try {
      const companies = await searchRepo.getTopCompanies(limit)

      if (!companies.length) {
        console.log('⚠️ No companies found to warm')
        return
      }

      // Use Redis mset for batch caching
      const entries = companies.map((company: any) => ({
        key: `company:${company.id}`,
        value: JSON.stringify(company),
        ttl: 3600 // 1 hour TTL for company data
      }))

      await redisService.mset(entries)
      console.log(`✅ Warmed cache for ${companies.length} companies`)
    } catch (error) {
      console.error('❌ Failed to warm companies cache:', error)
    }
  },

  /**
   * Warm top locations cache
   */
  async warmTopLocations(): Promise<void> {
    console.log('🔥 Warming cache for locations...')

    try {
      const locations = await searchRepo.getAllLocations()

      if (!locations.length) {
        console.log('⚠️ No locations found to warm')
        return
      }

      // Cache location hierarchy
      const entries = locations.map((location: any) => ({
        key: `location:${location.id}`,
        value: JSON.stringify(location),
        ttl: 7200 // 2 hours TTL for location data (rarely changes)
      }))

      await redisService.mset(entries)
      console.log(`✅ Warmed cache for ${locations.length} locations`)
    } catch (error) {
      console.error('❌ Failed to warm locations cache:', error)
    }
  },

  /**
   * Periodic cache refresh - call this from a cron job
   */
  async refreshCache(): Promise<void> {
    console.log('🔄 Starting periodic cache refresh...')

    try {
      await Promise.allSettled([
        this.warmPopularSearches(30), // Refresh top 30 searches
        this.warmTopCompanies(50), // Refresh top 50 companies
        this.warmTopLocations() // Refresh all locations
      ])

      console.log('✅ Periodic cache refresh complete')
    } catch (error) {
      console.error('❌ Periodic cache refresh failed:', error)
    }
  },

  /**
   * Get cache warming statistics
   */
  async getStats() {
    const redisInfo = await redisService.getInfo()
    const metrics = redisService.getMetrics()

    return {
      redis: redisInfo,
      metrics,
      timestamp: new Date().toISOString()
    }
  }
}
