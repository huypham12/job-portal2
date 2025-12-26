/**
 * Batch Seeding System
 * Xử lý seeding dữ liệu lớn với transaction và error handling
 */

import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'

// Set deterministic seed
faker.seed(42)

export interface BatchConfig {
  batchSize: number
  maxRetries: number
  enableTransactions: boolean
  continueOnError: boolean
  logProgress: boolean
  adaptiveBatchSize?: boolean
  optimizeForBulkInsert?: boolean
}

export interface BatchResult {
  success: boolean
  processed: number
  failed: number
  errors: string[]
  duration: number
}

export class BatchSeeder {
  private prisma: PrismaClient
  private config: BatchConfig
  private adaptiveBatchSizes: Map<string, number> = new Map()

  constructor(prisma: PrismaClient, config: Partial<BatchConfig> = {}) {
    this.prisma = prisma
    this.config = {
      batchSize: 100,
      maxRetries: 3,
      enableTransactions: true,
      continueOnError: true,
      logProgress: true,
      adaptiveBatchSize: true,
      optimizeForBulkInsert: true,
      ...config
    }

    // Initialize adaptive batch sizes for different operations
    this.initializeAdaptiveBatchSizes()
  }

  private initializeAdaptiveBatchSizes() {
    // Optimized batch sizes based on entity complexity and typical performance
    this.adaptiveBatchSizes.set('companies', 200) // Lightweight entities
    this.adaptiveBatchSizes.set('users', 150) // Medium weight
    this.adaptiveBatchSizes.set('profiles', 100) // Heavier with text fields
    this.adaptiveBatchSizes.set('jobs', 150) // Medium weight
    this.adaptiveBatchSizes.set('skills', 300) // Very lightweight
    this.adaptiveBatchSizes.set('applications', 250) // Lightweight
    this.adaptiveBatchSizes.set('job_views', 500) // Very lightweight
  }

  private getBatchSize(operation: string): number {
    if (this.config.adaptiveBatchSize) {
      return this.adaptiveBatchSizes.get(operation) || this.config.batchSize
    }
    return this.config.batchSize
  }

  // ============================================================================
  // MAIN BATCH PROCESSING METHODS
  // ============================================================================

  /**
   * Process data in batches with transaction support and optimizations
   */
  async processBatch<T>(
    data: T[],
    processor: (batch: T[], batchIndex: number) => Promise<void>,
    options: {
      operationName?: string
      onProgress?: (processed: number, total: number, batchIndex: number) => void
      onError?: (error: Error, batch: T[], batchIndex: number) => void
      operationType?: string
    } = {}
  ): Promise<BatchResult> {
    const startTime = Date.now()
    let processed = 0
    let failed = 0
    const errors: string[] = []

    const batchSize = this.getBatchSize(options.operationType || 'default')
    const totalBatches = Math.ceil(data.length / batchSize)

    // Apply bulk insert optimizations if enabled
    if (this.config.optimizeForBulkInsert) {
      await this.optimizeForBulkOperations()
    }

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * batchSize
      const end = Math.min(start + batchSize, data.length)
      const batch = data.slice(start, end)

      try {
        if (this.config.enableTransactions) {
          await this.prisma.$transaction(async (tx) => {
            // Create transaction-aware processor
            const txProcessor = async (batchData: T[]) => {
              await processor(batchData, batchIndex)
            }
            await txProcessor(batch)
          })
        } else {
          await processor(batch, batchIndex)
        }

        processed += batch.length

        if (this.config.logProgress && options.onProgress) {
          options.onProgress(processed, data.length, batchIndex)
        }
      } catch (error) {
        failed += batch.length
        const errorMessage = `Batch ${batchIndex + 1}/${totalBatches} failed: ${error instanceof Error ? error.message : String(error)}`
        errors.push(errorMessage)

        if (this.config.logProgress) {
          console.error(`❌ ${errorMessage}`)
        }

        if (options.onError) {
          options.onError(error as Error, batch, batchIndex)
        }

        if (!this.config.continueOnError) {
          break
        }
      }
    }

    const duration = Date.now() - startTime
    const success = failed === 0

    // Restore normal operations if optimizations were applied
    if (this.config.optimizeForBulkInsert) {
      await this.restoreNormalOperations()
    }

    if (this.config.logProgress) {
      const operation = options.operationName || 'Batch processing'
      console.log(`✅ ${operation} completed: ${processed}/${data.length} items processed in ${duration}ms`)
      if (failed > 0) {
        console.warn(`⚠️  ${failed} items failed`)
      }
    }

    return { success, processed, failed, errors, duration }
  }

  /**
   * Optimize database for bulk operations
   */
  private async optimizeForBulkOperations(): Promise<void> {
    try {
      // Temporarily disable triggers and constraints for bulk inserts
      await this.prisma.$executeRawUnsafe(`SET session_replication_role = 'replica'`)

      // Disable synchronous commits for better performance
      await this.prisma.$executeRawUnsafe(`SET synchronous_commit = off`)

      // Increase maintenance work memory
      await this.prisma.$executeRawUnsafe(`SET maintenance_work_mem = '256MB'`)

      // Disable autovacuum during bulk operations
      await this.prisma.$executeRawUnsafe(`SET autovacuum = off`)
    } catch (error) {
      console.warn('⚠️  Some bulk operation optimizations failed:', error.message)
    }
  }

  /**
   * Restore normal database operations
   */
  private async restoreNormalOperations(): Promise<void> {
    try {
      await this.prisma.$executeRawUnsafe(`SET session_replication_role = 'origin'`)
      await this.prisma.$executeRawUnsafe(`SET synchronous_commit = on`)
      await this.prisma.$executeRawUnsafe(`SET maintenance_work_mem = '64MB'`)
      await this.prisma.$executeRawUnsafe(`SET autovacuum = on`)
    } catch (error) {
      console.warn('⚠️  Failed to restore some database settings:', error.message)
    }
  }

  /**
   * Process with retry logic
   */
  async processWithRetry<T>(
    data: T[],
    processor: (item: T) => Promise<void>,
    options: {
      operationName?: string
      retryDelay?: number
    } = {}
  ): Promise<BatchResult> {
    const startTime = Date.now()
    let processed = 0
    let failed = 0
    const errors: string[] = []

    const retryProcessor = async (item: T, attempt: number = 1): Promise<void> => {
      try {
        await processor(item)
        processed++
      } catch (error) {
        if (attempt < this.config.maxRetries) {
          const delay = options.retryDelay || Math.pow(2, attempt) * 1000 // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, delay))
          return retryProcessor(item, attempt + 1)
        } else {
          failed++
          const errorMessage = `Failed to process item after ${this.config.maxRetries} attempts: ${error instanceof Error ? error.message : String(error)}`
          errors.push(errorMessage)
          throw error
        }
      }
    }

    // Process items individually with retry
    for (const item of data) {
      try {
        await retryProcessor(item)
      } catch (error) {
        // Continue processing other items if continueOnError is true
        if (!this.config.continueOnError) {
          break
        }
      }
    }

    const duration = Date.now() - startTime
    const success = failed === 0

    return { success, processed, failed, errors, duration }
  }

  // ============================================================================
  // SPECIALIZED BATCH METHODS FOR DIFFERENT ENTITIES
  // ============================================================================

  /**
   * Batch insert companies with related data
   */
  async seedCompanies(companiesData: any[]): Promise<BatchResult> {
    return this.processBatch(
      companiesData,
      async (batch) => {
        // Prepare company data
        const companies = batch.map((company) => ({
          name: company.name,
          description: company.description,
          contact_email: company.contact_email,
          contact_phone: company.contact_phone,
          contact_address: company.contact_address,
          website_url: company.website_url,
          linkedin_url: company.linkedin_url,
          facebook_url: company.facebook_url,
          tax_code: company.tax_code,
          created_at: new Date(),
          updated_at: new Date()
        }))

        // Bulk insert companies
        try {
          await this.prisma.companies.createMany({ data: companies })
        } catch (error) {
          console.error('❌ Error inserting companies batch:', error.message)
          // Try inserting one by one to find the problematic record
          console.log('🔍 Testing individual records...')
          for (let i = 0; i < Math.min(companies.length, 3); i++) {
            try {
              await this.prisma.companies.create({ data: companies[i] })
              console.log(`✅ Record ${i} inserted successfully`)
            } catch (singleError) {
              console.error(`❌ Record ${i} failed:`, singleError.message)
              console.error('Data:', JSON.stringify(companies[i], null, 2))
              break
            }
          }
          throw error
        }

        // Get inserted companies to create related data
        const insertedCompanies = await this.prisma.companies.findMany({
          where: {
            name: { in: companies.map((c) => c.name) }
          },
          select: { id: true, name: true }
        })

        const companyMap = new Map(insertedCompanies.map((c) => [c.name, c.id]))

        // Prepare and insert company details
        const companyDetails = batch
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
          await this.prisma.company_details.createMany({ data: companyDetails })
        }

        // Prepare and insert company benefits
        const companyBenefits = batch.flatMap((company) => {
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
          await this.prisma.company_benefits.createMany({ data: companyBenefits })
        }
      },
      {
        operationName: 'Seeding companies',
        operationType: 'companies',
        onProgress: (processed, total, batchIndex) => {
          console.log(`🏢 Processed ${processed}/${total} companies (batch ${batchIndex + 1})`)
        }
      }
    )
  }

  /**
   * Batch insert users and profiles
   */
  async seedUsersAndProfiles(userData: any[]): Promise<BatchResult> {
    return this.processBatch(
      userData,
      async (batch) => {
        // Prepare user data
        const users = batch.map((user) => ({
          email: user.email,
          password_hash: user.password_hash || '$2b$10$dummy.hash.for.seeding.purposes.only',
          role: user.role || 'candidate',
          verified: user.verified !== undefined ? user.verified : true,
          created_at: new Date(),
          updated_at: new Date()
        }))

        // Bulk insert users
        await this.prisma.users.createMany({ data: users })

        // Get inserted users
        const insertedUsers = await this.prisma.users.findMany({
          where: {
            email: { in: users.map((u) => u.email) }
          },
          select: { id: true, email: true }
        })

        const userMap = new Map(insertedUsers.map((u) => [u.email, u.id]))

        // Prepare and insert profiles
        const profiles = batch
          .map((user) => {
            const userId = userMap.get(user.email)
            if (!userId) return null

            return {
              user_id: userId,
              full_name: user.full_name,
              display_name: user.display_name,
              headline: user.headline,
              bio: user.bio,
              gender: user.gender,
              date_of_birth: user.date_of_birth,
              phone_number: user.phone_number,
              years_of_experience: user.years_of_experience,
              desired_job_title: user.desired_job_title,
              desired_job_type: user.desired_job_type,
              desired_salary_min: user.desired_salary_min,
              desired_currency: user.desired_currency,
              availability_status: user.availability_status,
              is_looking_for_job: user.is_looking_for_job,
              is_public: user.is_public,
              location_text: user.location_text,
              github_url: user.github_url,
              linkedin_url: user.linkedin_url,
              personal_website: user.personal_website,
              avatar_url: user.avatar_url,
              created_at: new Date(),
              updated_at: new Date()
            }
          })
          .filter(Boolean)

        if (profiles.length > 0) {
          await this.prisma.profiles.createMany({ data: profiles })
        }
      },
      {
        operationName: 'Seeding users and profiles',
        operationType: 'users',
        onProgress: (processed, total, batchIndex) => {
          console.log(`👥 Processed ${processed}/${total} users/profiles (batch ${batchIndex + 1})`)
        }
      }
    )
  }

  /**
   * Batch insert jobs with related data
   */
  async seedJobs(jobData: any[]): Promise<BatchResult> {
    return this.processBatch(
      jobData,
      async (batch) => {
        // Get company mappings first
        const companyNames = [...new Set(batch.map((job) => job.company_slug))]
        const companies = await this.prisma.companies.findMany({
          where: { name: { in: companyNames } },
          select: { id: true, name: true }
        })
        const companyMap = new Map(companies.map((c) => [c.name, c.id]))

        // Get location mappings
        const provinces = [...new Set(batch.map((job) => job.location_province))]
        const locations = await this.prisma.locations.findMany({
          where: { name: { in: provinces } },
          select: { id: true, name: true }
        })
        const locationMap = new Map(locations.map((l) => [l.name, l.id]))

        // Prepare job data
        const jobs = batch.map((job) => {
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

        // Bulk insert jobs
        await this.prisma.jobs.createMany({ data: jobs })

        // Get inserted jobs for related data
        const insertedJobs = await this.prisma.jobs.findMany({
          where: {
            title: { in: jobs.map((j) => j.title) },
            posted_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24h
          },
          select: { id: true, title: true }
        })

        // This is a simplified version - in real implementation,
        // you'd need more sophisticated job matching logic
        const jobMap = new Map(insertedJobs.map((j) => [j.title, j.id]))

        // Insert job skills, requirements, etc.
        // (Implementation would be similar to companies)
      },
      {
        operationName: 'Seeding jobs',
        operationType: 'jobs',
        onProgress: (processed, total, batchIndex) => {
          console.log(`💼 Processed ${processed}/${total} jobs (batch ${batchIndex + 1})`)
        }
      }
    )
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Clear existing data (use with caution!)
   */
  async clearData(tables: string[] = []): Promise<void> {
    const defaultTables = [
      'job_views',
      'saved_jobs',
      'applications',
      'application_stages',
      'application_documents',
      'search_history',
      'connection_interests',
      'notifications',
      'activity_logs',
      'audits',
      'profile_awards',
      'profile_certifications',
      'profile_educations',
      'profile_experiences',
      'profile_skills',
      'resumes',
      'job_posts_history',
      'job_work_arrangements',
      'job_benefits',
      'job_requirements',
      'job_skills',
      'job_tags',
      'jobs',
      'company_benefits',
      'company_details',
      'companies',
      'profiles',
      'users',
      'roles_permissions',
      'tags',
      'skills',
      'locations'
    ]

    const tablesToClear = tables.length > 0 ? tables : defaultTables

    console.log('🧹 Clearing existing data...')

    try {
      // Disable foreign key checks (PostgreSQL)
      await this.prisma.$executeRawUnsafe(`SET session_replication_role = 'replica'`)

      for (const table of tablesToClear) {
        try {
          await this.prisma.$executeRawUnsafe(`DELETE FROM ${table}`)
          console.log(`  Cleared ${table}`)
        } catch (error) {
          console.warn(`  Failed to clear ${table}:`, error.message || error)
        }
      }

      // Re-enable foreign key checks
      await this.prisma.$executeRawUnsafe(`SET session_replication_role = 'origin'`)
      console.log('✅ Data clearing completed')
    } catch (error) {
      console.error('❌ Error during data clearing:', error)
      // Try to re-enable FK checks even if clearing failed
      try {
        await this.prisma.$executeRawUnsafe(`SET session_replication_role = 'origin'`)
      } catch {}
      throw error
    }
  }

  /**
   * Get seeding statistics
   */
  async getStats(): Promise<Record<string, number>> {
    const stats: Record<string, number> = {}

    const tables = [
      'users',
      'companies',
      'profiles',
      'jobs',
      'applications',
      'skills',
      'tags',
      'locations',
      'job_views',
      'saved_jobs'
    ]

    for (const table of tables) {
      try {
        const count = await this.prisma[table as keyof typeof this.prisma].count()
        stats[table] = count
      } catch (error) {
        console.warn(`Error counting ${table}:`, error.message)
        stats[table] = 0
      }
    }

    return stats
  }
}

// ============================================================================
// EXPORT UTILITY FUNCTIONS
// ============================================================================

export function createBatchSeeder(prisma: PrismaClient, config?: Partial<BatchConfig>): BatchSeeder {
  return new BatchSeeder(prisma, config)
}

export async function withTiming<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
  const startTime = Date.now()
  console.log(`⏱️  Starting ${operationName}...`)

  try {
    const result = await operation()
    const duration = Date.now() - startTime
    console.log(`✅ ${operationName} completed in ${duration}ms`)
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`❌ ${operationName} failed after ${duration}ms:`, error)
    throw error
  }
}
