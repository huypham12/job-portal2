/**
 * Matching Logic Engine
 * Tạo matching patterns giữa job và candidate cho testing search & recommendation
 */

import { faker } from '@faker-js/faker'
import { USER_BEHAVIOR_PATTERNS, MATCHING_PROBABILITIES, VIETNAM_PROVINCES } from './constants'
import { SkillProfile, CandidateSkillProfile, skillDistributionEngine } from './skill-distribution'

// Set deterministic seed
faker.seed(42)

export interface JobProfile {
  id: string
  title: string
  requiredSkills: SkillProfile[]
  seniority: 'junior' | 'mid' | 'senior'
  location: string
  salary: { min: number; max: number }
  company: any
}

export interface MatchingResult {
  candidate: CandidateSkillProfile
  job: JobProfile
  score: number
  matchType: 'perfect' | 'good' | 'partial' | 'poor' | 'no_match'
  reasons: string[]
}

export class MatchingEngine {
  private matchingCache: Map<string, MatchingResult[]> = new Map()
  private behaviorCache: Map<string, any> = new Map()

  // ============================================================================
  // MAIN MATCHING METHODS
  // ============================================================================

  /**
   * Tính matching score giữa candidate và job
   */
  calculateMatchScore(candidate: CandidateSkillProfile, job: JobProfile): MatchingResult {
    let score = 0
    const reasons: string[] = []

    // 1. Skills matching (40% weight)
    const skillScore = this.calculateSkillMatch(candidate, job)
    score += skillScore.score * 0.4
    reasons.push(...skillScore.reasons)

    // 2. Seniority matching (30% weight)
    const seniorityScore = this.calculateSeniorityMatch(candidate, job)
    score += seniorityScore.score * 0.3
    reasons.push(...seniorityScore.reasons)

    // 3. Location matching (15% weight)
    const locationScore = this.calculateLocationMatch(candidate, job)
    score += locationScore.score * 0.15
    reasons.push(...locationScore.reasons)

    // 4. Salary expectation matching (15% weight)
    const salaryScore = this.calculateSalaryMatch(candidate, job)
    score += salaryScore.score * 0.15
    reasons.push(...salaryScore.reasons)

    // Determine match type
    const matchType = this.determineMatchType(score)

    return {
      candidate,
      job,
      score,
      matchType,
      reasons
    }
  }

  /**
   * Generate realistic applications dựa trên matching scores
   */
  generateApplicationsForJob(
    job: JobProfile,
    candidates: CandidateSkillProfile[],
    maxApplications: number = 50
  ): MatchingResult[] {
    const results: MatchingResult[] = []

    // Calculate matches for all candidates
    candidates.forEach((candidate) => {
      const result = this.calculateMatchScore(candidate, job)
      results.push(result)
    })

    // Sort by score descending
    results.sort((a, b) => b.score - a.score)

    // Apply realistic application behavior
    // Higher score = higher chance of applying, but not guaranteed
    const applications: MatchingResult[] = []

    results.forEach((result) => {
      let applyProbability = 0

      switch (result.matchType) {
        case 'perfect':
          applyProbability = 0.8
          break // 80% apply
        case 'good':
          applyProbability = 0.6
          break // 60% apply
        case 'partial':
          applyProbability = 0.3
          break // 30% apply
        case 'poor':
          applyProbability = 0.1
          break // 10% apply
        case 'no_match':
          applyProbability = 0.02
          break // 2% apply (noise)
      }

      if (faker.number.float({ min: 0, max: 1 }) < applyProbability && applications.length < maxApplications) {
        applications.push(result)
      }
    })

    return applications
  }

  /**
   * Generate user behavior patterns (views >> saves >> applications) in chunks
   */
  generateUserBehaviorForJobs(
    jobs: JobProfile[],
    candidates: CandidateSkillProfile[],
    chunkSize: number = 100
  ): {
    jobViews: any[]
    savedJobs: any[]
    applications: any[]
    searchHistory: any[]
  } {
    const jobViews: any[] = []
    const savedJobs: any[] = []
    const applications: any[] = []
    const searchHistory: any[] = []

    // Process candidates in chunks to reduce memory usage
    for (let i = 0; i < candidates.length; i += chunkSize) {
      const chunk = candidates.slice(i, i + chunkSize)

      chunk.forEach((candidate) => {
        // Generate search history first
        const userSearches = this.generateSearchHistory(candidate, jobs)
        searchHistory.push(...userSearches)

        // Generate views based on search results
        const userViews = this.generateJobViews(candidate, jobs, userSearches)
        jobViews.push(...userViews)

        // Generate saved jobs (subset of viewed jobs)
        const userSaves = this.generateSavedJobs(candidate, userViews)
        savedJobs.push(...userSaves)

        // Generate applications (subset of saved jobs)
        const userApplications = this.generateApplications(candidate, userSaves)
        applications.push(...userApplications)
      })

      // Force garbage collection if available
      if (global.gc && i % (chunkSize * 5) === 0) {
        global.gc()
      }
    }

    return { jobViews, savedJobs, applications, searchHistory }
  }

  // ============================================================================
  // PRIVATE MATCHING CALCULATION METHODS
  // ============================================================================

  private calculateSkillMatch(candidate: CandidateSkillProfile, job: JobProfile): { score: number; reasons: string[] } {
    const candidateSkills = candidate.skills
    const jobSkills = job.requiredSkills

    if (!jobSkills.length) return { score: 0, reasons: ['No required skills specified'] }

    let totalScore = 0
    const reasons: string[] = []
    let matchedSkills = 0

    jobSkills.forEach((jobSkill) => {
      const candidateSkill = candidateSkills.find((cs) => cs.name.toLowerCase() === jobSkill.name.toLowerCase())

      if (candidateSkill) {
        // Proficiency match
        const proficiencyRatio = Math.min(candidateSkill.proficiency / jobSkill.proficiency, 1)
        totalScore += proficiencyRatio

        // Level match bonus
        if (this.isLevelCompatible(candidateSkill.level, jobSkill.level)) {
          totalScore += 0.2
          reasons.push(`${candidateSkill.name}: Good proficiency and level match`)
        } else {
          reasons.push(`${candidateSkill.name}: Proficiency match but level gap`)
        }

        matchedSkills++
      } else {
        reasons.push(`Missing required skill: ${jobSkill.name}`)
      }
    })

    const finalScore = matchedSkills > 0 ? totalScore / jobSkills.length : 0

    return {
      score: Math.min(finalScore, 1),
      reasons
    }
  }

  private calculateSeniorityMatch(
    candidate: CandidateSkillProfile,
    job: JobProfile
  ): { score: number; reasons: string[] } {
    const seniorityLevels = ['junior', 'mid', 'senior']
    const candidateIndex = seniorityLevels.indexOf(candidate.seniority)
    const jobIndex = seniorityLevels.indexOf(job.seniority)

    let score = 0
    const reasons: string[] = []

    if (candidateIndex >= jobIndex) {
      // Candidate is senior enough
      score = 1
      reasons.push(`Seniority match: ${candidate.seniority} >= ${job.seniority}`)
    } else if (candidateIndex === jobIndex - 1) {
      // Close enough (e.g., mid for senior role)
      score = 0.7
      reasons.push(`Close seniority match: ${candidate.seniority} for ${job.seniority} role`)
    } else {
      // Too junior
      score = 0.2
      reasons.push(`Seniority gap: ${candidate.seniority} too junior for ${job.seniority} role`)
    }

    return { score, reasons }
  }

  private calculateLocationMatch(
    candidate: CandidateSkillProfile,
    job: JobProfile
  ): { score: number; reasons: string[] } {
    // Simple location matching - same city = 1, different = 0.5
    const candidateLocation =
      'location_text' in candidate ? candidate['location_text' as keyof typeof candidate] : VIETNAM_PROVINCES[0].name
    const jobLocation = job.location

    const score = candidateLocation === jobLocation ? 1 : 0.5
    const reasons = [score === 1 ? 'Same location' : 'Different location']

    return { score, reasons }
  }

  private calculateSalaryMatch(
    candidate: CandidateSkillProfile,
    job: JobProfile
  ): { score: number; reasons: string[] } {
    // Mock salary expectation for candidate
    const candidateSalary = this.estimateCandidateSalaryExpectation(candidate)

    const jobSalaryMin = job.salary.min
    const jobSalaryMax = job.salary.max

    let score = 0
    const reasons: string[] = []

    if (candidateSalary <= jobSalaryMax && candidateSalary >= jobSalaryMin) {
      score = 1
      reasons.push('Salary expectation matches job range')
    } else if (candidateSalary < jobSalaryMin * 1.2) {
      score = 0.7
      reasons.push('Slightly below job salary range')
    } else if (candidateSalary > jobSalaryMax * 0.8) {
      score = 0.8
      reasons.push('Slightly above job salary range')
    } else {
      score = 0.3
      reasons.push('Significant salary mismatch')
    }

    return { score, reasons }
  }

  private determineMatchType(score: number): 'perfect' | 'good' | 'partial' | 'poor' | 'no_match' {
    if (score >= 0.9) return 'perfect'
    if (score >= 0.7) return 'good'
    if (score >= 0.5) return 'partial'
    if (score >= 0.3) return 'poor'
    return 'no_match'
  }

  // ============================================================================
  // USER BEHAVIOR GENERATION
  // ============================================================================

  private generateSearchHistory(candidate: CandidateSkillProfile, jobs: JobProfile[]): any[] {
    const searches: any[] = []
    const searchCount = faker.number.int({
      min: USER_BEHAVIOR_PATTERNS.searchesPerUser.min,
      max: USER_BEHAVIOR_PATTERNS.searchesPerUser.max
    })

    for (let i = 0; i < searchCount; i++) {
      const searchQuery = this.generateSearchQuery(candidate)
      const searchResults = this.findRelevantJobs(searchQuery, jobs)
      const clickedJobs = faker.helpers.arrayElements(searchResults.slice(0, 10), {
        min: 0,
        max: USER_BEHAVIOR_PATTERNS.clicksPerSearch.max
      })

      searches.push({
        candidate_id: candidate, // Will be replaced with actual ID
        search_query: searchQuery,
        search_type: 'job_search',
        result_count: searchResults.length,
        filters_used: searchQuery.filters,
        clicked_jobs: clickedJobs.map((j) => j.id),
        searched_at: faker.date.recent({ days: 30 })
      })
    }

    return searches
  }

  private generateJobViews(candidate: CandidateSkillProfile, jobs: JobProfile[], searches: any[]): any[] {
    const views: any[] = []
    const viewedJobIds = new Set<string>()

    // Views from search clicks
    searches.forEach((search) => {
      search.clicked_jobs.forEach((jobId: string) => {
        if (!viewedJobIds.has(jobId)) {
          views.push({
            job_id: jobId,
            profile_id: candidate, // Will be replaced with actual ID
            viewed_at: faker.date.between({
              from: search.searched_at,
              to: new Date(search.searched_at.getTime() + 300000) // Within 5 minutes
            }),
            duration_seconds: faker.number.int({ min: 30, max: 300 }),
            source: 'search'
          })
          viewedJobIds.add(jobId)
        }
      })
    })

    // Additional random views
    const additionalViewCount = faker.number.int({
      min: USER_BEHAVIOR_PATTERNS.jobViewsPerUser.min - views.length,
      max: USER_BEHAVIOR_PATTERNS.jobViewsPerUser.max - views.length
    })

    for (let i = 0; i < additionalViewCount; i++) {
      const randomJob = faker.helpers.arrayElement(jobs)
      if (!viewedJobIds.has(randomJob.id)) {
        views.push({
          job_id: randomJob.id,
          profile_id: candidate,
          viewed_at: faker.date.recent({ days: 30 }),
          duration_seconds: faker.number.int({ min: 10, max: 180 }),
          source: 'direct'
        })
        viewedJobIds.add(randomJob.id)
      }
    }

    return views
  }

  private generateSavedJobs(candidate: CandidateSkillProfile, views: any[]): any[] {
    const saves: any[] = []
    const viewedJobs = views.map((v) => v.job_id)
    const saveCount = faker.number.int({
      min: USER_BEHAVIOR_PATTERNS.savedJobsPerUser.min,
      max: Math.min(USER_BEHAVIOR_PATTERNS.savedJobsPerUser.max, viewedJobs.length)
    })

    // Save jobs with higher engagement (longer view duration)
    const highEngagementViews = views
      .filter((v) => v.duration_seconds > 60)
      .sort((a, b) => b.duration_seconds - a.duration_seconds)
      .slice(0, saveCount)

    highEngagementViews.forEach((view) => {
      saves.push({
        job_id: view.job_id,
        profile_id: candidate,
        saved_at: new Date(view.viewed_at.getTime() + faker.number.int({ min: 1000, max: 3600000 })) // 1s to 1h later
      })
    })

    return saves
  }

  private generateApplications(candidate: CandidateSkillProfile, saves: any[]): any[] {
    const applications: any[] = []
    const applicationCount = faker.number.int({
      min: USER_BEHAVIOR_PATTERNS.applicationsPerUser.min,
      max: Math.min(USER_BEHAVIOR_PATTERNS.applicationsPerUser.max, saves.length)
    })

    // Apply to highest matching saved jobs
    const sortedSaves = saves
      .sort((a, b) => {
        // Sort by some matching criteria - simplified
        return faker.number.float() - 0.5
      })
      .slice(0, applicationCount)

    sortedSaves.forEach((save) => {
      applications.push({
        job_id: save.job_id,
        profile_id: candidate,
        status: faker.helpers.arrayElement(['pending', 'reviewed', 'interviewing']),
        applied_at: new Date(save.saved_at.getTime() + faker.number.int({ min: 3600000, max: 86400000 })), // 1h to 1 day later
        cover_letter: faker.lorem.paragraph(),
        metadata: {}
      })
    })

    return applications
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private isLevelCompatible(candidateLevel: string, requiredLevel: string): boolean {
    const levels = ['beginner', 'intermediate', 'advanced', 'expert']
    const candidateIndex = levels.indexOf(candidateLevel)
    const requiredIndex = levels.indexOf(requiredLevel)

    return candidateIndex >= requiredIndex
  }

  private estimateCandidateSalaryExpectation(candidate: CandidateSkillProfile): number {
    // Simple estimation based on seniority
    const baseSalaries = {
      junior: 15,
      mid: 25,
      senior: 40
    }

    const base = baseSalaries[candidate.seniority] || 20
    // Add variance
    return base * (0.8 + faker.number.float() * 0.4) // ±20%
  }

  private generateSearchQuery(candidate: CandidateSkillProfile): any {
    const mainSkill = faker.helpers.arrayElement(candidate.skills).name
    const locations = VIETNAM_PROVINCES.slice(0, 10).map((p) => p.name) // Take top 10 provinces for search

    return {
      query: `${mainSkill} developer`,
      filters: {
        location: faker.helpers.arrayElement(locations),
        salary_min: faker.number.int({ min: 10000000, max: 30000000 }),
        job_type: faker.helpers.arrayElement(['full_time', 'part_time']),
        experience_level: candidate.seniority
      }
    }
  }

  private findRelevantJobs(searchQuery: any, jobs: JobProfile[]): JobProfile[] {
    // Simple relevance scoring based on query match
    return jobs
      .map((job) => ({
        ...job,
        relevance: this.calculateSearchRelevance(searchQuery, job)
      }))
      .sort((a, b) => b.relevance - a.relevance)
      .map((item) => item)
  }

  private calculateSearchRelevance(query: any, job: JobProfile): number {
    let score = 0

    // Title match
    if (job.title.toLowerCase().includes(query.query.toLowerCase())) {
      score += 0.4
    }

    // Skills match
    const querySkills = query.query.toLowerCase().split(' ')
    job.requiredSkills.forEach((skill) => {
      if (querySkills.some((qs: string) => skill.name.toLowerCase().includes(qs))) {
        score += 0.3
      }
    })

    // Location match
    if (job.location === query.filters.location) {
      score += 0.2
    }

    // Salary match
    if (job.salary.min <= query.filters.salary_min && job.salary.max >= query.filters.salary_min) {
      score += 0.1
    }

    return score
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const matchingEngine = new MatchingEngine()
