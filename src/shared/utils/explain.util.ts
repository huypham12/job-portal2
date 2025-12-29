import { ScoreComponents } from './scoring.util'

export type ScoreBreakdown = {
  text: number
  skills: number
  location: number
  experience: number
  recency: number
  activity: number
  work_arrangement: number
  benefits: number
  category: number
}

/**
 * Convert raw normalized component values (0..1) and weights into a human-readable breakdown.
 * Returns breakdown values as percentages that sum approximately to totalPercent.
 *
 * Pseudocode:
 *  - inputs: components, weights
 *  - compute weighted sum per component
 *  - normalize to 0..100
 */
export function formatBreakdown(
  components: ScoreComponents,
  weights: {
    text?: number
    skills?: number
    location?: number
    experience?: number
    recency?: number
    activity?: number
    work_arrangement?: number
    benefits?: number
    category?: number
  } = {}
): ScoreBreakdown {
  const defaultWeights = {
    text: 0.25,
    skills: 0.25,
    location: 0.12,
    experience: 0.08,
    recency: 0.06,
    activity: 0.04,
    work_arrangement: 0.08,
    benefits: 0.06,
    category: 0.04
  }
  const w = { ...defaultWeights, ...weights }

  const text = components.text * w.text
  const skills = components.skills * w.skills
  const location = components.location * w.location
  const experience = components.experience * w.experience
  const recency = components.recency * w.recency
  const activity = components.activity * w.activity
  const work_arrangement = components.work_arrangement * w.work_arrangement
  const benefits = components.benefits * w.benefits
  const category = components.category * w.category

  const total = text + skills + location + experience + recency + activity + work_arrangement + benefits + category
  // Normalize each to percent of total (if total > 0) and scale to 0..100
  if (total <= 0) {
    return {
      text: 0,
      skills: 0,
      location: 0,
      experience: 0,
      recency: 0,
      activity: 0,
      work_arrangement: 0,
      benefits: 0,
      category: 0
    }
  }

  const factor = 100 / total
  return {
    text: Math.round(text * factor * 10) / 10,
    skills: Math.round(skills * factor * 10) / 10,
    location: Math.round(location * factor * 10) / 10,
    experience: Math.round(experience * factor * 10) / 10,
    recency: Math.round(recency * factor * 10) / 10,
    activity: Math.round(activity * factor * 10) / 10,
    work_arrangement: Math.round(work_arrangement * factor * 10) / 10,
    benefits: Math.round(benefits * factor * 10) / 10,
    category: Math.round(category * factor * 10) / 10
  }
}
