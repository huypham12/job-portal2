import { ScoreComponents } from './scoring.util'

export type ScoreBreakdown = {
  text: number
  skills: number
  location: number
  experience: number
  recency: number
  activity: number
  availability: number // Added availability
  work_arrangement: number
  benefits: number
  category: number
  total: number // Added total score
}

export type ScoreExplanation = {
  breakdown: ScoreBreakdown
  insights: string[] // Human-readable insights about the match
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
    availability?: number
    work_arrangement?: number
    benefits?: number
    category?: number
  } = {}
): ScoreExplanation {
  const defaultWeights = {
    text: 0.15,
    skills: 0.35,
    location: 0.15,
    experience: 0.12,
    recency: 0.03,
    activity: 0.08,
    availability: 0.05,
    work_arrangement: 0.05,
    benefits: 0.02,
    category: 0.0
  }
  const w = { ...defaultWeights, ...weights }

  const text = components.text * w.text
  const skills = components.skills * w.skills
  const location = components.location * w.location
  const experience = components.experience * w.experience
  const recency = components.recency * w.recency
  const activity = components.activity * w.activity
  const availability = components.availability * (w.availability || 0)
  const work_arrangement = components.work_arrangement * w.work_arrangement
  const benefits = components.benefits * w.benefits
  const category = components.category * w.category

  const total =
    text + skills + location + experience + recency + activity + availability + work_arrangement + benefits + category

  // Normalize each to percent of total (if total > 0) and scale to 0..100
  if (total <= 0) {
    return {
      breakdown: {
        text: 0,
        skills: 0,
        location: 0,
        experience: 0,
        recency: 0,
        activity: 0,
        availability: 0,
        work_arrangement: 0,
        benefits: 0,
        category: 0,
        total: 0
      },
      insights: ['No matching factors found']
    }
  }

  const factor = 100 / total
  const breakdown = {
    text: Math.round(text * factor * 10) / 10,
    skills: Math.round(skills * factor * 10) / 10,
    location: Math.round(location * factor * 10) / 10,
    experience: Math.round(experience * factor * 10) / 10,
    recency: Math.round(recency * factor * 10) / 10,
    activity: Math.round(activity * factor * 10) / 10,
    availability: Math.round(availability * factor * 10) / 10,
    work_arrangement: Math.round(work_arrangement * factor * 10) / 10,
    benefits: Math.round(benefits * factor * 10) / 10,
    category: Math.round(category * factor * 10) / 10,
    total: Math.round(total * 100 * 10) / 10
  }

  // Generate insights based on the breakdown
  const insights = generateInsights(breakdown, components)

  return { breakdown, insights }
}

/**
 * Generate human-readable insights about the candidate-job match
 */
function generateInsights(breakdown: ScoreBreakdown, components: ScoreComponents): string[] {
  const insights: string[] = []

  // Skills insights
  if (breakdown.skills >= 30) {
    insights.push('Excellent skills match - candidate has most required skills')
  } else if (breakdown.skills >= 15) {
    insights.push('Good skills foundation - some required skills present')
  } else {
    insights.push('Skills gap identified - may need training')
  }

  // Experience insights
  if (breakdown.experience >= 20) {
    insights.push('Experience level matches job requirements')
  } else if (breakdown.experience >= 10) {
    insights.push('Experience is borderline for this role')
  } else {
    insights.push('May lack sufficient experience for this position')
  }

  // Location insights
  if (breakdown.location >= 25) {
    insights.push('Location is a strong match')
  } else if (breakdown.location >= 10) {
    insights.push('Location match is moderate')
  } else {
    insights.push('Location may be a consideration for commuting')
  }

  // Activity insights
  if (breakdown.activity >= 15) {
    insights.push('Candidate profile is recently active')
  } else {
    insights.push('Profile has been inactive - may need re-engagement')
  }

  // Availability insights
  if (breakdown.availability >= 10) {
    insights.push('Candidate is actively seeking employment')
  } else {
    insights.push('Candidate availability status unclear')
  }

  // Work arrangement insights
  if (breakdown.work_arrangement >= 10) {
    insights.push('Work arrangement preferences align well')
  }

  // Overall assessment
  if (breakdown.total >= 80) {
    insights.unshift('⭐ Excellent match - highly recommended')
  } else if (breakdown.total >= 60) {
    insights.unshift('✅ Good match - worth considering')
  } else if (breakdown.total >= 40) {
    insights.unshift('⚠️ Moderate match - may need assessment')
  } else {
    insights.unshift('❌ Poor match - significant gaps identified')
  }

  return insights.slice(0, 5) // Limit to top 5 insights
}
