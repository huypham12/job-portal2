import { JobSearchRequestDto, JobSearchResponseDto, SuggestionRequestDto, SuggestionResponseDto } from './search.dto'
import { elasticsearchService } from '../../config/elasticsearch.service'
import { searchRepo } from './search.repo'
import { redisService } from '../../config/redis.service'
import { prisma } from '../../config/database.service'
import { Prisma } from '@prisma/client'
import { buildJobSearchQuery, buildJobSuggestionsQuery } from '../../search/jobSearch.builder'
import { QueryContext } from '../../search/search.types'
import { envConfig } from '../../config/getEnvConfig'
import { cacheManager, cacheKeys } from './cache.manager'
import { circuitBreakerService } from '../../shared/circuit-breaker.service'

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
      locationId, // Exact location UUID (preferred for precise filtering)
      companyId, // Optional exact company filter
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

    // Resolve location filter input (expand province -> district IDs when possible)
    let resolvedLocationFilter: string | string[] | undefined = undefined
    const locationFilterInput = (locationId as any) || (location as any)
    if (locationFilterInput) {
      try {
        const resolvedIds = await searchRepo.getLocationIdsForFilter(String(locationFilterInput))
        if (resolvedIds && resolvedIds.length > 0) {
          resolvedLocationFilter = resolvedIds.length === 1 ? resolvedIds[0] : resolvedIds
        } else {
          // fallback to using provided locationId (if it was an ID) or leave undefined
          resolvedLocationFilter = locationId || undefined
        }
      } catch (e) {
        console.warn('Failed to resolve location filter ids, falling back to raw input', e)
        resolvedLocationFilter = locationId || undefined
      }
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
        // Support both exact ID filtering (preferred) and text-based location_name
        location_id: resolvedLocationFilter, // Can be string or string[] - jobSearch.builder handles both
        location_name: location,
        // Support exact company filtering if provided (frontend can send companyId)
        company_id: companyId,
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

    // Use cache manager with consistent key generation
    const cacheKey = cacheKeys.searchJobs(queryContext, recruiterId)

    const esResp = await cacheManager.withSearchCache(
      cacheKey,
      async () => {
        // Reduced log verbosity - only log in development
        if (process.env.NODE_ENV !== 'production') {
          console.debug(
            `[search] resolving location filter input="${locationFilterInput}" -> resolved=${Array.isArray(resolvedLocationFilter) ? resolvedLocationFilter.length + ' ids' : resolvedLocationFilter}`
          )
        }

        // Build complete ES query using the canonical query builder
        const esQuery = buildJobSearchQuery(queryContext)

        // Enable explain and profile in dev mode for debugging
        const isDev = process.env.NODE_ENV !== 'production'
        const enableExplain = queryContext.options?.explain ?? isDev
        const enableProfile = queryContext.options?.profile ?? isDev

        // Execute search using the built query
        const result = await elasticsearchService.searchWithTemplate('jobs', esQuery, {
          explain: enableExplain,
          profile: enableProfile
        })

        // Log ES response for debugging
        console.log('\n📊 [ES Response Summary]')
        console.log('   Total hits:', result.total)
        console.log('   Took (ms):', result.took)
        console.log('   Max score:', result.hits?.[0]?._score || 'N/A')
        console.log('   Returned:', result.hits?.length || 0, 'documents\n')

        // Log detailed scoring breakdown if explain is enabled
        if (enableExplain && result.hits?.length > 0) {
          console.log('🎯 [Score Breakdown]')
          result.hits.forEach((hit: any, idx: number) => {
            console.log(`\n--- Result #${idx + 1}: ${hit._source?.title || hit._id} ---`)
            console.log(`ID: ${hit._source?.id}`)
            console.log(`Company: ${hit._source?.company_name}`)
            console.log(`Location: ${hit._source?.location_name}`)
            console.log(`Final Score: ${hit._score}`)

            if (hit._explanation) {
              console.log('\n📝 Score Calculation:')
              this.logScoringBreakdown(hit._explanation, 1)
            }
          })
        }

        // Log performance profile if enabled
        if (enableProfile && 'profile' in result && (result as any).profile) {
          console.log('\n⚡ [Performance Profile]')
          console.log(JSON.stringify((result as any).profile, null, 2))
        }

        // If ES returned zero results for a query with a location filter,
        // attempt a DB fallback (handles cases where ES index may be stale).
        const hasLocationFilter = !!(queryContext.filters?.location_id || queryContext.filters?.location_name)
        // Reduced log verbosity - only log in development
        if (process.env.NODE_ENV !== 'production') {
          console.debug(`[search] ES returned total=${result.total} for cacheKey=${cacheKey}`)
        }

        if ((result.total || 0) === 0 && hasLocationFilter) {
          // Use circuit breaker to protect against cascading failures
          try {
            const dbResp = await circuitBreakerService.execute(
              'db-fallback',
              async () => {
                const fallbackResult = await this.searchJobsFromDB(dto as any)
                if (process.env.NODE_ENV !== 'production') {
                  console.debug(`[search] DB fallback total=${fallbackResult.total} for cacheKey=${cacheKey}`)
                }
                return fallbackResult
              },
              {
                failureThreshold: 5,
                timeout: 60000, // 1 minute
                windowSize: 10000 // 10 seconds
              }
            )

            // Cache DB fallback separately
            const fallbackKey = cacheKeys.dbFallback(cacheKey)
            await cacheManager.withSearchCache(fallbackKey, async () => dbResp, 30)

            return dbResp
          } catch (e: any) {
            // If circuit is open or DB fallback fails, return ES response (empty)
            if (e.circuitBreaker) {
              console.warn('DB fallback circuit breaker is OPEN - skipping fallback')
            } else {
              console.warn('DB fallback after empty ES result failed', e)
            }
          }
        }

        return result
      },
      30 // TTL
    )

    return await this.formatJobSearchResponse(esResp, highlight)
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

    // Enrich hits: ensure _source.company_name exists using pre-fetched companyMap
    const hits = (esResp.hits || []).map((h: any) => {
      const src = (h._source as any) || {}
      const companyId = src?.company_id

      // Get company from pre-fetched batch (no per-hit DB calls)
      const company = companyMap[companyId]

      // If company found via enrichment, propagate into _source for frontend convenience
      if (company && (company as any).name && !src.company_name) {
        try {
          src.company_name = (company as any).name
        } catch (e) {
          // ignore
        }
      }

      // Log missing companies for monitoring (but don't block or retry per-hit)
      if (!company && companyId && !src.company_name) {
        console.warn(`[search] Missing company data for ES hit id=${h.id}, company_id=${companyId} - using placeholder`)
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

    return {
      total: esResp.total,
      took_ms: esResp.total_took_ms || esResp.took, // Use total_took_ms if available, fallback to took
      es_took_ms: esResp.es_took_ms || esResp.took, // Original ES time
      total_took_ms: esResp.total_took_ms || esResp.took, // Actual total time
      cache_hit: esResp.cache_hit || false, // Whether from cache
      cached_at: esResp.cached_at, // ISO timestamp if cached
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
    // Use cache manager with consistent key generation
    const cacheKey = cacheKeys.suggest(index, dto.q, dto.size, enhancedContext)

    return await cacheManager.withSuggestCache(
      cacheKey,
      async () => {
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
            const existingTitles = new Set(suggestions.map((s) => s.text))
            const additionalSuggestions = (queryResp.hits || [])
              .filter((h) => !existingTitles.has((h._source as any)?.title))
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

        return {
          suggestions: suggestions.map((s: any) => ({
            text: s.text,
            payload: s.payload,
            score: s.score
          }))
        }
      },
      20 // TTL
    )
  },

  /**
   * Skills suggestion endpoint for autocomplete
   */
  async suggestSkills(dto: {
    q: string
    size?: number
    context?: Record<string, unknown>
  }): Promise<SuggestionResponseDto> {
    const { q, size = 10, context } = dto
    const cacheKey = cacheKeys.suggestSkills(q, size, context)

    return await cacheManager.withSuggestCache(
      cacheKey,
      async () => {
        const esResp = await elasticsearchService.suggest({
          index: elasticsearchService.getIndexName('skills'),
          prefix: q,
          size: Math.min(size * 2, 20), // Get more results to filter
          context
        })

        let suggestions = esResp.suggestions || []

        // If completion suggester has few results, supplement with query-based suggestions
        if ((!suggestions || suggestions.length < 3) && q && q.length > 1) {
          try {
            const querySuggestions = await elasticsearchService.searchWithTemplate('skills', {
              query: {
                multi_match: {
                  query: q,
                  fields: ['name^3', 'name.autocomplete^2'],
                  fuzziness: 'AUTO',
                  prefix_length: 1
                }
              },
              size: Math.min(size * 2, 20),
              _source: ['name']
            })

            const existingNames = new Set(suggestions.map((s: any) => s.text))
            const additionalSuggestions = (querySuggestions.hits || [])
              .filter((h: any) => !existingNames.has((h._source as any)?.name))
              .slice(0, size - suggestions.length)
              .map((h: any) => ({
                text: (h._source as any)?.name ?? h.id,
                payload: h._source,
                score: h._score
              }))

            suggestions = [...suggestions, ...additionalSuggestions]
          } catch (e) {
            // ignore fallback errors
          }
        }

        // Ensure we don't exceed the requested size
        if (suggestions.length > size) {
          suggestions = suggestions.slice(0, size)
        }

        return {
          suggestions: suggestions.map((s: any) => ({
            text: s.text,
            payload: s.payload,
            score: s.score
          }))
        }
      },
      20 // TTL
    )
  },

  /**
   * Companies suggestion endpoint for autocomplete in job search
   */
  async suggestCompanies(dto: {
    q: string
    size?: number
    context?: Record<string, unknown>
  }): Promise<SuggestionResponseDto> {
    const { q, size = 10, context } = dto
    const cacheKey = cacheKeys.suggestCompanies(q, size, context)

    return await cacheManager.withSuggestCache(
      cacheKey,
      async () => {
        const esResp = await elasticsearchService.suggest({
          index: elasticsearchService.getIndexName('companies'),
          prefix: q,
          size: Math.min(size * 2, 20), // Get more results to filter
          context
        })

        let suggestions = esResp.suggestions || []

        // If completion suggester has few results, supplement with query-based suggestions
        if ((!suggestions || suggestions.length < 3) && q && q.length > 1) {
          try {
            const querySuggestions = await elasticsearchService.searchWithTemplate('companies', {
              query: {
                multi_match: {
                  query: q,
                  fields: ['name^3', 'name.autocomplete^2'],
                  fuzziness: 'AUTO',
                  prefix_length: 1
                }
              },
              size: Math.min(size * 2, 20),
              _source: ['name']
            })

            const existingNames = new Set(suggestions.map((s: any) => s.text))
            const additionalSuggestions = (querySuggestions.hits || [])
              .filter((h: any) => !existingNames.has((h._source as any)?.name))
              .slice(0, size - suggestions.length)
              .map((h: any) => ({
                text: (h._source as any)?.name ?? h.id,
                payload: h._source,
                score: h._score
              }))

            suggestions = [...suggestions, ...additionalSuggestions]
          } catch (e) {
            // ignore fallback errors
          }
        }

        // Ensure we don't exceed the requested size
        if (suggestions.length > size) {
          suggestions = suggestions.slice(0, size)
        }

        return {
          suggestions: suggestions.map((s: any) => ({
            text: s.text,
            payload: s.payload,
            score: s.score
          }))
        }
      },
      20 // TTL
    )
  },

  /**
   * Categories suggestion endpoint for autocomplete
   */
  async suggestCategories(dto: {
    q: string
    size?: number
    context?: Record<string, unknown>
  }): Promise<SuggestionResponseDto> {
    const { q, size = 10, context } = dto
    const cacheKey = cacheKeys.suggestCategories(q, size, context)

    return await cacheManager.withSuggestCache(
      cacheKey,
      async () => {
        const esResp = await elasticsearchService.suggest({
          index: elasticsearchService.getIndexName('categories'),
          prefix: q,
          size: Math.min(size * 2, 20), // Get more results to filter
          context
        })

        let suggestions = esResp.suggestions || []

        // If completion suggester has few results, supplement with query-based suggestions
        if ((!suggestions || suggestions.length < 3) && q && q.length > 1) {
          try {
            const querySuggestions = await elasticsearchService.searchWithTemplate('categories', {
              query: {
                multi_match: {
                  query: q,
                  fields: ['name^3', 'name.autocomplete^2'],
                  fuzziness: 'AUTO',
                  prefix_length: 1
                }
              },
              size: Math.min(size * 2, 20),
              _source: ['name', 'type']
            })

            const existingNames = new Set(suggestions.map((s: any) => s.text))
            const additionalSuggestions = (querySuggestions.hits || [])
              .filter((h: any) => !existingNames.has((h._source as any)?.name))
              .slice(0, size - suggestions.length)
              .map((h: any) => ({
                text: (h._source as any)?.name ?? h.id,
                payload: h._source,
                score: h._score
              }))

            suggestions = [...suggestions, ...additionalSuggestions]
          } catch (e) {
            // ignore fallback errors
          }
        }

        // Ensure we don't exceed the requested size
        if (suggestions.length > size) {
          suggestions = suggestions.slice(0, size)
        }

        // Ensure we don't exceed the requested size
        if (suggestions.length > size) {
          suggestions = suggestions.slice(0, size)
        }

        return {
          suggestions: suggestions.map((s: any) => ({
            text: s.text,
            payload: s.payload,
            score: s.score
          }))
        }
      },
      20 // TTL
    )
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

    // Use centralized ES wrapper for consistent search results
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
    const cacheKey = cacheKeys.profilesForJob(jobPayload, topN)

    const esResp = await cacheManager.withSearchCache(
      cacheKey,
      async () => {
        return await elasticsearchService.search({
          index: 'profiles',
          query: esQuery,
          from: 0,
          size: topN
        })
      },
      20 // TTL
    )

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
    const cacheKey = cacheKeys.jobsForProfile(profilePayload, topN)

    const esResp = await cacheManager.withSearchCache(
      cacheKey,
      async () => {
        return await elasticsearchService.search({
          index: 'jobs',
          query: esQuery,
          from: 0,
          size: topN
        })
      },
      20 // TTL
    )

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
        index: elasticsearchService.getIndexName('companies'),
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
      // Build Prisma where clause instead of raw SQL
      const where: any = {
        status: 'approved',
        admin_approved: true
      }

      // Text search across multiple fields
      if (q && q.length > 0) {
        where.OR = [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } }
          // Note: company relation filter removed - jobs table doesn't have direct relation
          // Company search is handled via batch fetch after query execution
        ]
      }

      // Location filter - use relation instead of non-existent location_name field
      if (location) {
        where.locations = {
          name: { contains: location, mode: 'insensitive' }
        }
      }

      // Job type filter
      if (jobType) {
        where.job_type = jobType
      }

      // Experience level filter
      if (typeof experienceLevel === 'number') {
        where.experience_level = experienceLevel
      }

      // Skills filter (array overlap check)
      if (skills && Array.isArray(skills) && skills.length > 0) {
        where.skills = { hasSome: skills }
      }

      // Salary range filters - handle JSONB field
      // Note: Prisma doesn't support JSON path operations well, so we'll skip strict salary filtering in fallback
      // This is acceptable since DB fallback is rarely used

      // Determine sort order
      let orderBy: any = { posted_at: 'desc' } // default

      if (sort === 'newest') orderBy = { posted_at: 'desc' }
      else if (sort === 'oldest') orderBy = { posted_at: 'asc' }
      else if (sort === 'relevance') orderBy = { posted_at: 'desc' } // fallback: newest first
      // Note: salary and experience sorting would require JSON path operations
      // For DB fallback, we'll use posted_at as fallback for those cases

      // Execute database query using Prisma client
      const [jobs, total] = await Promise.all([
        prisma.jobs.findMany({
          where,
          orderBy,
          skip: from,
          take: size
        }),
        prisma.jobs.count({ where })
      ])

      // Fetch company names for enrichment (batch fetch to avoid N+1)
      const companyIds = Array.from(new Set(jobs.map((job: any) => job.company_id).filter(Boolean)))
      let companyMap: Record<string, any> = {}
      if (companyIds.length > 0) {
        try {
          const companies = await prisma.companies.findMany({
            where: { id: { in: companyIds as string[] } },
            select: { id: true, name: true }
          })
          companyMap = companies.reduce((acc: any, c: any) => {
            acc[c.id] = c
            return acc
          }, {})
        } catch (e) {
          console.warn('Failed to fetch companies for DB fallback', e)
        }
      }

      return {
        took: 0, // DB query time not measured
        total,
        hits: jobs.map((job: any) => ({
          id: job.id,
          _source: {
            ...job,
            company_id: job.company_id,
            company_name: companyMap[job.company_id]?.name || 'Chưa có tên công ty'
          },
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

    // Use cache manager with consistent key generation
    const cacheKey = cacheKeys.searchJobsLegacy(esQuery, from, size, sort, recruiterId, {
      userExperienceLevel,
      userLocationId,
      userPrefersRemote,
      userSkills: userSkills?.slice(0, 5),
      userDesiredSalaryMin,
      userDesiredSalaryMax
    })

    const esResp = await cacheManager.withSearchCache(
      cacheKey,
      async () => {
        try {
          // Use old searchJobs advanced method with business-aware scoring
          return await elasticsearchService.searchJobs({
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
          return await this.searchJobsFromDB(dto)
        }
      },
      30 // TTL
    )

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
      took_ms: esResp.total_took_ms || esResp.took, // Use total_took_ms if available
      es_took_ms: esResp.es_took_ms || esResp.took, // Original ES time
      total_took_ms: esResp.total_took_ms || esResp.took, // Actual total time
      cache_hit: esResp.cache_hit || false, // Whether from cache
      cached_at: esResp.cached_at, // ISO timestamp if cached
      hits
    }
  },

  /**
   * Cache invalidation hooks - call these when data changes
   */

  /**
   * Invalidate job-related caches when a job is updated
   */
  async onJobUpdated(jobId: string): Promise<void> {
    await cacheManager.invalidateJobCache(jobId)
  },

  /**
   * Invalidate company-related caches when a company is updated
   */
  async onCompanyUpdated(companyId: string): Promise<void> {
    await cacheManager.invalidateCompanyCache(companyId)
  },

  /**
   * Invalidate recruiter-specific caches when recruiter data changes
   */
  async onRecruiterUpdated(recruiterId: string): Promise<void> {
    await cacheManager.invalidateRecruiterCache(recruiterId)
  },

  /**
   * Invalidate all search caches (use with caution - heavy operation)
   */
  async invalidateAllSearchCaches(): Promise<void> {
    await cacheManager.invalidateAllSearches()
  },

  /**
   * Helper to recursively log scoring breakdown from explain
   */
  logScoringBreakdown(explanation: any, indent = 0): void {
    const prefix = '   '.repeat(indent)
    if (!explanation) return

    console.log(`${prefix}├─ ${explanation.description} = ${explanation.value}`)

    if (explanation.details && explanation.details.length > 0) {
      explanation.details.forEach((detail: any) => {
        this.logScoringBreakdown(detail, indent + 1)
      })
    }
  }
}
