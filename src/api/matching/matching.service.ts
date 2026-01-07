import { elasticsearchService } from '../../config/elasticsearch.service'
import { searchService } from '../searches/search.service'
import { redisService } from '../../config/redis.service'
import {
  computeScoreComponents,
  normalizeScore,
  normalizeESScores,
  getDynamicWeights,
  DEFAULT_SCORE_WEIGHTS
} from '../../shared/utils/scoring.util'
import { formatBreakdown } from '../../shared/utils/explain.util'
import { buildJobSearchQuery } from '../../search/jobSearch.builder'
import { QueryContext } from '../../search/search.types'

// ========================================
// ENHANCED MATCHING INTERFACES
// ========================================

interface MatchingDimensions {
  experience: number // 0-1 score
  location: number // 0-1 score
  skills: number // 0-1 score
  preferences: number // 0-1 score
  activity: number // 0-1 score
  completeness: number // 0-1 score
}

interface MatchResult {
  candidate: any
  score: number // Final matching score (0-100)
  confidence: 'high' | 'medium' | 'low'
  reasons: string[] // Human-readable explanations
  dataCompleteness: number // 0-1 profile completeness
  matchingDimensions: MatchingDimensions
}

interface MatchQuality {
  overall: 'excellent' | 'good' | 'fair' | 'poor'
  strengths: string[]
  concerns: string[]
  recommendations: string[]
}

// Enhanced scoring configuration
const HYBRID_SCORING_CONFIG = {
  esWeight: 0.4, // Elasticsearch relevance score weight
  customWeight: 0.6, // Custom business logic weight
  minESScores: 10, // Minimum ES scores needed for reliable normalization
  enableDetailedExplain: true, // Include detailed breakdown in response
  cacheHybridScores: true // Cache computed hybrid scores
}

/**
 * Use min-max normalization of ES raw _score across the retrieved topN hits
 * to produce a deterministic text score in 0..1. This avoids relying on a
 * global arbitrary MAX and adapts to result set variations.
 */

/**
 * Compute hybrid score combining ES relevance + custom business logic
 */
async function computeHybridScore(
  esScore: number,
  esScores: number[],
  candidate: any,
  jobRequirements: any,
  experimentId?: string
): Promise<{
  finalScore: number
  breakdown: any
  esScoreNormalized: number
  customScoreNormalized: number
}> {
  // Normalize ES score using percentile-based approach for better distribution
  const esScoreNormalized = normalizeESScores([esScore], esScores)[0]

  // Extract candidate data for custom scoring
  const candidateData = {
    textScore: esScoreNormalized,
    requiredSkills: jobRequirements.skills?.map((s: any) => s.name) || [],
    candidateSkills: candidate.skills?.map((s: any) => s.name) || [],
    locationMatch:
      candidate.location_id === jobRequirements.location_id
        ? 1.0
        : candidate.location_province === jobRequirements.location_province
          ? 0.7
          : 0.0,
    experienceYears: candidate.years_of_experience || 0,
    expectedExperience: jobRequirements.experience_level || 0,
    profileUpdatedAtMs: candidate.last_active_at ? new Date(candidate.last_active_at).getTime() : undefined,
    isLookingForJob: candidate.is_looking_for_job || false,
    candidateRemotePreference: candidate.prefers_remote || false,
    jobRemoteAllowed: jobRequirements.is_remote_allowed || false,
    jobRemotePercentage: jobRequirements.remote_percentage || 0,
    candidateFlexiblePreference: candidate.prefers_flexible_hours || false,
    jobFlexibleHours: jobRequirements.flexible_hours || false,
    candidateDesiredBenefits: candidate.desired_benefits || [],
    jobBenefits: jobRequirements.job_benefits_type || [],
    candidatePreferredCategories: candidate.preferred_categories || [],
    jobCategories: jobRequirements.job_category || []
  }

  // Compute custom score components
  const customComponents = computeScoreComponents(candidateData)

  // Apply experiment-specific weights if provided, otherwise use dynamic weights based on job category
  let weights = DEFAULT_SCORE_WEIGHTS
  if (experimentId) {
    weights = getExperimentWeights(experimentId)
  } else if (jobRequirements.job_category?.length > 0) {
    weights = getDynamicWeights(jobRequirements.job_category)
  }

  // Calculate weighted custom score
  const customScoreRaw =
    customComponents.text * weights.text +
    customComponents.skills * weights.skills +
    customComponents.location * weights.location +
    customComponents.experience * weights.experience +
    customComponents.recency * weights.recency +
    customComponents.activity * weights.activity +
    customComponents.availability * weights.availability +
    customComponents.work_arrangement * weights.work_arrangement +
    customComponents.benefits * weights.benefits +
    customComponents.category * weights.category

  const customScoreNormalized = Math.max(0, Math.min(1, customScoreRaw))

  // Hybrid scoring: weighted combination
  const finalScore =
    esScoreNormalized * HYBRID_SCORING_CONFIG.esWeight + customScoreNormalized * HYBRID_SCORING_CONFIG.customWeight

  // Create detailed breakdown for explainability
  const breakdown = HYBRID_SCORING_CONFIG.enableDetailedExplain ? formatBreakdown(customComponents, weights) : null

  return {
    finalScore,
    breakdown,
    esScoreNormalized,
    customScoreNormalized
  }
}

/**
 * Get experiment-specific scoring weights for A/B testing
 */
function getExperimentWeights(experimentId: string): typeof DEFAULT_SCORE_WEIGHTS {
  // Simple A/B testing configuration
  const experiments: Record<string, Partial<typeof DEFAULT_SCORE_WEIGHTS>> = {
    exp_skills_priority: {
      skills: 0.45, // Increase skills weight
      experience: 0.08, // Reduce experience weight
      location: 0.12 // Reduce location weight
    },
    exp_experience_focus: {
      skills: 0.25, // Reduce skills weight
      experience: 0.25, // Increase experience weight
      location: 0.15 // Keep location
    },
    exp_location_priority: {
      skills: 0.3, // Standard skills
      experience: 0.1, // Standard experience
      location: 0.25 // Increase location weight
    }
  }

  return { ...DEFAULT_SCORE_WEIGHTS, ...(experiments[experimentId] || {}) }
}

export const matchingService = {
  /**
   * Return candidates for a job with enhanced scoring and explanation
   * Automatic matching based on job requirements - no manual filters needed
   */
  async matchCandidatesForJob(jobId: string, size = 50, minScore = 0, experimentId?: string) {
    const cacheKey = `matching:candidates:job:${jobId}:size:${size}:minScore:${minScore}`
    const cacheHit = await redisService.get(cacheKey)
    if (cacheHit) {
      return JSON.parse(cacheHit)
    }

    try {
      console.log(`🔍 [Matching] Processing job ${jobId}`)
      // Get job details first for enhanced matching calculations
      const job = await elasticsearchService.getById({
        index: elasticsearchService.getIndexName('jobs'),
        id: jobId
      })

      console.log(`🔍 [Matching] Job found:`, !!job, job?.title)
      if (!job) {
        throw new Error(`Job ${jobId} not found`)
      }

      // Sử dụng phương thức enhanced từ ES service - automatic matching from job content only
      const result = await elasticsearchService.matchCandidatesForJobEnhanced(jobId, size)

      // elasticsearchService.normalizeSearchResponse returns { took, total, hits }
      // where hits = [{ id, _source, _score }, ...]. Normalize to the expected
      // matching response shape used by frontend.
      const hits = Array.isArray((result as any).hits) ? (result as any).hits : []

      // Min-max normalization for consistent scoring across results
      const rawScores = hits.map((h: any) => (typeof h._score === 'number' ? h._score : 0))
      const rawMinScore = rawScores.length ? Math.min(...rawScores) : 0
      const rawMaxScore = rawScores.length ? Math.max(...rawScores) : rawMinScore

      const candidates = hits.map((h: any) => {
        const scoreRaw = typeof h._score === 'number' ? h._score : 0

        // Compute ES normalized score in 0..1 using min-max, with robust fallback when all scores equal.
        let esNormalized = 0
        if (rawScores.length === 0) {
          esNormalized = 0
        } else if (rawMaxScore === rawMinScore) {
          // All ES raw scores identical — avoid mapping all to 100%.
          // Give a neutral middle value for non-zero scores so business signals can differentiate.
          esNormalized = scoreRaw > 0 ? 0.5 : 0
        } else {
          esNormalized = Math.max(0, Math.min(1, (scoreRaw - rawMinScore) / (rawMaxScore - rawMinScore)))
        }

        // Compute custom multi-dimensional score (0..1) from job/profile dimensions
        const dimensions = this.calculateMatchingDimensions(job, h._source)
        const customScore = this.calculateMultiDimensionalScore(job, h._source, dimensions)

        // Hybrid final score using configured weights (es vs custom business logic)
        const finalRaw =
          esNormalized * HYBRID_SCORING_CONFIG.esWeight + customScore * HYBRID_SCORING_CONFIG.customWeight
        const score_percent = normalizeScore(finalRaw)

        // Calculate enhanced explanations
        const quality = this.assessMatchQuality(dimensions)
        const reasons = this.generateMatchReasons(job, h._source, dimensions)

        return {
          id: h.id,
          score_percent,
          _score: h._score,
          _source: h._source,
          explanation: {
            confidence: quality.overall === 'excellent' ? 'high' : quality.overall === 'good' ? 'medium' : 'low',
            reasons,
            quality,
            dimensions,
            data_completeness: dimensions.completeness,
            text_match: Math.max(0, Math.min(100, Math.round(esNormalized * 100))),
            overall_score: score_percent
          }
        }
      })

      // Adaptive threshold strategy
      const jobCompleteness = this.calculateJobCompleteness(job)
      const adaptiveThreshold = this.getAdaptiveThreshold(job, candidates.length, jobCompleteness)

      // Use provided minScore or adaptive threshold
      // Accept both percentage (0..100) and fractional (0..1) values from the UI:
      // - If frontend sends 0.82 treat as 82% (legacy/JS slider might send fractional)
      // - If frontend sends 82 treat as 82%
      // If minScore is explicitly set to 0, return all candidates
      // If minScore is undefined/null, use adaptive threshold
      const normalizeRequestedMin = (val: any) => {
        if (typeof val !== 'number' || Number.isNaN(val)) return undefined
        if (val >= 0 && val <= 1) return Math.round(val * 100) // fractional -> percent
        return Math.round(val)
      }

      const requestedThreshold = normalizeRequestedMin(minScore)
      const effectiveThreshold =
        requestedThreshold !== undefined && requestedThreshold >= 0 ? requestedThreshold : adaptiveThreshold

      // DEBUG logging: thresholds and candidate scores to trace UI/backend mismatch
      try {
        console.log(
          `🔍 [Matching][DEBUG] job=${jobId} requestedThreshold=${requestedThreshold} adaptiveThreshold=${adaptiveThreshold} effectiveThreshold=${effectiveThreshold}`
        )
        const snapshot = candidates.map((c: any) => ({ id: c.id, score: c.score_percent })).slice(0, 50)
        console.log(`🔍 [Matching][DEBUG] candidateScores(first50)=`, JSON.stringify(snapshot))
      } catch (e) {
        console.warn('🔍 [Matching][DEBUG] logging failed', e)
      }

      const filteredCandidates = candidates.filter((c: any) => c.score_percent >= effectiveThreshold)

      console.log(
        `🔍 [Matching] Job ${jobId}: ${candidates.length} candidates found, ${filteredCandidates.length} after filtering (threshold: ${effectiveThreshold})`
      )

      const filteredResult = {
        jobId,
        total: filteredCandidates.length,
        candidates: filteredCandidates.slice(0, size)
      }

      // Cache filtered results for 5 minutes (shorter TTL for personalized results)
      try {
        await redisService.set(cacheKey, JSON.stringify(filteredResult), 5 * 60)
      } catch (e) {
        // Non-fatal
      }

      return filteredResult
    } catch (error) {
      console.error(`Enhanced candidate matching failed for job ${jobId}:`, error)
      throw error
    }
  },

  // ========================================
  // ENHANCED MATCHING UTILITIES
  // ========================================

  /**
   * Calculate profile completeness score (0-1)
   * Higher scores indicate more complete profile data
   */
  calculateProfileCompleteness(profile: any): number {
    let score = 0
    const weights = {
      hasSkills: 0.3,
      hasExperience: 0.25,
      hasLocation: 0.15,
      hasHeadline: 0.1,
      hasBio: 0.1,
      isActive: 0.1
    }

    if (profile.skills_flat?.length > 0) score += weights.hasSkills
    if (profile.years_of_experience > 0) score += weights.hasExperience
    if (profile.location_id) score += weights.hasLocation
    if (profile.headline?.trim()) score += weights.hasHeadline
    if (profile.bio?.trim()) score += weights.hasBio
    if (profile.is_looking_for_job) score += weights.isActive

    return Math.min(1, Math.max(0, score))
  },

  /**
   * Calculate job completeness score (0-1)
   * Higher scores indicate more complete job requirements
   */
  calculateJobCompleteness(job: any): number {
    let score = 0
    const weights = {
      hasSkills: 0.25,
      hasExperience: 0.2,
      hasLocation: 0.15,
      hasDescription: 0.15,
      hasCategories: 0.1,
      hasBenefits: 0.1,
      hasWorkArrangements: 0.05
    }

    if (job.skills?.length > 0) score += weights.hasSkills
    if (job.experience_level || job.min_experience_years) score += weights.hasExperience
    if (job.location_id) score += weights.hasLocation
    if (job.description?.trim()) score += weights.hasDescription
    if (job.job_category?.length > 0) score += weights.hasCategories
    if (job.job_benefits_type?.length > 0) score += weights.hasBenefits
    if (job.is_remote_allowed !== undefined || job.flexible_hours !== undefined) score += weights.hasWorkArrangements

    return Math.min(1, Math.max(0, score))
  },

  /**
   * Get job type compatibility score based on candidate experience
   */
  getJobTypeCompatibility(jobType: string, candidateExperience: number): number {
    if (!jobType || candidateExperience < 0) return 0.5

    const compatibilityMap: Record<string, { minExp?: number; maxExp?: number; score: number }> = {
      internship: { maxExp: 1, score: candidateExperience <= 1 ? 1.0 : 0.3 },
      entry_level: { maxExp: 3, score: candidateExperience <= 3 ? 0.9 : candidateExperience <= 5 ? 0.6 : 0.2 },
      mid_level: { minExp: 2, maxExp: 7, score: candidateExperience >= 2 && candidateExperience <= 7 ? 0.8 : 0.4 },
      senior: { minExp: 5, score: candidateExperience >= 5 ? 0.7 : 0.3 },
      executive: { minExp: 10, score: candidateExperience >= 10 ? 0.6 : 0.2 },
      contract: { score: 0.8 }, // Contract jobs are flexible
      freelance: { score: 0.8 }, // Freelance jobs are flexible
      part_time: { score: 0.7 }, // Part-time jobs are flexible
      full_time: { score: 0.6 } // Full-time jobs are standard
    }

    const mapping = compatibilityMap[jobType.toLowerCase()] || { score: 0.5 }
    return mapping.score
  },

  /**
   * Calculate multi-dimensional matching score with adaptive weights
   */
  calculateMultiDimensionalScore(job: any, profile: any, dimensions: MatchingDimensions): number {
    // Adaptive weights based on data availability
    const availableDimensions = Object.values(dimensions).filter((v) => v > 0).length

    const baseWeights = {
      experience: dimensions.experience > 0 ? 0.25 : 0,
      location: dimensions.location > 0 ? 0.2 : 0,
      skills: dimensions.skills > 0 ? 0.3 : 0,
      preferences: dimensions.preferences > 0 ? 0.15 : 0,
      activity: 0.05, // Always include
      completeness: 0.05 // Always include
    }

    // Normalize weights to sum to 1
    const totalWeight = Object.values(baseWeights).reduce((a, b) => a + b, 0)
    const weights = Object.fromEntries(Object.entries(baseWeights).map(([key, value]) => [key, value / totalWeight]))

    // Calculate weighted score
    const score =
      dimensions.experience * weights.experience +
      dimensions.location * weights.location +
      dimensions.skills * weights.skills +
      dimensions.preferences * weights.preferences +
      dimensions.activity * weights.activity +
      dimensions.completeness * weights.completeness

    // Boost score if profile is highly complete and multiple dimensions match
    let boost = 1.0
    if (dimensions.completeness >= 0.8 && availableDimensions >= 3) {
      boost = 1.1 // 10% boost for complete profiles with good matches
    } else if (dimensions.completeness >= 0.6 && availableDimensions >= 2) {
      boost = 1.05 // 5% boost for moderately complete profiles
    }

    return Math.min(1, score * boost)
  },

  /**
   * Calculate matching dimensions for a job-profile pair
   */
  calculateMatchingDimensions(job: any, profile: any): MatchingDimensions {
    const dimensions: MatchingDimensions = {
      experience: 0,
      location: 0,
      skills: 0,
      preferences: 0,
      activity: 0,
      completeness: this.calculateProfileCompleteness(profile)
    }

    // Experience matching
    if (job.experience_level || job.min_experience_years) {
      const requiredExp = job.min_experience_years || Math.max(0, job.experience_level * 0.5)
      const candidateExp = profile.years_of_experience || 0

      if (candidateExp >= requiredExp) {
        // Perfect match or better
        dimensions.experience = candidateExp >= requiredExp * 1.5 ? 1.0 : candidateExp >= requiredExp * 1.2 ? 0.9 : 0.8
      } else if (candidateExp >= requiredExp * 0.7) {
        // Close match
        dimensions.experience = 0.6
      } else {
        // Too little experience
        dimensions.experience = Math.max(0.1, candidateExp / requiredExp)
      }
    }

    // Location matching
    if (job.location_id && profile.location_id) {
      if (job.location_id === profile.location_id) {
        dimensions.location = 1.0 // Exact match
      } else if (job.location_province && profile.location_province === job.location_province) {
        dimensions.location = 0.7 // Same province
      } else {
        dimensions.location = 0.3 // Different location
      }
    }

    // Skills matching
    if (job.skills?.length > 0 && profile.skills_flat?.length > 0) {
      const jobSkills = job.skills.map((s: any) => s.name?.toLowerCase()).filter(Boolean)
      const profileSkills = profile.skills_flat.map((s: string) => s.toLowerCase())

      const matchingSkills = jobSkills.filter((skill: string) =>
        profileSkills.some((pSkill: string) => pSkill.includes(skill) || skill.includes(pSkill))
      )

      dimensions.skills = jobSkills.length > 0 ? matchingSkills.length / jobSkills.length : 0
    }

    // Preferences matching (benefits, work arrangements, categories)
    let preferenceScore = 0
    let preferenceCount = 0

    // Benefits alignment
    if (job.job_benefits_type?.length > 0 && profile.desired_benefits?.length > 0) {
      const matchingBenefits = job.job_benefits_type.filter((benefit: string) =>
        profile.desired_benefits.includes(benefit)
      )
      preferenceScore += matchingBenefits.length / job.job_benefits_type.length
      preferenceCount++
    }

    // Category alignment
    if (job.job_category?.length > 0 && profile.preferred_categories?.length > 0) {
      const matchingCategories = job.job_category.filter((category: string) =>
        profile.preferred_categories.includes(category)
      )
      preferenceScore += matchingCategories.length / job.job_category.length
      preferenceCount++
    }

    // Work arrangement preferences
    if (job.is_remote_allowed && profile.prefers_remote) {
      preferenceScore += 1.0
      preferenceCount++
    }
    if (job.flexible_hours && profile.prefers_flexible_hours) {
      preferenceScore += 1.0
      preferenceCount++
    }

    dimensions.preferences = preferenceCount > 0 ? preferenceScore / preferenceCount : 0

    // Activity score (based on recency)
    if (profile.last_active_at) {
      const daysSinceActive = (Date.now() - new Date(profile.last_active_at).getTime()) / (1000 * 60 * 60 * 24)
      dimensions.activity = daysSinceActive <= 7 ? 1.0 : daysSinceActive <= 30 ? 0.7 : daysSinceActive <= 90 ? 0.4 : 0.1
    } else {
      dimensions.activity = 0.5 // Default for profiles without activity data
    }

    return dimensions
  },

  /**
   * Determine confidence level for a match
   */
  determineConfidence(score: number, dataCompleteness: number, dimensionsUsed: number): 'high' | 'medium' | 'low' {
    if (score >= 70 && dataCompleteness >= 0.7 && dimensionsUsed >= 3) {
      return 'high'
    }
    if (score >= 50 && dataCompleteness >= 0.5) {
      return 'medium'
    }
    return 'low'
  },

  /**
   * Generate human-readable reasons for a match (Vietnam context)
   */
  generateMatchReasons(job: any, profile: any, dimensions: MatchingDimensions): string[] {
    const reasons: string[] = []

    // Experience - detailed Vietnamese messaging
    if (dimensions.experience >= 0.8) {
      reasons.push(`Kinh nghiệm phù hợp (${profile.years_of_experience || 0} năm)`)
    } else if (dimensions.experience >= 0.6) {
      reasons.push(`Kinh nghiệm khá phù hợp`)
    }

    // Location - flexible Vietnam commuting context
    if (dimensions.location >= 0.9) {
      reasons.push(`Cùng vị trí làm việc`)
    } else if (dimensions.location >= 0.6) {
      reasons.push(`Cùng tỉnh/thành phố`)
    } else if (dimensions.location >= 0.3) {
      reasons.push(`Có thể di chuyển đến làm việc`)
    }

    // Skills - detailed percentage
    if (dimensions.skills >= 0.7) {
      reasons.push(`Kỹ năng phù hợp (${Math.round(dimensions.skills * 100)}%)`)
    } else if (dimensions.skills >= 0.4) {
      reasons.push(`Có một số kỹ năng liên quan`)
    }

    // Preferences - work arrangement and benefits
    if (dimensions.preferences >= 0.6) {
      reasons.push(`Sở thích làm việc phù hợp`)
    }

    // Profile completeness
    if (dimensions.completeness >= 0.8) {
      reasons.push(`Hồ sơ đầy đủ và chi tiết`)
    }

    // Activity level
    if (dimensions.activity >= 0.8) {
      reasons.push(`Đang tích cực tìm việc`)
    } else if (dimensions.activity >= 0.5) {
      reasons.push(`Profile có dấu hiệu hoạt động`)
    }

    return reasons.length > 0 ? reasons : ['Phù hợp tổng thể']
  },

  /**
   * Assess overall match quality with actionable insights
   */
  assessMatchQuality(dimensions: MatchingDimensions): MatchQuality {
    const quality: MatchQuality = {
      overall: 'fair',
      strengths: [],
      concerns: [],
      recommendations: []
    }

    // Assess strengths
    if (dimensions.skills >= 0.7) quality.strengths.push('Kỹ năng xuất sắc')
    if (dimensions.experience >= 0.8) quality.strengths.push('Kinh nghiệm phù hợp')
    if (dimensions.completeness >= 0.8) quality.strengths.push('Hồ sơ hoàn thiện')
    if (dimensions.activity >= 0.8) quality.strengths.push('Tích cực tìm việc')
    if (dimensions.preferences >= 0.6) quality.strengths.push('Sở thích làm việc phù hợp')

    // Assess concerns
    if (dimensions.location < 0.6) quality.concerns.push('Vị trí địa lý khác biệt')
    if (dimensions.skills < 0.4) quality.concerns.push('Thiếu kỹ năng chuyên môn')
    if (dimensions.experience < 0.6) quality.concerns.push('Kinh nghiệm hạn chế')
    if (dimensions.completeness < 0.5) quality.concerns.push('Hồ sơ chưa đầy đủ')

    // Generate recommendations
    if (dimensions.location < 0.6) {
      quality.recommendations.push('Xem xét hỗ trợ di chuyển hoặc remote work')
    }
    if (dimensions.skills < 0.7) {
      quality.recommendations.push('Đánh giá nhu cầu đào tạo bổ sung')
    }
    if (dimensions.experience < 0.6) {
      quality.recommendations.push('Xem xét vai trò junior hoặc training program')
    }
    if (dimensions.completeness < 0.5) {
      quality.recommendations.push('Khuyến khích candidate cập nhật hồ sơ')
    }

    // Overall assessment based on weighted score
    const overallScore = this.calculateOverallScore(dimensions)
    if (overallScore >= 80) quality.overall = 'excellent'
    else if (overallScore >= 65) quality.overall = 'good'
    else if (overallScore >= 45) quality.overall = 'fair'
    else quality.overall = 'poor'

    return quality
  },

  /**
   * Calculate overall score from dimensions
   */
  calculateOverallScore(dimensions: MatchingDimensions): number {
    const weights = {
      experience: 0.25,
      location: 0.15,
      skills: 0.35,
      preferences: 0.1,
      activity: 0.1,
      completeness: 0.05
    }

    return Math.min(
      100,
      Math.max(
        0,
        dimensions.experience * weights.experience * 100 +
          dimensions.location * weights.location * 100 +
          dimensions.skills * weights.skills * 100 +
          dimensions.preferences * weights.preferences * 100 +
          dimensions.activity * weights.activity * 100 +
          dimensions.completeness * weights.completeness * 100
      )
    )
  },

  /**
   * Get adaptive threshold based on job completeness and candidate availability
   */
  getAdaptiveThreshold(job: any, availableCandidates: number, jobCompleteness: number): number {
    const baseThreshold = 30

    // If very few candidates available, lower threshold
    if (availableCandidates < 5) {
      return Math.max(5, baseThreshold - 25)
    }

    if (availableCandidates < 10) {
      return Math.max(10, baseThreshold - 20)
    }

    // If job has incomplete data, be more lenient
    if (jobCompleteness < 0.3) {
      return Math.max(15, baseThreshold - 15)
    }

    if (jobCompleteness < 0.5) {
      return Math.max(20, baseThreshold - 10)
    }

    // If job is highly complete and many candidates, use higher threshold
    if (jobCompleteness >= 0.7 && availableCandidates > 50) {
      return Math.min(50, baseThreshold + 10)
    }

    return baseThreshold
  }
}
