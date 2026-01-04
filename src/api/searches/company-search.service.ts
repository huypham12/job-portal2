import { elasticsearchService } from '../../config/elasticsearch.service'
import { redisService } from '../../config/redis.service'
import { CompanySearchRequestDto, CompanySearchResponseDto, CompanySuggestionsRequestDto, CompanySuggestionsResponseDto, PopularCompaniesRequestDto, PopularCompaniesResponseDto } from './search.dto'

/**
 * Company search service using Elasticsearch
 */
export const companySearchService = {
  /**
   * Search companies with advanced filtering and scoring
   */
  async searchCompanies(dto: CompanySearchRequestDto): Promise<CompanySearchResponseDto> {
    const { q, industry, location, size_min, size_max, company_type, sort = 'relevance', page = 1, size = 20 } = dto
    const from = (page - 1) * size

    // Build cache key
    const cacheKey = `search:companies:${JSON.stringify(dto)}:page:${page}:size:${size}`
    const cacheHit = await redisService.getSearchResponse(cacheKey)
    if (cacheHit) {
      return {
        total: cacheHit.total,
        took_ms: cacheHit.took,
        companies: cacheHit.hits.map((h: any) => h._source)
      }
    }

    // Build ES query
    const must: any[] = []
    const filter: any[] = []

    // Text search
    if (q && q.length > 0) {
      must.push({
        multi_match: {
          query: q,
          fields: ['name^3', 'description^1.5', 'culture_description', 'industry'],
          fuzziness: 'AUTO',
          operator: 'and'
        }
      })
    } else {
      must.push({ match_all: {} })
    }

    // Filters
    if (industry) filter.push({ term: { industry } })
    if (location) filter.push({ match: { headquarters_location: location } })
    if (size_min !== undefined) filter.push({ range: { size: { gte: size_min } } })
    if (size_max !== undefined) filter.push({ range: { size: { lte: size_max } } })
    if (company_type) filter.push({ term: { company_type } })

    // Build sort
    let sortOptions: any[] = []
    switch (sort) {
      case 'name':
        sortOptions = [{ 'name.keyword': 'asc' }]
        break
      case 'size':
        sortOptions = [{ size: 'desc' }]
        break
      case 'relevance':
      default:
        sortOptions = [{ _score: 'desc' }]
        break
    }

    const esQuery = { bool: { must, filter } }

    const esResp = await elasticsearchService.search({
      index: 'companies',
      query: esQuery,
      from,
      size,
      sort: sortOptions
    })

    // Cache results for 15 minutes
    try {
      await redisService.setSearchResponse(cacheKey, esResp, 15 * 60)
    } catch (e) {
      // Non-fatal
    }

    const companies = esResp.hits.map((hit) => hit._source)

    return {
      total: esResp.total,
      took_ms: esResp.took,
      companies
    }
  },

  /**
   * Get company search suggestions using completion suggester
   */
  async getCompanySuggestions(dto: CompanySuggestionsRequestDto): Promise<CompanySuggestionsResponseDto> {
    const { q, size = 10, context } = dto

    const cacheKey = `search:companies:suggest:${q}:${size}:${JSON.stringify(context ?? {})}`
    const cached = await redisService.getSuggestResponse(cacheKey)
    if (cached) {
      return { suggestions: cached.suggestions }
    }

    const esResp = await elasticsearchService.suggest({
      index: 'companies',
      prefix: q,
      size,
      context: context as Record<string, unknown> | undefined
    })

    try {
      await redisService.setSuggestResponse(cacheKey, esResp, 20)
    } catch (e) {
      // Non-fatal
    }

    // Fallback to regular search if no suggestions
    let suggestions = esResp.suggestions || []
    if ((!suggestions || suggestions.length === 0) && q && q.length > 0) {
      try {
        const fallbackQuery = {
          bool: {
            should: [
              { match_phrase_prefix: { 'name.autocomplete': { query: q } } },
              { match_phrase_prefix: { name: { query: q } } }
            ]
          }
        }
        const fallbackResp = await elasticsearchService.search({
          index: 'companies',
          query: fallbackQuery,
          from: 0,
          size
        })
        suggestions = (fallbackResp.hits || []).map((h) => ({
          text: (h._source as any)?.name ?? h.id,
          payload: h._source,
          score: h._score
        }))
      } catch (e) {
        // Ignore fallback errors
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
   * Get popular companies based on various metrics
   */
  async getPopularCompanies(dto: PopularCompaniesRequestDto): Promise<PopularCompaniesResponseDto> {
    const { limit = 10, sort_by = 'size', industry } = dto

    const cacheKey = `search:companies:popular:${sort_by}:${industry || 'all'}:${limit}`
    const cacheHit = await redisService.getSearchResponse(cacheKey)
    if (cacheHit) {
      return {
        companies: cacheHit.hits.map((h: any) => h._source),
        sort_by,
        period: 'all_time'
      }
    }

    // Build query based on sort criteria
    let sortOptions: any[] = []
    let query: any = { match_all: {} }

    // Add industry filter if specified
    if (industry) {
      query = {
        bool: {
          must: [{ match_all: {} }],
          filter: [{ term: { industry } }]
        }
      }
    }

    switch (sort_by) {
      case 'size':
        sortOptions = [{ size: 'desc' }]
        break
      case 'name':
        sortOptions = [{ 'name.keyword': 'asc' }]
        break
      case 'founded_year':
        sortOptions = [{ founded_year: 'desc' }]
        break
      default:
        sortOptions = [{ size: 'desc' }]
        break
    }

    const esResp = await elasticsearchService.search({
      index: 'companies',
      query,
      from: 0,
      size: limit,
      sort: sortOptions
    })

    // Cache for 1 hour
    try {
      await redisService.setSearchResponse(cacheKey, esResp, 60 * 60)
    } catch (e) {
      // Non-fatal
    }

    const companies = esResp.hits.map((hit) => hit._source)

    return {
      companies,
      sort_by,
      period: 'all_time'
    }
  }
}
