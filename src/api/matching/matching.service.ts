import { elasticsearchService } from '../../config/elasticsearch.service'
import { searchService } from '../searches/search.service'
import { redisService } from '../../config/redis.service'
import { metrics } from '../../shared/utils/metrics.util'
import { computeScoreComponents, normalizeScore, DEFAULT_SCORE_WEIGHTS } from '../../shared/utils/scoring.util'
import { formatBreakdown } from '../../shared/utils/explain.util'

/**
 * Use min-max normalization of ES raw _score across the retrieved topN hits
 * to produce a deterministic text score in 0..1. This avoids relying on a
 * global arbitrary MAX and adapts to result set variations.
 */

export const matchingService = {
  /**
   * Return candidates for a job with score_percent and explanation.
   */
  async matchCandidatesForJob(jobId: string, size = 50, filters?: Record<string, any>) {
    const cacheKey = `matching:candidates:job:${jobId}:size:${size}`
    const cacheHit = await redisService.get(cacheKey)
    if (cacheHit) {
      metrics.increment('matching.candidates.cache_hit')
      return JSON.parse(cacheHit)
    }

    const timerDone = metrics.startTimer('matching.candidates.duration')

    // Fetch job payload from ES (lightweight)
    const jobPayload = await elasticsearchService.getById({ index: 'jobs', id: jobId })
    if (!jobPayload) {
      timerDone()
      return { jobId, total: 0, candidates: [] }
    }

    const topN = Math.max(size, 200)

    // Build advanced ES query for profiles matching với business-aware scoring
    const profileQuery = buildProfileMatchingQuery(jobPayload, filters)
    const esResp = await elasticsearchService.search({
      index: 'profiles',
      query: profileQuery,
      from: 0,
      size: topN,
      sort: [{ _score: 'desc' }] // Sort by relevance first
    })

    const hits = esResp.hits
    timerDone()
    metrics.increment('matching.candidates.request')

    // Compute min/max of ES raw scores for min-max normalization
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

      const components = computeScoreComponents({
        textScore: textScoreNorm,
        requiredSkills: (jobPayload as any).skills ?? [],
        candidateSkills: src.skills ?? [],
        locationMatch:
          (jobPayload as any).location_id && src.location_id && (jobPayload as any).location_id === src.location_id
            ? 1
            : 0,
        experienceYears: src.years_of_experience ?? 0,
        expectedExperience: (jobPayload as any).experience_level ?? 0,
        postedAtMs: (jobPayload as any).posted_at ? new Date((jobPayload as any).posted_at).getTime() : undefined,
        lastActiveAtMs: src.last_active_at ? new Date(src.last_active_at).getTime() : undefined,
      })

      const weightedRaw =
        components.text * DEFAULT_SCORE_WEIGHTS.text +
        components.skills * DEFAULT_SCORE_WEIGHTS.skills +
        components.location * DEFAULT_SCORE_WEIGHTS.location +
        components.experience * DEFAULT_SCORE_WEIGHTS.experience +
        components.recency * DEFAULT_SCORE_WEIGHTS.recency +
        components.activity * DEFAULT_SCORE_WEIGHTS.activity +
        components.availability * DEFAULT_SCORE_WEIGHTS.availability

      const score_percent = normalizeScore(weightedRaw)
      const explanation = formatBreakdown(components, DEFAULT_SCORE_WEIGHTS)

      return {
        id: h.id,
        score_percent,
        explanation,
        _source: src
      }
    })

    // Return top `size` sorted by score_percent desc
    const sorted = results.sort((a, b) => b.score_percent - a.score_percent).slice(0, size)
    const result = { jobId, total: results.length, candidates: sorted }

    // Cache results for 30 minutes
    try {
      await redisService.set(cacheKey, JSON.stringify(result), 30 * 60)
    } catch (e) {
      // Non-fatal
    }

    return result
  },

  /**
   * Return jobs for a profile with score_percent and explanation.
   */
  async matchJobsForProfile(profileId: string, size = 50, filters?: Record<string, any>) {
    const cacheKey = `matching:jobs:profile:${profileId}:size:${size}`
    const cacheHit = await redisService.getSearchResponse(cacheKey)
    if (cacheHit) {
      metrics.increment('matching.jobs.cache_hit')
      return cacheHit
    }

    const timerDone = metrics.startTimer('matching.jobs.duration')

    const profilePayload = await elasticsearchService.getById({ index: 'profiles', id: profileId })
    if (!profilePayload) {
      timerDone()
      return { profileId, total: 0, jobs: [] }
    }

    const topN = Math.max(size, 200)

    // Build advanced ES query for job-profile matching với business-aware scoring
    const jobQuery = buildJobMatchingQuery(profilePayload, filters)
    const esResp = await elasticsearchService.searchJobs({
      index: 'jobs',
      query: jobQuery,
      from: 0,
      size: topN,
      // Add profile preferences for enhanced scoring
      userExperienceLevel: (profilePayload as any).years_of_experience ?
        Math.floor((profilePayload as any).years_of_experience / 2) : undefined,
      userLocationId: (profilePayload as any).location_id,
      prioritizeFreshJobs: true, // Always prefer recent jobs for candidates
      userPrefersRemote: (profilePayload as any).location_text?.toLowerCase().includes('remote'),
      userSkills: (profilePayload as any).skills_flat || (profilePayload as any).skills?.map((s: any) => s.name),
      userDesiredSalaryMin: (profilePayload as any).desired_salary_min,
      userDesiredSalaryMax: (profilePayload as any).desired_salary_max
    })

    const hits = esResp.hits
    timerDone()
    metrics.increment('matching.jobs.request')

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

      const components = computeScoreComponents({
        textScore: textScoreNorm,
        requiredSkills: src.skills ?? [],
        candidateSkills: (profilePayload as any).skills ?? [],
        locationMatch:
          src.location_id &&
          (profilePayload as any).location_id &&
          src.location_id === (profilePayload as any).location_id
            ? 1
            : 0,
        experienceYears: (profilePayload as any).years_of_experience ?? 0,
        expectedExperience: src.experience_level ?? 0,
        postedAtMs: src.posted_at ? new Date(src.posted_at).getTime() : undefined,
        lastActiveAtMs: (profilePayload as any).last_active_at
          ? new Date((profilePayload as any).last_active_at).getTime()
          : undefined
      })

      const weightedRaw =
        components.text * DEFAULT_SCORE_WEIGHTS.text +
        components.skills * DEFAULT_SCORE_WEIGHTS.skills +
        components.location * DEFAULT_SCORE_WEIGHTS.location +
        components.experience * DEFAULT_SCORE_WEIGHTS.experience +
        components.recency * DEFAULT_SCORE_WEIGHTS.recency +
        components.activity * DEFAULT_SCORE_WEIGHTS.activity +
        components.availability * DEFAULT_SCORE_WEIGHTS.availability

      const score_percent = normalizeScore(weightedRaw)
      const explanation = formatBreakdown(components, DEFAULT_SCORE_WEIGHTS)

      return {
        id: h.id,
        score_percent,
        explanation,
        _source: src
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

    return result
  }
}

/**
 * Build advanced ES query for job-profile matching với business-aware scoring
 */
function buildJobMatchingQuery(profilePayload: any, filters?: Record<string, any>) {
  const must: any[] = []
  const should: any[] = []
  const filter: any[] = []

  // Text-based matching on job requirements and title
  if (profilePayload.headline || profilePayload.desired_job_title) {
    const queryText = profilePayload.headline || profilePayload.desired_job_title
    must.push({
      multi_match: {
        query: queryText,
        fields: ['title^3', 'description^2', 'job_requirements_title', 'company_name'],
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

  // Location matching
  if (profilePayload.location_id) {
    should.push({
      term: {
        location_id: {
          value: profilePayload.location_id,
          boost: 1.4
        }
      }
    })
  }

  // Remote work opportunity
  if (profilePayload.location_text?.toLowerCase().includes('remote')) {
    should.push({
      bool: {
        should: [
          { term: { is_remote_allowed: true } },
          { range: { remote_percentage: { gte: 50 } } }
        ],
        boost: 1.2
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

  // Apply additional filters
  if (filters) {
    if (filters.location_id) filter.push({ term: { location_id: filters.location_id } })
    if (filters.job_type) filter.push({ term: { job_type: filters.job_type } })
    if (filters.min_salary !== undefined) filter.push({ range: { salary_min: { gte: filters.min_salary } } })
    if (filters.max_salary !== undefined) filter.push({ range: { salary_max: { lte: filters.max_salary } } })
    if (filters.company_id) filter.push({ term: { company_id: filters.company_id } })
    if (filters.is_remote !== undefined) filter.push({ term: { is_remote_allowed: filters.is_remote } })
    if (filters.flexible_hours !== undefined) filter.push({ term: { flexible_hours: filters.flexible_hours } })
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

  // Text-based matching on headline and skills
  if (jobPayload.title) {
    must.push({
      multi_match: {
        query: jobPayload.title,
        fields: ['headline^3', 'full_name^1', 'bio', 'desired_job_title^2'],
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
}

