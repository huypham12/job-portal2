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

export const DEFAULT_SCORE_WEIGHTS = {
  text: 0.25, // Reduced to make room for new components
  skills: 0.25, // Reduced to make room for new components
  location: 0.12,
  experience: 0.08,
  recency: 0.06,
  activity: 0.04,
  availability: 0.02,
  work_arrangement: 0.08, // New: Work arrangement preferences
  benefits: 0.06, // New: Benefits alignment
  category: 0.04 // New: Category/industry alignment
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
 * Pseudocode / intended behavior:
 *  - text: normalized relevance from ES (map ES score -> 0..1)
 *  - skills: overlap ratio between required and candidate skills (0..1)
 *  - location: exact/distance match (0..1)
 *  - experience: gaussian or piecewise mapping of years difference (0..1)
 *  - recency: decay function based on posted_at (0..1)
 *  - activity: recency of profile updates (within 30 days -> 1)
 *  - availability: boost for candidates actively looking for jobs (1 or 0)
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

  // === SKILLS: simple overlap ratio required vs candidate (0..1) ===
  // Validate and normalize skills arrays (from joined tables, may contain null/undefined/empty)
  const validRequiredSkills = Array.isArray(requiredSkills)
    ? requiredSkills.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    : []
  const validCandidateSkills = Array.isArray(candidateSkills)
    ? candidateSkills.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    : []

  const requiredCount = Math.max(1, validRequiredSkills.length)
  const intersectionCount = validRequiredSkills.filter((s) =>
    validCandidateSkills.some((cs) => cs.toLowerCase() === s.toLowerCase())
  ).length
  const skills = intersectionCount / requiredCount

  // === EXPERIENCE: gaussian around target years ===
  // expectedExperience comes from jobs.experience_level (level scale, e.g., 1-5)
  // We map it to a "target years" and give highest score around that, decreasing if
  // candidate is significantly under/over qualified.
  const experienceYearsSafe = Number.isFinite(experienceYears) ? Math.max(0, experienceYears) : 0
  const targetYears =
    expectedExperience && expectedExperience > 0
      ? Math.max(0.5, expectedExperience * 2) // e.g. level 2 -> ~4 years
      : experienceYearsSafe // if no level set, don't penalize by default

  // sigma controls how quickly we penalize being far from target.
  // Rough intuition: within ±sigma from target ~ still high score.
  const sigmaYears = Math.max(1, targetYears * 0.7)
  const experience =
    targetYears > 0 ? gaussian(experienceYearsSafe, targetYears, sigmaYears) : 1

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

  // === TEXT: caller is responsible for mapping ES _score -> 0..1 using min-max or heuristic ===
  // We just clamp defensively.
  const text = Math.max(0, Math.min(1, textScore))

  // === LOCATION: already computed upstream (0..1). Clamp defensively. ===
  const location = Math.max(0, Math.min(1, locationMatch))

  // === AVAILABILITY: boost for actively looking candidates (binary) ===
  const availability = isLookingForJob ? 1 : 0

  // === WORK ARRANGEMENT: compatibility between candidate preferences and job offerings ===
  let work_arrangement = 0
  const remoteCompatibility = candidateRemotePreference === jobRemoteAllowed
  const flexibleCompatibility = candidateFlexiblePreference === jobFlexibleHours
  const remotePercentageScore = jobRemotePercentage / 100 // Normalize 0-100 to 0-1

  // Weight remote preference higher than flexible hours
  if (candidateRemotePreference) {
    work_arrangement = (remoteCompatibility ? 0.7 : 0) + (remotePercentageScore * 0.3)
  } else if (candidateFlexiblePreference) {
    work_arrangement = flexibleCompatibility ? 0.8 : 0.2 // Some base score even if not preferred
  } else {
    // Candidate doesn't have strong preferences - give moderate score for good arrangements
    work_arrangement = (jobRemoteAllowed || jobFlexibleHours) ? 0.6 : 0.3
  }

  // === BENEFITS: overlap between desired and offered benefits ===
  const validDesiredBenefits = Array.isArray(candidateDesiredBenefits)
    ? candidateDesiredBenefits.filter((b): b is string => typeof b === 'string' && b.trim().length > 0)
    : []
  const validJobBenefits = Array.isArray(jobBenefits)
    ? jobBenefits.filter((b): b is string => typeof b === 'string' && b.trim().length > 0)
    : []

  const benefitsCount = Math.max(1, validDesiredBenefits.length)
  const benefitsIntersection = validDesiredBenefits.filter((benefit) =>
    validJobBenefits.some((jb) => jb.toLowerCase().includes(benefit.toLowerCase()) ||
                                   benefit.toLowerCase().includes(jb.toLowerCase()))
  ).length
  const benefits = benefitsIntersection / benefitsCount

  // === CATEGORY: alignment between preferred and job categories ===
  const validPreferredCategories = Array.isArray(candidatePreferredCategories)
    ? candidatePreferredCategories.filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
    : []
  const validJobCategories = Array.isArray(jobCategories)
    ? jobCategories.filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
    : []

  const categoryCount = Math.max(1, validPreferredCategories.length)
  const categoryIntersection = validPreferredCategories.filter((category) =>
    validJobCategories.some((jc) => jc.toLowerCase().includes(category.toLowerCase()) ||
                                     category.toLowerCase().includes(jc.toLowerCase()))
  ).length
  const category = categoryIntersection / categoryCount

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
