/* eslint-disable @typescript-eslint/no-require-imports */
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

export async function seedJobs() {
  console.log('💼 Starting jobs seeding...')

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

    // Get all existing companies with their industries
    console.log('🏢 Fetching existing companies...')
    const companies = await prisma.companies.findMany({
      include: {
        company_details: {
          select: {
            industry: true,
            headquarters_location_id: true
          }
        }
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

    // Create a pool of all 300 jobs and track used indices to ensure no duplicates
    const jobPool = [...jobsData]

    // Shuffle indices to randomize assignment order
    const shuffledIndices = Array.from({ length: jobPool.length }, (_, i) => i).sort(() => Math.random() - 0.5)

    let indexPointer = 0 // Track which shuffled index we're assigning

    // Calculate jobs per company for even distribution with some variation
    const totalJobsToCreate = Math.min(jobPool.length, companies.length * 5) // Max 5 jobs per company
    const baseJobsPerCompany = Math.floor(totalJobsToCreate / companies.length)
    const extraJobs = totalJobsToCreate % companies.length

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
          const locationId = company.company_details?.headquarters_location_id || null

          // Calculate jobs for this company (base + extra for first companies)
          const companyGlobalIndex = i + batchIndex
          const jobsForThisCompany = baseJobsPerCompany + (companyGlobalIndex < extraJobs ? 1 : 0)

          // Assign unique jobs from shuffled pool to this company (each job data used exactly once)
          const companyJobs = []
          for (let j = 0; j < jobsForThisCompany && indexPointer < shuffledIndices.length; j++) {
            const jobIndex = shuffledIndices[indexPointer]
            const jobData = jobPool[jobIndex]
            companyJobs.push(jobData)
            indexPointer++
          }

          const createdJobs = await Promise.all(
            companyJobs.map(async (jobData, jobIndex) => {
              // Create job (no duplicate check needed as we ensure unique assignment)
              const job = await prisma.jobs.create({
                data: {
                  title: jobData.title,
                  description: jobData.description,
                  company_id: company.id,
                  location_id: locationId,
                  salary_range: jobData.salary_range,
                  job_type: jobData.job_type as job_type,
                  experience_level: jobData.experience_level,
                  posted_at: new Date(jobData.posted_at),
                  expires_at: new Date(jobData.expires_at),
                  status: job_status.approved,
                  metadata: {
                    seeded: true,
                    industry: industry,
                    batch_index: jobIndex
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

              // Create job categories (random industry categories from DB)
              const industryCategories = await prisma.categories.findMany({
                where: { type: 'industry' },
                select: { id: true }
              })
              const categoriesPerJob = 2
              const shuffledCategories = [...industryCategories].sort(() => 0.5 - Math.random())
              const selectedCategories = shuffledCategories.slice(0, categoriesPerJob)

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

              // Create job skills (random selection from existing skills)
              const skillsPerJob = Math.floor(Math.random() * 3) + 3 // 3-5 skills per job
              const allSkills = await prisma.skills.findMany({
                select: { id: true }
              })
              const shuffledSkills = [...allSkills].sort(() => 0.5 - Math.random())
              const selectedSkills = shuffledSkills.slice(0, Math.min(skillsPerJob, allSkills.length))

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
                  // Optional elasticsearch dependency
                  // Use try/catch with require to avoid type errors and missing module
                  let elasticsearchSyncService: any
                  try {
                    // eslint-disable-next-line @typescript-eslint/no-require-imports
                    elasticsearchSyncService =
                      require('../../../src/config/elasticsearch-sync.service').elasticsearchSyncService
                  } catch (err) {
                    throw new Error('Elasticsearch sync service not found: ' + err)
                  }

                  const esDoc = {
                    id: job.id,
                    title: job.title,
                    description: job.description,
                    company_id: job.company_id,
                    location_id: job.location_id,
                    salary_range: job.salary_range,
                    job_type: job.job_type,
                    experience_level: job.experience_level,
                    posted_at: job.posted_at,
                    expires_at: job.expires_at,
                    status: job.status,
                    metadata: job.metadata,
                    created_at: job.updated_at,
                    updated_at: job.updated_at
                  }
                  await elasticsearchSyncService.syncToElasticsearch('jobs', job.id, esDoc)
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

    console.log(`🎉 Successfully seeded ${totalJobsCreated} jobs for ${companies.length} companies!`)
    console.log(`📊 Average ${totalJobsCreated / companies.length} jobs per company`)
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
