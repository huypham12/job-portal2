/**
 * Streaming Processors for Different Entity Types
 * Implement StreamProcessor interface cho từng loại entity
 */

import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'
import { StreamProcessor } from './streaming-seeder'
import { aiGenerator } from './ai-generator'
import { skillDistributionEngine } from './skill-distribution'
import { CANDIDATE_DISTRIBUTION } from './constants'

// Set deterministic seed
faker.seed(42)

/**
 * Company Streaming Processor
 */
export class CompanyStreamingProcessor implements StreamProcessor<any, any> {
  private prisma: PrismaClient
  private totalCount: number

  constructor(prisma: PrismaClient, totalCount: number) {
    this.prisma = prisma
    this.totalCount = totalCount
  }

  getTotalCount(): number {
    return this.totalCount
  }

  getChunkSize(): number {
    return 200 // Companies are lightweight, can process larger chunks
  }

  async generateChunk(startIndex: number, chunkSize: number): Promise<any[]> {
    const companies: any[] = []

    for (let i = 0; i < chunkSize; i++) {
      const company = aiGenerator.generateCompany()
      companies.push({
        ...company,
        source: startIndex < this.totalCount * 0.25 ? 'real_inspired' : 'ai_generated',
        slug: company.name
          .toLowerCase()
          .replace(/[^a-zA-Z0-9]/g, '-')
          .replace(/-+/g, '-')
      })
    }

    return companies
  }

  async processChunk(chunk: any[]): Promise<any> {
    // Prepare company data
    const companies = chunk.map((company) => ({
      name: company.name,
      description: company.description,
      contact_email: company.contact_email,
      contact_phone: company.contact_phone,
      contact_address: company.contact_address,
      linkedin_url: company.linkedin_url,
      facebook_url: company.facebook_url,
      tax_code: company.tax_code,
      created_at: new Date(),
      updated_at: new Date()
    }))

    // Bulk insert companies
    const result = await this.prisma.companies.createMany({
      data: companies,
      skipDuplicates: true
    })

    // Get inserted companies for related data
    const validCompanies = companies.filter((c) => c.name && typeof c.name === 'string')
    const insertedCompanies = await this.prisma.companies.findMany({
      where: {
        name: { in: validCompanies.map((c) => c.name) }
      },
      select: { id: true, name: true },
      orderBy: { created_at: 'desc' },
      take: validCompanies.length
    })

    const companyMap = new Map(insertedCompanies.map((c) => [c.name, c.id]))

    // Prepare and insert company details
    const companyDetails = chunk
      .map((company) => {
        const companyId = companyMap.get(company.name)
        if (!companyId) return null

        return {
          company_id: companyId,
          industry: company.industry,
          founded_year: company.founded_year,
          employee_count_min: company.employee_count_min,
          employee_count_max: company.employee_count_max,
          website_url: company.website_url,
          culture_description: company.culture_description,
          created_at: new Date(),
          updated_at: new Date()
        }
      })
      .filter(Boolean)

    if (companyDetails.length > 0) {
      await this.prisma.company_details.createMany({
        data: companyDetails,
        skipDuplicates: true
      })
    }

    // Prepare and insert company benefits
    const companyBenefits = chunk.flatMap((company) => {
      const companyId = companyMap.get(company.name)
      if (!companyId || !company.benefits) return []

      return company.benefits.map((benefit: any) => ({
        company_id: companyId,
        benefit_type: benefit.benefit_type,
        title: benefit.title,
        description: benefit.description,
        is_featured: benefit.is_featured,
        created_at: new Date()
      }))
    })

    if (companyBenefits.length > 0) {
      await this.prisma.company_benefits.createMany({
        data: companyBenefits,
        skipDuplicates: true
      })
    }

    return {
      companiesInserted: result.count,
      detailsInserted: companyDetails.length,
      benefitsInserted: companyBenefits.length
    }
  }
}

/**
 * Candidate Streaming Processor
 */
export class CandidateStreamingProcessor implements StreamProcessor<any, any> {
  private prisma: PrismaClient
  private totalCount: number
  private juniorCount: number
  private midCount: number
  private seniorCount: number

  constructor(prisma: PrismaClient, totalCount: number) {
    this.prisma = prisma
    this.totalCount = totalCount

    // Calculate distribution
    this.juniorCount = Math.floor(totalCount * CANDIDATE_DISTRIBUTION.junior)
    this.midCount = Math.floor(totalCount * CANDIDATE_DISTRIBUTION.mid)
    this.seniorCount = totalCount - this.juniorCount - this.midCount
  }

  getTotalCount(): number {
    return this.totalCount
  }

  getChunkSize(): number {
    return 100 // Candidates are heavier with skills, smaller chunks
  }

  async generateChunk(startIndex: number, chunkSize: number): Promise<any[]> {
    const candidates: any[] = []

    for (let i = 0; i < chunkSize; i++) {
      const globalIndex = startIndex + i

      // Determine seniority for this candidate
      let seniority: 'junior' | 'mid' | 'senior'
      if (globalIndex < this.juniorCount) {
        seniority = 'junior'
      } else if (globalIndex < this.juniorCount + this.midCount) {
        seniority = 'mid'
      } else {
        seniority = 'senior'
      }

      // Generate base profile
      const profile = aiGenerator.generateProfile()

      // Generate skill profile for this candidate
      const skillProfile = skillDistributionEngine.generateCandidateSkills(seniority)

      // Combine profile with skills
      const candidate = {
        ...profile,
        email: `candidate${globalIndex + 1}@example.com`,
        seniority,
        skills: skillProfile.skills,
        source: 'ai_generated',
        password_hash: '$2b$10$dummy.hash.for.seeding.purposes.only',
        role: 'candidate',
        verified: true
      }

      candidates.push(candidate)
    }

    return candidates
  }

  async processChunk(chunk: any[]): Promise<any> {
    // Prepare user data
    const users = chunk.map((candidate) => ({
      email: candidate.email,
      password_hash: candidate.password_hash,
      role: candidate.role,
      verified: candidate.verified,
      created_at: new Date(),
      updated_at: new Date()
    }))

    // Bulk insert users
    const userResult = await this.prisma.users.createMany({
      data: users,
      skipDuplicates: true
    })

    // Get inserted users
    const insertedUsers = await this.prisma.users.findMany({
      where: {
        email: { in: users.map((u) => u.email) }
      },
      select: { id: true, email: true },
      orderBy: { created_at: 'desc' },
      take: users.length
    })

    const userMap = new Map(insertedUsers.map((u) => [u.email, u.id]))

    // Prepare and insert profiles
    const profiles = chunk
      .map((candidate) => {
        const userId = userMap.get(candidate.email)
        if (!userId) return null

        return {
          user_id: userId,
          full_name: candidate.full_name,
          display_name: candidate.display_name,
          headline: candidate.headline,
          bio: candidate.bio,
          gender: candidate.gender,
          date_of_birth: candidate.date_of_birth,
          phone_number: candidate.phone_number,
          years_of_experience: candidate.years_of_experience,
          desired_job_title: candidate.desired_job_title,
          desired_job_type: candidate.desired_job_type,
          desired_salary_min: candidate.desired_salary_min,
          desired_currency: candidate.desired_currency,
          availability_status: candidate.availability_status,
          is_looking_for_job: candidate.is_looking_for_job,
          is_public: candidate.is_public,
          location_text: candidate.location_text,
          github_url: candidate.github_url,
          linkedin_url: candidate.linkedin_url,
          personal_website: candidate.personal_website,
          avatar_url: candidate.avatar_url,
          created_at: new Date(),
          updated_at: new Date()
        }
      })
      .filter(Boolean)

    if (profiles.length > 0) {
      await this.prisma.profiles.createMany({
        data: profiles,
        skipDuplicates: true
      })
    }

    // Get inserted profiles for skills
    const insertedProfiles = await this.prisma.profiles.findMany({
      where: {
        user_id: { in: insertedUsers.map((u) => u.id) }
      },
      select: { id: true, user_id: true },
      orderBy: { created_at: 'desc' },
      take: profiles.length
    })

    const profileMap = new Map(insertedProfiles.map((p) => [p.user_id, p.id]))

    // Prepare and insert profile skills
    const profileSkills = chunk.flatMap((candidate) => {
      const userId = userMap.get(candidate.email)
      const profileId = profileMap.get(userId)
      if (!profileId || !candidate.skills) return []

      return candidate.skills.map((skill: any) => ({
        profile_id: profileId,
        skill_id: skill.id || 1, // This needs proper skill ID lookup
        proficiency_level: skill.proficiency,
        experience_years: skill.experience_years || 1,
        is_primary: skill.is_primary || false,
        created_at: new Date()
      }))
    })

    if (profileSkills.length > 0) {
      try {
        await this.prisma.profile_skills.createMany({
          data: profileSkills,
          skipDuplicates: true
        })
      } catch (error) {
        console.warn('⚠️  Failed to insert some profile skills:', error.message)
      }
    }

    return {
      usersInserted: userResult.count,
      profilesInserted: profiles.length,
      skillsInserted: profileSkills.length
    }
  }
}

/**
 * Job Streaming Processor
 */
export class JobStreamingProcessor implements StreamProcessor<any, any> {
  private prisma: PrismaClient
  private totalCount: number
  private companies: any[]

  constructor(prisma: PrismaClient, totalCount: number, companies: any[]) {
    this.prisma = prisma
    this.totalCount = totalCount
    this.companies = companies
  }

  getTotalCount(): number {
    return this.totalCount
  }

  getChunkSize(): number {
    return 150 // Jobs are medium weight
  }

  async generateChunk(startIndex: number, chunkSize: number): Promise<any[]> {
    const jobs: any[] = []

    for (let i = 0; i < chunkSize; i++) {
      // Select random company for this job
      const company = faker.helpers.arrayElement(this.companies)

      // Generate job based on company industry
      const job = aiGenerator.generateJob(company, this.getJobCategoryForIndustry(company.industry))

      jobs.push({
        ...job,
        company_slug: company.slug,
        source: 'ai_generated'
      })
    }

    return jobs
  }

  async processChunk(chunk: any[]): Promise<any> {
    // Get company mappings
    const companyNames = [
      ...new Set(chunk.map((job) => job.company_slug).filter((name) => name && typeof name === 'string'))
    ]
    const companies =
      companyNames.length > 0
        ? await this.prisma.companies.findMany({
            where: { name: { in: companyNames } },
            select: { id: true, name: true }
          })
        : []
    const companyMap = new Map(companies.map((c) => [c.name, c.id]))

    // Get location mappings
    const provinces = [
      ...new Set(chunk.map((job) => job.location_province).filter((name) => name && typeof name === 'string'))
    ]
    const locations =
      provinces.length > 0
        ? await this.prisma.locations.findMany({
            where: { name: { in: provinces } },
            select: { id: true, name: true }
          })
        : []
    const locationMap = new Map(locations.map((l) => [l.name, l.id]))

    // Prepare job data
    const jobs = chunk
      .map((job) => {
        const companyId = companyMap.get(job.company_slug)
        const locationId = locationMap.get(job.location_province)

        return {
          title: job.title,
          description: JSON.stringify(job.description || []),
          company_id: companyId,
          location_id: locationId,
          salary_range: job.salary,
          job_type: job.job_type,
          experience_level: job.experience_years_min || 0,
          posted_at: faker.date.recent({ days: 30 }),
          expires_at: faker.date.future({ years: 0.5 }),
          status: job.status || 'approved',
          created_at: new Date(),
          updated_at: new Date()
        }
      })
      .filter((job) => job.company_id && job.location_id) // Only insert jobs with valid references

    // Bulk insert jobs
    const jobResult = await this.prisma.jobs.createMany({
      data: jobs,
      skipDuplicates: true
    })

    // Get inserted jobs for related data
    const insertedJobs = await this.prisma.jobs.findMany({
      where: {
        title: { in: jobs.map((j) => j.title) },
        posted_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24h
      },
      select: { id: true, title: true },
      orderBy: { posted_at: 'desc' },
      take: jobs.length
    })

    // Insert job skills if available
    // This would require job skills data structure
    // For now, we'll skip this part as it needs more complex implementation

    return { jobsInserted: jobResult.count }
  }

  private getJobCategoryForIndustry(industry: string): string {
    const industryMap: Record<string, string> = {
      Technology: 'backend',
      FinTech: 'backend',
      'E-commerce': 'fullstack',
      Healthcare: 'backend',
      Education: 'frontend',
      Manufacturing: 'backend',
      Retail: 'frontend',
      Consulting: 'product',
      'Real Estate': 'frontend',
      Media: 'frontend'
    }

    return industryMap[industry] || 'backend'
  }
}

/**
 * Optimized User Behavior Processor
 */
export class UserBehaviorStreamingProcessor implements StreamProcessor<any, any> {
  private prisma: PrismaClient
  private jobs: any[]
  private candidates: any[]
  private chunkSize: number

  constructor(prisma: PrismaClient, jobs: any[], candidates: any[], chunkSize: number = 50) {
    this.prisma = prisma
    this.jobs = jobs
    this.candidates = candidates
    this.chunkSize = chunkSize
  }

  getTotalCount(): number {
    return this.candidates.length
  }

  getChunkSize(): number {
    return this.chunkSize
  }

  async generateChunk(startIndex: number, chunkSize: number): Promise<any[]> {
    const candidateChunk = this.candidates.slice(startIndex, startIndex + chunkSize)

    // Generate user behavior for this chunk of candidates
    const behaviorData: any[] = []

    for (const candidate of candidateChunk) {
      // Simplified behavior generation - in real implementation,
      // this would use the matching engine
      const candidateBehavior = {
        candidate,
        views: this.generateJobViews(candidate),
        saves: this.generateSavedJobs(candidate),
        applications: this.generateApplications(candidate)
      }

      behaviorData.push(candidateBehavior)
    }

    return behaviorData
  }

  async processChunk(chunk: any[]): Promise<any> {
    let totalViews = 0,
      totalSaves = 0,
      totalApplications = 0

    for (const behavior of chunk) {
      // Insert job views
      if (behavior.views.length > 0) {
        await this.prisma.job_views.createMany({
          data: behavior.views,
          skipDuplicates: true
        })
        totalViews += behavior.views.length
      }

      // Insert saved jobs
      if (behavior.saves.length > 0) {
        await this.prisma.saved_jobs.createMany({
          data: behavior.saves,
          skipDuplicates: true
        })
        totalSaves += behavior.saves.length
      }

      // Insert applications
      if (behavior.applications.length > 0) {
        await this.prisma.applications.createMany({
          data: behavior.applications,
          skipDuplicates: true
        })
        totalApplications += behavior.applications.length
      }
    }

    return { views: totalViews, saves: totalSaves, applications: totalApplications }
  }

  private generateJobViews(candidate: any): any[] {
    const viewCount = faker.number.int({ min: 5, max: 20 })
    const viewedJobs = faker.helpers.arrayElements(this.jobs, viewCount)

    return viewedJobs.map((job) => ({
      job_id: job.id || 1, // Need proper job ID
      profile_id: candidate.id || 1, // Need proper profile ID
      viewed_at: faker.date.recent({ days: 30 }),
      duration_seconds: faker.number.int({ min: 30, max: 300 }),
      source: faker.helpers.arrayElement(['search', 'direct', 'recommendation'])
    }))
  }

  private generateSavedJobs(candidate: any): any[] {
    // Save 10-30% of viewed jobs
    const viewedJobs = this.generateJobViews(candidate)
    const saveCount = Math.floor(viewedJobs.length * faker.number.float({ min: 0.1, max: 0.3 }))

    return viewedJobs.slice(0, saveCount).map((view) => ({
      job_id: view.job_id,
      profile_id: view.profile_id,
      saved_at: new Date(view.viewed_at.getTime() + faker.number.int({ min: 1000, max: 3600000 }))
    }))
  }

  private generateApplications(candidate: any): any[] {
    // Apply to 20-50% of saved jobs
    const savedJobs = this.generateSavedJobs(candidate)
    const applicationCount = Math.floor(savedJobs.length * faker.number.float({ min: 0.2, max: 0.5 }))

    return savedJobs.slice(0, applicationCount).map((save) => ({
      job_id: save.job_id,
      profile_id: save.profile_id,
      status: faker.helpers.arrayElement(['pending', 'reviewed', 'interviewing']),
      applied_at: new Date(save.saved_at.getTime() + faker.number.int({ min: 3600000, max: 86400000 })),
      cover_letter: faker.lorem.paragraph(),
      metadata: {}
    }))
  }
}
