import { JobSearchRequestDto, JobSearchResponseDto, SuggestionRequestDto, SuggestionResponseDto } from './search.dto'
import { elasticsearchService } from '../../config/elasticsearch.service'
import { searchRepo } from './search.repo'
import { redisService } from '../../config/redis.service'
import { metrics } from '../../shared/utils/metrics.util'

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
          fields: ['title^4', 'skills^3', 'company_name^2', 'description'],
          fuzziness: 'AUTO',
          operator: 'and'
        }
      })
    } else {
      must.push({ match_all: {} })
    }

    if (location) filter.push({ term: { location_id: location } })
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
    const esResp = await elasticsearchService.search({
      index: 'jobs',
      query: esQuery,
      from,
      size
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
    let esResp = await elasticsearchService.suggest({
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

    // Filter to only show OPEN candidates (actively looking for jobs)
    filter.push({ term: { availability_status: 'OPEN' } })

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
      await searchRepo.saveEvent(eventDto as any)
    } catch (e) {
      // Logging should not crash caller; rethrow if you want to surface errors.
      // For now, swallow and log to console for observability in dev.
      // Replace with proper logger in production.
      // eslint-disable-next-line no-console
      console.error('searchService.logEvent error', e)
    }
  }
}
