/**
 * Recency Scoring Module
 *
 * Handles time-based scoring for job freshness, profile activity, and temporal relevance.
 */

/**
 * Recency score levels
 */
export enum RecencyLevel {
  VERY_RECENT = 1.0,    // < 1 day
  RECENT = 0.8,         // 1-3 days
  FRESH = 0.6,          // 3-7 days
  MODERATE = 0.4,       // 1-2 weeks
  STALE = 0.2,          // 2-4 weeks
  OLD = 0.1,            // 1-3 months
  ARCHIVED = 0.0        // > 3 months
}

/**
 * Compute recency score for a job posting
 */
export function computeJobRecencyScore(
  postedAt: Date | string,
  expiresAt?: Date | string,
  currentTime: Date = new Date()
): {
  score: number
  level: RecencyLevel
  daysSincePosted: number
  daysUntilExpiry: number
  freshness: 'very_recent' | 'recent' | 'fresh' | 'moderate' | 'stale' | 'old' | 'archived'
  urgency: 'immediate' | 'high' | 'medium' | 'low' | 'expired'
} {
  const postedDate = new Date(postedAt)
  const expiryDate = expiresAt ? new Date(expiresAt) : null

  const daysSincePosted = Math.floor((currentTime.getTime() - postedDate.getTime()) / (1000 * 60 * 60 * 24))
  const daysUntilExpiry = expiryDate
    ? Math.floor((expiryDate.getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24))
    : Infinity

  // Determine freshness level
  let freshness: typeof RecencyLevel[keyof typeof RecencyLevel]
  let freshnessLabel: 'very_recent' | 'recent' | 'fresh' | 'moderate' | 'stale' | 'old' | 'archived'

  if (daysSincePosted < 1) {
    freshness = RecencyLevel.VERY_RECENT
    freshnessLabel = 'very_recent'
  } else if (daysSincePosted <= 3) {
    freshness = RecencyLevel.RECENT
    freshnessLabel = 'recent'
  } else if (daysSincePosted <= 7) {
    freshness = RecencyLevel.FRESH
    freshnessLabel = 'fresh'
  } else if (daysSincePosted <= 14) {
    freshness = RecencyLevel.MODERATE
    freshnessLabel = 'moderate'
  } else if (daysSincePosted <= 28) {
    freshness = RecencyLevel.STALE
    freshnessLabel = 'stale'
  } else if (daysSincePosted <= 90) {
    freshness = RecencyLevel.OLD
    freshnessLabel = 'old'
  } else {
    freshness = RecencyLevel.ARCHIVED
    freshnessLabel = 'archived'
  }

  // Determine urgency based on expiry
  let urgency: 'immediate' | 'high' | 'medium' | 'low' | 'expired'
  if (daysUntilExpiry < 0) {
    urgency = 'expired'
    freshness = 0 // Expired jobs get zero recency score
  } else if (daysUntilExpiry <= 1) {
    urgency = 'immediate'
  } else if (daysUntilExpiry <= 3) {
    urgency = 'high'
  } else if (daysUntilExpiry <= 7) {
    urgency = 'medium'
  } else {
    urgency = 'low'
  }

  return {
    score: freshness,
    level: freshness,
    daysSincePosted,
    daysUntilExpiry: daysUntilExpiry === Infinity ? -1 : daysUntilExpiry,
    freshness: freshnessLabel,
    urgency
  }
}

/**
 * Compute recency score for profile activity
 */
export function computeProfileRecencyScore(
  lastActiveAt: Date | string,
  createdAt?: Date | string,
  currentTime: Date = new Date()
): {
  score: number
  level: RecencyLevel
  daysSinceLastActive: number
  accountAgeDays: number
  activityLevel: 'very_active' | 'active' | 'moderate' | 'inactive' | 'dormant'
} {
  const lastActiveDate = new Date(lastActiveAt)
  const createdDate = createdAt ? new Date(createdAt) : null

  const daysSinceLastActive = Math.floor((currentTime.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24))
  const accountAgeDays = createdDate
    ? Math.floor((currentTime.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0

  // Determine activity level
  let activityLevel: RecencyLevel
  let activityLabel: 'very_active' | 'active' | 'moderate' | 'inactive' | 'dormant'

  if (daysSinceLastActive <= 1) {
    activityLevel = RecencyLevel.VERY_RECENT
    activityLabel = 'very_active'
  } else if (daysSinceLastActive <= 3) {
    activityLevel = RecencyLevel.RECENT
    activityLabel = 'active'
  } else if (daysSinceLastActive <= 7) {
    activityLevel = RecencyLevel.FRESH
    activityLabel = 'moderate'
  } else if (daysSinceLastActive <= 30) {
    activityLevel = RecencyLevel.MODERATE
    activityLabel = 'inactive'
  } else {
    activityLevel = RecencyLevel.STALE
    activityLabel = 'dormant'
  }

  // Boost score for newer accounts (they're more likely to be active job seekers)
  const accountFreshnessBonus = accountAgeDays <= 30 ? 0.1 :
                                accountAgeDays <= 90 ? 0.05 : 0

  const finalScore = Math.min(1, activityLevel + accountFreshnessBonus)

  return {
    score: finalScore,
    level: activityLevel,
    daysSinceLastActive,
    accountAgeDays,
    activityLevel: activityLabel
  }
}

/**
 * Compute application recency score
 */
export function computeApplicationRecencyScore(
  appliedAt: Date | string,
  currentTime: Date = new Date()
): {
  score: number
  level: RecencyLevel
  daysSinceApplied: number
  recencyLabel: 'just_applied' | 'recent' | 'moderate' | 'old' | 'stale'
} {
  const appliedDate = new Date(appliedAt)
  const daysSinceApplied = Math.floor((currentTime.getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24))

  let level: RecencyLevel
  let recencyLabel: 'just_applied' | 'recent' | 'moderate' | 'old' | 'stale'

  if (daysSinceApplied <= 1) {
    level = RecencyLevel.VERY_RECENT
    recencyLabel = 'just_applied'
  } else if (daysSinceApplied <= 7) {
    level = RecencyLevel.RECENT
    recencyLabel = 'recent'
  } else if (daysSinceApplied <= 14) {
    level = RecencyLevel.FRESH
    recencyLabel = 'moderate'
  } else if (daysSinceApplied <= 30) {
    level = RecencyLevel.MODERATE
    recencyLabel = 'old'
  } else {
    level = RecencyLevel.STALE
    recencyLabel = 'stale'
  }

  return {
    score: level,
    level,
    daysSinceApplied,
    recencyLabel
  }
}

/**
 * Combine multiple recency factors for overall temporal relevance
 */
export function computeCombinedRecencyScore(
  jobRecency: ReturnType<typeof computeJobRecencyScore>,
  profileRecency?: ReturnType<typeof computeProfileRecencyScore>,
  applicationRecency?: ReturnType<typeof computeApplicationRecencyScore>
): {
  score: number
  factors: {
    jobFreshness: number
    profileActivity: number
    applicationTiming: number
  }
  recommendation: string
} {
  const jobFreshness = jobRecency.score
  const profileActivity = profileRecency?.score || 0.5 // Default neutral
  const applicationTiming = applicationRecency ? applicationRecency.score : 0.5 // Default neutral

  // Weighted combination: job freshness is most important for candidates
  const combinedScore = (jobFreshness * 0.5) + (profileActivity * 0.3) + (applicationTiming * 0.2)

  let recommendation = ''
  if (combinedScore >= 0.8) {
    recommendation = 'Highly recommended - fresh opportunity with active candidate'
  } else if (combinedScore >= 0.6) {
    recommendation = 'Good match - reasonable timing for both parties'
  } else if (combinedScore >= 0.4) {
    recommendation = 'Fair match - consider follow-up for engagement'
  } else {
    recommendation = 'Low priority - timing may not be optimal'
  }

  return {
    score: combinedScore,
    factors: {
      jobFreshness,
      profileActivity,
      applicationTiming
    },
    recommendation
  }
}

/**
 * Get recency quality description
 */
export function getRecencyQuality(
  score: number,
  type: 'job' | 'profile' | 'application'
): {
  quality: 'excellent' | 'good' | 'fair' | 'poor'
  description: string
  actionNeeded?: string
} {
  if (score >= 0.8) {
    return {
      quality: 'excellent',
      description: type === 'job' ? 'Very fresh posting' :
                   type === 'profile' ? 'Highly active candidate' :
                   'Recent application'
    }
  }

  if (score >= 0.6) {
    return {
      quality: 'good',
      description: type === 'job' ? 'Recently posted' :
                   type === 'profile' ? 'Active candidate' :
                   'Recent application'
    }
  }

  if (score >= 0.4) {
    return {
      quality: 'fair',
      description: type === 'job' ? 'Moderately fresh' :
                   type === 'profile' ? 'Moderately active' :
                   'Somewhat recent application',
      actionNeeded: type === 'job' ? 'Consider if still actively hiring' :
                    type === 'profile' ? 'May need re-engagement' :
                    'Check application status'
    }
  }

  return {
    quality: 'poor',
    description: type === 'job' ? 'Old posting' :
                 type === 'profile' ? 'Inactive candidate' :
                 'Old application',
    actionNeeded: type === 'job' ? 'Verify if position is still open' :
                  type === 'profile' ? 'Consider re-engagement campaign' :
                  'Application may be stale'
  }
}

/**
 * Calculate time-based decay factor
 */
export function calculateTimeDecay(
  originalScore: number,
  ageInDays: number,
  halfLifeDays: number = 30
): number {
  // Exponential decay: score halves every halfLifeDays
  const decayFactor = Math.pow(0.5, ageInDays / halfLifeDays)
  return originalScore * decayFactor
}

/**
 * Get optimal posting times based on historical data (placeholder)
 */
export function getOptimalPostingTimes(): {
  bestDays: string[]
  bestHours: number[]
  reasoning: string
} {
  // This would be populated with real analytics data
  return {
    bestDays: ['Tuesday', 'Wednesday', 'Thursday'],
    bestHours: [9, 10, 11, 14, 15],
    reasoning: 'Based on historical application rates and candidate activity patterns'
  }
}
