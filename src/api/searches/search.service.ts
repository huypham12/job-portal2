import { JobSearchRequestDto, JobSearchResponseDto, SuggestionRequestDto, SuggestionResponseDto } from './search.dto'
import { elasticsearchService } from '../../config/elasticsearch.service'
import { searchRepo } from './search.repo'
import { redisService } from '../../config/redis.service'
import { metrics } from '../../shared/utils/metrics.util'
import { prisma } from '../../config/database.service'
import { Prisma } from '@prisma/client'

/**
 * Search service: build ES query (pseudocode), call elasticsearchService, map to response.
 * - Keep ES query details as pseudocode per project constraints.
 * - Return snake_case response shape as defined by DTO.
 */
export const searchService = {
  async searchJobs(
    dto: JobSearchRequestDto & {
      userExperienceLevel?: number
      userLocationId?: string
      userPrefersRemote?: boolean
      userSkills?: string[]
      userDesiredSalaryMin?: number
      userDesiredSalaryMax?: number
      recruiterId?: string  // MANDATORY for tenant isolation
    }
  ): Promise<JobSearchResponseDto> {
    const {
      q,
      location,
      jobType,
      experienceLevel,
      skills,
      page = 1,
      size = 20,
      highlight,
      // User context parameters (can be extracted from auth/session later)
      userExperienceLevel,
      userLocationId,
      userPrefersRemote,
      userSkills,
      userDesiredSalaryMin,
      userDesiredSalaryMax,
      recruiterId  // MANDATORY for tenant isolation
    } = dto

    const from = (page - 1) * size

    // Build ES query using multi_match + filters for fuzzy search
    const must: any[] = []
    const filter: any[] = []

    // CRITICAL: Enforce recruiter isolation - reject if no recruiter context
    if (!recruiterId) {
      throw new Error('recruiterId is required for job search to ensure tenant isolation')
    }

    // Add mandatory recruiter ownership filter
    filter.push({ term: { recruiter_id: recruiterId } })

    if (q && q.length) {
      must.push({
        multi_match: {
          query: q,
          fields: [
            'title^4',
            'skills^3',
            'company_name^2',
            'description',
            'location_province^2', // Boost province search
            'location_district^2', // Boost district search
            'location_combined^1.5' // Boost combined search
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
    const cacheKey = `search:jobs:${JSON.stringify(esQuery)}:from:${from}:size:${size}:userCtx:${JSON.stringify({
      userExperienceLevel,
      userLocationId,
      userPrefersRemote,
      userSkills: userSkills?.slice(0, 5), // Limit for cache key
      userDesiredSalaryMin,
      userDesiredSalaryMax
    })}`
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

    let esResp: any
    try {
      // Sử dụng searchJobs advanced method với business-aware scoring
      esResp = await elasticsearchService.searchJobs({
        index: 'jobs',
        query: esQuery,
        from,
        size,
        // Enhanced user context cho personalized scoring
        userExperienceLevel,
        userLocationId,
        prioritizeFreshJobs: true,
        userPrefersRemote,
        userSkills,
        userDesiredSalaryMin,
        userDesiredSalaryMax
      })
    } catch (esError) {
      console.warn('ES search failed, falling back to DB search', esError)
      metrics.increment('search.jobs.es_fallback')

      // Fallback to database search
      esResp = await this.searchJobsFromDB(dto)
    }

    timerDone()
    metrics.increment('search.jobs.request')
    // cache results for short period
    try {
      await redisService.setSearchResponse(cacheKey, esResp, 30)
    } catch (e) {
      // non-fatal
    }

    // Optional enrichment: fetch companies for hits that need extra info
    const companyIds = Array.from(new Set(esResp.hits.map((h: any) => (h._source as any)?.company_id).filter(Boolean)))
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

    const hits = esResp.hits.map((h: any) => {
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
  async suggest(
    dto: SuggestionRequestDto & {
      userLocation?: string
      userExperienceLevel?: number
      userSkills?: string[]
    }
  ): Promise<SuggestionResponseDto> {
    const index = dto.type === 'profiles' ? 'profiles' : 'jobs'
    const { userLocation, userExperienceLevel, userSkills, ...rest } = dto

    // Build enhanced context for better suggestions
    const enhancedContext: Record<string, unknown> = { ...dto.context }

    // Add user preferences to context for personalized suggestions
    if (userLocation) {
      enhancedContext.location = userLocation
    }
    if (userExperienceLevel !== undefined) {
      enhancedContext.experience_level = userExperienceLevel
    }
    if (userSkills && userSkills.length > 0) {
      enhancedContext.skills = userSkills.slice(0, 5) // Limit for performance
    }

    // call ES suggester via wrapper with enhanced context
    const cacheKey = `search:suggest:${index}:${dto.q}:${dto.size}:${JSON.stringify(enhancedContext)}`
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
      context: enhancedContext
    })
    timerDone()
    metrics.increment('search.suggest.request')
    try {
      await redisService.setSuggestResponse(cacheKey, esResp, 20)
    } catch (e) {
      // Silently ignore Redis caching errors to avoid breaking the search functionality
      console.warn('Failed to cache suggest response:', e)
    }

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
   * Search companies with mandatory recruiter isolation
   */
  async searchCompanies(dto: {
    q?: string
    page?: number
    size?: number
    recruiterId: string  // MANDATORY for tenant isolation
  }): Promise<{ total: number; hits: any[]; took_ms: number }> {
    const { q, page = 1, size = 20, recruiterId } = dto
    const from = (page - 1) * size

    // CRITICAL: Enforce recruiter isolation
    if (!recruiterId) {
      throw new Error('recruiterId is required for company search to ensure tenant isolation')
    }

    const must: any[] = []
    const filter: any[] = []

    // Add mandatory recruiter ownership filter
    filter.push({ term: { recruiter_id: recruiterId } })

    if (q && q.length) {
      must.push({
        multi_match: {
          query: q,
          fields: ['name^3', 'description', 'industry', 'website'],
          fuzziness: 'AUTO',
          operator: 'and'
        }
      })
    } else {
      must.push({ match_all: {} })
    }

    const esQuery = { bool: { must, filter } }

    // Use centralized ES wrapper to ensure consistent id mapping (_id -> id)
    const resp = await elasticsearchService.search({
      index: elasticsearchService.getIndexName('companies'),
      query: esQuery,
      from,
      size
    })

    return {
      took_ms: resp.took,
      total: resp.total,
      hits: resp.hits
    }
  },

  /**
   * Search applications with dual ownership context
   */
  async searchApplications(dto: {
    q?: string
    page?: number
    size?: number
    recruiterId?: string
    candidateId?: string
    // Exactly one of recruiterId or candidateId must be provided
  }): Promise<{ total: number; hits: any[]; took_ms: number }> {
    const { q, page = 1, size = 20, recruiterId, candidateId } = dto
    const from = (page - 1) * size

    // CRITICAL: Enforce dual ownership - exactly one context required
    if ((!recruiterId && !candidateId) || (recruiterId && candidateId)) {
      throw new Error('Either recruiterId OR candidateId must be provided for application search (not both, not neither)')
    }

    const must: any[] = []
    const filter: any[] = []

    // Add ownership filter based on context
    if (recruiterId) {
      filter.push({ term: { recruiter_id: recruiterId } })
    } else if (candidateId) {
      filter.push({ term: { candidate_id: candidateId } })
    }

    if (q && q.length) {
      must.push({
        multi_match: {
          query: q,
          fields: ['candidate_name^2', 'job_title', 'job_company_name', 'candidate_headline'],
          fuzziness: 'AUTO',
          operator: 'and'
        }
      })
    } else {
      must.push({ match_all: {} })
    }

    const esQuery = { bool: { must, filter } }

    // Use centralized ES wrapper to ensure consistent id mapping (_id -> id)
    const resp = await elasticsearchService.search({
      index: elasticsearchService.getIndexName('applications'),
      query: esQuery,
      from,
      size
    })

    return {
      took_ms: resp.took,
      total: resp.total,
      hits: resp.hits
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
    } catch (e) {
      // Silently ignore Redis caching errors to avoid breaking the search functionality
      console.warn('Failed to cache search response:', e)
    }

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
    } catch (e) {
      // Silently ignore Redis caching errors to avoid breaking the search functionality
      console.warn('Failed to cache search response:', e)
    }

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
      await Promise.allSettled([this.logEventToES(eventDto), searchRepo.saveEvent(eventDto as any)])
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

    // Use correct ES 8.x syntax for indexing documents
    const client = elasticsearchService.getClient()
    await client.index({
      index: elasticsearchService.getIndexName('search_events'),
      id: `${eventDto.user_id}_${eventDto.event_type}_${eventDto.timestamp_ms}`,
      document: doc
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
              must: [{ term: { event_type: 'impression' } }, { range: { created_at: { gte: dateThreshold } } }]
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
      return (
        response.aggregations?.popular_queries?.buckets.map((bucket: any) => ({
          search_query: bucket.key,
          search_count: bucket.doc_count,
          avg_results: bucket.avg_results?.value || 0,
          last_searched: bucket.last_searched?.value
        })) || []
      )
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
   * Get raw Elasticsearch client for advanced operations
   */
  getESClient() {
    return elasticsearchService.getClient()
  },

  /**
   * Check Elasticsearch health and connection status
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
   * Fallback search implementation using database when ES is unavailable
   */
  async searchJobsFromDB(dto: JobSearchRequestDto): Promise<{ took: number; total: number; hits: any[] }> {
    const { q, location, jobType, experienceLevel, skills, page = 1, size = 20 } = dto
    const from = (page - 1) * size

    try {
      // Build basic database query with similar filters
      let whereClause = "WHERE j.status = 'active'"
      const params: any[] = []

      if (q && q.length > 0) {
        whereClause += ` AND (j.title ILIKE $${params.length + 1} OR j.description ILIKE $${params.length + 1} OR c.name ILIKE $${params.length + 1})`
        params.push(`%${q}%`)
      }

      if (location) {
        whereClause += ` AND (j.location_name ILIKE $${params.length + 1})`
        params.push(`%${location}%`)
      }

      if (jobType) {
        whereClause += ` AND j.job_type = $${params.length + 1}`
        params.push(jobType)
      }

      if (typeof experienceLevel === 'number') {
        whereClause += ` AND j.experience_level = $${params.length + 1}`
        params.push(experienceLevel)
      }

      if (skills && Array.isArray(skills) && skills.length > 0) {
        whereClause += ` AND j.skills && $${params.length + 1}`
        params.push(skills)
      }

      // Execute database query
      const query = `
        SELECT
          j.id,
          j.title,
          j.description,
          j.location_name,
          j.job_type,
          j.experience_level,
          j.skills,
          j.posted_at,
          c.id as company_id,
          c.name as company_name,
          j.metadata
        FROM jobs j
        LEFT JOIN companies c ON j.company_id = c.id
        ${whereClause}
        ORDER BY j.posted_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `
      params.push(size, from)

      const jobs = await prisma.$queryRaw(Prisma.sql`${query}`, ...params)

      // Count total for pagination
      const countQuery = `SELECT COUNT(*) as total FROM jobs j LEFT JOIN companies c ON j.company_id = c.id ${whereClause}`
      const countResult = (await prisma.$queryRaw(Prisma.sql`${countQuery}`, ...params.slice(0, -2))) as any[]

      return {
        took: 0, // DB query time not measured
        total: Number(countResult[0]?.total || 0),
        hits: (jobs as any[]).map((job) => ({
          id: job.id,
          _source: job,
          _score: 1 // Default score for DB fallback
        }))
      }
    } catch (dbError) {
      console.error('DB fallback search also failed', dbError)
      // Return empty results if both ES and DB fail
      return {
        took: 0,
        total: 0,
        hits: []
      }
    }
  }
}
