import { elasticsearchService } from '../../config/elasticsearch.service'
import { prisma } from '../../config/database.service'
import { metrics } from '../../shared/utils/metrics.util'
import { buildJobSearchQuery } from '../../search/jobSearch.builder'
import { QueryContext } from '../../search/search.types'

/**
 * Recommendations Service
 * Provides personalized recommendations with A/B testing support
 */

export interface CandidateRecommendation {
  job_id: string
  score: number
  explanation: Record<string, any>
  experiment_variant: string
  _source: any
}

export interface RecruiterRecommendation {
  profile_id: string
  job_id: string
  score: number
  explanation: Record<string, any>
  experiment_variant: string
  _source: any
}

/**
 * A/B Testing variants for recommendation algorithms
 */
const RECOMMENDATION_VARIANTS = {
  BASELINE: 'baseline',
  ENHANCED_SKILLS: 'enhanced_skills',
  LOCATION_WEIGHTED: 'location_weighted',
  TRENDING_BOOST: 'trending_boost',
  HYBRID: 'hybrid',
  // New enhanced variants
  WORK_LIFE_BALANCE: 'work_life_balance',
  BENEFITS_FOCUSED: 'benefits_focused',
  CATEGORY_ALIGNED: 'category_aligned',
  COMPREHENSIVE: 'comprehensive'
} as const

type RecommendationVariant = typeof RECOMMENDATION_VARIANTS[keyof typeof RECOMMENDATION_VARIANTS]

export const recommendationsService = {
  /**
   * Get personalized job recommendations for a candidate
   */
  async getCandidateRecommendations(
    userId: string,
    limit: number = 20,
    experimentId?: string
  ): Promise<CandidateRecommendation[]> {
    const timer = metrics.startTimer('recommendations.candidate.duration')

    try {
      // Get user's profile
      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: { profiles: true }
      })

      if (!user?.profiles) {
        return []
      }

      const profileId = user.profiles.id

      // Determine experiment variant
      const variant = this.getExperimentVariant(userId, experimentId)

      // Get profile data from ES for better performance
      const profileData = await elasticsearchService.getById({
        index: elasticsearchService.getIndexName('profiles'),
        id: profileId
      })

      if (!profileData) {
        return []
      }

    // Generate recommendations based on variant
    const recommendations = await this.generateCandidateRecommendations(
      profileData,
      variant,
      limit,
      userId // Pass userId for potential personalization
    )

      metrics.increment('recommendations.candidate.success')
      return recommendations

    } catch (error) {
      console.error('Error generating candidate recommendations:', error)
      metrics.increment('recommendations.candidate.error')
      return []
    } finally {
      timer()
    }
  },

  /**
   * Get candidate recommendations for recruiter
   */
  async getRecruiterRecommendations(
    userId: string,
    companyId: string | undefined,
    limit: number = 10,
    experimentId?: string
  ): Promise<RecruiterRecommendation[]> {
    const timer = metrics.startTimer('recommendations.recruiter.duration')

    try {
      // Use provided companyId or get from user's company association
      let targetCompanyId = companyId
      if (!targetCompanyId) {
        // For now, require explicit company_id parameter
        // TODO: Implement user-company relationship lookup
        return []
      }

      // Get active jobs for the company
      const activeJobs = await prisma.jobs.findMany({
        where: {
          company_id: targetCompanyId,
          status: 'approved',
          expires_at: { gt: new Date() }
        },
        select: { id: true },
        take: 10 // Limit to recent jobs
      })

      if (activeJobs.length === 0) {
        return []
      }

      const variant = this.getExperimentVariant(userId, experimentId)

      // Generate recommendations for each job
      const allRecommendations: RecruiterRecommendation[] = []

      for (const job of activeJobs.slice(0, 3)) { // Process top 3 jobs
        const jobRecommendations = await this.generateRecruiterRecommendations(
          job.id,
          variant,
          Math.ceil(limit / activeJobs.length)
        )
        allRecommendations.push(...jobRecommendations)
      }

      // Sort by score and limit
      const sorted = allRecommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)

      metrics.increment('recommendations.recruiter.success')
      return sorted

    } catch (error) {
      console.error('Error generating recruiter recommendations:', error)
      metrics.increment('recommendations.recruiter.error')
      return []
    } finally {
      timer()
    }
  },

  /**
   * Determine which experiment variant to use
   */
  getExperimentVariant(userId: string, experimentId?: string): RecommendationVariant {
    // Simple A/B testing logic - can be enhanced with proper experiment framework
    if (experimentId) {
      // Explicit experiment override
      const variant = experimentId as RecommendationVariant
      if (Object.values(RECOMMENDATION_VARIANTS).includes(variant)) {
        return variant
      }
    }

    // User-based variant assignment for consistency
    const hash = this.simpleHash(userId)
    const variants = Object.values(RECOMMENDATION_VARIANTS)

    // Updated distribution: 50% baseline, 50% split among enhanced variants for more experimentation
    if (hash % 100 < 50) {
      return RECOMMENDATION_VARIANTS.BASELINE
    } else {
      const enhancedVariants = variants.filter(v => v !== RECOMMENDATION_VARIANTS.BASELINE)
      return enhancedVariants[hash % enhancedVariants.length]
    }
  },

  /**
   * Generate recommendations for candidate based on experiment variant
   */
  async generateCandidateRecommendations(
    profileData: any,
    variant: RecommendationVariant,
    limit: number,
    userId?: string
  ): Promise<CandidateRecommendation[]> {
    // Build QueryContext from profile data
    const queryContext: QueryContext = {
      // Use profile headline as search query for recommendations
      q: profileData.headline || profileData.desired_job_title,

      // User preferences from profile
      userSkills: profileData.skills_flat || profileData.skills?.map((s: any) => s.name),
      userLocationId: profileData.location_id,
      userExperienceLevel: profileData.years_of_experience ?
        Math.floor(profileData.years_of_experience / 2) : undefined,
      userPrefersRemote: profileData.location_text?.toLowerCase().includes('remote') ||
                         (profileData as any).prefers_remote,
      userPrefersFlexibleHours: (profileData as any).prefers_flexible_hours,
      userDesiredSalaryMin: profileData.desired_salary_min,
      userDesiredSalaryMax: profileData.desired_salary_max,
      userDesiredBenefits: (profileData as any).desired_benefits,
      userPreferredCategories: (profileData as any).preferred_categories,
      userRemotePercentageMin: (profileData as any).prefers_remote ? 50 : undefined,

      // Pagination for recommendations
      pagination: { page: 1, size: limit * 2 }, // Get more for better scoring

      // Always prioritize fresh jobs for candidates
      options: { prioritizeFreshJobs: true }
    }

    // Apply variant-specific modifications to the query context
    const modifiedContext = this.applyVariantModificationsToContext(queryContext, variant, 'candidate')

    // Use standardized query builder
    const esQuery = buildJobSearchQuery(modifiedContext)
    const esResponse = await elasticsearchService.searchWithTemplate('jobs', esQuery)

    return esResponse.hits.map(hit => ({
      job_id: hit.id,
      score: hit._score || 0,
      explanation: {
        variant,
        base_score: hit._score || 0,
        enhancements: this.getVariantEnhancements(variant)
      },
      experiment_variant: variant,
      _source: hit._source
    }))
  },

  /**
   * Generate recommendations for recruiter based on experiment variant
   */
  async generateRecruiterRecommendations(
    jobId: string,
    variant: RecommendationVariant,
    limit: number
  ): Promise<RecruiterRecommendation[]> {
    // Get job data from ES
    const jobData = await elasticsearchService.getById({
      index: elasticsearchService.getIndexName('jobs'),
      id: jobId
    })

    if (!jobData) {
      return []
    }

    const baseQuery = this.buildBaseRecruiterQuery(jobData)
    const variantQuery = this.applyVariantModifications(baseQuery, variant, 'recruiter')

    const esResponse = await elasticsearchService.search({
      index: elasticsearchService.getIndexName('profiles'),
      query: variantQuery,
      from: 0,
      size: limit * 2
    })

    return esResponse.hits.map(hit => ({
      profile_id: hit.id,
      job_id: jobId,
      score: hit._score || 0,
      explanation: {
        variant,
        base_score: hit._score || 0,
        enhancements: this.getVariantEnhancements(variant)
      },
      experiment_variant: variant,
      _source: hit._source
    }))
  },

  /**
   * Build enhanced base ES query for candidate recommendations
   */
  buildBaseCandidateQuery(profileData: any) {
    const shouldClauses = []

    // Basic work arrangement preferences
    if ((profileData as any).prefers_remote || profileData.location_text?.toLowerCase().includes('remote')) {
      shouldClauses.push({ term: { is_remote_allowed: { boost: 1.2 } } })
    }

    if ((profileData as any).prefers_flexible_hours) {
      shouldClauses.push({ term: { flexible_hours: { boost: 1.1 } } })
    }

    // Benefits alignment
    if ((profileData as any).desired_benefits && Array.isArray((profileData as any).desired_benefits)) {
      shouldClauses.push({
        terms: { job_benefits_type: (profileData as any).desired_benefits, boost: 1.1 }
      })
    }

    // Category preferences
    if ((profileData as any).preferred_categories && Array.isArray((profileData as any).preferred_categories)) {
      shouldClauses.push({
        terms: { job_category: (profileData as any).preferred_categories, boost: 1.1 }
      })
    }

    return {
      bool: {
        must: [
          { term: { status: 'approved' } },
          {
            bool: {
              should: [
                { range: { expires_at: { gte: 'now' } } },
                { bool: { must_not: { exists: { field: 'expires_at' } } } }
              ]
            }
          }
        ],
        should: shouldClauses,
        filter: [],
        minimum_should_match: shouldClauses.length > 0 ? 0 : undefined
      }
    }
  },

  /**
   * Build enhanced base ES query for recruiter recommendations
   */
  buildBaseRecruiterQuery(jobData: any) {
    const shouldClauses = []

    // Location matching
    if (jobData.location_id) {
      shouldClauses.push({ term: { location_id: jobData.location_id, boost: 1.3 } })
    }

    // Experience level compatibility
    if (jobData.experience_level !== undefined) {
      const targetYears = jobData.experience_level * 2
      shouldClauses.push({
        range: {
          years_of_experience: {
            gte: Math.max(0, targetYears - 2),
            lte: targetYears + 2,
            boost: 1.2
          }
        }
      })
    }

    // Skills alignment
    if (jobData.skills && Array.isArray(jobData.skills)) {
      shouldClauses.push({
        terms: { 'skills_flat': jobData.skills, boost: 1.4 }
      })
    }

    // Work arrangement preferences alignment
    if (jobData.is_remote_allowed) {
      shouldClauses.push({
        term: { 'location_text': { value: 'remote', boost: 1.1 } }
      })
    }

    // Benefits alignment
    if (jobData.job_benefits && Array.isArray(jobData.job_benefits)) {
      shouldClauses.push({
        terms: { 'desired_benefits': jobData.job_benefits.map((b: any) => b.benefit_type), boost: 1.1 }
      })
    }

    return {
      bool: {
        must: [
          { term: { is_looking_for_job: true } }
        ],
        should: shouldClauses,
        filter: [],
        minimum_should_match: shouldClauses.length > 0 ? 0 : undefined
      }
    }
  },

  /**
   * Apply experiment variant modifications to QueryContext
   */
  applyVariantModificationsToContext(
    context: QueryContext,
    variant: RecommendationVariant,
    type: 'candidate' | 'recruiter'
  ): QueryContext {
    const modifiedContext = { ...context }

    // Ensure options exists
    if (!modifiedContext.options) {
      modifiedContext.options = {}
    }

    switch (variant) {
      case RECOMMENDATION_VARIANTS.ENHANCED_SKILLS:
        // Enhanced skill matching - already handled by default scoring
        // Could add skill-specific filters here if needed
        break

      case RECOMMENDATION_VARIANTS.LOCATION_WEIGHTED:
        // Stronger location emphasis - already handled by scoring templates
        break

      case RECOMMENDATION_VARIANTS.TRENDING_BOOST:
        // Enhanced fresh job prioritization
        modifiedContext.options.prioritizeFreshJobs = true
        break

      case RECOMMENDATION_VARIANTS.WORK_LIFE_BALANCE:
        // Enhanced work arrangement preferences
        modifiedContext.userPrefersRemote = true
        modifiedContext.userPrefersFlexibleHours = true
        modifiedContext.userRemotePercentageMin = 50
        break

      case RECOMMENDATION_VARIANTS.BENEFITS_FOCUSED:
        // Focus on benefits and salary - already handled by scoring templates
        break

      case RECOMMENDATION_VARIANTS.CATEGORY_ALIGNED:
        // Enhanced category alignment - already handled by scoring templates
        break

      case RECOMMENDATION_VARIANTS.COMPREHENSIVE:
        // All enhancements
        modifiedContext.options.prioritizeFreshJobs = true
        modifiedContext.userPrefersRemote = true
        modifiedContext.userPrefersFlexibleHours = true
        modifiedContext.userRemotePercentageMin = 50
        break

      case RECOMMENDATION_VARIANTS.HYBRID:
        // Balanced enhancements
        modifiedContext.options.prioritizeFreshJobs = true
        modifiedContext.userPrefersRemote = true
        break

      case RECOMMENDATION_VARIANTS.BASELINE:
      default:
        // No modifications - use default scoring
        break
    }

    return modifiedContext
  },

  /**
   * Legacy method - kept for backward compatibility during rollout
   * @deprecated Use applyVariantModificationsToContext instead
   */
  applyVariantModifications(query: any, variant: RecommendationVariant, type: 'candidate' | 'recruiter') {
    // This method is now deprecated and will be removed in Phase 3
    // Keeping for backward compatibility during rollout
    console.warn('applyVariantModifications is deprecated, use applyVariantModificationsToContext')
    return query
  },

  /**
   * Get enhancements applied by variant
   */
  getVariantEnhancements(variant: RecommendationVariant): string[] {
    switch (variant) {
      case RECOMMENDATION_VARIANTS.ENHANCED_SKILLS:
        return ['skill_matching_boost']
      case RECOMMENDATION_VARIANTS.LOCATION_WEIGHTED:
        return ['location_boost']
      case RECOMMENDATION_VARIANTS.TRENDING_BOOST:
        return ['fresh_jobs_boost']
      case RECOMMENDATION_VARIANTS.HYBRID:
        return ['location_boost', 'fresh_jobs_boost', 'remote_boost']
      case RECOMMENDATION_VARIANTS.WORK_LIFE_BALANCE:
        return ['work_arrangement_boost', 'flexible_hours_boost', 'remote_boost']
      case RECOMMENDATION_VARIANTS.BENEFITS_FOCUSED:
        return ['benefits_alignment_boost', 'salary_boost']
      case RECOMMENDATION_VARIANTS.CATEGORY_ALIGNED:
        return ['category_alignment_boost', 'industry_boost']
      case RECOMMENDATION_VARIANTS.COMPREHENSIVE:
        return ['skill_matching_boost', 'work_arrangement_boost', 'benefits_alignment_boost', 'category_alignment_boost', 'location_boost', 'fresh_jobs_boost']
      default:
        return []
    }
  },

  /**
   * Simple hash function for consistent user assignment
   */
  simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }
}
