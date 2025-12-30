import { elasticsearchService } from '../../config/elasticsearch.service'
import { searchService } from '../searches/search.service'
import { redisService } from '../../config/redis.service'
import { metrics } from '../../shared/utils/metrics.util'
import { computeScoreComponents, normalizeScore, DEFAULT_SCORE_WEIGHTS } from '../../shared/utils/scoring.util'
import { formatBreakdown } from '../../shared/utils/explain.util'
import { buildJobSearchQuery } from '../../search/jobSearch.builder'
import { QueryContext } from '../../search/search.types'

/**
 * Use min-max normalization of ES raw _score across the retrieved topN hits
 * to produce a deterministic text score in 0..1. This avoids relying on a
 * global arbitrary MAX and adapts to result set variations.
 */

export const matchingService = {
  /**
   * Return candidates for a job with enhanced scoring and explanation
   * Automatic matching based on job requirements - no manual filters needed
   */
  async matchCandidatesForJob(jobId: string, size = 50) {
    const cacheKey = `matching:candidates:job:${jobId}:size:${size}`
    const cacheHit = await redisService.get(cacheKey)
    if (cacheHit) {
      metrics.increment('matching.candidates.cache_hit')
      return JSON.parse(cacheHit)
    }

    const timerDone = metrics.startTimer('matching.candidates.duration')

    try {
      // Sử dụng phương thức enhanced từ ES service - automatic matching from job content only
      const result = await elasticsearchService.matchCandidatesForJobEnhanced(jobId, size)

      // elasticsearchService.normalizeSearchResponse returns { took, total, hits }
      // where hits = [{ id, _source, _score }, ...]. Normalize to the expected
      // matching response shape used by frontend.
      const hits = Array.isArray((result as any).hits) ? (result as any).hits : []

      // Min-max normalization for consistent scoring across results
      const rawScores = hits.map((h: any) => (typeof h._score === 'number' ? h._score : 0))
      const minScore = rawScores.length ? Math.min(...rawScores) : 0
      const maxScore = rawScores.length ? Math.max(...rawScores) : minScore

      const candidates = hits.map((h: any) => {
        const scoreRaw = typeof h._score === 'number' ? h._score : 0

        // Normalize score to 0-100 range
        let score_percent = 0
        if (maxScore === minScore) {
          score_percent = scoreRaw > 0 ? 100 : 0
        } else {
          score_percent = Math.max(0, Math.min(100, Math.round((scoreRaw - minScore) / (maxScore - minScore) * 100)))
        }

        return {
          id: h.id,
          score_percent,
          _score: h._score,
          _source: h._source,
          explanation: {
            // For candidates, we provide basic score info since detailed matching
            // logic is based on job requirements and candidate profiles
            text_match: scoreRaw > 0 ? Math.max(0, Math.min(100, Math.round(scoreRaw * 100))) : 0,
            overall_score: score_percent
          }
        }
      })

      const filteredResult = {
        jobId,
        total: typeof (result as any).total === 'number' ? (result as any).total : candidates.length,
        candidates: candidates.slice(0, size)
      }

      timerDone()
      metrics.increment('matching.candidates.request')

      // Cache results for 30 minutes
      try {
        await redisService.set(cacheKey, JSON.stringify(filteredResult), 30 * 60)
      } catch (e) {
        // Non-fatal
      }

      return filteredResult
    } catch (error) {
      timerDone()
      console.error(`Enhanced candidate matching failed for job ${jobId}:`, error)
      throw error
    }
  },

  /**
   * Return jobs for a profile with enhanced scoring and explanation
   */
  async matchJobsForProfile(profileId: string, size = 50) {
    const cacheKey = `matching:jobs:profile:${profileId}:size:${size}`
    const cacheHit = await redisService.getSearchResponse(cacheKey)
    if (cacheHit) {
      metrics.increment('matching.jobs.cache_hit')
      return cacheHit
    }

    const timerDone = metrics.startTimer('matching.jobs.duration')

    try {
      // Fetch profile payload
      const profilePayload = await elasticsearchService.getById({ index: elasticsearchService.getIndexName('profiles'), id: profileId })

      if (!profilePayload) {
        timerDone()
        return { profileId, total: 0, jobs: [] }
      }

      // Build QueryContext từ profile data
      const queryContext: QueryContext = {
        q: (profilePayload as any).headline || (profilePayload as any).desired_job_title,
        userSkills: (profilePayload as any).skills_flat || (profilePayload as any).skills?.map((s: any) => s.name),
        userLocationId: (profilePayload as any).location_id,
        userExperienceLevel: (profilePayload as any).years_of_experience ?
          Math.floor((profilePayload as any).years_of_experience / 2) : undefined,
        userPrefersRemote: (profilePayload as any).location_text?.toLowerCase().includes('remote') ||
                           (profilePayload as any).prefers_remote,
        userPrefersFlexibleHours: (profilePayload as any).prefers_flexible_hours,
        userDesiredSalaryMin: (profilePayload as any).desired_salary_min,
        userDesiredSalaryMax: (profilePayload as any).desired_salary_max,
        userDesiredBenefits: (profilePayload as any).desired_benefits,
        userPreferredCategories: (profilePayload as any).preferred_categories,
        userRemotePercentageMin: (profilePayload as any).prefers_remote ? 50 : undefined,
        pagination: { page: 1, size: Math.min(size * 2, 100) },
        options: { prioritizeFreshJobs: true }
      }

      // Sử dụng searchJobs với business-aware scoring
      const esQuery = buildJobSearchQuery(queryContext)
      const esResp = await elasticsearchService.searchWithTemplate('jobs', esQuery)

      const hits = esResp.hits

      // Min-max normalization cho scoring
      const rawScores = hits.map((h: any) => (typeof h._score === 'number' ? h._score : 0))
      const minScore = rawScores.length ? Math.min(...rawScores) : 0
      const maxScore = rawScores.length ? Math.max(...rawScores) : minScore

      const results = hits.map((h: any) => {
        const src = h._source || {}
        const rawText = typeof h._score === 'number' ? h._score : 0
        let textScoreNorm = 0
        if (maxScore === minScore) {
          textScoreNorm = rawText > 0 ? 1 : 0
        } else {
          textScoreNorm = Math.max(0, Math.min(1, (rawText - minScore) / (maxScore - minScore)))
        }

        // Tính toán các components scoring
        const components = computeScoreComponents({
          textScore: textScoreNorm,
          requiredSkills: src.skills ?? [],
          candidateSkills: (profilePayload as any).skills ?? [],
          locationMatch: src.location_id && (profilePayload as any).location_id &&
                        src.location_id === (profilePayload as any).location_id ? 1 : 0,
          experienceYears: (profilePayload as any).years_of_experience ?? 0,
          expectedExperience: src.experience_level ?? 0,
          postedAtMs: src.posted_at ? new Date(src.posted_at).getTime() : undefined,
          profileUpdatedAtMs: (profilePayload as any).updated_at ?
                             new Date((profilePayload as any).updated_at).getTime() : undefined,
          isLookingForJob: (profilePayload as any).is_looking_for_job ?? true,
          // Work arrangement matching
          candidateRemotePreference: (profilePayload as any).location_text?.toLowerCase().includes('remote') ||
                                   (profilePayload as any).prefers_remote,
          jobRemoteAllowed: src.is_remote_allowed,
          jobRemotePercentage: src.remote_percentage ?? 0,
          candidateFlexiblePreference: (profilePayload as any).prefers_flexible_hours,
          jobFlexibleHours: src.flexible_hours,
          // Benefits matching
          candidateDesiredBenefits: (profilePayload as any).desired_benefits ?? [],
          jobBenefits: src.job_benefits?.map((b: any) => b.benefit_type) ?? [],
          // Category matching
          candidatePreferredCategories: (profilePayload as any).preferred_categories ?? [],
          jobCategories: src.job_categories?.map((c: any) => c.categories?.name) ?? []
        })

        const weightedRaw = components.text * DEFAULT_SCORE_WEIGHTS.text +
                           components.skills * DEFAULT_SCORE_WEIGHTS.skills +
                           components.location * DEFAULT_SCORE_WEIGHTS.location +
                           components.experience * DEFAULT_SCORE_WEIGHTS.experience +
                           components.recency * DEFAULT_SCORE_WEIGHTS.recency +
                           components.activity * DEFAULT_SCORE_WEIGHTS.activity +
                           components.availability * DEFAULT_SCORE_WEIGHTS.availability +
                           components.work_arrangement * DEFAULT_SCORE_WEIGHTS.work_arrangement +
                           components.benefits * DEFAULT_SCORE_WEIGHTS.benefits +
                           components.category * DEFAULT_SCORE_WEIGHTS.category

        // Ensure score_percent is within 0-100 range
        const score_percent = Math.max(0, Math.min(100, normalizeScore(weightedRaw)))
        const explanation = formatBreakdown(components, DEFAULT_SCORE_WEIGHTS)

        // Only include essential fields from _source to reduce response size
        const essentialSource = {
          id: src.id,
          title: src.title,
          description: src.description,
          company_name: src.company_name,
          location_name: src.location_name,
          location_id: src.location_id,
          salary_min: src.salary_min,
          salary_max: src.salary_max,
          job_type: src.job_type,
          is_remote_allowed: src.is_remote_allowed,
          remote_percentage: src.remote_percentage,
          flexible_hours: src.flexible_hours,
          skills: src.skills,
          experience_level: src.experience_level,
          posted_at: src.posted_at,
          status: src.status,
          job_categories: src.job_categories,
          job_benefits: src.job_benefits
        }

        return {
          id: h.id,
          score_percent,
          explanation,
          _source: essentialSource
        }
      })

      const sorted = results.sort((a, b) => b.score_percent - a.score_percent).slice(0, size)
      const result = { profileId, total: results.length, jobs: sorted }

      // Cache results for 30 minutes
      try {
        await redisService.set(cacheKey, JSON.stringify(result), 30 * 60)
      } catch (e) {
        // Non-fatal
      }

      timerDone()
      return result
    } catch (error) {
      timerDone()
      console.error(`Enhanced job matching failed for profile ${profileId}:`, error)
      throw error
    }
  }
}

/**
 * Build advanced ES query for job-profile matching với business-aware scoring
 */
function buildJobMatchingQuery(profilePayload: any, filters?: Record<string, any>) {
  const must: any[] = []
  const should: any[] = []
  const filter: any[] = []

  // Enhanced text-based matching using comprehensive job fields
  if (profilePayload.headline || profilePayload.desired_job_title) {
    const queryText = profilePayload.headline || profilePayload.desired_job_title
    must.push({
      multi_match: {
        query: queryText,
        fields: [
          'title^4', // Highest priority for job title
          'description^2.5', // High priority for job description
          'company_name^2', // Company name
          'job_requirements_title^1.5', // Job requirements
          'job_benefits_type^1.2', // Benefits offered
          'job_category^1', // Job categories
          'location_name^1', // Location name
          'location_combined^0.8', // Combined location
          'tags^0.8' // Job tags
        ],
        fuzziness: 'AUTO',
        operator: 'and'
      }
    })
  }

  // Skills matching - critical for job fit
  if (profilePayload.skills_flat && Array.isArray(profilePayload.skills_flat) && profilePayload.skills_flat.length) {
    must.push({
      terms: { skills: profilePayload.skills_flat }
    })

    // Boost jobs requiring high proficiency in candidate's skills
    should.push({
      nested: {
        path: 'skills',
        query: {
          bool: {
            must: [
              { terms: { 'skills.name': profilePayload.skills_flat } },
              { range: { 'skills.proficiency': { gte: 3 } } }
            ]
          }
        },
        boost: 1.4
      }
    })
  }

  // Experience level compatibility
  if (typeof profilePayload.years_of_experience === 'number') {
    const candidateLevel = Math.floor(profilePayload.years_of_experience / 2)
    should.push({
      range: {
        experience_level: {
          lte: candidateLevel + 1, // Accept jobs up to 1 level above
          gte: Math.max(0, candidateLevel - 1), // Accept jobs 1 level below
          boost: 1.3
        }
      }
    })
  }

  // Enhanced location matching with hierarchy
  if (profilePayload.location_id) {
    should.push({
      term: {
        location_id: {
          value: profilePayload.location_id,
          boost: 1.5 // Exact location match gets highest boost
        }
      }
    })
  }

  // Location hierarchy matching for broader matches
  if ((profilePayload as any).location_province || (profilePayload as any).location_district) {
    const locationShould = []

    if ((profilePayload as any).location_province) {
      locationShould.push({
        match: {
          location_province: {
            query: (profilePayload as any).location_province,
            boost: 1.2
          }
        }
      })
    }

    if ((profilePayload as any).location_district) {
      locationShould.push({
        match: {
          location_district: {
            query: (profilePayload as any).location_district,
            boost: 1.3
          }
        }
      })
    }

    if (locationShould.length > 0) {
      should.push({
        bool: {
          should: locationShould,
          minimum_should_match: 0
        }
      })
    }
  }

  // Enhanced work arrangement matching
  const workArrangementShould = []

  // Remote work preference
  if (profilePayload.location_text?.toLowerCase().includes('remote') || (profilePayload as any).prefers_remote) {
    workArrangementShould.push({
      bool: {
        should: [
          { term: { is_remote_allowed: { value: true, boost: 1.5 } } },
          { range: { remote_percentage: { gte: 80, boost: 1.3 } } }, // High remote preference
          { range: { remote_percentage: { gte: 50, boost: 1.1 } } }  // Medium remote preference
        ]
      }
    })
  }

  // Flexible hours preference
  if ((profilePayload as any).prefers_flexible_hours) {
    workArrangementShould.push({
      term: { flexible_hours: { value: true, boost: 1.4 } }
    })
  }

  // General work-life balance boost for good arrangements
  workArrangementShould.push({
    bool: {
      should: [
        { term: { is_remote_allowed: true } },
        { term: { flexible_hours: true } },
        { range: { remote_percentage: { gte: 20 } } }
      ],
      boost: 1.1
    }
  })

  if (workArrangementShould.length > 0) {
    should.push({
      bool: {
        should: workArrangementShould,
        minimum_should_match: 0
      }
    })
  }

  // Salary compatibility
  if (profilePayload.desired_salary_min || profilePayload.desired_salary_max) {
    const salaryConditions = []
    if (profilePayload.desired_salary_min) {
      salaryConditions.push({
        range: { salary_min: { gte: profilePayload.desired_salary_min * 0.9 } } // Accept 10% less than desired
      })
    }
    if (profilePayload.desired_salary_max) {
      salaryConditions.push({
        range: { salary_max: { lte: profilePayload.desired_salary_max * 1.1 } } // Accept 10% more than max
      })
    }
    if (salaryConditions.length > 0) {
      should.push({
        bool: {
          should: salaryConditions,
          minimum_should_match: Math.min(1, salaryConditions.length),
          boost: 1.1
        }
      })
    }
  }

  // Boost jobs with flexible arrangements for work-life balance
  should.push({
    bool: {
      should: [
        { term: { flexible_hours: true } },
        { term: { is_remote_allowed: true } }
      ],
      boost: 1.1
    }
  })

  // Benefits matching - boost jobs with desired benefits
  if ((profilePayload as any).desired_benefits && Array.isArray((profilePayload as any).desired_benefits)) {
    should.push({
      terms: {
        'job_benefits_type': (profilePayload as any).desired_benefits,
        boost: 1.3
      }
    })
  }

  // Category matching - boost jobs in preferred categories
  if ((profilePayload as any).preferred_categories && Array.isArray((profilePayload as any).preferred_categories)) {
    should.push({
      terms: {
        'job_category': (profilePayload as any).preferred_categories,
        boost: 1.2
      }
    })
  }

  // Only include active jobs
  filter.push({ term: { status: 'active' } })

  // Exclude expired jobs
  filter.push({
    bool: {
      should: [
        { range: { expires_at: { gte: 'now' } } },
        { bool: { must_not: { exists: { field: 'expires_at' } } } }
      ]
    }
  })

  // Apply enhanced additional filters
  if (filters) {
    if (filters.location_id) filter.push({ term: { location_id: filters.location_id } })
    if (filters.job_type) filter.push({ term: { job_type: filters.job_type } })
    if (filters.min_salary !== undefined) filter.push({ range: { salary_min: { gte: filters.min_salary } } })
    if (filters.max_salary !== undefined) filter.push({ range: { salary_max: { lte: filters.max_salary } } })
    if (filters.company_id) filter.push({ term: { company_id: filters.company_id } })

    // Work arrangement filters
    if (filters.is_remote !== undefined) filter.push({ term: { is_remote_allowed: filters.is_remote } })
    if (filters.flexible_hours !== undefined) filter.push({ term: { flexible_hours: filters.flexible_hours } })
    if (filters.remote_percentage_min !== undefined) filter.push({ range: { remote_percentage: { gte: filters.remote_percentage_min } } })

    // Category and benefits filters
    if (filters.job_category) filter.push({ term: { job_category: filters.job_category } })
    if (filters.job_category_type) filter.push({ term: { job_category_type: filters.job_category_type } })
    if (filters.benefits_type) filter.push({ terms: { job_benefits_type: filters.benefits_type.split(',').map((b: string) => b.trim()) } })

    // Tags filter
    if (filters.tags) filter.push({ terms: { tags: filters.tags.split(',').map((t: string) => t.trim()) } })
  }

  return {
    bool: {
      must,
      should,
      filter,
      minimum_should_match: should.length > 0 ? 0 : undefined
    }
  }
}

/**
 * Build advanced ES query for profile-job matching với business-aware scoring
 */
function buildProfileMatchingQuery(jobPayload: any, filters?: Record<string, any>) {
  const must: any[] = []
  const should: any[] = []
  const filter: any[] = []

  // Enhanced text-based matching using comprehensive profile fields
  if (jobPayload.title) {
    must.push({
      multi_match: {
        query: jobPayload.title,
        fields: [
          'headline^3', // Highest priority for profile headline
          'desired_job_title^2', // Job title preferences
        'full_name^1.5', // Name matching
          'bio^1', // Bio/description
          'skills_flat^1', // Skills
          'education_degree^0.8' // Education background
        ],
        fuzziness: 'AUTO',
        operator: 'and'
      }
    })
  }

  // Skills matching - critical for job fit
  if (jobPayload.skills && Array.isArray(jobPayload.skills) && jobPayload.skills.length) {
    must.push({
      terms: { 'skills_flat': jobPayload.skills }
    })

    // Boost profiles with high proficiency in required skills
    should.push({
      nested: {
        path: 'skills',
        query: {
          bool: {
            must: [
              { terms: { 'skills.name': jobPayload.skills } },
              { range: { 'skills.proficiency': { gte: 3 } } } // High proficiency boost
            ]
          }
        },
        boost: 1.5
      }
    })
  }

  // Experience level matching
  if (typeof jobPayload.experience_level === 'number') {
    should.push({
      range: {
        years_of_experience: {
          gte: jobPayload.experience_level * 2, // At least 2 years per level
          boost: 1.2
        }
      }
    })
  }

  // Location matching
  if (jobPayload.location_id) {
    should.push({
      term: {
        location_id: {
          value: jobPayload.location_id,
          boost: 1.3 // Strong location preference
        }
      }
    })
  }

  // Remote work preference
  if (jobPayload.is_remote_allowed) {
    should.push({
      term: {
        'location_text': {
          value: 'remote',
          boost: 1.1
        }
      }
    })
  }

  // Benefits alignment - boost profiles that want job's benefits
  if (jobPayload.job_benefits && Array.isArray(jobPayload.job_benefits)) {
    should.push({
      terms: {
        'desired_benefits': jobPayload.job_benefits.map((b: any) => b.benefit_type),
        boost: 1.2
      }
    })
  }

  // Category alignment - boost profiles interested in job's categories
  if (jobPayload.job_categories && Array.isArray(jobPayload.job_categories)) {
    should.push({
      terms: {
        'preferred_categories': jobPayload.job_categories.map((c: any) => c.categories?.name),
        boost: 1.1
      }
    })
  }
 
  // Final combined boolean query for profile -> job matching
  return {
    bool: {
      must,
      should,
      filter,
      minimum_should_match: should.length > 0 ? 0 : undefined
    }
  }
}

