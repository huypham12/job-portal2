import { JobSearchRequestDto, JobSearchResponseDto, SuggestionRequestDto, SuggestionResponseDto } from './search.dto'
import { elasticsearchService } from '../../config/elasticsearch.service'
import { searchRepo } from './search.repo'
import { redisService } from '../../config/redis.service'
import { metrics } from '../../shared/utils/metrics.util'
import { prisma } from '../../config/database.service'

/**
 * Search service: build ES query (pseudocode), call elasticsearchService, map to response.
 * - Keep ES query details as pseudocode per project constraints.
 * - Return snake_case response shape as defined by DTO.
 */
export const searchService = {
  async searchJobs(dto: JobSearchRequestDto): Promise<JobSearchResponseDto> {
    const { q, location, jobType, experienceLevel, skills, page = 1, size = 20, highlight } = dto

    const from = (page - 1) * size

    // Build ES query using multi_match + filters for fuzzy search
    const must: any[] = []
    const filter: any[] = []

    if (q && q.length) {
      must.push({
        multi_match: {
          query: q,
          fields: [
            'title^4',
            'skills^3',
            'company_name^2',
            'description',
            'location_province^2',     // Boost province search
            'location_district^2',     // Boost district search
            'location_combined^1.5'    // Boost combined search
          ],
          fuzziness: 'AUTO',
          operator: 'and'
        }
      })
    } else {
      must.push({ match_all: {} })
    }

    // Handle location filtering with province/district hierarchy
    if (location) {
      const locationIds = await searchRepo.getLocationIdsForFilter(location)
      if (locationIds.length > 0) {
        filter.push({ terms: { location_id: locationIds } })
      }
    }
    if (jobType) filter.push({ term: { job_type: jobType } })
    if (typeof experienceLevel === 'number') filter.push({ term: { experience_level: experienceLevel } })
    if (skills && Array.isArray(skills) && skills.length) filter.push({ terms: { skills } })

    const esQuery = { bool: { must, filter } }
    const cacheKey = `search:jobs:${JSON.stringify(esQuery)}:from:${from}:size:${size}`
    const cacheHit = await redisService.getSearchResponse(cacheKey)
    if (cacheHit) {
      metrics.increment('search.jobs.cache_hit')
      return {
        total: cacheHit.total,
        took_ms: cacheHit.took,
        hits: cacheHit.hits.map((h) => ({
          id: h.id,
          title: (h._source as any)?.title,
          company: { id: (h._source as any)?.company_id, name: (h._source as any)?.company_name },
          score: h._score ?? undefined,
          highlight: undefined,
          _source: h._source
        }))
      }
    }

    const timerDone = metrics.startTimer('search.jobs.duration')

    // Sử dụng searchJobs advanced method với business-aware scoring
    const esResp = await elasticsearchService.searchJobs({
      index: 'jobs',
      query: esQuery,
      from,
      size,
      // Thêm user context cho enhanced scoring (có thể mở rộng sau)
      prioritizeFreshJobs: true
    })

    timerDone()
    metrics.increment('search.jobs.request')
    // cache results for short period
    try {
      await redisService.setSearchResponse(cacheKey, esResp, 30)
    } catch (e) {
      // non-fatal
    }

    // Optional enrichment: fetch companies for hits that need extra info
    const companyIds = Array.from(new Set(esResp.hits.map((h) => (h._source as any)?.company_id).filter(Boolean)))
    let companyMap: Record<string, unknown> = {}
    if (companyIds.length) {
      try {
        const companies = await searchRepo.getCompaniesByIds(companyIds as string[])
        companyMap = companies.reduce((acc: any, c: any) => {
          if (c && (c as any).id) acc[(c as any).id] = c
          return acc
        }, {})
      } catch (e) {
        // keep enrichment optional and non-fatal
      }
    }

    const hits = esResp.hits.map((h) => {
      const src = h._source as any
      return {
        id: h.id,
        title: src?.title,
        company: companyMap[src?.company_id] ?? { id: src?.company_id, name: src?.company_name },
        score: h._score ?? undefined,
        highlight: highlight ? (h as any)._highlight : undefined,
        _source: src
      }
    })

    return {
      total: esResp.total,
      took_ms: esResp.took,
      hits
    }
  },
  /**
   * Suggestion endpoint: calls ES suggest via `elasticsearchService.suggest`.
   * - Keeps ES details in the config wrapper.
   * - Pseudocode fallback: if completion suggester returns empty, fallback to ngram-based query (left as TODO).
   */
  async suggest(dto: SuggestionRequestDto): Promise<SuggestionResponseDto> {
    const index = dto.type === 'profiles' ? 'profiles' : 'jobs'
    // call ES suggester via wrapper
    const cacheKey = `search:suggest:${index}:${dto.q}:${dto.size}:${JSON.stringify(dto.context ?? {})}`
    const cached = await redisService.getSuggestResponse(cacheKey)
    if (cached) {
      metrics.increment('search.suggest.cache_hit')
      return { suggestions: cached.suggestions }
    }

    const timerDone = metrics.startTimer('search.suggest.duration')
    const esResp = await elasticsearchService.suggest({
      index,
      prefix: dto.q,
      size: dto.size,
      context: dto.context as Record<string, unknown> | undefined
    })
    timerDone()
    metrics.increment('search.suggest.request')
    try {
      await redisService.setSuggestResponse(cacheKey, esResp, 20)
    } catch (e) {}

    // esResp.suggestions is expected to be [{ text, payload, score }]
    // If empty, fallback to ngram/autocomplete-based search
    let suggestions = esResp.suggestions || []
    if ((!suggestions || suggestions.length === 0) && dto.q && dto.q.length > 0) {
      try {
        const fallbackQuery = {
          bool: {
            should: [
              { match_phrase_prefix: { 'title.autocomplete': { query: dto.q } } },
              { match_phrase_prefix: { title: { query: dto.q } } }
            ]
          }
        }
        const fallbackResp = await elasticsearchService.search({
          index,
          query: fallbackQuery,
          from: 0,
          size: dto.size ?? 10
        })
        suggestions = (fallbackResp.hits || []).map((h) => ({
          text: (h._source as any)?.title ?? h.id,
          payload: h._source,
          score: h._score
        }))
      } catch (e) {
        // ignore fallback errors
      }
    }

    return {
      suggestions: suggestions.map((s: any) => ({
        text: s.text,
        payload: s.payload,
        score: s.score
      }))
    }
  },
  /**
   * Search profiles relevant to a job payload.
   * - jobPayload: lightweight job object (from jobRepo.getById)
   * - topN: number of results to retrieve from ES for server-side re-ranking
   *
   * Returns ES hits (id, _score, _source) so caller can re-rank deterministically.
   */
  async searchProfilesForJob(jobPayload: any, topN = 200) {
    // Build ES query for retrieving candidate profiles for a given job
    const must: any[] = []
    const filter: any[] = []

    if (jobPayload && jobPayload.title) {
      must.push({
        multi_match: {
          query: jobPayload.title,
          fields: ['headline^3', 'full_name^1', 'profile_summary'],
          fuzziness: 'AUTO'
        }
      })
    } else {
      must.push({ match_all: {} })
    }
    if (jobPayload && Array.isArray(jobPayload.skills) && jobPayload.skills.length) {
      must.push({ terms: { skills: jobPayload.skills } })
    }


    const esQuery = { bool: { must, filter } }
    const cacheKey = `search:profiles_for_job:${JSON.stringify(jobPayload)}:topN:${topN}`
    const cacheHit = await redisService.getSearchResponse(cacheKey)
    if (cacheHit) {
      metrics.increment('search.profiles_for_job.cache_hit')
      return cacheHit.hits
    }

    const timerDone = metrics.startTimer('search.profiles_for_job.duration')
    const esResp = await elasticsearchService.search({
      index: 'profiles',
      query: esQuery,
      from: 0,
      size: topN
    })
    timerDone()
    metrics.increment('search.profiles_for_job.request')
    try {
      await redisService.setSearchResponse(cacheKey, esResp, 20)
    } catch (e) {}

    // Return raw hits to let caller re-rank
    return esResp.hits
  },
  /**
   * Search jobs relevant to a profile payload.
   * - profilePayload: lightweight profile object (from resumeRepo.getById)
   * - topN: number of results to retrieve from ES for server-side re-ranking
   *
   * Returns ES hits (id, _score, _source) so caller can re-rank deterministically.
   */
  async searchJobsForProfile(profilePayload: any, topN = 200) {
    const must: any[] = []
    if (profilePayload && profilePayload.headline) {
      must.push({
        multi_match: {
          query: profilePayload.headline,
          fields: ['title^3', 'company_name^1', 'description'],
          fuzziness: 'AUTO'
        }
      })
    } else {
      must.push({ match_all: {} })
    }
    if (profilePayload && Array.isArray(profilePayload.skills) && profilePayload.skills.length) {
      must.push({ terms: { skills: profilePayload.skills } })
    }
    const esQuery = { bool: { must } }
    const cacheKey = `search:jobs_for_profile:${JSON.stringify(profilePayload)}:topN:${topN}`
    const cacheHit = await redisService.getSearchResponse(cacheKey)
    if (cacheHit) {
      metrics.increment('search.jobs_for_profile.cache_hit')
      return cacheHit.hits
    }

    const timerDone = metrics.startTimer('search.jobs_for_profile.duration')
    const esResp = await elasticsearchService.search({
      index: 'jobs',
      query: esQuery,
      from: 0,
      size: topN
    })
    timerDone()
    metrics.increment('search.jobs_for_profile.request')
    try {
      await redisService.setSearchResponse(cacheKey, esResp, 20)
    } catch (e) {}

    return esResp.hits
  },
  /**
   * Log search-related events (impression, click, apply).
   * - Validates event at controller level; service performs minimal guards and persists via repo.
   * - Stores raw filters as JSON via repo.saveEvent (Postgres).
   */
  async logEvent(eventDto: import('./events.dto').EventRequestDto): Promise<void> {
    // minimal guard: event_type should be one of allowed (controller already validated)
    try {
      // Dual-write: ES + DB với graceful fallback
      await Promise.allSettled([
        this.logEventToES(eventDto),
        searchRepo.saveEvent(eventDto as any)
      ])
    } catch (e) {
      // Logging should not crash caller; rethrow if you want to surface errors.
      // For now, swallow and log to console for observability in dev.
      // Replace with proper logger in production.

      console.error('searchService.logEvent error', e)
    }
  },

  /**
   * Log search event to Elasticsearch for analytics
   */
  async logEventToES(eventDto: import('./events.dto').EventRequestDto): Promise<void> {
    const doc = {
      user_id: eventDto.user_id,
      event_type: eventDto.event_type,
      job_id: eventDto.job_id,
      profile_id: eventDto.profile_id,
      query: eventDto.query,
      position: eventDto.position,
      filters: eventDto.filters,
      result_count: eventDto.result_count,
      timestamp_ms: eventDto.timestamp_ms,
      created_at: new Date(),
      user_agent: eventDto.user_agent,
      ip_address: eventDto.ip_address,
      search_duration_ms: eventDto.search_duration_ms,
      es_took_ms: eventDto.es_took_ms
    }

    await elasticsearchService.search({
      index: 'search_events',
      query: {
        index: {
          _index: elasticsearchService.getIndexName('search_events'),
          _id: `${eventDto.user_id}_${eventDto.event_type}_${eventDto.timestamp_ms}`,
          body: doc
        }
      }
    })
  },

  /**
   * Get popular queries using ES aggregations with DB fallback
   */
  async getPopularQueries(days: number = 7, limit: number = 10) {
    try {
      // Try ES first for real-time analytics
      return await this.getPopularQueriesFromES(days, limit)
    } catch (e) {
      // Fallback to DB if ES unavailable
      console.warn('ES popular queries failed, falling back to DB', e)
      return await this.getPopularQueriesFromDB(days, limit)
    }
  },

  /**
   * Get popular queries from Elasticsearch aggregations
   */
  async getPopularQueriesFromES(days: number = 7, limit: number = 10) {
    const dateThreshold = new Date()
    dateThreshold.setDate(dateThreshold.getDate() - days)

    try {
      const client = elasticsearchService.getClient()
      const esResp = await client.search({
        index: elasticsearchService.getIndexName('search_events'),
        body: {
          query: {
            bool: {
              must: [
                { term: { event_type: 'impression' } },
                { range: { created_at: { gte: dateThreshold } } }
              ]
            }
          },
          aggs: {
            popular_queries: {
              terms: {
                field: 'query.keyword',
                size: limit,
                order: { _count: 'desc' }
              },
              aggs: {
                avg_results: { avg: { field: 'result_count' } },
                last_searched: { max: { field: 'created_at' } }
              }
            }
          },
          size: 0
        }
      })

      const response = esResp as any
      return response.aggregations?.popular_queries?.buckets.map((bucket: any) => ({
        search_query: bucket.key,
        search_count: bucket.doc_count,
        avg_results: bucket.avg_results?.value || 0,
        last_searched: bucket.last_searched?.value
      })) || []
    } catch (e) {
      console.warn('ES aggregations failed', e)
      throw e
    }
  },

  /**
   * Get popular queries from database (fallback)
   */
  async getPopularQueriesFromDB(days: number = 7, limit: number = 10) {
    const dateThreshold = new Date()
    dateThreshold.setDate(dateThreshold.getDate() - days)

    // Use raw SQL for performance (similar to existing implementation)
    const popularQueries = await prisma.$queryRaw`
      SELECT
        search_query,
        COUNT(*) as search_count,
        AVG(result_count) as avg_results,
        MAX(searched_at) as last_searched
      FROM search_history
      WHERE searched_at >= ${dateThreshold}
        AND search_query::text != '{}'
      GROUP BY search_query
      ORDER BY search_count DESC
      LIMIT ${limit}
    `

    return popularQueries
  },

  /**
   * Get document by ID from Elasticsearch
   */
  async getJobById(id: string) {
    try {
      return await elasticsearchService.getById({
        index: 'jobs',
        id
      })
    } catch (e) {
      console.warn(`ES getJobById failed for ${id}, falling back to DB`, e)
      return await searchRepo.getJobById(id)
    }
  },

  /**
   * Get profile by ID from Elasticsearch
   */
  async getProfileById(id: string) {
    try {
      return await elasticsearchService.getById({
        index: 'profiles',
        id
      })
    } catch (e) {
      console.warn(`ES getProfileById failed for ${id}, falling back to DB`, e)
      return await searchRepo.getProfileById(id)
    }
  },

  /**
   * Get company by ID from Elasticsearch
   */
  async getCompanyById(id: string) {
    try {
      return await elasticsearchService.getById({
        index: 'companies',
        id
      })
    } catch (e) {
      console.warn(`ES getCompanyById failed for ${id}, falling back to DB`, e)
      return await searchRepo.getCompanyById(id)
    }
  },

  /**
   * Check Elasticsearch health and connection
   */
  async checkESHealth(): Promise<boolean> {
    try {
      return await elasticsearchService.checkConnection()
    } catch (e) {
      console.error('ES health check failed', e)
      return false
    }
  },

  /**
   * Initialize Elasticsearch indices (call during app startup)
   */
  async initializeESIndices(): Promise<void> {
    try {
      await elasticsearchService.initializeIndices()
      console.log('Elasticsearch indices initialized successfully')
    } catch (e) {
      console.error('Failed to initialize ES indices', e)
      throw e
    }
  },

  /**
   * Get raw Elasticsearch client for advanced operations
   */
  getESClient() {
    return elasticsearchService.getClient()
  }
}
