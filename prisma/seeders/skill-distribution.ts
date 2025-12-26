/**
 * Skill Distribution Engine
 * Phân phối skills theo seniority với trọng số và tạo matching/mismatch patterns
 */

import { faker } from '@faker-js/faker'
import { SKILLS_DATABASE, SKILL_CATEGORIES, CANDIDATE_DISTRIBUTION, MATCHING_PROBABILITIES } from './constants'
import { aiGenerator } from './ai-generator'

// Set deterministic seed
faker.seed(42)

export interface SkillProfile {
  name: string
  proficiency: number // 1-5
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  category: string
}

export interface CandidateSkillProfile {
  skills: SkillProfile[]
  seniority: 'junior' | 'mid' | 'senior'
  primaryCategory: string
  matchingScore?: number
}

export class SkillDistributionEngine {
  private skillPool: Map<string, any> = new Map()
  private categoryWeights: Map<string, number> = new Map()
  private candidateSkillCache: Map<string, CandidateSkillProfile> = new Map()
  private jobSkillCache: Map<string, SkillProfile[]> = new Map()

  constructor() {
    this.initializeSkillPool()
    this.calculateCategoryWeights()
  }

  private initializeSkillPool() {
    // Group skills by category and seniority
    SKILLS_DATABASE.forEach((skill) => {
      if (!this.skillPool.has(skill.category)) {
        this.skillPool.set(skill.category, {
          junior: [],
          mid: [],
          senior: [],
          expert: []
        })
      }

      const categoryPool = this.skillPool.get(skill.category)

      // Classify skills by seniority thresholds
      if (skill.seniority.junior >= 40) categoryPool.junior.push(skill)
      if (skill.seniority.mid >= 50) categoryPool.mid.push(skill)
      if (skill.seniority.senior >= 70) categoryPool.senior.push(skill)
      if (skill.weight >= 70) categoryPool.expert.push(skill)
    })
  }

  private calculateCategoryWeights() {
    // Calculate weights for each category based on market demand
    this.categoryWeights.set(SKILL_CATEGORIES.PROGRAMMING_LANGUAGES, 40)
    this.categoryWeights.set(SKILL_CATEGORIES.FRAMEWORKS, 30)
    this.categoryWeights.set(SKILL_CATEGORIES.DATABASES, 15)
    this.categoryWeights.set(SKILL_CATEGORIES.CLOUD, 10)
    this.categoryWeights.set(SKILL_CATEGORIES.DEVOPS, 5)
  }

  // ============================================================================
  // MAIN SKILL GENERATION METHODS
  // ============================================================================

  /**
   * Generate skill profile cho candidate theo seniority (with caching)
   */
  generateCandidateSkills(seniority: 'junior' | 'mid' | 'senior'): CandidateSkillProfile {
    const cacheKey = `candidate_${seniority}_${faker.seed()}` // Include seed for deterministic results

    if (this.candidateSkillCache.has(cacheKey)) {
      return this.candidateSkillCache.get(cacheKey)!
    }

    const skillCount = this.getSkillCountForSeniority(seniority)
    const primaryCategory = this.selectPrimaryCategory()
    const skills = this.selectSkillsForCandidate(seniority, skillCount, primaryCategory)

    const profile: CandidateSkillProfile = {
      skills: skills.map((skill) => this.createSkillProfile(skill, seniority)),
      seniority,
      primaryCategory
    }

    // Cache the result (limit cache size)
    if (this.candidateSkillCache.size < 1000) {
      this.candidateSkillCache.set(cacheKey, profile)
    }

    return profile
  }

  /**
   * Generate required skills cho job
   */
  generateJobRequiredSkills(jobCategory: string, seniority: 'junior' | 'mid' | 'senior'): SkillProfile[] {
    const skillCount = faker.number.int({ min: 3, max: 6 })
    const categoryMap = {
      backend: SKILL_CATEGORIES.FRAMEWORKS,
      frontend: SKILL_CATEGORIES.FRAMEWORKS,
      fullstack: SKILL_CATEGORIES.FRAMEWORKS,
      devops: SKILL_CATEGORIES.CLOUD,
      data: SKILL_CATEGORIES.DATA,
      mobile: SKILL_CATEGORIES.MOBILE,
      design: SKILL_CATEGORIES.DESIGN
    }

    const primaryCategory = categoryMap[jobCategory] || SKILL_CATEGORIES.PROGRAMMING_LANGUAGES
    const skills = this.selectSkillsForJob(seniority, skillCount, primaryCategory)

    return skills.map((skill) => ({
      name: skill.name,
      proficiency: this.getRequiredProficiency(skill, seniority),
      level: this.getRequiredLevel(seniority),
      category: skill.category
    }))
  }

  // ============================================================================
  // MATCHING & MISMATCH LOGIC
  // ============================================================================

  /**
   * Tính matching score giữa candidate và job
   */
  calculateMatchingScore(candidateSkills: SkillProfile[], jobRequiredSkills: SkillProfile[]): number {
    if (!jobRequiredSkills.length) return 0

    let totalScore = 0
    let matchedSkills = 0

    jobRequiredSkills.forEach((jobSkill) => {
      const candidateSkill = candidateSkills.find((cs) => cs.name.toLowerCase() === jobSkill.name.toLowerCase())

      if (candidateSkill) {
        // Calculate proficiency match (0-1 scale)
        const proficiencyMatch = Math.min(candidateSkill.proficiency / jobSkill.proficiency, 1)
        // Calculate level match
        const levelMatch = this.calculateLevelMatch(candidateSkill.level, jobSkill.level)

        totalScore += (proficiencyMatch + levelMatch) / 2
        matchedSkills++
      }
    })

    return matchedSkills > 0 ? totalScore / jobRequiredSkills.length : 0
  }

  /**
   * Create mismatched candidate profile for testing
   */
  createMismatchedProfile(
    jobSkills: SkillProfile[],
    matchType: 'poor' | 'partial' | 'no_match'
  ): CandidateSkillProfile {
    const baseSeniority = faker.helpers.arrayElement(['junior', 'mid', 'senior'] as const)
    const candidateSkills = this.generateCandidateSkills(baseSeniority)

    // Modify skills based on match type
    switch (matchType) {
      case 'poor':
        // Keep only 10-40% of required skills
        candidateSkills.skills = candidateSkills.skills.filter(
          (skill) => faker.number.float() > 0.6 || jobSkills.some((js) => js.name === skill.name)
        )
        break

      case 'partial':
        // Keep 40-70% of required skills
        candidateSkills.skills = candidateSkills.skills.filter(
          (skill) => faker.number.float() > 0.3 || jobSkills.some((js) => js.name === skill.name)
        )
        break

      case 'no_match':
        // Keep only 0-10% of required skills (mostly random)
        candidateSkills.skills = candidateSkills.skills.filter((skill) => faker.number.float() > 0.9)
        break
    }

    // Recalculate matching score
    candidateSkills.matchingScore = this.calculateMatchingScore(candidateSkills.skills, jobSkills)

    return candidateSkills
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private getSkillCountForSeniority(seniority: string): number {
    const ranges = {
      junior: { min: 2, max: 4 },
      mid: { min: 3, max: 6 },
      senior: { min: 4, max: 8 }
    }
    const range = ranges[seniority]
    return faker.number.int({ min: range.min, max: range.max })
  }

  private selectPrimaryCategory(): string {
    const categories = Array.from(this.categoryWeights.keys())
    const weights = Array.from(this.categoryWeights.values())

    return this.weightedRandom(categories, weights)
  }

  private selectSkillsForCandidate(seniority: string, count: number, primaryCategory: string): any[] {
    const skills = []
    const categoryPool = this.skillPool.get(primaryCategory)

    if (categoryPool && categoryPool[seniority]) {
      // Add skills from primary category
      const primarySkills = faker.helpers.arrayElements(categoryPool[seniority], {
        min: Math.floor(count * 0.6),
        max: Math.floor(count * 0.8)
      })
      skills.push(...primarySkills)
    }

    // Add skills from other categories
    const remainingCount = count - skills.length
    if (remainingCount > 0) {
      const otherCategories = Array.from(this.skillPool.keys()).filter((cat) => cat !== primaryCategory)

      for (const category of otherCategories) {
        if (skills.length >= count) break

        const catPool = this.skillPool.get(category)
        if (catPool && catPool[seniority] && catPool[seniority].length > 0) {
          const skill = faker.helpers.arrayElement(catPool[seniority])
          if (!skills.find((s) => s.name === (skill as any).name)) {
            skills.push(skill)
          }
        }
      }
    }

    return skills.slice(0, count)
  }

  private selectSkillsForJob(seniority: string, count: number, primaryCategory: string): any[] {
    const skills = []
    const categoryPool = this.skillPool.get(primaryCategory)

    // Jobs require more specific skills
    if (categoryPool && categoryPool[seniority]) {
      const jobSkills = faker.helpers.arrayElements(categoryPool[seniority], {
        min: Math.floor(count * 0.7),
        max: count
      })
      skills.push(...jobSkills)
    }

    // Add some complementary skills from related categories
    const complementaryCategories = this.getComplementaryCategories(primaryCategory)
    const remainingCount = count - skills.length

    if (remainingCount > 0) {
      for (const category of complementaryCategories) {
        const catPool = this.skillPool.get(category)
        if (catPool && catPool[seniority]) {
          const compSkills = faker.helpers.arrayElements(catPool[seniority], { min: 1, max: remainingCount })
          skills.push(...compSkills)
        }
      }
    }

    return skills.slice(0, count)
  }

  private getComplementaryCategories(primaryCategory: string): string[] {
    const complements = {
      [SKILL_CATEGORIES.FRAMEWORKS]: [SKILL_CATEGORIES.PROGRAMMING_LANGUAGES, SKILL_CATEGORIES.DATABASES],
      [SKILL_CATEGORIES.PROGRAMMING_LANGUAGES]: [SKILL_CATEGORIES.FRAMEWORKS, SKILL_CATEGORIES.CLOUD],
      [SKILL_CATEGORIES.DATABASES]: [SKILL_CATEGORIES.PROGRAMMING_LANGUAGES, SKILL_CATEGORIES.CLOUD],
      [SKILL_CATEGORIES.CLOUD]: [SKILL_CATEGORIES.DEVOPS, SKILL_CATEGORIES.PROGRAMMING_LANGUAGES]
    }

    return complements[primaryCategory] || [SKILL_CATEGORIES.PROGRAMMING_LANGUAGES]
  }

  private createSkillProfile(skill: any, candidateSeniority: string): SkillProfile {
    const proficiency = this.calculateProficiency(skill, candidateSeniority)
    const level = this.mapProficiencyToLevel(proficiency)

    return {
      name: skill.name,
      proficiency,
      level,
      category: skill.category
    }
  }

  private calculateProficiency(skill: any, seniority: string): number {
    // Base proficiency from skill seniority requirements
    let baseProficiency = 1

    switch (seniority) {
      case 'junior':
        baseProficiency = faker.number.int({ min: 1, max: 3 })
        break
      case 'mid':
        baseProficiency = faker.number.int({ min: 2, max: 4 })
        break
      case 'senior':
        baseProficiency = faker.number.int({ min: 3, max: 5 })
        break
    }

    // Adjust based on skill weight (popular skills have higher proficiency)
    const weightBonus = Math.floor(skill.weight / 20)
    return Math.min(baseProficiency + weightBonus, 5)
  }

  private mapProficiencyToLevel(proficiency: number): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
    if (proficiency <= 2) return 'beginner'
    if (proficiency <= 3) return 'intermediate'
    if (proficiency <= 4) return 'advanced'
    return 'expert'
  }

  private getRequiredProficiency(skill: any, jobSeniority: string): number {
    // Jobs require higher proficiency than candidates typically have
    switch (jobSeniority) {
      case 'junior':
        return faker.number.int({ min: 2, max: 3 })
      case 'mid':
        return faker.number.int({ min: 3, max: 4 })
      case 'senior':
        return faker.number.int({ min: 4, max: 5 })
      default:
        return 3
    }
  }

  private getRequiredLevel(seniority: string): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
    switch (seniority) {
      case 'junior':
        return 'beginner'
      case 'mid':
        return 'intermediate'
      case 'senior':
        return 'advanced'
      default:
        return 'intermediate'
    }
  }

  private calculateLevelMatch(candidateLevel: string, requiredLevel: string): number {
    const levelHierarchy = ['beginner', 'intermediate', 'advanced', 'expert']
    const candidateIndex = levelHierarchy.indexOf(candidateLevel)
    const requiredIndex = levelHierarchy.indexOf(requiredLevel)

    if (candidateIndex >= requiredIndex) return 1
    if (candidateIndex === requiredIndex - 1) return 0.7 // Close enough
    return 0.3 // Too junior
  }

  private weightedRandom(items: string[], weights: number[]): string {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
    let random = faker.number.float({ min: 0, max: totalWeight })

    for (let i = 0; i < items.length; i++) {
      random -= weights[i]
      if (random <= 0) return items[i]
    }

    return items[0]
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const skillDistributionEngine = new SkillDistributionEngine()

// ============================================================================
// UTILITY FUNCTIONS FOR MATCHING
// ============================================================================

export function generateMatchingCandidates(jobSkills: SkillProfile[], count: number): CandidateSkillProfile[] {
  const candidates: CandidateSkillProfile[] = []

  // Generate candidates with different matching levels
  const matchTypes: Array<'perfect' | 'good' | 'partial' | 'poor' | 'no_match'> = [
    'perfect',
    'good',
    'partial',
    'poor',
    'no_match'
  ]

  matchTypes.forEach((matchType) => {
    const candidateCount = Math.floor(count * MATCHING_PROBABILITIES[matchType])
    for (let i = 0; i < candidateCount; i++) {
      let candidate: CandidateSkillProfile

      if (matchType === 'perfect') {
        // Create perfect match candidate
        candidate = skillDistributionEngine.generateCandidateSkills(faker.helpers.arrayElement(['mid', 'senior']))
        // Add required job skills with high proficiency
        jobSkills.forEach((jobSkill) => {
          if (!candidate.skills.find((cs) => cs.name === jobSkill.name)) {
            candidate.skills.push({
              ...jobSkill,
              proficiency: 5,
              level: 'expert'
            })
          }
        })
      } else if (matchType === 'good') {
        // Create good match candidate (partial but close)
        candidate = skillDistributionEngine.createMismatchedProfile(jobSkills, 'partial')
      } else {
        // Create mismatched candidate
        candidate = skillDistributionEngine.createMismatchedProfile(
          jobSkills,
          matchType as 'poor' | 'partial' | 'no_match'
        )
      }

      candidates.push(candidate)
    }
  })

  // Shuffle to randomize order
  return faker.helpers.shuffle(candidates)
}
