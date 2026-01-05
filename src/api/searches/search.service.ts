import { JobSearchRequestDto, JobSearchResponseDto, SuggestionRequestDto, SuggestionResponseDto } from './search.dto'
import { elasticsearchService } from '../../config/elasticsearch.service'
import { searchRepo } from './search.repo'
import { redisService } from '../../config/redis.service'
import { prisma } from '../../config/database.service'
import { Prisma } from '@prisma/client'
import { buildJobSearchQuery, buildJobSuggestionsQuery } from '../../search/jobSearch.builder'
import { QueryContext } from '../../search/search.types'
import { envConfig } from '../../config/getEnvConfig'

/**
 * Search service: build ES query (pseudocode), call elasticsearchService, map to response.
 * - Keep ES query details as pseudocode per project constraints.
 * - Return snake_case response shape as defined by DTO.
 */
/**
 * Check if new search builder should be used based on rollout percentage
 */
function shouldUseNewSearchBuilder(userId?: string): boolean {
  const percentage = envConfig.rollout.newSearchBuilderPercentage
  if (percentage >= 100) return true
  if (percentage <= 0) return false

  // Use user ID for consistent rollout (same user always gets same experience)
  const hash = userId ? simpleHash(userId) : Math.random() * 100
  return hash % 100 < percentage
}

/**
 * Simple hash function for consistent user assignment to rollout groups
 */
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

export const searchService = {
  async searchJobs(
    dto: Omit<JobSearchRequestDto, 'location'> & {
      location?: string
      locationId?: string
      userExperienceLevel?: number
      userLocationId?: string
      userPrefersRemote?: boolean
      userSkills?: string[]
      userDesiredSalaryMin?: number
      userDesiredSalaryMax?: number
      recruiterId?: string // Optional for tenant isolation (only for authenticated recruiters)
    }
  ): Promise<JobSearchResponseDto> {
    const {
      q,
      location,
      jobType,
      experienceLevel,
      skills,
      salaryMin,
      salaryMax,
      jobCategories,
      jobBenefits,
      remotePercentageMin,
      flexibleHours,
      sort,
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
      recruiterId // Optional: only present for authenticated recruiters
    } = dto

    // Check if new search builder should be used (use default hash for anonymous users)
    const useNewBuilder = shouldUseNewSearchBuilder(recruiterId || 'anonymous')

    if (!useNewBuilder) {
      // Fallback to old implementation
      return this.searchJobsLegacy(dto)
    }

    // Build standardized QueryContext from DTO
    const queryContext: QueryContext = {
      q,
      userSkills,
      userLocationId,
      userExperienceLevel,
      userPrefersRemote,
      userDesiredSalaryMin,
      userDesiredSalaryMax,
      userRemotePercentageMin: remotePercentageMin,
      userPrefersFlexibleHours: flexibleHours,
      userPreferredCategories: jobCategories,
      userDesiredBenefits: jobBenefits,
      filters: {
        location_name: location,
        job_type: jobType,
        experience_level: experienceLevel,
        skill_names: skills,
        salary_min: salaryMin,
        salary_max: salaryMax,
        job_category: jobCategories,
        benefits_type: jobBenefits,
        remote_percentage_min: remotePercentageMin,
        flexible_hours: flexibleHours,
        sort: sort,
        recruiter_id: recruiterId // Optional: only filter by tenant if recruiterId provided
      },
      pagination: { page, size },
      options: {
        explain: process.env.ES_EXPLAIN_QUERIES === 'true',
        profile: process.env.ES_PROFILE_QUERIES === 'true'
      }
    }

    // Create cache key from normalized context (include recruiterId for tenant isolation)
    const cacheKey = `search:jobs:v2:${JSON.stringify(queryContext)}:recruiterId:${recruiterId || 'public'}`
    const cacheHit = await redisService.getSearchResponse(cacheKey)
    if (cacheHit) {
      return await this.formatJobSearchResponse(cacheHit, highlight)
    }

    try {
      // Build complete ES query using the canonical query builder
      const esQuery = buildJobSearchQuery(queryContext)

      // Execute search using the built query
      const esResp = await elasticsearchService.searchWithTemplate('jobs', esQuery, {
        explain: queryContext.options?.explain,
        profile: queryContext.options?.profile
      })

      // Cache results for short period
      try {
        await redisService.setSearchResponse(cacheKey, esResp, 30)
      } catch (e) {
        // non-fatal
      }

      return await this.formatJobSearchResponse(esResp, highlight)
    } catch (esError) {
      console.warn('ES search failed, falling back to DB search', esError)

      // Fallback to database search
      const esResp = await this.searchJobsFromDB(dto)
      return await this.formatJobSearchResponse(esResp, highlight)
    }
  },

  /**
   * Format ES response to standardized JobSearchResponseDto
   */
  async formatJobSearchResponse(esResp: any, highlight?: boolean): Promise<JobSearchResponseDto> {
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

    // Enrich hits: ensure _source.company_name exists (fallback to DB if necessary)
    const hits = await Promise.all(
      (esResp.hits || []).map(async (h: any) => {
        const src = (h._source as any) || {}
        const companyId = src?.company_id

        // Primary enrichment from pre-fetched companyMap
        let company = companyMap[companyId]

        // If still missing, try single-company DB lookup (last-resort)
        if ((!company || !(company as any)?.name) && companyId) {
          try {
            const dbCompany = await searchRepo.getCompanyById(companyId)
            if (dbCompany) {
              company = { id: dbCompany.id, name: (dbCompany as any).name, logo_url: (dbCompany as any).logo_url }
            }
          } catch (e) {
            console.warn(
              `[search] Failed to load company ${companyId} from DB for hit ${h.id}:`,
              (e as Error)?.message || e
            )
          }
        }

        // If company found via enrichment, propagate into _source for frontend convenience
        if (company && (company as any).name && !src.company_name) {
          try {
            src.company_name = (company as any).name
          } catch (e) {
            // ignore
          }
        }

        if (!company || !(company as any).name) {
          // Last-resort placeholder and logging for triage
          console.warn(
            `[search] Missing company name for ES hit id=${h.id}, company_id=${companyId}, src.company_name='${
              src?.company_name || ''
            }'`
          )
        }

        return {
          id: h.id,
          title: src?.title,
          company:
            company ??
            (src?.company_name
              ? { id: src?.company_id, name: src.company_name }
              : { id: src?.company_id, name: 'Chưa có tên công ty' }),
          score: h._score ?? undefined,
          highlight: highlight ? (h as any)._highlight : undefined,
          _source: src
        }
      })
    )

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

    // Use new query builder for suggestions
    const cacheKey = `search:suggest:v2:${index}:${dto.q}:${dto.size}:${JSON.stringify(enhancedContext)}`
    const cached = await redisService.getSuggestResponse(cacheKey)
    if (cached) {
      return { suggestions: cached.suggestions }
    }

    try {
      // Try completion suggester first with increased size for better results
      const esResp = await elasticsearchService.suggest({
        index: elasticsearchService.getIndexName(index),
        prefix: dto.q,
        size: Math.min(dto.size * 2, 20), // Get more results to filter
        context: enhancedContext
      })

      let suggestions = esResp.suggestions || []

      // If completion suggester has few results, supplement with query-based suggestions
      if ((!suggestions || suggestions.length < 3) && dto.q && dto.q.length > 1) {
        try {
          const querySuggestions = buildJobSuggestionsQuery(dto.q, dto.size)
          const queryResp = await elasticsearchService.searchWithTemplate(index, querySuggestions)

          // Avoid duplicates by checking existing suggestion texts
          const existingTitles = new Set(suggestions.map(s => s.text))
          const additionalSuggestions = (queryResp.hits || [])
            .filter(h => !existingTitles.has((h._source as any)?.title))
            .slice(0, dto.size - suggestions.length)
            .map((h) => ({
              text: (h._source as any)?.title ?? h.id,
              payload: h._source,
              score: h._score
            }))

          suggestions = [...suggestions, ...additionalSuggestions]
        } catch (e) {
          // ignore fallback errors
        }
      }

      // Ensure we don't exceed the requested size
      if (suggestions.length > dto.size) {
        suggestions = suggestions.slice(0, dto.size)
      }

      // Cache results
      try {
        await redisService.setSuggestResponse(cacheKey, { suggestions }, 20)
      } catch (e) {
        console.warn('Failed to cache suggest response:', e)
      }

      return {
        suggestions: suggestions.map((s: any) => ({
          text: s.text,
          payload: s.payload,
          score: s.score
        }))
      }
    } catch (error) {
      console.warn('ES suggest failed:', error)
      // Return empty suggestions on error
      return { suggestions: [] }
    }
  },

  /**
   * Search companies with mandatory recruiter isolation
   */
  async searchCompanies(dto: {
    q?: string
    page?: number
    size?: number
    recruiterId?: string // Optional for public search, mandatory for tenant isolation
  }): Promise<{ total: number; hits: any[]; took_ms: number }> {
    const { q, page = 1, size = 20, recruiterId } = dto
    const from = (page - 1) * size

    const must: any[] = []
    const filter: any[] = []

    // Optional: Add recruiter ownership filter only if recruiterId provided
    // This allows public company search while still supporting tenant isolation for authenticated recruiters
    if (recruiterId) {
      filter.push({ term: { recruiter_id: recruiterId } })
    }

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
      throw new Error(
        'Either recruiterId OR candidateId must be provided for application search (not both, not neither)'
      )
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
      return cacheHit.hits
    }

    const esResp = await elasticsearchService.search({
      index: 'profiles',
      query: esQuery,
      from: 0,
      size: topN
    })
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
      return cacheHit.hits
    }

    const esResp = await elasticsearchService.search({
      index: 'jobs',
      query: esQuery,
      from: 0,
      size: topN
    })
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
   * Location autocomplete for search UI
   */
  async searchLocations(query: string, type?: 'province' | 'district', parentId?: string) {
    return await elasticsearchService.searchLocations(query, type, parentId)
  },

  /**
   * Skills autocomplete for search UI
   */
  async searchSkills(query: string, category?: string) {
    return await elasticsearchService.searchSkills(query, category)
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
    const {
      q,
      location,
      jobType,
      experienceLevel,
      skills,
      salaryMin,
      salaryMax,
      jobCategories,
      jobBenefits,
      sort,
      page = 1,
      size = 20
    } = dto
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

      if (salaryMin !== undefined) {
        whereClause += ` AND (j.salary_range->>'max')::int >= $${params.length + 1}`
        params.push(salaryMin)
      }

      if (salaryMax !== undefined) {
        whereClause += ` AND (j.salary_range->>'min')::int <= $${params.length + 1}`
        params.push(salaryMax)
      }

      if (jobCategories && Array.isArray(jobCategories) && jobCategories.length > 0) {
        whereClause += ` AND EXISTS (SELECT 1 FROM job_categories jc WHERE jc.job_id = j.id AND jc.category_id IN (SELECT id FROM categories WHERE name = ANY($${params.length + 1})))`
        params.push(jobCategories)
      }

      if (jobBenefits && Array.isArray(jobBenefits) && jobBenefits.length > 0) {
        whereClause += ` AND EXISTS (SELECT 1 FROM job_benefits jb WHERE jb.job_id = j.id AND jb.benefit_type = ANY($${params.length + 1}))`
        params.push(jobBenefits)
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
        ORDER BY
          CASE
            WHEN $${params.length + 1} = 'newest' THEN j.posted_at
            WHEN $${params.length + 1} = 'oldest' THEN j.posted_at
            WHEN $${params.length + 1} = 'salary_high' THEN (j.salary_range->>'max')::int
            WHEN $${params.length + 1} = 'salary_low' THEN (j.salary_range->>'min')::int
            WHEN $${params.length + 1} = 'experience_high' THEN j.experience_level
            WHEN $${params.length + 1} = 'experience_low' THEN j.experience_level
            ELSE j.posted_at
          END
          ${sort === 'oldest' || sort === 'salary_low' || sort === 'experience_low' ? 'ASC' : 'DESC'}
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `
      params.push(sort || 'relevance', size, from)

      const jobs = await prisma.$queryRaw(Prisma.sql`${query}`, ...params)

      // Count total for pagination
      const countQuery = `SELECT COUNT(*) as total FROM jobs j LEFT JOIN companies c ON j.company_id = c.id ${whereClause.replace(/ORDER BY[\s\S]*$/, '')}`
      const countResult = (await prisma.$queryRaw(Prisma.sql`${countQuery}`, ...params.slice(0, -3))) as any[]

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
  },

  /**
   * Legacy search implementation - kept for gradual rollout
   * @deprecated Will be removed after full rollout of new builder
   */
  async searchJobsLegacy(
    dto: JobSearchRequestDto & {
      userExperienceLevel?: number
      userLocationId?: string
      userPrefersRemote?: boolean
      userSkills?: string[]
      userDesiredSalaryMin?: number
      userDesiredSalaryMax?: number
      recruiterId?: string // Optional for tenant isolation
    }
  ): Promise<JobSearchResponseDto> {
    const {
      q,
      location,
      jobType,
      experienceLevel,
      skills,
      salaryMin,
      salaryMax,
      jobCategories,
      jobBenefits,
      remotePercentageMin,
      flexibleHours,
      sort,
      page = 1,
      size = 20,
      highlight,
      userExperienceLevel,
      userLocationId,
      userPrefersRemote,
      userSkills,
      userDesiredSalaryMin,
      userDesiredSalaryMax,
      recruiterId
    } = dto

    const from = (page - 1) * size

    // Build ES query using multi_match + filters for fuzzy search
    const must: any[] = []
    const filter: any[] = []

    // Optional: Add recruiter ownership filter only if recruiterId provided
    // This allows public search (candidates) while still supporting tenant isolation for authenticated recruiters
    if (recruiterId) {
      filter.push({ term: { recruiter_id: recruiterId } })
    }

    if (q && q.length) {
      must.push({
        multi_match: {
          query: q,
          fields: [
            'title^4',
            'skills^3',
            'company_name^2',
            'description',
            'location_province^2',
            'location_district^2',
            'location_combined^1.5'
          ],
          fuzziness: 'AUTO',
          operator: 'and'
        }
      })
    } else {
      must.push({ match_all: {} })
    }

    // Handle location filtering with province/district hierarchy
    // Prefer locationId (UUID) over location (name) for precision
    const locationFilterValue = (dto as any).locationId || location
    if (locationFilterValue) {
      const locationIds = await searchRepo.getLocationIdsForFilter(locationFilterValue)
      if (locationIds.length > 0) {
        filter.push({ terms: { location_id: locationIds } })
      }
    }
    if (jobType) filter.push({ term: { job_type: jobType } })
    if (typeof experienceLevel === 'number') filter.push({ term: { experience_level: experienceLevel } })
    if (skills && Array.isArray(skills) && skills.length) filter.push({ terms: { skills_flat: skills } })

    // Salary range filters
    if (salaryMin !== undefined || salaryMax !== undefined) {
      const salaryConditions = []
      if (salaryMin !== undefined) {
        salaryConditions.push({
          range: { salary_min: { gte: salaryMin * 0.8 } } // Accept 80% of desired minimum
        })
      }
      if (salaryMax !== undefined) {
        salaryConditions.push({
          range: { salary_max: { lte: salaryMax * 1.2 } } // Accept up to 120% of desired maximum
        })
      }
      if (salaryConditions.length > 0) {
        filter.push({
          bool: {
            should: salaryConditions,
            minimum_should_match: Math.min(1, salaryConditions.length)
          }
        })
      }
    }

    // Job categories filter
    if (jobCategories && Array.isArray(jobCategories) && jobCategories.length > 0) {
      filter.push({ terms: { job_category: jobCategories } })
    }

    // Job benefits filter
    if (jobBenefits && Array.isArray(jobBenefits) && jobBenefits.length > 0) {
      filter.push({ terms: { job_benefits_type: jobBenefits } })
    }

    // Remote percentage filter
    if (remotePercentageMin !== undefined) {
      filter.push({
        range: { remote_percentage: { gte: remotePercentageMin } }
      })
    }

    // Flexible hours filter
    if (flexibleHours !== undefined) {
      filter.push({ term: { flexible_hours: flexibleHours } })
    }

    const esQuery = { bool: { must, filter } }
    const cacheKey = `search:jobs:legacy:${JSON.stringify(esQuery)}:from:${from}:size:${size}:sort:${sort}:recruiterId:${recruiterId || 'public'}:userCtx:${JSON.stringify(
      {
        userExperienceLevel,
        userLocationId,
        userPrefersRemote,
        userSkills: userSkills?.slice(0, 5),
        userDesiredSalaryMin,
        userDesiredSalaryMax
      }
    )}`
    const cacheHit = await redisService.getSearchResponse(cacheKey)
    if (cacheHit) {
      return this.formatJobSearchResponse(cacheHit, highlight)
    }

    let esResp: any
    try {
      // Use old searchJobs advanced method with business-aware scoring
      esResp = await elasticsearchService.searchJobs({
        index: 'jobs',
        query: esQuery,
        from,
        size,
        sort:
          sort === 'relevance'
            ? [{ _score: 'desc' }, { posted_at: 'desc' }]
            : sort === 'newest'
              ? [{ posted_at: 'desc' }]
              : sort === 'oldest'
                ? [{ posted_at: 'asc' }]
                : sort === 'salary_high'
                  ? [{ salary_max: 'desc' }]
                  : sort === 'salary_low'
                    ? [{ salary_min: 'asc' }]
                    : sort === 'experience_high'
                      ? [{ experience_level: 'desc' }]
                      : sort === 'experience_low'
                        ? [{ experience_level: 'asc' }]
                        : [{ _score: 'desc' }, { posted_at: 'desc' }],
        // Enhanced user context for personalized scoring
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

      // Fallback to database search
      esResp = await this.searchJobsFromDB(dto)
    }

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
  }
}
