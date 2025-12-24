export type ScoreComponents = {
  text: number
  skills: number
  location: number
  experience: number
  recency: number
  activity: number
}

export const DEFAULT_SCORE_WEIGHTS = {
  text: 0.35,
  skills: 0.3,
  location: 0.15,
  experience: 0.1,
  recency: 0.05,
  activity: 0.05,
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
 *  - recency: decay function based on posted_at or last_active_at (0..1)
 *  - activity: binary / recency-based (0..1)
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
  lastActiveAtMs?: number
}): ScoreComponents {
  const {
    textScore = 0,
    requiredSkills = [],
    candidateSkills = [],
    locationMatch = 0,
    experienceYears = 0,
    expectedExperience = 0,
    postedAtMs,
    lastActiveAtMs
  } = input

  // skills overlap (simple intersection / required)
  const requiredCount = Math.max(1, requiredSkills.length)
  const intersectionCount = requiredSkills.filter((s) => candidateSkills.includes(s)).length
  const skills = intersectionCount / requiredCount

  // experience fit: 1.0 if candidate >= expected, else proportional
  const experience = expectedExperience <= 0 ? 1 : Math.max(0, Math.min(1, experienceYears / expectedExperience))

  // recency: simple decay (newer -> closer to 1). If postedAtMs missing -> 0
  let recency = 0
  if (postedAtMs) {
    const ageDays = Math.max(0, (Date.now() - postedAtMs) / (1000 * 60 * 60 * 24))
    // decay to 0 at ~90 days
    recency = Math.max(0, Math.min(1, (90 - ageDays) / 90))
  }

  // activity: recency of profile activity (within 30 days -> 1)
  let activity = 0
  if (lastActiveAtMs) {
    const activeDays = Math.max(0, (Date.now() - lastActiveAtMs) / (1000 * 60 * 60 * 24))
    activity = Math.max(0, Math.min(1, (30 - activeDays) / 30))
  }

  // textScore assumed already normalized to 0..1 by caller; otherwise clamp
  const text = Math.max(0, Math.min(1, textScore))

  return {
    text,
    skills,
    location: Math.max(0, Math.min(1, locationMatch)),
    experience,
    recency,
    activity
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
