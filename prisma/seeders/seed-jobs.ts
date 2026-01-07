import { PrismaClient, job_status, job_type } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { envConfig } from '../../src/config/getEnvConfig'
// import { elasticsearchSyncService } from '../../../src/shared/services/elasticsearch-sync.service'

const prisma = new PrismaClient()

// Check if Elasticsearch is available and enabled
const isElasticsearchEnabled = !envConfig.elasticsearch.disableElasticsearch
let isElasticsearchAvailable = false

// Interfaces for JSON data
interface JobData {
  title: string
  description: string
  salary_range: {
    min: number
    max: number
    currency: string
  }
  job_type: string
  experience_level: number
  status: string
  expires_at: string
  posted_at: string
}

// Valid job types from Prisma enum
const VALID_JOB_TYPES = ['full_time', 'part_time', 'contract'] as const
type ValidJobType = (typeof VALID_JOB_TYPES)[number]

// Map invalid job types from JSON to valid enum values
const jobTypeMapping: Record<string, ValidJobType> = {
  'full-time': 'full_time',
  'part-time': 'part_time',
  part_time: 'part_time',
  full_time: 'full_time',
  contract: 'contract',
  freelance: 'contract', // Map freelance to contract
  internship: 'part_time', // Map internship to part_time
  temporary: 'contract',
  seasonal: 'contract',
  volunteer: 'part_time'
}

// Track job type mapping for logging
const jobTypeMappingStats: Record<string, number> = {}

// Helper function to validate and map job type
const validateJobType = (jobType: string): ValidJobType => {
  const normalizedType = jobType.toLowerCase().trim()

  // Track stats
  jobTypeMappingStats[normalizedType] = (jobTypeMappingStats[normalizedType] || 0) + 1

  // Check if it's already a valid type
  if (VALID_JOB_TYPES.includes(normalizedType as ValidJobType)) {
    return normalizedType as ValidJobType
  }

  // Map to valid type
  const mappedType = jobTypeMapping[normalizedType]
  if (mappedType) {
    return mappedType
  }

  // Default fallback
  console.warn(`⚠️  Unknown job type "${jobType}", defaulting to "full_time"`)
  return 'full_time'
}

interface JobBenefitData {
  benefit_type: string
  title: string
  description: string | null
  value_amount: number | null
  value_currency: string | null
}

interface JobCategoryData {
  job_id: string
  category_id: string
}

interface JobRequirementData {
  requirement_type: string
  title: string
  description: string | null
  is_required: boolean
  level: string | null
  years_experience: number | null
}

interface JobWorkArrangementData {
  is_remote_allowed: boolean
  remote_percentage: number
  flexible_hours: boolean
  travel_requirement: string | null
  overtime_expected: boolean
  shift_type: string | null
}

// Job categories for diversity mapping
enum JobCategory {
  TECH = 'tech',
  HEALTHCARE = 'healthcare',
  FINANCE = 'finance',
  EDUCATION = 'education',
  MARKETING = 'marketing',
  ENGINEERING = 'engineering',
  HOSPITALITY = 'hospitality',
  LEGAL = 'legal',
  SALES = 'sales',
  OTHER = 'other'
}

// Mapping industry to job categories
const industryToJobCategories: Record<string, JobCategory[]> = {
  Technology: [JobCategory.TECH],
  Healthcare: [JobCategory.HEALTHCARE],
  Finance: [JobCategory.FINANCE],
  Education: [JobCategory.EDUCATION],
  Retail: [JobCategory.SALES, JobCategory.MARKETING],
  Manufacturing: [JobCategory.ENGINEERING],
  Hospitality: [JobCategory.HOSPITALITY],
  Legal: [JobCategory.LEGAL],
  Construction: [JobCategory.ENGINEERING],
  'Real Estate': [JobCategory.SALES],
  Transportation: [JobCategory.ENGINEERING],
  Energy: [JobCategory.ENGINEERING],
  Agriculture: [JobCategory.ENGINEERING],
  Media: [JobCategory.MARKETING],
  Entertainment: [JobCategory.MARKETING],
  Consulting: [JobCategory.OTHER],
  'Non-profit': [JobCategory.OTHER],
  Government: [JobCategory.OTHER],
  Telecommunications: [JobCategory.TECH],
  Pharmaceuticals: [JobCategory.HEALTHCARE],
  Insurance: [JobCategory.FINANCE],
  Automotive: [JobCategory.ENGINEERING],
  'Food & Beverage': [JobCategory.HOSPITALITY]
}

// Mapping job categories to skill category types
const jobCategoryToSkillTypes: Record<JobCategory, string[]> = {
  [JobCategory.TECH]: ['technical'],
  [JobCategory.HEALTHCARE]: ['technical'], // Healthcare might need specific technical skills
  [JobCategory.FINANCE]: ['technical'], // Finance analysis skills
  [JobCategory.EDUCATION]: ['technical'], // Educational technology
  [JobCategory.MARKETING]: ['technical'], // Digital marketing tools
  [JobCategory.ENGINEERING]: ['technical'],
  [JobCategory.HOSPITALITY]: ['technical'], // Hospitality management systems
  [JobCategory.LEGAL]: ['technical'], // Legal research tools
  [JobCategory.SALES]: ['technical'], // CRM systems
  [JobCategory.OTHER]: ['technical', 'industry'] // Mix of skills
}

// Function to categorize job based on title
function categorizeJob(title: string): JobCategory {
  const titleLower = title.toLowerCase()

  if (
    titleLower.includes('developer') ||
    titleLower.includes('engineer') ||
    titleLower.includes('architect') ||
    titleLower.includes('analyst') ||
    titleLower.includes('scientist') ||
    titleLower.includes('programmer') ||
    titleLower.includes('designer') ||
    titleLower.includes('automation') ||
    titleLower.includes('devops') ||
    titleLower.includes('quality') ||
    titleLower.includes('database') ||
    titleLower.includes('api')
  ) {
    return JobCategory.TECH
  }

  if (
    titleLower.includes('medical') ||
    titleLower.includes('health') ||
    titleLower.includes('nurse') ||
    titleLower.includes('therapist') ||
    titleLower.includes('technician') ||
    titleLower.includes('pharmacist') ||
    titleLower.includes('physician') ||
    titleLower.includes('radiologic') ||
    titleLower.includes('veterinary') ||
    titleLower.includes('dietitian') ||
    titleLower.includes('paramedic')
  ) {
    return JobCategory.HEALTHCARE
  }

  if (
    titleLower.includes('finance') ||
    titleLower.includes('financial') ||
    titleLower.includes('accountant') ||
    titleLower.includes('analyst') ||
    titleLower.includes('controller') ||
    titleLower.includes('equity') ||
    titleLower.includes('credit') ||
    titleLower.includes('budget') ||
    titleLower.includes('tax') ||
    titleLower.includes('insurance') ||
    titleLower.includes('underwriter')
  ) {
    return JobCategory.FINANCE
  }

  if (
    titleLower.includes('teacher') ||
    titleLower.includes('professor') ||
    titleLower.includes('instructor') ||
    titleLower.includes('educator') ||
    titleLower.includes('tutor')
  ) {
    return JobCategory.EDUCATION
  }

  if (
    titleLower.includes('marketing') ||
    titleLower.includes('content') ||
    titleLower.includes('advertising') ||
    titleLower.includes('brand') ||
    titleLower.includes('digital') ||
    titleLower.includes('growth') ||
    titleLower.includes('creative') ||
    titleLower.includes('public relations')
  ) {
    return JobCategory.MARKETING
  }

  if (
    titleLower.includes('engineer') ||
    titleLower.includes('architect') ||
    titleLower.includes('project manager') ||
    titleLower.includes('estimator') ||
    titleLower.includes('inspector') ||
    titleLower.includes('process')
  ) {
    return JobCategory.ENGINEERING
  }

  if (
    titleLower.includes('hotel') ||
    titleLower.includes('restaurant') ||
    titleLower.includes('chef') ||
    titleLower.includes('bartender') ||
    titleLower.includes('cook') ||
    titleLower.includes('housekeeper') ||
    titleLower.includes('concierge') ||
    titleLower.includes('tour guide')
  ) {
    return JobCategory.HOSPITALITY
  }

  if (
    titleLower.includes('attorney') ||
    titleLower.includes('legal') ||
    titleLower.includes('counsel') ||
    titleLower.includes('litigation') ||
    titleLower.includes('compliance')
  ) {
    return JobCategory.LEGAL
  }

  if (
    titleLower.includes('sales') ||
    titleLower.includes('account executive') ||
    titleLower.includes('business development') ||
    titleLower.includes('customer success') ||
    titleLower.includes('representative')
  ) {
    return JobCategory.SALES
  }

  return JobCategory.OTHER
}

export async function seedJobs() {
  console.log('💼 Starting jobs seeding...')

  // Fixed: 3 jobs per company, 100 companies = 300 jobs total
  const jobsPerCompany = 3

  try {
    // Check Elasticsearch availability
    if (isElasticsearchEnabled) {
      try {
        // @ts-expect-error - Optional elasticsearch dependency
        isElasticsearchAvailable = await import('../../../src/config/elasticsearch.service')
          .then(({ elasticsearchService }: any) => elasticsearchService.checkConnection())
          .catch(() => false)
        if (isElasticsearchAvailable) {
          console.log('✅ Elasticsearch is available for job sync')
        } else {
          console.log('⚠️  Elasticsearch is not available - sync disabled')
        }
      } catch (error) {
        console.log('⚠️  Elasticsearch check failed - sync disabled')
        isElasticsearchAvailable = false
      }
    }

    // Load data from JSON files
    const jobsPath = path.join(__dirname, 'data', 'jobs.json')
    const jobBenefitsPath = path.join(__dirname, 'data', 'job_benefits.json')
    const jobCategoriesPath = path.join(__dirname, 'data', 'job_categories.json')
    const jobRequirementsPath = path.join(__dirname, 'data', 'job_requirements.json')
    const jobWorkArrangementsPath = path.join(__dirname, 'data', 'job_work_arrangements.json')

    const jobsData: JobData[] = JSON.parse(fs.readFileSync(jobsPath, 'utf-8'))
    const jobBenefitsData: JobBenefitData[] = JSON.parse(fs.readFileSync(jobBenefitsPath, 'utf-8'))
    const jobCategoriesData: JobCategoryData[] = JSON.parse(fs.readFileSync(jobCategoriesPath, 'utf-8'))
    const jobRequirementsData: JobRequirementData[] = JSON.parse(fs.readFileSync(jobRequirementsPath, 'utf-8'))
    const jobWorkArrangementsData: JobWorkArrangementData[] = JSON.parse(
      fs.readFileSync(jobWorkArrangementsPath, 'utf-8')
    )

    console.log(
      `📊 Loaded ${jobsData.length} jobs, ${jobBenefitsData.length} job benefits, ${jobCategoriesData.length} job categories, ${jobRequirementsData.length} job requirements, ${jobWorkArrangementsData.length} work arrangements`
    )

    // Get all existing companies with their industries and locations
    console.log('🏢 Fetching existing companies...')
    const companies = await prisma.companies.findMany({
      include: {
        company_details: {
          select: {
            industry: true,
            headquarters_location_id: true,
            headquarters_location: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
          }
        }
      }
    })

    // Get all available locations for fallback
    console.log('📍 Fetching available locations...')
    const availableLocations = await prisma.locations.findMany({
      where: {
        type: 'province' // Only provinces for job locations
      },
      select: {
        id: true,
        name: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    if (companies.length === 0) {
      throw new Error('No companies found. Please run companies seeding first.')
    }

    console.log(`🏢 Found ${companies.length} companies to create jobs for`)

    // Clear existing job-related data (delete jobs first to trigger cascade deletes)
    console.log('🧹 Clearing existing job data...')
    await prisma.jobs.deleteMany({}) // Delete jobs first to cascade delete related records
    await prisma.job_views.deleteMany({})
    await prisma.job_skills.deleteMany({})
    await prisma.job_categories.deleteMany({})
    await prisma.job_requirements.deleteMany({})
    await prisma.job_benefits.deleteMany({})
    await prisma.job_work_arrangements.deleteMany({})
    await prisma.saved_jobs.deleteMany({})
    await prisma.connection_interests.deleteMany({})
    await prisma.applications.deleteMany({})
    console.log('✅ Cleared existing job data')

    // Create categorized job pools for diversity
    const categorizedJobs: Record<JobCategory, JobData[]> = {
      [JobCategory.TECH]: [],
      [JobCategory.HEALTHCARE]: [],
      [JobCategory.FINANCE]: [],
      [JobCategory.EDUCATION]: [],
      [JobCategory.MARKETING]: [],
      [JobCategory.ENGINEERING]: [],
      [JobCategory.HOSPITALITY]: [],
      [JobCategory.LEGAL]: [],
      [JobCategory.SALES]: [],
      [JobCategory.OTHER]: []
    }

    // Categorize all jobs
    jobsData.forEach((job) => {
      const category = categorizeJob(job.title)
      categorizedJobs[category].push(job)
    })

    // Track used jobs to ensure no duplicates
    const usedJobIds = new Set<string>()
    let totalJobsAssigned = 0

    // Fixed: 3 jobs per company, 100 companies = 300 jobs total
    const totalJobsToCreate = Math.min(jobsData.length, companies.length * jobsPerCompany)

    // Process companies in batches
    const batchSize = 5 // Process 5 companies at a time
    let totalJobsCreated = 0
    let processedCompanies = 0

    for (let i = 0; i < companies.length; i += batchSize) {
      const batch = companies.slice(i, i + batchSize)
      console.log(
        `📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(companies.length / batchSize)} (${batch.length} companies)`
      )

      const batchPromises = batch.map(async (company, batchIndex) => {
        try {
          const industry = company.company_details?.industry || null
          // Use company headquarters location, or fallback to a random available location
          let locationId = company.company_details?.headquarters_location_id || null

          if (!locationId && availableLocations.length > 0) {
            // Random fallback location
            const randomLocation = availableLocations[Math.floor(Math.random() * availableLocations.length)]
            locationId = randomLocation.id
          }

          // Fixed: each company gets exactly 3 jobs
          const jobsForThisCompany = jobsPerCompany

          // Get preferred job categories for this company based on industry
          const preferredCategories = industry
            ? industryToJobCategories[industry] || [JobCategory.OTHER]
            : [JobCategory.OTHER]

          // Assign diverse jobs to this company
          const companyJobs = []
          const jobsPerCategory = Math.ceil(jobsForThisCompany / preferredCategories.length)

          for (const category of preferredCategories) {
            if (companyJobs.length >= jobsForThisCompany) break

            const categoryJobs = categorizedJobs[category]
            const availableJobs = categoryJobs.filter((job) => !usedJobIds.has(job.title))

            // Shuffle available jobs for randomness
            const shuffledCategoryJobs = [...availableJobs].sort(() => Math.random() - 0.5)

            // Take jobs for this category
            const jobsToTake = Math.min(
              jobsPerCategory,
              jobsForThisCompany - companyJobs.length,
              shuffledCategoryJobs.length
            )
            for (let i = 0; i < jobsToTake; i++) {
              const jobData = shuffledCategoryJobs[i]
              companyJobs.push(jobData)
              usedJobIds.add(jobData.title)
              totalJobsAssigned++
              if (totalJobsAssigned >= totalJobsToCreate) break
            }
          }

          // If we still don't have enough jobs, fill with other categories
          if (companyJobs.length < jobsForThisCompany && totalJobsAssigned < totalJobsToCreate) {
            const remainingJobs = jobsForThisCompany - companyJobs.length
            const otherCategories = Object.values(JobCategory).filter((cat) => !preferredCategories.includes(cat))

            for (const category of otherCategories) {
              if (companyJobs.length >= jobsForThisCompany) break

              const categoryJobs = categorizedJobs[category]
              const availableJobs = categoryJobs.filter((job) => !usedJobIds.has(job.title))
              const shuffledCategoryJobs = [...availableJobs].sort(() => Math.random() - 0.5)

              const jobsToTake = Math.min(remainingJobs - companyJobs.length, shuffledCategoryJobs.length)
              for (let i = 0; i < jobsToTake; i++) {
                const jobData = shuffledCategoryJobs[i]
                companyJobs.push(jobData)
                usedJobIds.add(jobData.title)
                totalJobsAssigned++
                if (totalJobsAssigned >= totalJobsToCreate) break
              }
            }
          }

          const createdJobs = await Promise.all(
            companyJobs.map(async (jobData, jobIndex) => {
              // Create job (no duplicate check needed as we ensure unique assignment)
              const validatedJobType = validateJobType(jobData.job_type)

              const job = await prisma.jobs.create({
                data: {
                  title: jobData.title,
                  description: jobData.description,
                  company_id: company.id,
                  location_id: locationId,
                  salary_range: jobData.salary_range,
                  job_type: validatedJobType,
                  experience_level: jobData.experience_level,
                  posted_at: new Date(jobData.posted_at),
                  expires_at: new Date(jobData.expires_at),
                  status: job_status.approved,
                  admin_approved: true, // Jobs được seed được coi là đã duyệt
                  metadata: {
                    seeded: true,
                    industry: industry,
                    batch_index: jobIndex,
                    original_job_type: jobData.job_type // Keep original for reference
                  },
                  version: 1,
                  deleted: false,
                  updated_at: new Date()
                }
              })

              // Create job benefits (random selection)
              const benefitsPerJob = 3
              const shuffledBenefits = [...jobBenefitsData].sort(() => 0.5 - Math.random())
              const selectedBenefits = shuffledBenefits.slice(0, benefitsPerJob)

              await Promise.all(
                selectedBenefits.map((benefitData) =>
                  prisma.job_benefits.create({
                    data: {
                      job_id: job.id,
                      benefit_type: benefitData.benefit_type,
                      title: benefitData.title,
                      description: benefitData.description,
                      value_amount: benefitData.value_amount,
                      value_currency: benefitData.value_currency,
                      created_at: new Date()
                    }
                  })
                )
              )

              // Create job categories (select relevant industry categories)
              const categoriesPerJob = 2
              let selectedCategories: { id: string }[] = []

              // First priority: categories matching company industry
              if (industry) {
                const industryCategories = await prisma.categories.findMany({
                  where: {
                    type: 'industry',
                    name: {
                      contains: industry.split(' ')[0] // Match first word of industry
                    }
                  },
                  select: { id: true }
                })

                if (industryCategories.length > 0) {
                  const shuffledIndustryCats = [...industryCategories].sort(() => 0.5 - Math.random())
                  selectedCategories = shuffledIndustryCats.slice(
                    0,
                    Math.min(categoriesPerJob, industryCategories.length)
                  )
                }
              }

              // Second priority: general industry categories
              if (selectedCategories.length < categoriesPerJob) {
                const remainingSlots = categoriesPerJob - selectedCategories.length
                const usedCategoryIds = selectedCategories.map((cat) => cat.id)

                const generalCategories = await prisma.categories.findMany({
                  where: {
                    type: 'industry',
                    id: {
                      notIn: usedCategoryIds
                    }
                  },
                  select: { id: true }
                })

                const shuffledGeneralCats = [...generalCategories].sort(() => 0.5 - Math.random())
                const additionalCategories = shuffledGeneralCats.slice(
                  0,
                  Math.min(remainingSlots, generalCategories.length)
                )
                selectedCategories = [...selectedCategories, ...additionalCategories]
              }

              await Promise.all(
                selectedCategories.map((categoryData) =>
                  prisma.job_categories.create({
                    data: {
                      job_id: job.id,
                      category_id: categoryData.id
                    }
                  })
                )
              )

              // Create job requirements (random selection)
              const requirementsPerJob = 3
              const shuffledRequirements = [...jobRequirementsData].sort(() => 0.5 - Math.random())
              const selectedRequirements = shuffledRequirements.slice(0, requirementsPerJob)

              await Promise.all(
                selectedRequirements.map((requirementData) =>
                  prisma.job_requirements.create({
                    data: {
                      job_id: job.id,
                      requirement_type: requirementData.requirement_type,
                      title: requirementData.title,
                      description: requirementData.description,
                      is_required: requirementData.is_required,
                      level: requirementData.level,
                      years_experience: requirementData.years_experience,
                      created_at: new Date()
                    }
                  })
                )
              )

              // Create job work arrangement
              const workArrangementData =
                jobWorkArrangementsData[Math.floor(Math.random() * jobWorkArrangementsData.length)]
              await prisma.job_work_arrangements.create({
                data: {
                  job_id: job.id,
                  is_remote_allowed: workArrangementData.is_remote_allowed,
                  remote_percentage: workArrangementData.remote_percentage,
                  flexible_hours: workArrangementData.flexible_hours,
                  travel_requirement: workArrangementData.travel_requirement,
                  overtime_expected: workArrangementData.overtime_expected,
                  shift_type: workArrangementData.shift_type,
                  created_at: new Date()
                }
              })

              // Create job skills (select from relevant skill categories)
              const skillsPerJob = Math.floor(Math.random() * 3) + 3 // 3-5 skills per job
              const jobCategory = categorizeJob(jobData.title)
              const relevantSkillTypes = jobCategoryToSkillTypes[jobCategory] || ['technical']

              const relevantSkills = await prisma.skills.findMany({
                where: {
                  category: {
                    type: {
                      in: relevantSkillTypes as any // Cast to avoid type issues
                    }
                  }
                },
                select: { id: true, name: true, category_id: true },
                orderBy: { name: 'asc' }
              })

              // If not enough relevant skills, supplement with general skills
              let availableSkills = [...relevantSkills]
              if (availableSkills.length < skillsPerJob) {
                const additionalSkills = await prisma.skills.findMany({
                  where: {
                    id: {
                      notIn: availableSkills.map((s) => s.id)
                    }
                  },
                  select: { id: true, name: true, category_id: true },
                  take: skillsPerJob - availableSkills.length
                })
                availableSkills = [...availableSkills, ...additionalSkills]
              }

              const shuffledSkills = [...availableSkills].sort(() => 0.5 - Math.random())
              const selectedSkills = shuffledSkills.slice(0, Math.min(skillsPerJob, availableSkills.length))

              await Promise.all(
                selectedSkills.map((skill) =>
                  prisma.job_skills.create({
                    data: {
                      job_id: job.id,
                      skill_id: skill.id
                    }
                  })
                )
              )

              // Sync to Elasticsearch if available
              if (isElasticsearchAvailable && isElasticsearchEnabled) {
                try {
                  // Use syncJobById to properly sync job with all relations
                  // This ensures skills_flat, categories, etc. are populated correctly
                  try {
                    // eslint-disable-next-line @typescript-eslint/no-require-imports
                    const elasticsearchSyncService = require('../../../src/config/elasticsearch-sync.service')
                      .elasticsearchSyncService as any
                    await elasticsearchSyncService.syncJobById(job.id, null, 'upsert')
                  } catch (err: any) {
                    console.warn(`⚠️  Failed to sync job ${job.id} to Elasticsearch:`, err.message)
                  }
                } catch (esError) {
                  console.warn(`⚠️  Failed to sync job ${job.id} to Elasticsearch:`, esError)
                }
              }

              return job
            })
          )

          return companyJobs.length
        } catch (error) {
          console.error(`❌ Error creating jobs for company ${company.name}:`, error)
          throw error
        }
      })

      const batchResults = await Promise.all(batchPromises)
      const batchJobCount = batchResults.reduce((sum, count) => sum + count, 0)
      totalJobsCreated += batchJobCount
      processedCompanies += batch.length

      console.log(
        `✅ Completed batch ${Math.floor(i / batchSize) + 1}, created ${batchJobCount} jobs, ` +
          `total: ${totalJobsCreated} jobs for ${processedCompanies} companies`
      )
    }

    // Validate uniqueness
    const totalJobsInDB = await prisma.jobs.count()
    console.log(`✅ Validation: ${totalJobsInDB} total jobs in database`)

    // Log job type mapping statistics
    console.log(`📊 Job Type Mapping Statistics:`)
    Object.entries(jobTypeMappingStats)
      .sort(([, a], [, b]) => b - a)
      .forEach(([originalType, count]) => {
        const mappedType =
          jobTypeMapping[originalType] ||
          (VALID_JOB_TYPES.includes(originalType as ValidJobType) ? originalType : 'full_time')
        console.log(`   "${originalType}" → "${mappedType}": ${count} jobs`)
      })

    console.log(`🎉 Successfully seeded ${totalJobsCreated} jobs for ${companies.length} companies!`)
    console.log(`📊 Each company has ${jobsPerCompany} jobs (${totalJobsCreated} total jobs)`)
    console.log(`🔍 Job uniqueness ensured: ${usedJobIds.size} unique job titles used`)
  } catch (error) {
    console.error('❌ Error seeding jobs:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Main execution function for standalone running
async function main() {
  try {
    await seedJobs()
  } catch (error) {
    console.error('❌ Job seeding failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}
