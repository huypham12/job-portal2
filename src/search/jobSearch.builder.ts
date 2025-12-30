/**
 * Job Search Query Builder
 *
 * Central, canonical query builder for job search operations.
 * Replaces scattered query logic across services with standardized, testable approach.
 *
 * Features:
 * - Conservative boosts prioritizing skills over titles
 * - Clear separation of MUST/FILTER/SHOULD clauses
 * - Support for function_score personalization
 * - Vietnamese text handling
 */

import { QueryContext, ESQuery, JobDocument } from './search.types'
import { buildJobSearchFunctionScore, BOOSTS } from './scoring/score.templates'

/**
 * Get sort configuration based on sort option
 */
function getSortConfig(sort?: string): any[] {
  switch (sort) {
    case 'newest':
      return [{ posted_at: 'desc' }]
    case 'oldest':
      return [{ posted_at: 'asc' }]
    case 'salary_high':
      return [{ salary_max: 'desc' }]
    case 'salary_low':
      return [{ salary_min: 'asc' }]
    case 'experience_high':
      return [{ experience_level: 'desc' }]
    case 'experience_low':
      return [{ experience_level: 'asc' }]
    case 'relevance':
    default:
      return [{ _score: 'desc' }, { posted_at: 'desc' }]
  }
}

/**
 * Build canonical Elasticsearch query for job search
 * Implements conservative boosting: skills > location > experience > freshness
 */
export function buildJobSearchQuery(context: QueryContext): ESQuery {
  const {
    q,
    userSkills,
    userLocationId,
    userExperienceLevel,
    userPrefersRemote,
    userPrefersFlexibleHours,
    userDesiredSalaryMin,
    userDesiredSalaryMax,
    userDesiredBenefits,
    userPreferredCategories,
    userRemotePercentageMin,
    filters,
    pagination,
    options
  } = context

  const mustClauses: any[] = []
  const filterClauses: any[] = []
  let queryBody: any = {}

  // === MUST CLAUSES (required matches) ===

  // Full-text search with conservative field boosts
  if (q && q.trim()) {
    // Detect Vietnamese characters for query optimization
    const vietnameseRegex = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/u
    const hasVietnameseChars = vietnameseRegex.test(q.trim())

    // Conservative field boosts - skills get priority over titles
    const searchFields = [
      `title^${BOOSTS.title}`,
      `description^${BOOSTS.description}`,
      `skills^${BOOSTS.skillsExact}`,
      `job_category^${BOOSTS.categoryMatch}`,
      `company_name^${BOOSTS.company_name}`,
      `location_name^${BOOSTS.location_name}`,
      `job_requirements_title^1.2`,
      `job_benefits_type^1.0`
    ]

    // Vietnamese-optimized parameters
    const operator = hasVietnameseChars ? 'or' : 'and'
    const minShouldMatch = hasVietnameseChars ? '30%' : '60%'

    mustClauses.push({
      multi_match: {
        query: q.trim(),
        fields: searchFields,
        type: 'best_fields',
        operator,
        minimum_should_match: minShouldMatch,
        // Keep exact matching for Vietnamese (analyzer handles normalization),
        // but allow fuzzy matching for non-Vietnamese queries so users get
        // tolerant / typo-friendly results in Latin queries.
        fuzziness: hasVietnameseChars ? 0 : 'AUTO',
        prefix_length: hasVietnameseChars ? 0 : 1
      }
    })
  }

  // === FILTER CLAUSES (mandatory conditions) ===

  // Status filter - only approved jobs
  filterClauses.push({
    term: { status: filters?.status || 'approved' }
  })

  // Active jobs only (not expired)
  filterClauses.push({
    range: { expires_at: { gt: 'now' } }
  })

  // Company filter
  if (filters?.company_id) {
    filterClauses.push({ term: { company_id: filters.company_id } })
  }

  // Location filter
  if (filters?.location_id) {
    filterClauses.push({ term: { location_id: filters.location_id } })
  }

  // Job type filter
  if (filters?.job_type) {
    filterClauses.push({ term: { job_type: filters.job_type } })
  }

  // Experience level filter
  if (filters?.experience_level !== undefined) {
    filterClauses.push({ term: { experience_level: filters.experience_level } })
  }

  // Skills filter (if specified in filters) - improved with nested matching
  if (filters?.skill_names && filters.skill_names.length > 0) {
    filterClauses.push({
      bool: {
        should: [
          // Exact match trên skills array (keyword)
          { terms: { skills: filters.skill_names } },
          // Nested match cho structured skills
          {
            nested: {
              path: 'skills',
              query: {
                bool: {
                  must: [
                    { terms: { 'skills.name': filters.skill_names } },
                    { range: { 'skills.proficiency': { gte: 3 } } }
                  ]
                }
              }
            }
          }
        ],
        minimum_should_match: 1
      }
    })
  }

  // Work arrangement filters
  if (filters?.is_remote !== undefined) {
    filterClauses.push({ term: { is_remote_allowed: filters.is_remote } })
  }

  if (filters?.flexible_hours !== undefined) {
    filterClauses.push({ term: { flexible_hours: filters.flexible_hours } })
  }

  if (filters?.remote_percentage_min !== undefined) {
    filterClauses.push({
      range: { remote_percentage: { gte: filters.remote_percentage_min } }
    })
  }

  // Category filters
  if (filters?.job_category) {
    filterClauses.push({ term: { job_category: filters.job_category } })
  }

  if (filters?.job_category_type) {
    filterClauses.push({ term: { job_category_type: filters.job_category_type } })
  }

  // Benefits filter
  if (filters?.benefits_type && filters.benefits_type.length > 0) {
    filterClauses.push({
      terms: { job_benefits_type: filters.benefits_type }
    })
  }

  // Job categories filter
  if (filters?.job_category && filters.job_category.length > 0) {
    filterClauses.push({
      terms: { job_category: filters.job_category }
    })
  }

  // Flexible hours filter
  if (filters?.flexible_hours !== undefined) {
    filterClauses.push({ term: { flexible_hours: filters.flexible_hours } })
  }

  // Tags filter
  if (filters?.tags && filters.tags.length > 0) {
    filterClauses.push({
      terms: { tags: filters.tags }
    })
  }

  // Salary range filters (overlap logic)
  if (filters?.salary_min !== undefined || filters?.salary_max !== undefined) {
    const salaryConditions = []

    if (filters.salary_min !== undefined) {
      salaryConditions.push({
        range: { salary_min: { gte: filters.salary_min * 0.8 } } // Accept 80% of desired minimum
      })
    }

    if (filters.salary_max !== undefined) {
      salaryConditions.push({
        range: { salary_max: { lte: filters.salary_max * 1.2 } } // Accept up to 120% of desired maximum
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

  // Date filters
  if (filters?.posted_after) {
    filterClauses.push({
      range: {
        posted_at: { gte: filters.posted_after.toISOString() }
      }
    })
  }

  if (filters?.posted_before) {
    filterClauses.push({
      range: {
        posted_at: { lte: filters.posted_before.toISOString() }
      }
    })
  }

  // Location name filter (text search)
  if (filters?.location_name && filters.location_name.trim()) {
    filterClauses.push({
      match: {
        location_name: {
          query: filters.location_name.trim(),
          operator: 'and'
        }
      }
    })
  }

  // === BUILD MAIN QUERY ===

  queryBody.bool = {
    must: mustClauses.length > 0 ? mustClauses : undefined,
    filter: filterClauses.length > 0 ? filterClauses : undefined
  }

  // Add function_score for personalization if we have user context
  const hasUserContext = userSkills || userLocationId || userExperienceLevel ||
    userPrefersRemote || userPrefersFlexibleHours ||
    userDesiredSalaryMin || userDesiredSalaryMax ||
    userDesiredBenefits || userPreferredCategories

  if (hasUserContext) {
    const functionScore = buildJobSearchFunctionScore(context)
    if (functionScore.function_score) {
      queryBody = {
        function_score: {
          query: queryBody,
          ...functionScore.function_score
        }
      }
    }
  }

  // === BUILD FINAL ES QUERY ===

  const esQuery: ESQuery = {
    query: queryBody,
    from: pagination ? (pagination.page - 1) * pagination.size : 0,
    size: pagination?.size || 20,
    sort: getSortConfig(filters?.sort), // Dynamic sort based on filter
    _source: true // Include all fields
  }

  // Add debugging options
  if (options?.explain) {
    esQuery.explain = true
  }

  if (options?.profile) {
    esQuery.profile = true
  }

  return esQuery
}

/**
 * Build query for job suggestions/autocomplete
 * Lightweight query optimized for prefix matching
 */
export function buildJobSuggestionsQuery(prefix: string, size = 10): ESQuery {
  return {
    query: {
      bool: {
        must: [
          {
            multi_match: {
              query: prefix,
              fields: ['title.suggest', 'company_name.suggest'],
              type: 'phrase_prefix'
            }
          }
        ],
        filter: [
          { term: { status: 'approved' } },
          { range: { expires_at: { gt: 'now' } } }
        ]
      }
    },
    size,
    _source: ['title', 'company_name', 'id']
  }
}

/**
 * Build query for popular/trending jobs
 * Focuses on recency and engagement signals
 */
export function buildPopularJobsQuery(limit = 20): ESQuery {
  return {
    query: {
      function_score: {
        query: {
          bool: {
            filter: [
              { term: { status: 'approved' } },
              { range: { expires_at: { gt: 'now' } } }
            ]
          }
        },
        functions: [
          {
            filter: { range: { posted_at: { gte: 'now-7d' } } },
            weight: BOOSTS.freshnessDays7
          },
          {
            filter: { range: { posted_at: { gte: 'now-30d' } } },
            weight: BOOSTS.freshnessDays30
          }
        ],
        score_mode: 'multiply',
        boost_mode: 'multiply'
      }
    },
    size: limit,
    sort: [{ _score: 'desc' }, { posted_at: 'desc' }]
  }
}
