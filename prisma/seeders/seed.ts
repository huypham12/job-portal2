/**
 * ADVANCED SEED SYSTEM - Quality Data Generation for Search & Recommendation Testing
 *
 * Tạo 1000 companies, 5000 jobs, 10000 candidates với:
 * - 20-30% data thực tế VN market patterns
 * - 70-80% AI-generated học từ patterns thực tế
 * - Realistic matching & user behavior patterns
 * - Deterministic seeding (reproducible results)
 *
 * 🎯 Mục tiêu: Test search, matching, scoring, recommendation với data quality cao
 */

import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'
import { SEED_RANDOM } from './constants'
import { aiGenerator } from './ai-generator'
import { skillDistributionEngine } from './skill-distribution'
import { matchingEngine } from './matching-logic'
import { createBatchSeeder, withTiming } from './batch-seeder'
import { createStreamingSeeder, createDatabaseOptimizer, MemoryMonitor } from './streaming-seeder'
import {
  CompanyStreamingProcessor,
  CandidateStreamingProcessor,
  JobStreamingProcessor,
  UserBehaviorStreamingProcessor
} from './streaming-processors'

// Set deterministic seed for reproducible results
faker.seed(SEED_RANDOM)

const prisma = new PrismaClient()

// ============================================================================
// CONFIGURATION
// ============================================================================

const SEED_CONFIG = {
  COMPANIES_COUNT: 1000,
  JOBS_COUNT: 5000,
  CANDIDATES_COUNT: 10000,

  // Data source ratios
  REAL_DATA_RATIO: 0.25, // 25% real VN market patterns
  AI_GENERATED_RATIO: 0.75, // 75% AI learned from real patterns

  // Data management
  CLEAR_EXISTING_DATA: process.env.CLEAR_EXISTING_DATA === 'true' || false, // Set to true to clear all data before seeding
  USER_BEHAVIOR_CANDIDATE_LIMIT: parseInt(process.env.USER_BEHAVIOR_CANDIDATE_LIMIT || '300'), // Limit candidates for user behavior generation

  // Streaming configuration
  ENABLE_STREAMING: true,
  STREAMING_CHUNK_SIZE: 200,
  MAX_MEMORY_MB: 512,
  ENABLE_PARALLEL: true,
  PARALLEL_CHUNKS: 3,

  // Batch processing (fallback)
  BATCH_SIZE: 50,
  ENABLE_TRANSACTIONS: true,
  CONTINUE_ON_ERROR: true,
  MAX_RETRIES: 3
}

// ============================================================================
// PHASE 1: FOUNDATION DATA (Skills, Tags, Locations)
// ============================================================================

async function seedFoundationData(): Promise<void> {
  console.log('\n🏗️  PHASE 1: Seeding Foundation Data')

  // Import and use existing seeders for foundation data
  const { seedLocations } = await import('./seed-locations')
  const { seedSkills } = await import('./seed-skills')
  const { seedTags } = await import('./seed-tags')

  await withTiming(async () => {
    await seedLocations(prisma)
    await seedSkills(prisma)
    await seedTags(prisma)
  }, 'Foundation data seeding')
}

// ============================================================================
// PHASE 2: COMPANIES GENERATION (STREAMING)
// ============================================================================

async function streamCompanies(): Promise<void> {
  console.log('\n🏢 PHASE 2: Streaming Companies')

  const streamingSeeder = createStreamingSeeder(prisma, {
    chunkSize: SEED_CONFIG.STREAMING_CHUNK_SIZE,
    maxMemoryMB: SEED_CONFIG.MAX_MEMORY_MB,
    enableParallelProcessing: SEED_CONFIG.ENABLE_PARALLEL,
    parallelChunks: 1 // Reduce parallelism for companies to avoid deadlocks
  })

  const processor = new CompanyStreamingProcessor(prisma, SEED_CONFIG.COMPANIES_COUNT)

  await streamingSeeder.processStream(processor, {
    operationName: 'Company streaming',
    onProgress: (processed, total, chunkIndex) => {
      console.log(`🏢 Processed ${processed}/${total} companies (chunk ${chunkIndex + 1})`)
    },
    enableGC: true
  })
}

// ============================================================================
// PHASE 3: CANDIDATES GENERATION (STREAMING)
// ============================================================================

async function streamCandidates(): Promise<void> {
  console.log('\n👥 PHASE 3: Streaming Candidates')

  const { CANDIDATE_DISTRIBUTION } = await import('./constants')

  // Calculate distribution
  const juniorCount = Math.floor(SEED_CONFIG.CANDIDATES_COUNT * CANDIDATE_DISTRIBUTION.junior)
  const midCount = Math.floor(SEED_CONFIG.CANDIDATES_COUNT * CANDIDATE_DISTRIBUTION.mid)
  const seniorCount = SEED_CONFIG.CANDIDATES_COUNT - juniorCount - midCount

  console.log(`  📊 Distribution: ${juniorCount} junior, ${midCount} mid, ${seniorCount} senior`)

  const streamingSeeder = createStreamingSeeder(prisma, {
    chunkSize: 100, // Smaller chunks for candidates (they're heavier)
    maxMemoryMB: SEED_CONFIG.MAX_MEMORY_MB,
    enableParallelProcessing: SEED_CONFIG.ENABLE_PARALLEL,
    parallelChunks: SEED_CONFIG.PARALLEL_CHUNKS
  })

  const processor = new CandidateStreamingProcessor(prisma, SEED_CONFIG.CANDIDATES_COUNT)

  await streamingSeeder.processStream(processor, {
    operationName: 'Candidate streaming',
    onProgress: (processed, total, chunkIndex) => {
      console.log(`👥 Processed ${processed}/${total} candidates (chunk ${chunkIndex + 1})`)
    },
    enableGC: true
  })
}

// ============================================================================
// PHASE 4: JOBS GENERATION (STREAMING)
// ============================================================================

async function streamJobs(): Promise<any[]> {
  console.log('\n💼 PHASE 4: Streaming Jobs')

  // Get companies for job generation
  const companies = await prisma.companies.findMany({
    select: { id: true, name: true }
  })

  if (companies.length === 0) {
    throw new Error('No companies found. Please run company seeding first.')
  }

  console.log(`  📊 ${Math.floor(SEED_CONFIG.JOBS_COUNT / companies.length)} jobs per company average`)

  const streamingSeeder = createStreamingSeeder(prisma, {
    chunkSize: 150, // Medium chunks for jobs
    maxMemoryMB: SEED_CONFIG.MAX_MEMORY_MB,
    enableParallelProcessing: SEED_CONFIG.ENABLE_PARALLEL,
    parallelChunks: SEED_CONFIG.PARALLEL_CHUNKS
  })

  const processor = new JobStreamingProcessor(prisma, SEED_CONFIG.JOBS_COUNT, companies)

  await streamingSeeder.processStream(processor, {
    operationName: 'Job streaming',
    onProgress: (processed, total, chunkIndex) => {
      console.log(`💼 Processed ${processed}/${total} jobs (chunk ${chunkIndex + 1})`)
    },
    enableGC: true
  })

  // Return jobs for user behavior generation (simplified - in real implementation,
  // we'd need to fetch the inserted jobs)
  return companies // Placeholder return
}

// ============================================================================
// PHASE 5: USER BEHAVIOR & MATCHING SIMULATION (STREAMING)
// ============================================================================

async function streamUserBehavior(): Promise<void> {
  console.log('\n🎯 PHASE 5: Streaming User Behavior Simulation')

  // Get jobs and candidates for behavior simulation
  const [jobs, candidates] = await Promise.all([
    prisma.jobs.findMany({
      select: { id: true, title: true },
      take: SEED_CONFIG.JOBS_COUNT
    }),
    prisma.profiles.findMany({
      select: { id: true, user_id: true },
      take: SEED_CONFIG.USER_BEHAVIOR_CANDIDATE_LIMIT
    })
  ])

  if (jobs.length === 0 || candidates.length === 0) {
    console.warn('⚠️  Skipping user behavior generation - insufficient jobs or candidates')
    return
  }

  console.log(`  📊 Simulating behavior for ${candidates.length} candidates and ${jobs.length} jobs`)

  const streamingSeeder = createStreamingSeeder(prisma, {
    chunkSize: 50, // Small chunks for user behavior
    maxMemoryMB: SEED_CONFIG.MAX_MEMORY_MB,
    enableParallelProcessing: false, // Sequential for user behavior (complex relationships)
    parallelChunks: 1
  })

  const processor = new UserBehaviorStreamingProcessor(
    prisma,
    jobs,
    candidates,
    SEED_CONFIG.USER_BEHAVIOR_CANDIDATE_LIMIT / 10 // Smaller chunks
  )

  await streamingSeeder.processStream(processor, {
    operationName: 'User behavior streaming',
    onProgress: (processed, total, chunkIndex) => {
      console.log(`🎯 Processed behavior for ${processed}/${total} candidates (chunk ${chunkIndex + 1})`)
    },
    enableGC: true
  })
}

// ============================================================================
// MAIN SEEDING ORCHESTRATION
// ============================================================================

async function main() {
  console.log('🚀 ADVANCED SEED SYSTEM - Quality Data Generation')
  console.log('================================================')
  console.log(
    `Target: ${SEED_CONFIG.COMPANIES_COUNT} companies, ${SEED_CONFIG.JOBS_COUNT} jobs, ${SEED_CONFIG.CANDIDATES_COUNT} candidates`
  )
  console.log(
    `Data source: ${SEED_CONFIG.REAL_DATA_RATIO * 100}% real patterns + ${SEED_CONFIG.AI_GENERATED_RATIO * 100}% AI generated`
  )
  console.log(`User behavior: ${SEED_CONFIG.USER_BEHAVIOR_CANDIDATE_LIMIT} candidates (optimized for speed)`)
  if (SEED_CONFIG.CLEAR_EXISTING_DATA) {
    console.log('🧹 Data mode: CLEAR EXISTING DATA (fresh seeding)')
  } else {
    console.log('📦 Data mode: APPEND TO EXISTING DATA (incremental seeding)')
  }
  console.log('================================================')
  console.log('💡 To clear existing data: set CLEAR_EXISTING_DATA=true')
  console.log('================================================\n')

  const batchSeeder = createBatchSeeder(prisma, {
    batchSize: SEED_CONFIG.BATCH_SIZE,
    enableTransactions: SEED_CONFIG.ENABLE_TRANSACTIONS,
    continueOnError: SEED_CONFIG.CONTINUE_ON_ERROR
  })

  // Clear existing data if requested
  if (SEED_CONFIG.CLEAR_EXISTING_DATA) {
    console.log('\n🧹 CLEAR_EXISTING_DATA=true: Clearing all existing data before seeding...')
    console.log('⚠️  WARNING: This will delete ALL data from the database!')
    await withTiming(() => batchSeeder.clearData(), 'Data clearing')
    console.log('✅ Existing data cleared. Starting fresh seeding...\n')
  }

  try {
    // Initialize database optimizations
    const dbOptimizer = createDatabaseOptimizer(prisma)
    await dbOptimizer.optimizeForSeeding()

    // Start memory monitoring
    MemoryMonitor.start()

    // PHASE 1: Foundation Data
    await seedFoundationData()

    if (SEED_CONFIG.ENABLE_STREAMING) {
      console.log('\n🌊 USING STREAMING SEEDING MODE')

      // PHASE 2: Stream Companies
      await withTiming(() => streamCompanies(), 'Company streaming')

      // PHASE 3: Stream Candidates
      await withTiming(() => streamCandidates(), 'Candidate streaming')

      // PHASE 4: Stream Jobs
      await withTiming(() => streamJobs(), 'Job streaming')

      // PHASE 5: Stream User Behavior
      await withTiming(() => streamUserBehavior(), 'User behavior streaming')

      // PHASE 6: Seed Profile Extensions (simplified)
      await seedProfileExtensions([]) // Empty array since we're using streaming
    } else {
      console.log('\n📦 USING BATCH SEEDING MODE (LEGACY)')

      // Fallback to batch seeding for compatibility
      // PHASE 2: Generate Companies
      const companies = await withTiming(() => generateCompaniesLegacy(), 'Company generation')

      // PHASE 3: Seed Companies to DB
      await withTiming(async () => {
        const result = await batchSeeder.seedCompanies(companies)
        if (!result.success) {
          console.error('Company seeding failed:', result.errors)
        }
      }, 'Company seeding to database')

      // PHASE 4: Generate Candidates
      const candidates = await withTiming(() => generateCandidatesLegacy(), 'Candidate generation')

      // PHASE 5: Seed Users & Profiles to DB
      await withTiming(async () => {
        const result = await batchSeeder.seedUsersAndProfiles(candidates)
        if (!result.success) {
          console.error('User/Profile seeding failed:', result.errors)
        }
      }, 'User and profile seeding to database')

      // PHASE 6: Generate Jobs
      const jobs = await withTiming(() => generateJobsLegacy(companies), 'Job generation')

      // PHASE 7: Seed Jobs to DB
      await withTiming(async () => {
        const result = await batchSeeder.seedJobs(jobs)
        if (!result.success) {
          console.error('Job seeding failed:', result.errors)
        }
      }, 'Job seeding to database')

      // PHASE 8: Generate User Behavior (limited candidates for performance)
      const behaviorCandidates = candidates.slice(0, SEED_CONFIG.USER_BEHAVIOR_CANDIDATE_LIMIT)
      console.log(
        `  📊 Using ${behaviorCandidates.length}/${candidates.length} candidates for user behavior simulation`
      )
      const behavior = await withTiming(
        () => generateUserBehaviorLegacy(jobs, behaviorCandidates),
        'User behavior simulation'
      )

      // PHASE 9: Seed Profile Extensions (Skills, Experience, Education)
      await seedProfileExtensions(candidates)
    }

    // Restore database settings
    await dbOptimizer.restoreNormalOperation()

    // Report memory usage
    MemoryMonitor.report('seeding completion')

    // PHASE 10: Final Statistics
    await displayFinalStats()

    console.log('\n🎉 ADVANCED SEEDING COMPLETED SUCCESSFULLY!')
    console.log('===============================================')
    console.log('Data is now ready for:')
    console.log('• Search algorithm testing')
    console.log('• Recommendation system evaluation')
    console.log('• Matching score validation')
    console.log('• User behavior analysis')
    console.log('===============================================')
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    throw error
  }
}

// ============================================================================
// LEGACY FUNCTIONS (FALLBACK FOR BATCH MODE)
// ============================================================================

async function generateCompaniesLegacy(): Promise<any[]> {
  console.log('\n🏢 PHASE 2: Generating Companies (Legacy)')

  const companies: any[] = []

  // 25% real VN market inspired companies
  const realCompanyCount = Math.floor(SEED_CONFIG.COMPANIES_COUNT * SEED_CONFIG.REAL_DATA_RATIO)
  console.log(`  📊 Generating ${realCompanyCount} real-inspired companies...`)

  for (let i = 0; i < realCompanyCount; i++) {
    const company = aiGenerator.generateCompany()
    companies.push({
      ...company,
      source: 'real_inspired',
      slug: company.name
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]/g, '-')
        .replace(/-+/g, '-')
    })

    if (i % 100 === 0) console.log(`    Generated ${i + 1}/${realCompanyCount} real companies...`)
  }

  // 75% AI generated companies learning from real patterns
  const aiCompanyCount = SEED_CONFIG.COMPANIES_COUNT - realCompanyCount
  console.log(`  🤖 Generating ${aiCompanyCount} AI-learned companies...`)

  for (let i = 0; i < aiCompanyCount; i++) {
    const company = aiGenerator.generateCompany()
    companies.push({
      ...company,
      source: 'ai_generated',
      slug: company.name
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]/g, '-')
        .replace(/-+/g, '-')
    })

    if (i % 200 === 0)
      console.log(`    Generated ${realCompanyCount + i + 1}/${SEED_CONFIG.COMPANIES_COUNT} AI companies...`)
  }

  return companies
}

async function generateCandidatesLegacy(): Promise<any[]> {
  console.log('\n👥 PHASE 3: Generating Candidates (Legacy)')

  const candidates: any[] = []
  const { CANDIDATE_DISTRIBUTION } = await import('./constants')

  // Calculate distribution
  const juniorCount = Math.floor(SEED_CONFIG.CANDIDATES_COUNT * CANDIDATE_DISTRIBUTION.junior)
  const midCount = Math.floor(SEED_CONFIG.CANDIDATES_COUNT * CANDIDATE_DISTRIBUTION.mid)
  const seniorCount = SEED_CONFIG.CANDIDATES_COUNT - juniorCount - midCount

  console.log(`  📊 Distribution: ${juniorCount} junior, ${midCount} mid, ${seniorCount} senior`)

  // Generate candidates by seniority
  const seniorities: Array<'junior' | 'mid' | 'senior'> = ['junior', 'mid', 'senior']
  const counts = [juniorCount, midCount, seniorCount]

  for (let s = 0; s < seniorities.length; s++) {
    const seniority = seniorities[s]
    const count = counts[s]

    console.log(`    Generating ${count} ${seniority} candidates...`)

    for (let i = 0; i < count; i++) {
      // Generate base profile
      const profile = aiGenerator.generateProfile()

      // Generate skill profile for this candidate
      const skillProfile = skillDistributionEngine.generateCandidateSkills(seniority)

      // Combine profile with skills
      const candidate = {
        ...profile,
        email: `candidate${candidates.length + 1}@example.com`,
        seniority,
        skills: skillProfile.skills,
        source: 'ai_generated',
        password_hash: '$2b$10$dummy.hash.for.seeding.purposes.only'
      }

      candidates.push(candidate)

      if (candidates.length % 500 === 0) {
        console.log(`      Generated ${candidates.length}/${SEED_CONFIG.CANDIDATES_COUNT} candidates...`)
      }
    }
  }

  return candidates
}

async function generateJobsLegacy(companies: any[]): Promise<any[]> {
  console.log('\n💼 PHASE 4: Generating Jobs with Matching Logic (Legacy)')

  const jobs: any[] = []
  const jobsPerCompany = Math.floor(SEED_CONFIG.JOBS_COUNT / companies.length)

  console.log(`  📊 ${jobsPerCompany} jobs per company average`)

  for (const company of companies) {
    const companyJobCount = jobsPerCompany + faker.number.int({ min: -1, max: 2 }) // ±2 variance

    for (let i = 0; i < companyJobCount && jobs.length < SEED_CONFIG.JOBS_COUNT; i++) {
      // Generate job based on company industry
      const job = aiGenerator.generateJob(company, getJobCategoryForIndustry(company.industry))

      jobs.push({
        ...job,
        company_slug: company.slug,
        source: 'ai_generated'
      })
    }

    if (companies.indexOf(company) % 100 === 0) {
      console.log(
        `    Generated jobs for ${companies.indexOf(company) + 1}/${companies.length} companies (${jobs.length} total)...`
      )
    }
  }

  return jobs
}

async function generateUserBehaviorLegacy(
  jobs: any[],
  candidates: any[]
): Promise<{
  applications: any[]
  jobViews: any[]
  savedJobs: any[]
  searchHistory: any[]
}> {
  console.log('\n🎯 PHASE 5: Simulating User Behavior & Matching (Legacy)')

  // Convert to JobProfile format for matching engine
  const jobProfiles: any[] = jobs.map((job) => ({
    id: `job_${jobs.indexOf(job)}`,
    title: job.title,
    requiredSkills: job.skills.map((skill: any) => ({
      name: skill,
      proficiency: 3,
      level: 'intermediate'
    })),
    seniority: job.level,
    location: job.location_province,
    salary: job.salary,
    company: { name: job.company_slug }
  }))

  // Convert candidates to skill profiles
  const candidateProfiles = candidates.map((candidate) => ({
    skills: candidate.skills,
    seniority: candidate.seniority,
    primaryCategory: 'programming_languages'
  }))

  // Generate realistic user behavior
  const behavior = matchingEngine.generateUserBehaviorForJobs(jobProfiles, candidateProfiles)

  console.log(`  📊 Generated:`)
  console.log(`    - ${behavior.applications.length} applications`)
  console.log(`    - ${behavior.jobViews.length} job views`)
  console.log(`    - ${behavior.savedJobs.length} saved jobs`)
  console.log(`    - ${behavior.searchHistory.length} search history entries`)

  return behavior
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getJobCategoryForIndustry(industry: string): string {
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

async function seedProfileExtensions(candidates: any[]): Promise<void> {
  console.log('\n📚 PHASE 9: Seeding Profile Extensions')

  // Use existing seeders for profile extensions
  const { seedProfileExperiences } = await import('./seed-profile-experiences')
  const { seedProfileEducations } = await import('./seed-profile-educations')
  const { seedProfileCertifications } = await import('./seed-profile-certifications')
  const { seedProfileAwards } = await import('./seed-profile-awards')

  await withTiming(async () => {
    // Skip profile skills in streaming mode - already handled by CandidateStreamingProcessor
    if (candidates.length > 0) {
      const { seedProfileSkills } = await import('./seed-profile-skills')
      await seedProfileSkills(prisma)
    } else {
      console.log('  ⏭️  Skipping profile skills seeding (already handled by streaming processor)')
    }

    await seedProfileExperiences(prisma)
    await seedProfileEducations(prisma)
    await seedProfileCertifications(prisma)
    await seedProfileAwards(prisma)
  }, 'Profile extensions seeding')
}

async function displayFinalStats(): Promise<void> {
  console.log('\n📊 FINAL STATISTICS')
  console.log('==================')

  const batchSeeder = createBatchSeeder(prisma)
  const stats = await batchSeeder.getStats()

  console.log(`Companies: ${stats.companies}`)
  console.log(`Users: ${stats.users}`)
  console.log(`Profiles: ${stats.profiles}`)
  console.log(`Jobs: ${stats.jobs}`)
  console.log(`Skills: ${stats.skills}`)
  console.log(`Tags: ${stats.tags}`)
  console.log(`Locations: ${stats.locations}`)
  console.log(`Job Views: ${stats.job_views}`)
  console.log(`Saved Jobs: ${stats.saved_jobs}`)
  console.log(`Applications: ${stats.applications}`)
}

// ============================================================================
// EXECUTION
// ============================================================================

main()
  .catch((e) => {
    console.error('💥 CRITICAL ERROR:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
