import { envConfig } from './getEnvConfig'

export type SearchParams = {
  index: string
  query: unknown
  from?: number
  size?: number
  sort?: unknown
}

export type SuggestParams = {
  index: string
  prefix: string
  size?: number
  context?: Record<string, unknown>
}

export type GetByIdParams = {
  index: string
  id: string
}

export type SearchResponse<T = any> = {
  took: number
  total: number
  hits: Array<{ id: string; _source: T; _score?: number }>
}

export type Suggestion = { text: string; payload?: unknown; score?: number }
export type SuggestResponse = { suggestions: Suggestion[] }

/**
 * Thin Elasticsearch client wrapper.
 * Only method signatures are provided here — implementation belongs to infra/bootstrap code.
 *
 * Controllers/services must call these methods; do NOT call ES client directly.
 */
import { Client } from '@elastic/elasticsearch'

const ES_NODE = envConfig.elasticsearch.nodeUrl || envConfig.elasticsearch.host || envConfig.elasticsearch.node

// Enhanced Vietnamese analyzer configuration optimized for job portal search
const vietnameseAnalyzers = {
  analysis: {
    filter: {
      // Optimized stop words - removed overly common words that might filter out relevant terms
      vi_stop: {
        type: 'stop',
        stopwords: [
          'của', 'và', 'là', 'có', 'được', 'trong', 'người', 'đã', 'từ', 'với',
          'cho', 'như', 'này', 'đó', 'theo', 'về', 'ở', 'vào', 'sẽ', 'để',
          'ra', 'đi', 'đến', 'tại', 'nhưng', 'vẫn', 'cũng', 'bị', 'một', 'hai',
          'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín', 'mười'
        ]
      },
      // Improved stemmer for Vietnamese
      vi_stem: {
        type: 'stemmer',
        language: 'light_english' // Better than porter2 for Vietnamese context
      },
      // Asciifolding for normalizers - must not preserve original for keyword fields
      asciifolding_filter: {
        type: 'asciifolding',
        preserve_original: false
      },
      // Additional filters for better Vietnamese text processing
      vi_word_delimiter: {
        type: 'word_delimiter',
        generate_word_parts: true,
        generate_number_parts: false,
        catenate_words: true,
        catenate_numbers: false,
        catenate_all: false,
        split_on_case_change: false,
        preserve_original: true,
        split_on_numerics: false
      }
    },
    analyzer: {
      // Main analyzer for indexing - optimized for Vietnamese job descriptions
      vi_analyzer: {
        type: 'custom',
        tokenizer: 'standard',
        filter: ['lowercase', 'vi_word_delimiter', 'asciifolding_filter', 'vi_stop', 'vi_stem']
      },
      // Search analyzer - more permissive for queries
      vi_search_analyzer: {
        type: 'custom',
        tokenizer: 'standard',
        filter: ['lowercase', 'vi_word_delimiter', 'asciifolding_filter', 'vi_stop']
      },
      // Specialized analyzer for job titles and short texts
      vi_title_analyzer: {
        type: 'custom',
        tokenizer: 'standard',
        filter: ['lowercase', 'asciifolding_filter'] // Minimal filtering for titles
      }
    },
    normalizer: {
      lc_normalizer: {
        type: 'custom',
        filter: ['lowercase', 'asciifolding_filter']
      }
    }
  }
}

let esClient: Client | null = null
function getClient(): Client {
  if (esClient) return esClient
  esClient = new Client({ node: ES_NODE })
  return esClient
}

export const elasticsearchService = {
  async search<T = any>(params: SearchParams): Promise<SearchResponse<T>> {
    const client = getClient()
    const { index, query, from = 0, size = 10, sort } = params

    // If caller passes a full body (including aggregations, highlight, etc.), use it.
    // Otherwise treat `query` as the `body.query`.
    const body: any = {}
    if (query && typeof query === 'object' && ('query' in query || 'bool' in query || 'multi_match' in query)) {
      body.query = query
    } else if (query && typeof query === 'object') {
      // assume it's the `query` object
      body.query = query
    } else {
      // pass through - for safety put as match_all
      body.query = { match_all: {} }
    }
    if (sort) body.sort = sort

    const resp = await client.search({
      index,
      body,
      from,
      size
    })

    const took = resp.took ?? 0
    const hitsRaw = (resp.hits && resp.hits.hits) || []
    const totalRaw = resp.hits && resp.hits.total
    const total =
      typeof totalRaw === 'object' && totalRaw !== null
        ? (totalRaw as any).value
        : ((totalRaw as number | undefined) ?? hitsRaw.length)

    const hits = hitsRaw.map((h: any) => ({
      id: h._id,
      _source: h._source,
      _score: h._score
    }))

    return { took, total, hits }
  },

  /**
   * Enhanced search with business-aware scoring for job portal
   * Optimized for Elasticsearch 8.15.2 with clear boost rationale
   */
  async searchJobs(
    params: SearchParams & {
      userExperienceLevel?: number
      userLocationId?: string
      prioritizeFreshJobs?: boolean
      userPrefersRemote?: boolean
      userPrefersFlexibleHours?: boolean
      userSkills?: string[]
      userDesiredSalaryMin?: number
      userDesiredSalaryMax?: number
      userDesiredBenefits?: string[]
      userPreferredCategories?: string[]
      userRemotePercentageMin?: number
    }
  ): Promise<SearchResponse<any>> {
    const client = getClient()
    const {
      index,
      query,
      from = 0,
      size = 10,
      sort,
      userExperienceLevel,
      userLocationId,
      prioritizeFreshJobs = true,
      userPrefersRemote = false,
      userPrefersFlexibleHours,
      userSkills = [],
      userDesiredSalaryMin,
      userDesiredSalaryMax,
      userDesiredBenefits,
      userPreferredCategories,
      userRemotePercentageMin
    } = params

    const body: any = {}

    // Handle different query types with optimized scoring for ES 8.15.2
    if (query && typeof query === 'object' && ('query' in query || 'bool' in query || 'multi_match' in query)) {
      // Use provided query directly if it's already a complete Elasticsearch query
      body.query = query
    } else if (query && typeof query === 'object') {
      // Build optimized bool query for job search
      const mustClauses = []
      const shouldClauses = []
      const filterClauses = []

      // Extract existing query components
      if (query && typeof query === 'object' && 'bool' in query && query.bool && typeof query.bool === 'object') {
        const boolQuery = query.bool as any
        if (boolQuery.must && Array.isArray(boolQuery.must)) {
          mustClauses.push(...boolQuery.must)
        }
        if (boolQuery.filter && Array.isArray(boolQuery.filter)) {
          filterClauses.push(...boolQuery.filter)
        }
        if (boolQuery.should && Array.isArray(boolQuery.should)) {
          shouldClauses.push(...boolQuery.should)
        }
      }

      // Apply business logic filters (use filter for mandatory conditions)
      if (userLocationId) {
        filterClauses.push({
          term: { location_id: userLocationId }
        })
      }

      if (userExperienceLevel !== undefined) {
        filterClauses.push({
          term: { experience_level: userExperienceLevel }
        })
      }

      // Salary range as filter (mandatory business requirement)
      if (userDesiredSalaryMin !== undefined || userDesiredSalaryMax !== undefined) {
        const salaryConditions = []
        if (userDesiredSalaryMin !== undefined) {
          salaryConditions.push({
            range: { salary_min: { gte: userDesiredSalaryMin * 0.8 } } // Accept 80% of desired minimum
          })
        }
        if (userDesiredSalaryMax !== undefined) {
          salaryConditions.push({
            range: { salary_max: { lte: userDesiredSalaryMax * 1.2 } } // Accept up to 120% of desired maximum
          })
        }
        if (salaryConditions.length > 0) {
          filterClauses.push({
            bool: {
              should: salaryConditions,
              minimum_should_match: Math.min(1, salaryConditions.length)
            }
          })
        }
      }

      // Skills matching as filter (mandatory for job requirements)
      if (userSkills && userSkills.length > 0) {
        filterClauses.push({
          nested: {
            path: 'skills',
            query: {
              bool: {
                must: [
                  { terms: { 'skills.name': userSkills } },
                  { range: { 'skills.proficiency': { gte: 3 } } } // Require proficiency level 3+
                ]
              }
            }
          }
        })
      }

      // Apply preference-based boosts (should clauses with clear rationale)
      // Fresh jobs boost: Recent jobs are more likely to be active positions
      if (prioritizeFreshJobs) {
        shouldClauses.push({
          range: {
            posted_at: {
              gte: 'now-7d/d',
              boost: 1.1 // 10% boost for jobs posted in last 7 days
            }
          }
        })
      }

      // Remote work preference boost: When user prefers remote, prioritize remote jobs
      if (userPrefersRemote) {
        shouldClauses.push({
          term: {
            is_remote_allowed: {
              value: true,
              boost: 1.15 // 15% boost for remote-allowed jobs when user prefers remote
            }
          }
        })
        // Additional boost for highly remote positions
        shouldClauses.push({
          range: {
            remote_percentage: {
              gte: 80,
              boost: 1.05 // Additional 5% boost for 80%+ remote jobs
            }
          }
        })
      }

      // Flexible hours boost: Work-life balance preference (higher boost if user prefers it)
      const flexibleBoost = userPrefersFlexibleHours ? 1.15 : 1.05
      shouldClauses.push({
        term: {
          flexible_hours: {
            value: true,
            boost: flexibleBoost
          }
        }
      })

      // Benefits alignment boost
      if (userDesiredBenefits && userDesiredBenefits.length > 0) {
        shouldClauses.push({
          terms: {
            job_benefits_type: userDesiredBenefits,
            boost: 1.1
          }
        })
      }

      // Category alignment boost
      if (userPreferredCategories && userPreferredCategories.length > 0) {
        shouldClauses.push({
          terms: {
            job_category: userPreferredCategories,
            boost: 1.1
          }
        })
      }

      // Remote percentage preference boost
      if (userRemotePercentageMin !== undefined) {
        shouldClauses.push({
          range: {
            remote_percentage: {
              gte: userRemotePercentageMin,
              boost: 1.05
            }
          }
        })
      }

      // Construct final bool query
      body.query = {
        bool: {
          must: mustClauses.length > 0 ? mustClauses : undefined,
          should: shouldClauses.length > 0 ? shouldClauses : undefined,
          filter: filterClauses.length > 0 ? filterClauses : undefined,
          minimum_should_match: shouldClauses.length > 0 ? 0 : undefined
        }
      }
    } else {
      body.query = { match_all: {} }
    }

    if (sort) body.sort = sort

    const resp = await client.search({
      index,
      body,
      from,
      size
    })

    const took = resp.took ?? 0
    const hitsRaw = (resp.hits && resp.hits.hits) || []
    const totalRaw = resp.hits && resp.hits.total
    const total =
      typeof totalRaw === 'object' && totalRaw !== null
        ? (totalRaw as any).value
        : ((totalRaw as number | undefined) ?? hitsRaw.length)

    const hits = hitsRaw.map((h: any) => ({
      id: h._id,
      _source: h._source,
      _score: h._score
    }))

    return { took, total, hits }
  },

  async suggest(params: SuggestParams): Promise<SuggestResponse> {
    const client = getClient()
    const { index, prefix, size = 10, context } = params

    // Use completion suggester on `title.suggest` by default; callers should ensure index mapping exists.
    const suggestBody: any = {
      suggest: {
        completion_suggest: {
          prefix,
          completion: {
            field: 'title.suggest',
            size
          }
        }
      },
      size: 0
    }
    // If context is provided, attach to completion suggester (ES expects contexts under `completion` query in mapping)
    if (context && Object.keys(context).length) {
      // Map provided context into suggestion contexts if appropriate
      // Note: This depends on index mapping having named contexts. We attach as `contexts` for the suggester.
      ;(suggestBody.suggest.completion_suggest.completion as any).contexts = context
    }

    const resp = await client.search({
      index,
      body: suggestBody
    })

    const suggestions: Suggestion[] = []
    const suggestResult = resp.suggest && resp.suggest.completion_suggest
    if (Array.isArray(suggestResult)) {
      for (const entry of suggestResult) {
        if (entry.options && Array.isArray(entry.options)) {
          for (const opt of entry.options) {
            suggestions.push({
              text: opt.text,
              payload: (opt as any)._source || (opt as any)._id,
              score: opt.score
            })
          }
        }
      }
    }

    return { suggestions }
  },

  async getById<T = any>(params: GetByIdParams): Promise<T | null> {
    const client = getClient()
    const { index, id } = params
    try {
      const resp = await client.get({ index, id })
      return (resp._source as T) ?? null
    } catch (e: any) {
      // Return null for not found
      if (e && e.meta && (e.meta.statusCode === 404 || e.statusCode === 404)) return null
      throw e
    }
  },
  // Expose raw client for advanced operations (used by CLI)
  getClient(): Client {
    return getClient()
  },
  async ping(): Promise<boolean> {
    const client = getClient()
    try {
      await client.ping()
      return true
    } catch {
      return false
    }
  },
  async checkConnection(): Promise<boolean> {
    return await this.ping()
  },
  async close(): Promise<void> {
    if (esClient) {
      try {
        await esClient.close()
      } catch (e) {
        // ignore
      } finally {
        esClient = null
      }
    }
  },
  getIndexName(name: string): string {
    // Allow optional prefix via env var ES_INDEX_PREFIX
    const prefix = envConfig.elasticsearch.esIndexPrefix || envConfig.elasticsearch.indexPrefix
    return `${prefix}${name}`
  },
  async deleteIndex(name: string): Promise<boolean> {
    const client = getClient()
    const indexName = this.getIndexName(name)
    try {
      const exists = await client.indices.exists({ index: indexName })
      if (!exists) return false
      await client.indices.delete({ index: indexName })
      return true
    } catch (e) {
      return false
    }
  },
  async initializeIndices(): Promise<void> {
    const client = getClient()
    // Define basic mappings per SEARCH_MATCHING_PLAN.md
    const jobsIndex = this.getIndexName('jobs')
    const companiesIndex = this.getIndexName('companies')
    const profilesIndex = this.getIndexName('profiles')
    const applicationsIndex = this.getIndexName('applications')
    const searchEventsIndex = this.getIndexName('search_events')

    // Jobs mapping - Optimized for job portal search
    const jobsMapping = {
      mappings: {
        properties: {
          id: { type: 'keyword' },
          job_id: { type: 'keyword' },
          title: {
            type: 'text',
            analyzer: 'vi_title_analyzer', // Use specialized analyzer for titles
            search_analyzer: 'vi_search_analyzer',
            fields: {
              keyword: { type: 'keyword', normalizer: 'lc_normalizer' },
              autocomplete: { type: 'text', analyzer: 'autocomplete_analyzer' },
              suggest: { type: 'completion' },
              raw: { type: 'keyword' },
              // Enhanced title search with main analyzer
              analyzed: { type: 'text', analyzer: 'vi_analyzer' }
            }
          },
          description: {
            type: 'text',
            analyzer: 'vi_analyzer',
            search_analyzer: 'vi_search_analyzer',
            fields: {
              keyword: { type: 'keyword', normalizer: 'lc_normalizer' }
            }
          },
          skills: {
            type: 'keyword'
          },
          tags: { type: 'keyword' },
          company_id: { type: 'keyword' },
          company_name: {
            type: 'text',
            analyzer: 'vi_analyzer',
            fields: {
              keyword: { type: 'keyword', normalizer: 'lc_normalizer' },
              suggest: { type: 'completion' }
            }
          },
          company_size: { type: 'integer' }, // For company reputation boost
          // Ownership information for security verification
          recruiter_id: { type: 'keyword' },
          recruiter_role: { type: 'keyword' },
          location_id: { type: 'keyword' },
          location_name: {
            type: 'text',
            analyzer: 'vi_analyzer',
            fields: {
              keyword: { type: 'keyword', normalizer: 'lc_normalizer' }
            }
          },
          // Location fields for hierarchical search (province + district)
          location_province: {
            type: 'text',
            analyzer: 'vi_analyzer',
            fields: {
              keyword: { type: 'keyword', normalizer: 'lc_normalizer' },
              autocomplete: { type: 'text', analyzer: 'autocomplete_analyzer' }
            }
          },
          location_district: {
            type: 'text',
            analyzer: 'vi_analyzer',
            fields: {
              keyword: { type: 'keyword', normalizer: 'lc_normalizer' },
              autocomplete: { type: 'text', analyzer: 'autocomplete_analyzer' }
            }
          },
          // Combined field for flexible search
          location_combined: {
            type: 'text',
            analyzer: 'vi_analyzer',
            fields: {
              keyword: { type: 'keyword', normalizer: 'lc_normalizer' }
            }
          },
          salary_range: { type: 'text' },
          salary_min: { type: 'integer' },
          salary_max: { type: 'integer' },
          job_type: { type: 'keyword' },
          experience_level: { type: 'integer' },
          // Job requirements - Critical for matching
          job_requirements_title: {
            type: 'text',
            analyzer: 'vi_analyzer'
          },
          job_requirements_years_experience: { type: 'integer' },
          job_requirements_is_required: { type: 'boolean' },
          // Work arrangements - Critical for work-life balance matching
          is_remote_allowed: { type: 'boolean' },
          flexible_hours: { type: 'boolean' },
          remote_percentage: { type: 'integer' },
          travel_requirement: { type: 'keyword' },
          // Job categories for better filtering
          job_category: { type: 'keyword' },
          job_category_type: { type: 'keyword' }, // industry, technical, work_type
          // Job benefits for enhanced matching
          job_benefits_type: { type: 'keyword' },
          job_benefits_value_amount: { type: 'integer' },
          status: { type: 'keyword' },
          posted_at: { type: 'date' },
          expires_at: { type: 'date' },
          metadata: { type: 'object' }
        }
      },
      settings: {
        ...vietnameseAnalyzers,
        analysis: {
          ...vietnameseAnalyzers.analysis,
          analyzer: {
            ...vietnameseAnalyzers.analysis.analyzer,
            autocomplete_analyzer: {
              type: 'custom',
              tokenizer: 'edge_ngram_tokenizer',
              filter: ['lowercase', 'asciifolding_filter']
            }
          },
          tokenizer: {
            edge_ngram_tokenizer: {
              type: 'edge_ngram',
              min_gram: 1,
              max_gram: 15, // Optimized for job titles
              token_chars: ['letter', 'digit', 'whitespace']
            }
          }
        }
      }
    }

    // Profiles mapping - Optimized for candidate search and matching
    const profilesMapping = {
      mappings: {
        properties: {
          id: { type: 'keyword' },
          profile_id: { type: 'keyword' },
          user_id: { type: 'keyword' },
          user_role: { type: 'keyword' }, // Ownership context
          full_name: {
            type: 'text',
            analyzer: 'vi_analyzer',
            fields: {
              keyword: { type: 'keyword', normalizer: 'lc_normalizer' }
            }
          },
          display_name: {
            type: 'text',
            analyzer: 'vi_analyzer',
            fields: {
              keyword: { type: 'keyword', normalizer: 'lc_normalizer' }
            }
          },
          headline: {
            type: 'text',
            analyzer: 'vi_analyzer',
            fields: {
              keyword: { type: 'keyword', normalizer: 'lc_normalizer' },
              suggest: { type: 'completion' }
            }
          },
          bio: {
            type: 'text',
            analyzer: 'vi_analyzer'
          },
          desired_job_title: {
            type: 'text',
            analyzer: 'vi_analyzer',
            fields: {
              keyword: { type: 'keyword', normalizer: 'lc_normalizer' },
              suggest: { type: 'completion' }
            }
          },
          desired_salary_min: { type: 'integer' },
          desired_salary_max: { type: 'integer' },
          years_of_experience: { type: 'integer' },
          skills: {
            type: 'nested', // Use nested for structured skill data
            properties: {
              name: { type: 'keyword' },
              proficiency: {
                type: 'integer'
              },
              level: { type: 'keyword' },
              category: { type: 'keyword' }, // Skills taxonomy
              category_type: { type: 'keyword' } // industry, technical, etc.
            }
          },
          skills_flat: {
            type: 'keyword'
          },
          location_id: { type: 'keyword' },
          location_text: {
            type: 'text',
            analyzer: 'vi_analyzer',
            fields: {
              keyword: { type: 'keyword', normalizer: 'lc_normalizer' }
            }
          },
          // Education and experience data
          education_degree: { type: 'keyword' },
          education_field_of_study: { type: 'text', analyzer: 'vi_analyzer' },
          certifications_skills_acquired: {
            type: 'text',
            analyzer: 'vi_analyzer'
          },
          current_employment: { type: 'boolean' }, // Is currently employed
          is_looking_for_job: { type: 'boolean' },
          last_active_at: { type: 'date' },
          resume_url: { type: 'keyword' },
          avatar_url: { type: 'keyword' }
        }
      },
      settings: {
        ...vietnameseAnalyzers,
        analysis: {
          ...vietnameseAnalyzers.analysis,
          analyzer: {
            ...vietnameseAnalyzers.analysis.analyzer,
            autocomplete_analyzer: {
              type: 'custom',
              tokenizer: 'edge_ngram_tokenizer',
              filter: ['lowercase', 'asciifolding_filter']
            }
          },
          tokenizer: {
            edge_ngram_tokenizer: {
              type: 'edge_ngram',
              min_gram: 1,
              max_gram: 15, // Optimized for profile headlines
              token_chars: ['letter', 'digit', 'whitespace']
            }
          }
        }
      }
    }

    // Companies mapping - Optimized for company search and filtering
    const companiesMapping = {
      mappings: {
        properties: {
          id: { type: 'keyword' },
          company_id: { type: 'keyword' },
          name: {
            type: 'text',
            analyzer: 'vi_analyzer',
            fields: {
              keyword: { type: 'keyword', normalizer: 'lc_normalizer' },
              autocomplete: { type: 'text', analyzer: 'autocomplete_analyzer' },
              suggest: { type: 'completion' }
            }
          },
          description: {
            type: 'text',
            analyzer: 'vi_analyzer'
          },
          recruiter_id: { type: 'keyword' },
          recruiter_role: { type: 'keyword' }, // Ownership information
          logo_url: { type: 'keyword' },
          size: { type: 'integer' },
          // Contact info - not indexed for search privacy
          industry: { type: 'keyword' },
          founded_year: { type: 'integer' },
          employee_count_min: { type: 'integer' },
          employee_count_max: { type: 'integer' },
          website_url: { type: 'keyword' },
          headquarters_location: {
            type: 'text',
            analyzer: 'vi_analyzer'
          },
          company_type: { type: 'keyword' },
          revenue_range: { type: 'keyword' },
          culture_description: {
            type: 'text',
            analyzer: 'vi_analyzer'
          }
        }
      },
      settings: {
        ...vietnameseAnalyzers,
        analysis: {
          ...vietnameseAnalyzers.analysis,
          analyzer: {
            ...vietnameseAnalyzers.analysis.analyzer,
            autocomplete_analyzer: {
              type: 'custom',
              tokenizer: 'standard',
              filter: ['lowercase', 'asciifolding_filter']
            }
          }
        }
      }
    }

    // Search Events mapping - Optimized for analytics and user behavior tracking
    const searchEventsMapping = {
      mappings: {
        properties: {
          id: { type: 'keyword' },
          user_id: { type: 'keyword' },
          event_type: { type: 'keyword' },
          job_id: { type: 'keyword' },
          profile_id: { type: 'keyword' },
          query: {
            type: 'text',
            analyzer: 'vi_analyzer',
            fields: {
              keyword: { type: 'keyword', normalizer: 'lc_normalizer' } // For exact matching in aggregations
            }
          },
          position: { type: 'integer' },
          filters: { type: 'object' },
          result_count: { type: 'integer' },
          timestamp_ms: { type: 'date' },
          created_at: { type: 'date' },
          session_id: { type: 'keyword' },
          user_agent: { type: 'text' },
          ip_address: { type: 'ip' },
          // Performance metrics
          search_duration_ms: { type: 'integer' },
          es_took_ms: { type: 'integer' },
          // Business context
          user_location: { type: 'keyword' },
          user_experience_level: { type: 'integer' },
          user_job_type_preference: { type: 'keyword' }
        }
      },
      settings: {
        ...vietnameseAnalyzers,
        analysis: {
          ...vietnameseAnalyzers.analysis,
          analyzer: {
            ...vietnameseAnalyzers.analysis.analyzer,
            autocomplete_analyzer: {
              type: 'custom',
              tokenizer: 'standard',
              filter: ['lowercase', 'asciifolding_filter']
            }
          }
        }
      }
    }

    // Applications mapping - Optimized for recruitment analytics and tracking
    const applicationsMapping = {
      mappings: {
        properties: {
          id: { type: 'keyword' },
          application_id: { type: 'keyword' },
          job_id: { type: 'keyword' },
          profile_id: { type: 'keyword' },
          user_id: { type: 'keyword' },
          status: { type: 'keyword' },
          applied_at: { type: 'date' },
          first_viewed_at: { type: 'date' },
          last_viewed_at: { type: 'date' },
          view_count: { type: 'integer' },
          // Candidate info - for analytics and filtering
          candidate_name: {
            type: 'text',
            analyzer: 'vi_analyzer'
          },
          candidate_email: { type: 'keyword' },
          candidate_headline: {
            type: 'text',
            analyzer: 'vi_analyzer'
          },
          candidate_location: { type: 'text', analyzer: 'vi_analyzer' },
          candidate_years_experience: { type: 'integer' },
          candidate_desired_salary_min: { type: 'integer' },
          candidate_desired_salary_max: { type: 'integer' },
          candidate_skills: {
            type: 'nested',
            properties: {
              name: { type: 'keyword' },
              proficiency: { type: 'integer' },
              category: { type: 'keyword' }
            }
          },
          candidate_skills_flat: {
            type: 'keyword'
          },
          candidate_education: { type: 'keyword' },
          candidate_current_employment: { type: 'boolean' },
          // Job info with requirements matching
          job_title: {
            type: 'text',
            analyzer: 'vi_analyzer'
          },
          job_company_name: { type: 'text', analyzer: 'vi_analyzer' },
          job_location: { type: 'text', analyzer: 'vi_analyzer' },
          job_type: { type: 'keyword' },
          job_salary_min: { type: 'integer' },
          job_salary_max: { type: 'integer' },
          job_experience_level: { type: 'integer' },
          job_is_remote_allowed: { type: 'boolean' },
          job_requirements_years_experience: { type: 'integer' },
          // Application stages - detailed pipeline data
          current_stage_name: { type: 'keyword' },
          current_stage_status: { type: 'keyword' },
          stages_count: { type: 'integer' },
          completed_stages_count: { type: 'integer' },
          average_rating: { type: 'float' },
          has_rating: { type: 'boolean' },
          // Timeline analytics
          days_since_applied: { type: 'integer' },
          days_since_first_viewed: { type: 'integer' },
          days_since_last_viewed: { type: 'integer' },
          total_view_time: { type: 'integer' }, // in seconds
          // Metadata and flags
          has_notes: { type: 'boolean' },
          is_shortlisted: { type: 'boolean' },
          is_withdrawn: { type: 'boolean' },
          last_updated: { type: 'date' }
        }
      },
      settings: {
        ...vietnameseAnalyzers,
        analysis: {
          ...vietnameseAnalyzers.analysis,
          analyzer: {
            ...vietnameseAnalyzers.analysis.analyzer,
            autocomplete_analyzer: {
              type: 'custom',
              tokenizer: 'standard',
              filter: ['lowercase', 'asciifolding_filter']
            }
          }
        }
      }
    }

    // Create or update indices
    const createIfNotExists = async (indexName: string, body: any) => {
      const exists = await client.indices.exists({ index: indexName })
      if (!exists) {
        await client.indices.create({ index: indexName, body })
      } else {
        // Optionally update mapping - skip for now to avoid breaking changes
      }
    }

    await createIfNotExists(jobsIndex, jobsMapping)
    await createIfNotExists(companiesIndex, companiesMapping)
    await createIfNotExists(profilesIndex, profilesMapping)
    await createIfNotExists(applicationsIndex, applicationsMapping)
    await createIfNotExists(searchEventsIndex, searchEventsMapping)
  }
}
