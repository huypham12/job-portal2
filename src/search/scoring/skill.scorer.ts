/**
 * Skill Scoring Module
 *
 * Handles skill-based scoring and matching logic.
 * Provides functions to compute skill relevance scores for ranking.
 */

import { ScoringComponent } from '../search.types'

/**
 * Compute skill-based score for job-candidate matching
 *
 * @param jobSkills - Array of skills required by the job (can be flat strings or nested objects)
 * @param candidateSkills - Array of candidate skills (can be flat strings or nested objects)
 * @param candidateExperience - Candidate's years of experience (optional, for proficiency inference)
 * @returns Object with match details and normalized score (0-1)
 */
export function computeSkillScore(
  jobSkills: any[],
  candidateSkills: any[],
  candidateExperience?: number
): {
  exactMatches: number
  partialMatches: number
  proficiencyScore: number
  totalScore: number
  matchDetails: Array<{
    skill: string
    matched: boolean
    proficiency?: number
    requiredLevel?: string
  }>
} {
  if (!jobSkills || jobSkills.length === 0) {
    return {
      exactMatches: 0,
      partialMatches: 0,
      proficiencyScore: 0,
      totalScore: 0,
      matchDetails: []
    }
  }

  // Normalize job skills to array of strings
  const normalizedJobSkills = normalizeSkillsToStrings(jobSkills)

  // Normalize candidate skills to objects with proficiency
  const normalizedCandidateSkills = normalizeSkillsToObjects(candidateSkills, candidateExperience)

  let exactMatches = 0
  let partialMatches = 0
  let totalProficiencyScore = 0
  const matchDetails: Array<{
    skill: string
    matched: boolean
    proficiency?: number
    requiredLevel?: string
  }> = []

  // Score each job skill requirement
  for (const jobSkill of normalizedJobSkills) {
    const candidateSkill = normalizedCandidateSkills.find((cs) => cs.name.toLowerCase() === jobSkill.toLowerCase())

    if (candidateSkill) {
      exactMatches++
      const proficiencyScore = candidateSkill.proficiency / 5 // Normalize to 0-1
      totalProficiencyScore += proficiencyScore

      matchDetails.push({
        skill: jobSkill,
        matched: true,
        proficiency: candidateSkill.proficiency,
        requiredLevel: candidateSkill.level
      })
    } else {
      // Check for partial matches (contains relationship)
      const partialMatch = normalizedCandidateSkills.find(
        (cs) =>
          jobSkill.toLowerCase().includes(cs.name.toLowerCase()) ||
          cs.name.toLowerCase().includes(jobSkill.toLowerCase())
      )

      if (partialMatch) {
        partialMatches++
        const partialProficiencyScore = (partialMatch.proficiency / 5) * 0.7 // 70% of exact match
        totalProficiencyScore += partialProficiencyScore

        matchDetails.push({
          skill: jobSkill,
          matched: true,
          proficiency: partialMatch.proficiency,
          requiredLevel: partialMatch.level
        })
      } else {
        matchDetails.push({
          skill: jobSkill,
          matched: false
        })
      }
    }
  }

  // Calculate final scores
  const skillMatchRatio = (exactMatches + partialMatches * 0.5) / normalizedJobSkills.length
  const avgProficiencyScore = normalizedJobSkills.length > 0 ? totalProficiencyScore / normalizedJobSkills.length : 0

  // Combined score: 60% skill match ratio, 40% average proficiency
  const totalScore = skillMatchRatio * 0.6 + avgProficiencyScore * 0.4

  return {
    exactMatches,
    partialMatches,
    proficiencyScore: avgProficiencyScore,
    totalScore: Math.min(1, totalScore), // Cap at 1.0
    matchDetails
  }
}

/**
 * Normalize skills array to string array
 */
function normalizeSkillsToStrings(skills: any[]): string[] {
  if (!Array.isArray(skills)) return []

  return skills
    .map((skill) => {
      if (typeof skill === 'string') {
        return skill
      }
      if (typeof skill === 'object' && skill.name) {
        return skill.name
      }
      return String(skill)
    })
    .filter(Boolean)
}

/**
 * Normalize skills array to objects with proficiency
 */
function normalizeSkillsToObjects(
  skills: any[],
  experienceYears?: number
): Array<{ name: string; proficiency: number; level: string }> {
  if (!Array.isArray(skills)) return []

  return skills.map((skill) => {
    if (typeof skill === 'string') {
      // Infer proficiency from experience
      const proficiency = inferProficiencyFromExperience(experienceYears)
      return {
        name: skill,
        proficiency,
        level: getProficiencyLevel(proficiency)
      }
    }

    if (typeof skill === 'object' && skill.name) {
      return {
        name: skill.name,
        proficiency: skill.proficiency || inferProficiencyFromExperience(experienceYears),
        level: skill.level || getProficiencyLevel(skill.proficiency)
      }
    }

    return {
      name: String(skill),
      proficiency: inferProficiencyFromExperience(experienceYears),
      level: getProficiencyLevel(inferProficiencyFromExperience(experienceYears))
    }
  })
}

/**
 * Infer proficiency level from years of experience
 */
function inferProficiencyFromExperience(years?: number): number {
  if (!years || years < 0) return 2 // Beginner

  if (years < 2) return 2 // Beginner
  if (years < 4) return 3 // Intermediate
  if (years < 7) return 4 // Advanced
  return 5 // Expert
}

/**
 * Convert proficiency number to level string
 */
function getProficiencyLevel(proficiency: number): string {
  if (proficiency >= 5) return 'expert'
  if (proficiency >= 4) return 'advanced'
  if (proficiency >= 3) return 'intermediate'
  return 'beginner'
}

/**
 * Calculate skill gap analysis
 */
export function analyzeSkillGap(
  jobSkills: string[],
  candidateSkills: Array<{ name: string; proficiency: number }>
): {
  missingSkills: string[]
  weakSkills: Array<{ skill: string; currentLevel: number; requiredLevel: number }>
  strongSkills: Array<{ skill: string; proficiency: number }>
} {
  const normalizedJobSkills = normalizeSkillsToStrings(jobSkills)
  const normalizedCandidateSkills = normalizeSkillsToObjects(candidateSkills)

  const missingSkills: string[] = []
  const weakSkills: Array<{ skill: string; currentLevel: number; requiredLevel: number }> = []
  const strongSkills: Array<{ skill: string; proficiency: number }> = []

  for (const jobSkill of normalizedJobSkills) {
    const candidateSkill = normalizedCandidateSkills.find((cs) => cs.name.toLowerCase() === jobSkill.toLowerCase())

    if (!candidateSkill) {
      missingSkills.push(jobSkill)
    } else if (candidateSkill.proficiency < 3) {
      weakSkills.push({
        skill: jobSkill,
        currentLevel: candidateSkill.proficiency,
        requiredLevel: 3
      })
    } else if (candidateSkill.proficiency >= 4) {
      strongSkills.push({
        skill: jobSkill,
        proficiency: candidateSkill.proficiency
      })
    }
  }

  return {
    missingSkills,
    weakSkills,
    strongSkills
  }
}

/**
 * Get skill match quality description
 */
export function getSkillMatchQuality(
  exactMatches: number,
  partialMatches: number,
  totalRequired: number,
  avgProficiency: number
): {
  quality: 'excellent' | 'good' | 'fair' | 'poor'
  description: string
  recommendation?: string
} {
  const matchRatio = (exactMatches + partialMatches * 0.5) / totalRequired

  if (matchRatio >= 0.8 && avgProficiency >= 0.8) {
    return {
      quality: 'excellent',
      description: 'Strong skill match with high proficiency',
      recommendation: 'Highly recommended for this role'
    }
  }

  if (matchRatio >= 0.6 && avgProficiency >= 0.6) {
    return {
      quality: 'good',
      description: 'Good skill alignment with solid proficiency',
      recommendation: 'Good candidate with some training needed'
    }
  }

  if (matchRatio >= 0.4 && avgProficiency >= 0.4) {
    return {
      quality: 'fair',
      description: 'Moderate skill overlap with adequate proficiency',
      recommendation: 'Consider with significant training investment'
    }
  }

  return {
    quality: 'poor',
    description: 'Limited skill match and/or low proficiency',
    recommendation: 'Not recommended without extensive training'
  }
}
