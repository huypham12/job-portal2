export type ScoreComponents = {
  text: number
  skills: number
  location: number
  experience: number
  recency: number
  activity: number
  availability: number
  work_arrangement: number // Work arrangement compatibility (remote, flexible hours)
  benefits: number // Benefits alignment
  category: number // Category/industry alignment
}

// Optimized weights for candidate-job matching (recruiters finding candidates)
export const DEFAULT_SCORE_WEIGHTS = {
  text: 0.15, // Reduced - text matching less critical for candidate-job fit
  skills: 0.35, // Increased - most important factor for job fit
  location: 0.15, // Increased - commuting logistics matter
  experience: 0.12, // Increased - experience compatibility crucial
  recency: 0.03, // Reduced - job age not relevant for candidate matching
  activity: 0.08, // Increased - recently active profiles preferred
  availability: 0.05, // Increased - must be looking for jobs
  work_arrangement: 0.05, // Reduced - still important but not top priority
  benefits: 0.02, // Reduced - nice to have but not critical
  category: 0.0 // Removed - industry alignment less important than skills/experience
}

/**
 * Simple gaussian function in [0,1] with peak = 1 at mean.
 * Useful for modelling "sweet spots" (experience, recency, activity).
 */
function gaussian(x: number, mean: number, sigma: number): number {
  if (!Number.isFinite(x) || !Number.isFinite(mean) || !Number.isFinite(sigma) || sigma <= 0) {
    return 0
  }
  const z = (x - mean) / sigma
  return Math.exp(-0.5 * z * z)
}

/**
 * Compute raw score components from input data.
 * This function should be deterministic and testable.
 *
 * Scoring logic:
 *  - text: logistic normalization of ES relevance score (0..1)
 *  - skills: overlap ratio between required and candidate skills (0..1)
 *  - location: hierarchical scoring (exact=1.0, province=0.7, different=0.3)
 *  - experience: gaussian mapping around target experience years (0..1)
 *  - recency: gaussian decay based on job posting age (newer = higher)
 *  - activity: gaussian decay based on profile update recency (recent = higher)
 *  - availability: binary boost for actively job-seeking candidates (1 or 0)
 *  - work_arrangement: rewards jobs with good arrangements + preference bonus
 *  - benefits: fuzzy overlap between desired and offered benefits
 *  - category: fuzzy alignment between preferred and job categories
 *
 * NOTE: Do not perform ES calls here. Accept normalized inputs if possible.
 */
export function computeScoreComponents(input: {
  textScore?: number // raw ES text score (optional)
  requiredSkills?: string[]
  candidateSkills?: string[]
  locationMatch?: number // 0..1
  experienceYears?: number
  expectedExperience?: number
  postedAtMs?: number
  profileUpdatedAtMs?: number // from profiles.updated_at
  isLookingForJob?: boolean // from profiles.is_looking_for_job
  // New work arrangement parameters
  candidateRemotePreference?: boolean // Does candidate prefer remote work?
  jobRemoteAllowed?: boolean // Does job allow remote work?
  jobRemotePercentage?: number // Job's remote percentage (0-100)
  candidateFlexiblePreference?: boolean // Does candidate prefer flexible hours?
  jobFlexibleHours?: boolean // Does job offer flexible hours?
  // New benefits parameters
  candidateDesiredBenefits?: string[] // Benefits candidate wants
  jobBenefits?: string[] // Benefits job offers
  // New category parameters
  candidatePreferredCategories?: string[] // Categories candidate prefers
  jobCategories?: string[] // Job categories
}): ScoreComponents {
  const {
    textScore = 0,
    requiredSkills = [],
    candidateSkills = [],
    locationMatch = 0,
    experienceYears = 0,
    expectedExperience = 0,
    postedAtMs,
    profileUpdatedAtMs,
    isLookingForJob = true,
    // New work arrangement parameters
    candidateRemotePreference = false,
    jobRemoteAllowed = false,
    jobRemotePercentage = 0,
    candidateFlexiblePreference = false,
    jobFlexibleHours = false,
    // New benefits parameters
    candidateDesiredBenefits = [],
    jobBenefits = [],
    // New category parameters
    candidatePreferredCategories = [],
    jobCategories = []
  } = input

  // === SKILLS: improved overlap ratio with exact matching (0..1) ===
  // Validate and normalize skills arrays (from joined tables, may contain null/undefined/empty)
  const validRequiredSkills = Array.isArray(requiredSkills)
    ? requiredSkills.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    : []
  const validCandidateSkills = Array.isArray(candidateSkills)
    ? candidateSkills.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    : []

  let skills = 0
  if (validRequiredSkills.length === 0) {
    // If no skills required, give moderate score based on candidate skills
    skills = validCandidateSkills.length > 0 ? 0.5 : 0.3
  } else {
    // Count exact matches (case-insensitive)
    const intersectionCount = validRequiredSkills.filter((required) =>
      validCandidateSkills.some((candidate) => candidate.toLowerCase() === required.toLowerCase())
    ).length

    // Calculate overlap ratio - candidate must have at least 50% of required skills
    skills = Math.min(1.0, (intersectionCount / validRequiredSkills.length) * 2)
  }

  // === EXPERIENCE: strict compatibility check for candidate-job matching ===
  // expectedExperience comes from jobs.experience_level (level scale, e.g., 1-5)
  // For matching, we need stricter compatibility than for general search
  const experienceYearsSafe = Number.isFinite(experienceYears) ? Math.max(0, experienceYears) : 0

  let experience = 0
  if (expectedExperience && expectedExperience > 0) {
    // Map experience level to years: level 1 = 0-2 years, level 2 = 2-4 years, etc.
    const minYearsForLevel = (expectedExperience - 1) * 2
    const maxYearsForLevel = expectedExperience * 2

    if (experienceYearsSafe >= minYearsForLevel && experienceYearsSafe <= maxYearsForLevel + 2) {
      // Perfect match: within level range
      experience = 1.0
    } else if (experienceYearsSafe >= minYearsForLevel - 1 && experienceYearsSafe <= maxYearsForLevel + 3) {
      // Good match: slightly outside range
      experience = 0.7
    } else if (experienceYearsSafe < minYearsForLevel) {
      // Under-qualified: penalize more
      experience = Math.max(0.1, (experienceYearsSafe / minYearsForLevel) * 0.5)
    } else {
      // Over-qualified: still acceptable but lower score
      experience = Math.max(0.3, 1.0 - (experienceYearsSafe - maxYearsForLevel) / maxYearsForLevel)
    }
  } else {
    // No experience requirement specified
    experience = experienceYearsSafe > 0 ? 0.8 : 0.5
  }

  // === RECENCY: gaussian decay based on job age in days ===
  // Newer jobs get higher scores; older jobs decay gradually rather than hard cut.
  let recency = 0
  if (postedAtMs) {
    const ageDays = Math.max(0, (Date.now() - postedAtMs) / (1000 * 60 * 60 * 24))
    // mean = 0 (just posted is best), sigma ~= 45 days → usable ~3 months
    const sigmaDays = 45
    recency = gaussian(ageDays, 0, sigmaDays)
  }

  // === ACTIVITY: gaussian decay based on days since last profile update ===
  // Very recent updates get strong boost, slowly decays after ~1–2 months.
  let activity = 0
  if (profileUpdatedAtMs) {
    const updateDays = Math.max(0, (Date.now() - profileUpdatedAtMs) / (1000 * 60 * 60 * 24))
    const sigmaActivity = 30
    activity = gaussian(updateDays, 0, sigmaActivity)
  }

  // === TEXT: normalize ES _score using logistic function for better distribution ===
  // ES scores can be very high, logistic function provides better 0-1 mapping
  // Higher scores get closer to 1, lower scores decay to 0
  const text = textScore > 0 ? 1 / (1 + Math.exp(-textScore * 0.1)) : 0

  // === LOCATION: hierarchical scoring based on match level ===
  // 1.0 = exact location match (same province/city + district)
  // 0.7 = same province, different district
  // 0.3 = different province but same region/country
  // 0.0 = no location match
  // If no location preference, give moderate score for candidates with any location
  const location = locationMatch > 0 ? Math.max(0.1, Math.min(1, locationMatch)) : 0.5

  // === AVAILABILITY: boost for actively looking candidates (binary) ===
  const availability = isLookingForJob ? 1 : 0

  // === WORK ARRANGEMENT: strict preference alignment for candidate-job matching ===
  // Only boost when both candidate and job have compatible preferences
  let work_arrangement = 0.0

  // Remote work compatibility
  if (candidateRemotePreference && (jobRemoteAllowed || jobRemotePercentage > 50)) {
    work_arrangement += 0.6 // Strong boost for remote alignment
  } else if (!candidateRemotePreference && !jobRemoteAllowed && jobRemotePercentage < 20) {
    work_arrangement += 0.4 // Moderate boost for office alignment
  } else if (!candidateRemotePreference && (jobRemoteAllowed || jobRemotePercentage > 50)) {
    work_arrangement += 0.1 // Small boost - candidate accepts some remote
  }

  // Flexible hours compatibility
  if (candidateFlexiblePreference && jobFlexibleHours) {
    work_arrangement += 0.4 // Strong boost for flexible alignment
  } else if (!candidateFlexiblePreference && !jobFlexibleHours) {
    work_arrangement += 0.2 // Moderate boost for standard hours alignment
  }

  work_arrangement = Math.min(1.0, work_arrangement)

  // === BENEFITS: simple overlap check (simplified for performance) ===
  const validDesiredBenefits = Array.isArray(candidateDesiredBenefits)
    ? candidateDesiredBenefits.filter((b): b is string => typeof b === 'string' && b.trim().length > 0)
    : []
  const validJobBenefits = Array.isArray(jobBenefits)
    ? jobBenefits.filter((b): b is string => typeof b === 'string' && b.trim().length > 0)
    : []

  let benefits = 0
  if (validDesiredBenefits.length > 0 && validJobBenefits.length > 0) {
    // Simple exact match count
    const matchCount = validDesiredBenefits.filter((desired) =>
      validJobBenefits.some((job) => job.toLowerCase() === desired.toLowerCase())
    ).length
    benefits = matchCount > 0 ? Math.min(1.0, matchCount / validDesiredBenefits.length) : 0
  } else {
    // No preferences or no benefits offered
    benefits = 0.0
  }

  // === CATEGORY: removed for matching (weight = 0) ===
  // Category alignment not prioritized in candidate-job matching
  const category = 0.0

  return {
    text,
    skills,
    location,
    experience,
    recency,
    activity,
    availability,
    work_arrangement,
    benefits,
    category
  }
}

/**
 * Normalize a raw combined score (0..1 expected) into 0..100 integer percent.
 * Caller should aggregate weighted raw components first, then call normalizeScore.
 */
export function normalizeScore(raw: number): number {
  const clamped = Math.max(0, Math.min(1, raw))
  return Math.round(clamped * 100)
}
