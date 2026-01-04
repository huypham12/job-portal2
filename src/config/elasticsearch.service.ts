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
 * Enhanced Elasticsearch client wrapper for Job Portal
 * Supports advanced search, matching, and analytics features
 */
import { Client } from '@elastic/elasticsearch'

const ES_NODE = envConfig.elasticsearch.nodeUrl || envConfig.elasticsearch.host || envConfig.elasticsearch.node

// Enhanced Vietnamese analyzer configuration optimized for job portal search
export const vietnameseAnalyzers = {
  analysis: {
    filter: {
      // Optimized stop words - removed overly common words that might filter out relevant terms
      vi_stop: {
        type: 'stop',
        stopwords: [
          'của',
          'và',
          'là',
          'có',
          'được',
          'trong',
          'người',
          'đã',
          'từ',
          'với',
          'cho',
          'như',
          'này',
          'đó',
          'theo',
          'về',
          'ở',
          'vào',
          'sẽ',
          'để',
          'ra',
          'đi',
          'đến',
          'tại',
          'nhưng',
          'vẫn',
          'cũng',
          'bị',
          'một',
          'hai',
          'ba',
          'bốn',
          'năm',
          'sáu',
          'bảy',
          'tám',
          'chín',
          'mười'
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
      },
      // Autocomplete analyzer for search suggestions
      autocomplete_analyzer: {
        type: 'custom',
        tokenizer: 'edge_ngram_tokenizer',
        filter: ['lowercase', 'asciifolding_filter']
      }
    },
    normalizer: {
      lc_normalizer: {
        type: 'custom',
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

// Enhanced index mappings với full schema utilization
export const enhancedMappings = {
  jobs: {
    mappings: {
      properties: {
        // Core job info
        id: { type: 'keyword' },
        job_id: { type: 'keyword' },
        title: {
          type: 'text',
          analyzer: 'vi_title_analyzer',
          search_analyzer: 'vi_search_analyzer',
          fields: {
            keyword: { type: 'keyword', normalizer: 'lc_normalizer' },
            autocomplete: { type: 'text', analyzer: 'autocomplete_analyzer' },
            suggest: { type: 'completion' },
            analyzed: { type: 'text', analyzer: 'vi_analyzer' }
          }
        },
        description: {
          type: 'text',
          analyzer: 'vi_analyzer',
          search_analyzer: 'vi_search_analyzer'
        },

        // Company relationship
        company_id: { type: 'keyword' },
        company_name: {
          type: 'text',
          analyzer: 'vi_analyzer',
          fields: {
            keyword: { type: 'keyword', normalizer: 'lc_normalizer' },
            suggest: { type: 'completion' }
          }
        },
        company_size: { type: 'integer' },
        company_industry: { type: 'keyword' },

        // Location hierarchy (từ locations table)
        location_id: { type: 'keyword' },
        location_name: {
          type: 'text',
          analyzer: 'vi_analyzer',
          fields: {
            keyword: { type: 'keyword', normalizer: 'lc_normalizer' }
          }
        },
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
        location_combined: {
          type: 'text',
          analyzer: 'vi_analyzer',
          fields: {
            keyword: { type: 'keyword', normalizer: 'lc_normalizer' }
          }
        },

        // Job requirements (từ job_requirements table)
        job_requirements: {
          type: 'nested',
          properties: {
            requirement_type: { type: 'keyword' },
            title: { type: 'text', analyzer: 'vi_analyzer' },
            description: { type: 'text', analyzer: 'vi_analyzer' },
            is_required: { type: 'boolean' },
            level: { type: 'keyword' },
            years_experience: { type: 'integer' }
          }
        },
        experience_level: { type: 'integer' },
        min_experience_years: { type: 'integer' },
        max_experience_years: { type: 'integer' },

        // Skills (từ job_skills + skills tables)
        skills: {
          type: 'nested',
          properties: {
            name: { type: 'keyword' },
            category: { type: 'keyword' },
            category_type: { type: 'keyword' },
            proficiency_required: { type: 'integer' }
          }
        },
        skills_flat: { type: 'keyword' },
        skills_technical: { type: 'keyword' },
        skills_soft: { type: 'keyword' },

        // Work arrangements (từ job_work_arrangements table)
        is_remote_allowed: { type: 'boolean' },
        remote_percentage: { type: 'integer' },
        flexible_hours: { type: 'boolean' },
        travel_requirement: { type: 'keyword' },
        overtime_expected: { type: 'boolean' },
        shift_type: { type: 'keyword' },

        // Benefits (từ job_benefits table)
        job_benefits: {
          type: 'nested',
          properties: {
            benefit_type: { type: 'keyword' },
            title: { type: 'text', analyzer: 'vi_analyzer' },
            description: { type: 'text', analyzer: 'vi_analyzer' },
            value_amount: { type: 'integer' },
            value_currency: { type: 'keyword' }
          }
        },
        job_benefits_type: { type: 'keyword' },

        // Categories (từ job_categories + categories tables)
        job_categories: {
          type: 'nested',
          properties: {
            category_id: { type: 'keyword' },
            name: { type: 'keyword' },
            type: { type: 'keyword' }
          }
        },
        job_category: { type: 'keyword' },
        job_category_type: { type: 'keyword' },

        // Salary & job details
        salary_range: { type: 'text' },
        salary_min: { type: 'integer' },
        salary_max: { type: 'integer' },
        job_type: { type: 'keyword' },

        // Status & dates
        status: { type: 'keyword' },
        posted_at: { type: 'date' },
        expires_at: { type: 'date' },
        updated_at: { type: 'date' },

        // Recruiter info
        recruiter_id: { type: 'keyword' },
        recruiter_role: { type: 'keyword' },

        // Metadata
        metadata: { type: 'object' },
        version: { type: 'integer' }
      }
    }
  },

  profiles: {
    mappings: {
      properties: {
        // Core profile info
        id: { type: 'keyword' },
        profile_id: { type: 'keyword' },
        user_id: { type: 'keyword' },
        user_role: { type: 'keyword' },

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
            suggest: { type: 'completion' },
            analyzed: { type: 'text', analyzer: 'vi_analyzer' }
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

        // Skills (từ profile_skills + skills tables)
        skills: {
          type: 'nested',
          properties: {
            name: { type: 'keyword' },
            proficiency: { type: 'integer' },
            level: { type: 'keyword' },
            category: { type: 'keyword' },
            category_type: { type: 'keyword' }
          }
        },
        skills_flat: { type: 'keyword' },
        skills_technical: { type: 'keyword' },
        skills_soft: { type: 'keyword' },

        // Experience & Education
        years_of_experience: { type: 'integer' },
        current_employment: { type: 'boolean' },
        is_looking_for_job: { type: 'boolean' },

        experiences: {
          type: 'nested',
          properties: {
            company_name: { type: 'text', analyzer: 'vi_analyzer' },
            position: { type: 'text', analyzer: 'vi_analyzer' },
            start_date: { type: 'date' },
            end_date: { type: 'date' },
            is_current: { type: 'boolean' },
            description: { type: 'text', analyzer: 'vi_analyzer' }
          }
        },
        educations: {
          type: 'nested',
          properties: {
            school_name: { type: 'text', analyzer: 'vi_analyzer' },
            degree: { type: 'keyword' },
            field_of_study: { type: 'text', analyzer: 'vi_analyzer' },
            start_date: { type: 'date' },
            end_date: { type: 'date' }
          }
        },
        certifications: {
          type: 'nested',
          properties: {
            name: { type: 'text', analyzer: 'vi_analyzer' },
            issuing_org: { type: 'text', analyzer: 'vi_analyzer' },
            issue_date: { type: 'date' },
            expiry_date: { type: 'date' }
          }
        },

        // Location & Preferences
        location_id: { type: 'keyword' },
        location_text: {
          type: 'text',
          analyzer: 'vi_analyzer',
          fields: {
            keyword: { type: 'keyword', normalizer: 'lc_normalizer' }
          }
        },
        location_province: { type: 'keyword' },
        location_district: { type: 'keyword' },

        // Preferences
        desired_salary_min: { type: 'integer' },
        desired_salary_max: { type: 'integer' },
        desired_job_type: { type: 'keyword' },
        desired_benefits: { type: 'keyword' },
        preferred_categories: { type: 'keyword' },
        prefers_remote: { type: 'boolean' },
        prefers_flexible_hours: { type: 'boolean' },

        // Activity tracking
        last_active_at: { type: 'date' },
        updated_at: { type: 'date' },
        created_at: { type: 'date' }
      }
    }
  },

  companies: {
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
        description: { type: 'text', analyzer: 'vi_analyzer' },
        industry: { type: 'keyword' },
        size: { type: 'integer' },
        founded_year: { type: 'integer' },
        employee_count_min: { type: 'integer' },
        employee_count_max: { type: 'integer' },
        headquarters_location: { type: 'text', analyzer: 'vi_analyzer' },
        company_type: { type: 'keyword' },
        revenue_range: { type: 'keyword' },
        culture_description: { type: 'text', analyzer: 'vi_analyzer' },
        recruiter_id: { type: 'keyword' },
        is_verified: { type: 'boolean' },
        status: { type: 'keyword' }
      }
    }
  },

  locations: {
    mappings: {
      properties: {
        id: { type: 'keyword' },
        name: {
          type: 'text',
          analyzer: 'vi_analyzer',
          fields: {
            keyword: { type: 'keyword', normalizer: 'lc_normalizer' },
            autocomplete: { type: 'text', analyzer: 'autocomplete_analyzer' }
          }
        },
        parent_id: { type: 'keyword' },
        type: { type: 'keyword' },
        latitude: { type: 'float' },
        longitude: { type: 'float' }
      }
    }
  },

  skills: {
    mappings: {
      properties: {
        id: { type: 'keyword' },
        name: {
          type: 'text',
          analyzer: 'vi_analyzer',
          fields: {
            keyword: { type: 'keyword', normalizer: 'lc_normalizer' },
            autocomplete: { type: 'text', analyzer: 'autocomplete_analyzer' },
            suggest: { type: 'completion' }
          }
        },
        category_id: { type: 'keyword' },
        category_name: { type: 'keyword' },
        category_type: { type: 'keyword' }
      }
    }
  },

  applications: {
    mappings: {
      properties: {
        id: { type: 'keyword' },
        application_id: { type: 'keyword' },
        job_id: { type: 'keyword' },
        profile_id: { type: 'keyword' },
        user_id: { type: 'keyword' },
        recruiter_id: { type: 'keyword' },
        candidate_id: { type: 'keyword' },
        status: { type: 'keyword' },
        applied_at: { type: 'date' },
        first_viewed_at: { type: 'date' },
        last_viewed_at: { type: 'date' },
        view_count: { type: 'integer' },
        job_title: { type: 'text', analyzer: 'vi_analyzer' },
        job_company_name: { type: 'text', analyzer: 'vi_analyzer' },
        job_location: { type: 'text', analyzer: 'vi_analyzer' },
        job_type: { type: 'keyword' },
        job_salary_min: { type: 'integer' },
        job_salary_max: { type: 'integer' },
        job_experience_level: { type: 'integer' },
        job_is_remote_allowed: { type: 'boolean' },
        job_requirements_years_experience: { type: 'integer' },
        candidate_name: { type: 'text', analyzer: 'vi_analyzer' },
        candidate_email: { type: 'keyword' },
        candidate_headline: { type: 'text', analyzer: 'vi_analyzer' },
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
        candidate_skills_flat: { type: 'keyword' },
        candidate_education: { type: 'keyword' },
        candidate_current_employment: { type: 'boolean' },
        current_stage_name: { type: 'keyword' },
        current_stage_status: { type: 'keyword' },
        stages_count: { type: 'integer' },
        completed_stages_count: { type: 'integer' },
        average_rating: { type: 'float' },
        has_rating: { type: 'boolean' },
        days_since_applied: { type: 'integer' },
        days_since_first_viewed: { type: 'integer' },
        days_since_last_viewed: { type: 'integer' },
        total_view_time: { type: 'integer' },
        has_notes: { type: 'boolean' },
        is_shortlisted: { type: 'boolean' },
        is_withdrawn: { type: 'boolean' },
        last_updated: { type: 'date' }
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
    } else if (typeof query === 'string' && query.trim()) {
      // Convert string query to multi_match across high-priority job fields
      body.query = {
        multi_match: {
          query: query.trim(),
          fields: [
            'title^4', // Highest priority - job title
            'description^2.5', // High priority - job description
            'company_name^2', // High priority - company name
            'skills_flat^2', // High priority - skills
            'job_category^1', // Medium priority - categories
            'location_name^1', // Medium priority - location
            'location_combined^0.8', // Lower priority - combined location
            'job_requirements_title^1.2' // Medium priority - requirements
          ],
          type: 'best_fields',
          operator: 'or',
          minimum_should_match: '30%',
          fuzziness: 'AUTO',
          prefix_length: 1
        }
      }
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
  /**
   * Standardized search with template support
   * Central entrypoint for all search operations with logging and debugging
   */
  async searchWithTemplate(
    indexName: string,
    queryBody: any,
    options?: {
      explain?: boolean
      profile?: boolean
      timeout?: string
    }
  ): Promise<SearchResponse<any>> {
    const client = getClient()
    const index = this.getEffectiveIndexName(indexName)

    // Merge options into query body
    const searchBody = { ...queryBody }
    if (options?.explain) searchBody.explain = true
    if (options?.profile) searchBody.profile = true
    if (options?.timeout) searchBody.timeout = options.timeout

    // Add metrics and logging
    const startTime = Date.now()

    try {
      const response = await client.search({
        index,
        body: searchBody
      })

      const duration = Date.now() - startTime

      // Log search performance (only in development or for slow queries)
      if (duration > 1000 || process.env.NODE_ENV === 'development') {
        console.log(`🔍 [ES] Search ${indexName} (${index}): ${duration}ms, total=${response.hits?.total || 0}`)
      }

      return this.normalizeSearchResponse(response)
    } catch (error) {
      console.error(`❌ [ES] Search failed for ${indexName} (${index}):`, error)
      throw error
    }
  },

  /**
   * Normalize Elasticsearch response to consistent format
   */
  normalizeSearchResponse(response: any): SearchResponse<any> {
    const took = response.took ?? 0
    const hitsRaw = (response.hits && response.hits.hits) || []
    const totalRaw = response.hits && response.hits.total

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
   * Explain query scoring for debugging
   */
  async explainQuery(indexName: string, documentId: string, query: any): Promise<any> {
    const client = getClient()
    const index = this.getEffectiveIndexName(indexName)

    try {
      const response = await client.explain({
        index,
        id: documentId,
        body: { query }
      })
      return response
    } catch (error) {
      console.error(`❌ [ES] Explain failed for ${indexName} (${index})/${documentId}:`, error)
      throw error
    }
  },

  /**
   * Profile query performance
   */
  async profileQuery(indexName: string, query: any): Promise<any> {
    const client = getClient()
    const index = this.getEffectiveIndexName(indexName)

    try {
      const response = await client.search({
        index,
        body: {
          ...query,
          profile: true
        }
      })
      return response.profile
    } catch (error) {
      console.error(`❌ [ES] Profile failed for ${indexName}:`, error)
      throw error
    }
  },

  /**
   * Get index name with alias support for zero-downtime reindexing
   * Supports override for canary deployments
   */
  getEffectiveIndexName(baseName: string): string {
    // Support temporary index override for testing (e.g., jobs_v2)
    const override = process.env[`ES_INDEX_OVERRIDE_${baseName.toUpperCase()}`]
    if (override) {
      return override
    }

    // Default: use base index name (will be aliased in Phase 2)
    return this.getIndexName(baseName)
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
  /**
   * Enhanced job search với location hierarchy và advanced filters
   */
  async searchJobsEnhanced(params: {
    q?: string
    location?: {
      provinceId?: string
      districtId?: string
      locationName?: string
    }
    skills?: string[]
    jobType?: string[]
    experienceLevel?: { min?: number; max?: number }
    salaryRange?: { min?: number; max?: number }
    workArrangement?: {
      isRemote?: boolean
      remotePercentageMin?: number
      flexibleHours?: boolean
    }
    benefits?: string[]
    categories?: string[]
    companySize?: { min?: number; max?: number }
    postedWithinDays?: number
    sort?: string
    page?: number
    size?: number
  }) {
    const {
      q,
      location,
      skills,
      jobType,
      experienceLevel,
      salaryRange,
      workArrangement,
      benefits,
      categories,
      companySize,
      postedWithinDays,
      sort,
      page = 1,
      size = 20
    } = params

    const mustClauses: any[] = []
    const filterClauses: any[] = []
    const shouldClauses: any[] = []

    // Full-text search với Vietnamese analyzer
    if (q?.trim()) {
      mustClauses.push({
        multi_match: {
          query: q.trim(),
          fields: [
            'title^3',
            'title.analyzed^2',
            'description^1.5',
            'company_name^1',
            'skills_flat^2',
            'job_requirements_title^1',
            'location_combined^1'
          ],
          type: 'best_fields',
          operator: 'or',
          minimum_should_match: '30%',
          fuzziness: 'AUTO',
          prefix_length: 1
        }
      })
    }

    // Location hierarchy filtering
    if (location) {
      const locationFilters = []

      if (location.provinceId) {
        locationFilters.push({
          term: { location_province: location.provinceId }
        })
      }

      if (location.districtId) {
        locationFilters.push({
          term: { location_district: location.districtId }
        })
      }

      if (location.locationName) {
        locationFilters.push({
          multi_match: {
            query: location.locationName,
            fields: ['location_name', 'location_province', 'location_district'],
            fuzziness: 'AUTO'
          }
        })
      }

      if (locationFilters.length > 0) {
        filterClauses.push({
          bool: { should: locationFilters, minimum_should_match: 1 }
        })
      }
    }

    // Skills filtering với proficiency
    if (skills?.length) {
      filterClauses.push({
        nested: {
          path: 'skills',
          query: {
            bool: {
              must: [{ terms: { 'skills.name': skills } }, { range: { 'skills.proficiency_required': { gte: 2 } } }]
            }
          }
        }
      })
    }

    // Job type filtering
    if (jobType?.length) {
      filterClauses.push({ terms: { job_type: jobType } })
    }

    // Experience level filtering
    if (experienceLevel) {
      const expFilters = []
      if (experienceLevel.min !== undefined) {
        expFilters.push({ range: { experience_level: { gte: experienceLevel.min } } })
      }
      if (experienceLevel.max !== undefined) {
        expFilters.push({ range: { experience_level: { lte: experienceLevel.max } } })
      }
      if (expFilters.length > 0) {
        filterClauses.push({ bool: { must: expFilters } })
      }
    }

    // Salary range filtering
    if (salaryRange) {
      const salaryFilters = []
      if (salaryRange.min !== undefined) {
        salaryFilters.push({ range: { salary_min: { gte: salaryRange.min } } })
      }
      if (salaryRange.max !== undefined) {
        salaryFilters.push({ range: { salary_max: { lte: salaryRange.max } } })
      }
      if (salaryFilters.length > 0) {
        filterClauses.push({
          bool: { should: salaryFilters, minimum_should_match: 1 }
        })
      }
    }

    // Work arrangement filtering
    if (workArrangement) {
      if (workArrangement.isRemote !== undefined) {
        filterClauses.push({ term: { is_remote_allowed: workArrangement.isRemote } })
      }
      if (workArrangement.remotePercentageMin !== undefined) {
        filterClauses.push({
          range: { remote_percentage: { gte: workArrangement.remotePercentageMin } }
        })
      }
      if (workArrangement.flexibleHours !== undefined) {
        filterClauses.push({ term: { flexible_hours: workArrangement.flexibleHours } })
      }
    }

    // Benefits filtering
    if (benefits?.length) {
      filterClauses.push({ terms: { job_benefits_type: benefits } })
    }

    // Categories filtering
    if (categories?.length) {
      filterClauses.push({ terms: { job_category: categories } })
    }

    // Company size filtering
    if (companySize) {
      const sizeFilters = []
      if (companySize.min !== undefined) {
        sizeFilters.push({ range: { company_size: { gte: companySize.min } } })
      }
      if (companySize.max !== undefined) {
        sizeFilters.push({ range: { company_size: { lte: companySize.max } } })
      }
      if (sizeFilters.length > 0) {
        filterClauses.push({ bool: { must: sizeFilters } })
      }
    }

    // Posted within days
    if (postedWithinDays) {
      filterClauses.push({
        range: {
          posted_at: { gte: `now-${postedWithinDays}d/d` }
        }
      })
    }

    // Active jobs only
    filterClauses.push({ term: { status: 'approved' } })
    filterClauses.push({ range: { expires_at: { gt: 'now' } } })

    // Build final query
    const queryBody = {
      bool: {
        must: mustClauses,
        filter: filterClauses,
        should: shouldClauses,
        minimum_should_match: 0
      }
    }

    // Add sorting
    let sortConfig = []
    switch (sort) {
      case 'newest':
        sortConfig = [{ posted_at: 'desc' }]
        break
      case 'salary_high':
        sortConfig = [{ salary_max: 'desc' }]
        break
      case 'salary_low':
        sortConfig = [{ salary_min: 'asc' }]
        break
      case 'experience_high':
        sortConfig = [{ experience_level: 'desc' }]
        break
      case 'company_size':
        sortConfig = [{ company_size: 'desc' }]
        break
      case 'relevance':
      default:
        sortConfig = [{ _score: 'desc' }, { posted_at: 'desc' }]
    }

    const response = await this.search({
      index: this.getIndexName('jobs'),
      query: queryBody,
      from: (page - 1) * size,
      size,
      sort: sortConfig
    })

    return this.normalizeSearchResponse(response)
  },

  /**
   * Enhanced candidate-job matching với job requirements extraction
   */
  async matchCandidatesForJobEnhanced(jobId: string, size = 50) {
    // First, get job details with all requirements.
    // Note: documents may be indexed with a prefixed id (`job_<id>`). Try direct id first,
    // then fall back to searching for `job_id` field to be robust across index formats.
    let job = await this.getById({
      index: this.getIndexName('jobs'),
      id: jobId
    })

    if (!job) {
      // Fallback: search by job_id field
      try {
        const fallbackResp = await this.search({
          index: this.getIndexName('jobs'),
          query: {
            bool: {
              must: [{ term: { job_id: jobId } }]
            }
          },
          size: 1
        })
        const hit = (fallbackResp.hits && fallbackResp.hits[0]) || null
        if (hit) {
          job = hit._source
          console.log(`🔁 [ES] Fallback found job doc for jobId=${jobId} via job_id field`)
        }
      } catch (e) {
        console.warn(`🔁 [ES] Fallback search for job_id ${jobId} failed:`, e)
      }
    }

    if (!job) return { candidates: [] }

    const mustClauses = []
    const shouldClauses = []

    // Required skills matching với proficiency
    if (job.skills?.length > 0) {
      mustClauses.push({
        nested: {
          path: 'skills',
          query: {
            bool: {
              must: job.skills.map((skill: any) => ({
                bool: {
                  should: [
                    { term: { 'skills.name': skill.name } },
                    {
                      fuzzy: {
                        'skills.name': {
                          value: skill.name,
                          fuzziness: 'AUTO'
                        }
                      }
                    }
                  ],
                  minimum_should_match: 1
                }
              }))
            }
          }
        }
      })

      // Boost candidates with high proficiency in required skills
      shouldClauses.push({
        nested: {
          path: 'skills',
          query: {
            bool: {
              must: job.skills.map((skill: any) => ({
                bool: {
                  must: [
                    { term: { 'skills.name': skill.name } },
                    { range: { 'skills.proficiency': { gte: skill.proficiency_required || 3 } } }
                  ]
                }
              }))
            }
          }
        }
      })
    }

    // Experience requirements
    if (job.experience_level || job.min_experience_years) {
      const minYears = job.min_experience_years || job.experience_level * 1.5
      mustClauses.push({
        range: { years_of_experience: { gte: minYears } }
      })

      // Boost candidates with exact experience match
      shouldClauses.push({
        range: {
          years_of_experience: {
            gte: minYears,
            lte: minYears + 2 // Within 2 years of requirement
          }
        }
      })
    }

    // Location matching
    if (job.location_id) {
      shouldClauses.push({
        term: { location_id: job.location_id }
      })

      // Also match province/district level
      if (job.location_province) {
        shouldClauses.push({
          term: { location_province: job.location_province }
        })
      }
    }

    // Work arrangement preferences
    if (job.is_remote_allowed) {
      shouldClauses.push({
        bool: {
          should: [
            { term: { prefers_remote: true } },
            {
              match: {
                location_text: {
                  query: 'remote',
                  boost: 0.5
                }
              }
            }
          ]
        }
      })
    }

    if (job.flexible_hours) {
      shouldClauses.push({
        term: { prefers_flexible_hours: true }
      })
    }

    // Benefits alignment
    if (job.job_benefits_type?.length > 0) {
      shouldClauses.push({
        terms: { desired_benefits: job.job_benefits_type }
      })
    }

    // Categories alignment
    if (job.job_category?.length > 0) {
      shouldClauses.push({
        terms: { preferred_categories: job.job_category }
      })
    }

    // Salary expectations (overlap logic)
    if (job.salary_min || job.salary_max) {
      const salaryConditions = []
      if (job.salary_min) {
        salaryConditions.push({
          range: { desired_salary_min: { lte: job.salary_min * 1.2 } }
        })
      }
      if (job.salary_max) {
        salaryConditions.push({
          range: { desired_salary_max: { gte: job.salary_max * 0.8 } }
        })
      }
      if (salaryConditions.length > 0) {
        shouldClauses.push({
          bool: {
            should: salaryConditions,
            minimum_should_match: 1
          }
        })
      }
    }

    // Only active candidates
    mustClauses.push({ term: { is_looking_for_job: true } })

    // Boost recently active profiles
    shouldClauses.push({
      range: { last_active_at: { gte: 'now-30d' } }
    })

    const queryBody = {
      bool: {
        must: mustClauses,
        should: shouldClauses,
        minimum_should_match: 0
      }
    }

    const response = await this.search({
      index: this.getIndexName('profiles'),
      query: queryBody,
      from: 0,
      size,
      sort: [{ _score: 'desc' }]
    })

    const normalized = this.normalizeSearchResponse(response)

    // If strict query returned no hits, perform a relaxed fallback search to
    // avoid showing empty results for recruiters. The relaxed query converts
    // strictly-required skill/experience clauses into SHOULD clauses so we
    // can surface partially-matching candidates.
    if (normalized && (normalized.total || 0) === 0) {
      try {
        // Build a relaxed version of the query: remove hard must skill/experience
        // requirements while keeping basic filters like is_looking_for_job.
        const relaxedMust: any[] = []
        const relaxedShould: any[] = []

        // Keep the 'is_looking_for_job' filter if present
        // (we ensure only active/available candidates are returned)
        relaxedMust.push({ term: { is_looking_for_job: true } })

        // Move existing shouldClauses into relaxedShould
        if (shouldClauses.length > 0) {
          relaxedShould.push(...shouldClauses)
        }

        // If job had skills, add a looser multi_match on skills fields
        if (job.skills?.length > 0) {
          const skillNames = job.skills.map((s: any) => s.name || s)
          relaxedShould.push({
            multi_match: {
              query: skillNames.join(' '),
              fields: ['skills.name^2', 'skills_flat^1.5', 'bio', 'headline'],
              fuzziness: 'AUTO'
            }
          })
        }

        // Loosen experience constraint to a SHOULD clause (prefer candidates
        // with similar years but don't require it)
        if (job.experience_level || job.min_experience_years) {
          const minYears = job.min_experience_years || job.experience_level * 1.5
          relaxedShould.push({
            range: {
              years_of_experience: {
                gte: Math.max(0, minYears - 2),
                lte: minYears + 3
              }
            }
          })
        }

        const relaxedQueryBody = {
          bool: {
            must: relaxedMust,
            should: relaxedShould,
            minimum_should_match: relaxedShould.length > 0 ? 1 : 0
          }
        }

        const fallbackResp = await this.search({
          index: this.getIndexName('profiles'),
          query: relaxedQueryBody,
          from: 0,
          size,
          sort: [{ _score: 'desc' }]
        })

        const fallbackNorm = this.normalizeSearchResponse(fallbackResp)
        console.log(`🔁 [ES] Relaxed candidate matching returned ${fallbackNorm.total} hits for jobId=${jobId}`)
        return fallbackNorm
      } catch (e) {
        console.warn(`🔁 [ES] Relaxed fallback search for job ${jobId} failed:`, e)
        return normalized
      }
    }

    return normalized
  },

  /**
   * Location hierarchy search for UI autocomplete
   */
  async searchLocations(query: string, type?: 'province' | 'district', parentId?: string) {
    const mustClauses = []

    if (query) {
      mustClauses.push({
        multi_match: {
          query,
          fields: ['name', 'name.autocomplete'],
          fuzziness: 'AUTO'
        }
      })
    }

    if (type) {
      mustClauses.push({ term: { type } })
    }

    if (parentId) {
      mustClauses.push({ term: { parent_id: parentId } })
    }

    const response = await this.search({
      index: this.getIndexName('locations'),
      query: {
        bool: { must: mustClauses }
      },
      size: 20
    })

    return this.normalizeSearchResponse(response)
  },

  /**
   * Skills autocomplete với categories
   */
  async searchSkills(query: string, category?: string) {
    const mustClauses = []

    if (query) {
      mustClauses.push({
        multi_match: {
          query,
          fields: ['name', 'name.autocomplete'],
          type: 'bool_prefix'
        }
      })
    }

    if (category) {
      mustClauses.push({
        term: { category_id: category }
      })
    }

    const response = await this.search({
      index: this.getIndexName('skills'),
      query: {
        bool: { must: mustClauses }
      },
      size: 10
    })

    return this.normalizeSearchResponse(response)
  },

  async initializeIndices(): Promise<void> {
    const client = getClient()

    // Enhanced index creation với enriched mappings
    const indices = [
      { name: 'jobs', mapping: enhancedMappings.jobs },
      { name: 'profiles', mapping: enhancedMappings.profiles },
      { name: 'companies', mapping: enhancedMappings.companies },
      { name: 'locations', mapping: enhancedMappings.locations },
      { name: 'skills', mapping: enhancedMappings.skills },
      { name: 'applications', mapping: enhancedMappings.applications }
    ]

    for (const { name, mapping } of indices) {
      const indexName = this.getIndexName(name)

      try {
        const exists = await client.indices.exists({ index: indexName })

        if (!exists) {
          // Add settings to mapping
          const fullMapping = {
            ...mapping,
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
                tokenizer: vietnameseAnalyzers.analysis.tokenizer
              }
            }
          }

          await client.indices.create({
            index: indexName,
            body: fullMapping as any
          })
          console.log(`✅ Created index: ${indexName}`)
        } else {
          console.log(`ℹ️ Index ${indexName} already exists`)
        }
      } catch (error) {
        console.error(`❌ Failed to create index ${indexName}:`, error)
      }
    }
  }
}
