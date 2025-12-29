import { elasticsearchService } from './elasticsearch.service'
import { prisma } from './database.service'
import { jobToESDoc, profileToESDoc, companyToESDoc, applicationToESDoc } from '../shared/utils/es-transformers'
import { ElasticsearchSyncMiddleware } from '../middleware/elasticsearch-sync.middleware'

export interface SyncStats {
  database: {
    jobs: number
    companies: number
    profiles: number
    applications: number
    total: number
  }
  elasticsearch: {
    jobs: number
    companies: number
    profiles: number
    applications: number
    total: number
  }
  timestamp: string
  lastSyncAt: Date | null
  errors: number
  syncStatus?: {
    pending: number
    success: number
    failed: number
    total: number
  }
}

export interface SyncAllResult {
  jobs: { processed: number; errors: number; duration: number }
  companies: { processed: number; errors: number; duration: number }
  profiles: { processed: number; errors: number; duration: number }
  applications: { processed: number; errors: number; duration: number }
  totalTime: number
}

export interface SyncOptions {
  chunkSize?: number
  forceReindex?: boolean
}

/**
 * Elasticsearch Sync Service
 * Handles synchronization between database and Elasticsearch
 */
export class ElasticsearchSyncService {
  /**
   * Update sync status in database
   */
  private async updateSyncStatus(
    entityType: string,
    entityId: string,
    status: 'pending' | 'success' | 'failed',
    error?: string
  ): Promise<void> {
    try {
      await (prisma as any).sync_status.upsert({
        where: {
          entity_type_entity_id: {
            entity_type: entityType,
            entity_id: entityId
          }
        },
        update: {
          sync_status: status,
          last_attempt_at: new Date(),
          retry_count: status === 'failed' ? { increment: 1 } : 0,
          error_message: error,
          updated_at: new Date()
        },
        create: {
          entity_type: entityType,
          entity_id: entityId,
          sync_status: status,
          error_message: error
        }
      })
    } catch (dbError) {
      console.error(`Failed to update sync status for ${entityType}:${entityId}`, dbError)
    }
  }

  /**
   * Enhanced sync method with retry logic
   */
  async syncToElasticsearchWithRetry(index: string, id: string, document: any, maxRetries = 3): Promise<boolean> {
    let lastError: any

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Mark as pending before attempt
        await this.updateSyncStatus(index.replace('s', ''), id, 'pending')

        // Attempt sync
        await this.syncDocument(index, id, document)

        // Mark as success
        await this.updateSyncStatus(index.replace('s', ''), id, 'success')

        console.log(`✅ Synced ${index}:${id} successfully`)
        return true
      } catch (error) {
        lastError = error
        console.warn(
          `ES sync attempt ${attempt + 1}/${maxRetries + 1} failed for ${index}:${id}:`,
          (error as any)?.message || error
        )

        // Exponential backoff delay (1s, 2s, 4s, 8s...)
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000
          console.log(`⏳ Retrying in ${delay}ms...`)
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }

    // All retries failed - mark as failed
    await this.updateSyncStatus(index.replace('s', ''), id, 'failed', lastError?.message || 'Unknown error')

    console.error(`❌ All sync attempts failed for ${index}:${id}`)
    return false
  }

  /**
   * Helper method to sync to Elasticsearch
   */
  private async syncDocument(index: string, id: string, document: any): Promise<void> {
    const client = elasticsearchService.getClient()
    const indexName = elasticsearchService.getIndexName(index)

    try {
      await client.index({
        index: indexName,
        id,
        document
      })

      console.log(`✅ Synced ${index}:${id} to Elasticsearch`)
    } catch (error: any) {
      // Check if it's a connection error (ES not available)
      if (error?.name === 'ConnectionError' || error?.code === 'ECONNREFUSED' || error?.meta?.statusCode === 0) {
        console.warn(`⚠️  Elasticsearch not available - skipping sync for ${index}:${id}`)
      } else {
        console.error(`❌ Failed to sync ${index}:${id} to Elasticsearch:`, error)
        throw error
      }
    }
  }

  /**
   * Sync a job by ID with ownership validation
   */
  async syncJobById(jobId: string, userId: string | null, action: 'upsert' | 'delete'): Promise<boolean> {
    try {
      if (action === 'delete') {
        await elasticsearchSyncService.deleteFromElasticsearch('jobs', jobId)
        return true
      }

      // ENFORCE: Job ownership qua company
      const job = await prisma.jobs.findUnique({
        where: {
          id: jobId,
          deleted: false  // Chỉ sync active jobs
        },
        include: {
          companies: {
            include: {
              users: true // Include recruiter user info for ownership
            }
          },
          locations: {
            include: {
              parent: true // Include parent province for location hierarchy
            }
          },
          job_skills: {
            include: { skills: true }
          },
          job_requirements: true,
          job_categories: {
            include: { categories: true }
          },
          job_benefits: true,
          job_work_arrangements: true
        }
      })

      if (!job) {
        console.log(`⚠️ Job ${jobId} not found or deleted`)
        return false
      }

      // Validate ownership nếu có userId context
      if (userId && job.companies?.recruiter_id !== userId) {
        console.error(`Job ${jobId} ownership violation - user ${userId} vs owner ${job.companies?.recruiter_id}`)
        return false
      }

      const document = jobToESDoc(job) // Will throw if ownership missing
      // ES _id chuẩn hóa = jobId (DB id) để đồng bộ với PostgreSQL và các chỗ khác gọi getById/syncToElasticsearch
      await this.syncDocument('jobs', jobId, document)
      return true
    } catch (error) {
      console.error(`❌ Failed to sync job ${jobId}:`, error)
      return false
    }
  }

  /**
   * Sync a company by ID with ownership validation
   */
  async syncCompanyById(companyId: string, userId: string | null, action: 'upsert' | 'delete'): Promise<boolean> {
    try {
      if (action === 'delete') {
        await elasticsearchSyncService.deleteFromElasticsearch('companies', companyId)
        return true
      }

      // ENFORCE: Company direct ownership
      const company = await prisma.companies.findUnique({
        where: { id: companyId },
        include: {
          users: true, // Include recruiter user info for ownership
          company_details: {
            include: {
              headquarters_location: true
            }
          }
        }
      })

      if (!company) {
        console.log(`⚠️ Company ${companyId} not found`)
        return false
      }

      // Validate ownership nếu có userId context
      if (userId && company.recruiter_id !== userId) {
        console.error(`Company ${companyId} ownership violation - user ${userId} vs owner ${company.recruiter_id}`)
        return false
      }

      const document = companyToESDoc(company) // Will throw if ownership missing
      // ES _id chuẩn hóa = companyId (DB id)
      await this.syncDocument('companies', companyId, document)
      return true
    } catch (error) {
      console.error(`❌ Failed to sync company ${companyId}:`, error)
      return false
    }
  }

  /**
   * Sync a profile by ID with ownership validation
   */
  async syncProfileById(profileId: string, userId: string | null, action: 'upsert' | 'delete'): Promise<boolean> {
    try {
      if (action === 'delete') {
        await elasticsearchSyncService.deleteFromElasticsearch('profiles', profileId)
        return true
      }

      // ENFORCE: Profile user ownership
      const profile = await prisma.profiles.findUnique({
        where: { id: profileId },
        include: {
          users: true, // Include user info for role
          skills: {
            include: { skills: { include: { category: true } } }
          },
          educations: true,
          experiences: true,
          certifications: true
        }
      })

      if (!profile) {
        console.log(`⚠️ Profile ${profileId} not found`)
        return false
      }

      // Validate ownership nếu có userId context
      if (userId && profile.user_id !== userId) {
        console.error(`Profile ${profileId} ownership violation - user ${userId} vs owner ${profile.user_id}`)
        return false
      }

      const document = profileToESDoc(profile) // Will throw if ownership missing
      // ES _id chuẩn hóa = profileId (DB id)
      await this.syncDocument('profiles', profileId, document)
      return true
    } catch (error) {
      console.error(`❌ Failed to sync profile ${profileId}:`, error)
      return false
    }
  }

  /**
   * Sync an application by ID with dual ownership validation
   */
  async syncApplicationById(applicationId: string, userId: string | null, action: 'upsert' | 'delete'): Promise<boolean> {
    try {
      if (action === 'delete') {
        await elasticsearchSyncService.deleteFromElasticsearch('applications', applicationId)
        return true
      }

      // ENFORCE: Dual ownership validation
      const application = (await prisma.applications.findUnique({
        where: { id: applicationId },
        include: {
          jobs: {
            include: {
              companies: true,
              locations: true,
              job_requirements: true,
              job_work_arrangements: true
            }
          },
          profiles: {
            include: {
              users: true,
              skills: {
                include: { skills: true }
              },
              educations: true,
              experiences: true
            }
          },
          application_stages: {
            orderBy: { stage_order: 'desc' }
          }
        }
      })) as any // Cast to any to bypass Prisma type issues

      if (!application) {
        console.log(`⚠️ Application ${applicationId} not found`)
        return false
      }

      // Validate dual ownership nếu có userId context
      const recruiterId = application.jobs?.companies?.recruiter_id
      const candidateId = application.profiles?.user_id

      if (userId) {
        const hasRecruiterAccess = recruiterId === userId
        const hasCandidateAccess = candidateId === userId

        if (!hasRecruiterAccess && !hasCandidateAccess) {
          console.error(`Application ${applicationId} ownership violation - user ${userId} has no access`)
          return false
        }
      }

      // Transform to match applicationToESDoc format
      const transformedApplication = {
        ...application,
        profiles: {
          ...application.profiles,
          skills: application.profiles?.skills,
          educations: application.profiles?.educations,
          experiences: application.profiles?.experiences
        }
      }

      const document = applicationToESDoc(transformedApplication) // Will throw if ownership missing
      // ES _id chuẩn hóa = applicationId (DB id)
      await this.syncDocument('applications', applicationId, document)
      return true
    } catch (error) {
      console.error(`❌ Failed to sync application ${applicationId}:`, error)
      return false
    }
  }

  /**
   * Bulk sync jobs by IDs with ownership validation
   */
  async bulkSyncJobsByIds(jobIds: string[], userId: string | null, action: 'upsert' | 'delete'): Promise<{ synced: number; errors: number }> {
    let synced = 0
    let errors = 0

    // Pre-validate ownership for all jobs if userId provided
    if (userId) {
      const ownedJobs = await prisma.jobs.findMany({
        where: {
          id: { in: jobIds },
          companies: { recruiter_id: userId },
          deleted: false
        },
        select: { id: true }
      })

      const ownedJobIds = ownedJobs.map(j => j.id)
      const notOwnedJobs = jobIds.filter(id => !ownedJobIds.includes(id))

      if (notOwnedJobs.length > 0) {
        console.error(`Bulk job sync ownership violation - user ${userId} doesn't own jobs: ${notOwnedJobs.join(', ')}`)
        errors += notOwnedJobs.length
        jobIds = ownedJobIds // Only sync owned jobs
      }
    }

    for (const jobId of jobIds) {
      const success = await this.syncJobById(jobId, userId, action)
      if (success) {
        synced++
      } else {
        errors++
      }
    }

    return { synced, errors }
  }

  /**
   * Bulk sync applications by IDs with dual ownership validation
   */
  async bulkSyncApplicationsByIds(
    applicationIds: string[],
    userId: string | null,
    action: 'upsert' | 'delete'
  ): Promise<{ synced: number; errors: number }> {
    let synced = 0
    let errors = 0

    // For applications, ownership is complex (recruiter OR candidate)
    // We'll validate during individual sync calls
    for (const applicationId of applicationIds) {
      const success = await this.syncApplicationById(applicationId, userId, action)
      if (success) {
        synced++
      } else {
        errors++
      }
    }

    return { synced, errors }
  }

  /**
   * Sync all data from database to Elasticsearch
   */
  async syncAllData(options: SyncOptions = {}): Promise<SyncAllResult> {
    const startTime = Date.now()
    const { chunkSize = 1000, forceReindex = false } = options

    console.log(`🔄 Starting ${forceReindex ? 'full reindex' : 'sync'} with chunk size ${chunkSize}`)

    // Mark bulk sync as running to prevent middleware conflicts
    ElasticsearchSyncMiddleware.setBulkSyncRunning(true)

    const result: SyncAllResult = {
      jobs: { processed: 0, errors: 0, duration: 0 },
      companies: { processed: 0, errors: 0, duration: 0 },
      profiles: { processed: 0, errors: 0, duration: 0 },
      applications: { processed: 0, errors: 0, duration: 0 },
      totalTime: 0
    }

    // If force reindex is enabled, clear all indices first
    if (forceReindex) {
      console.log('🗑️ Force reindex enabled - clearing all indices...')
      const indices = ['jobs', 'companies', 'profiles', 'applications']
      for (const index of indices) {
        try {
          await elasticsearchService.deleteIndex(index)
          console.log(`✅ Cleared ${index} index`)
        } catch (error) {
          console.warn(`⚠️ Failed to clear ${index} index (may not exist):`, error)
        }
      }

      // Recreate indices with fresh mappings
      console.log('🔧 Recreating indices with mappings...')
      await elasticsearchService.initializeIndices()
      console.log('✅ Indices recreated successfully')
    }

    try {
      // Sync companies
      const companiesStart = Date.now()
      console.log('🏢 Syncing companies...')
      const companies = await prisma.companies.findMany({ select: { id: true } })
      console.log(`Found ${companies.length} companies to sync`)
      for (const company of companies) {
        try {
          console.log(`Syncing company ${company.id}...`)
          await elasticsearchSyncService.syncCompanyById(company.id, null, 'upsert') // null = skip ownership check for initial sync
          result.companies.processed++
          console.log(`✅ Synced company ${company.id}`)
        } catch (error) {
          result.companies.errors++
          console.error(`❌ Failed to sync company ${company.id}:`, error)
        }
      }
      result.companies.duration = Date.now() - companiesStart
      console.log(`✅ Synced ${result.companies.processed} companies (${result.companies.errors} errors)`)

      // Sync profiles
      const profilesStart = Date.now()
      console.log('👥 Syncing profiles...')
      const profiles = await prisma.profiles.findMany({ select: { id: true } })
      for (const profile of profiles) {
        try {
          await elasticsearchSyncService.syncProfileById(profile.id, null, 'upsert') // null = skip ownership check for initial sync
          result.profiles.processed++
        } catch (error) {
          result.profiles.errors++
          console.error(`❌ Failed to sync profile ${profile.id}:`, error)
        }
      }
      result.profiles.duration = Date.now() - profilesStart
      console.log(`✅ Synced ${result.profiles.processed} profiles (${result.profiles.errors} errors)`)

      // Sync jobs
      const jobsStart = Date.now()
      console.log('💼 Syncing jobs...')
      const jobs = await prisma.jobs.findMany({ select: { id: true } })
      for (const job of jobs) {
        try {
          await elasticsearchSyncService.syncJobById(job.id, null, 'upsert') // null = skip ownership check for initial sync
          result.jobs.processed++
        } catch (error) {
          result.jobs.errors++
          console.error(`❌ Failed to sync job ${job.id}:`, error)
        }
      }
      result.jobs.duration = Date.now() - jobsStart
      console.log(`✅ Synced ${result.jobs.processed} jobs (${result.jobs.errors} errors)`)

      // Sync applications
      const applicationsStart = Date.now()
      console.log('📋 Syncing applications...')
      const applications = await prisma.applications.findMany({ select: { id: true } })
      for (const application of applications) {
        try {
          await elasticsearchSyncService.syncApplicationById(application.id, null, 'upsert') // null = skip ownership check for initial sync
          result.applications.processed++
        } catch (error) {
          result.applications.errors++
          console.error(`❌ Failed to sync application ${application.id}:`, error)
        }
      }
      result.applications.duration = Date.now() - applicationsStart
      console.log(`✅ Synced ${result.applications.processed} applications (${result.applications.errors} errors)`)
    } catch (error) {
      console.error('❌ Sync failed:', error)
      // Clear bulk sync flag even on error
      ElasticsearchSyncMiddleware.setBulkSyncRunning(false)
    }

    result.totalTime = Date.now() - startTime
    console.log(`✅ Sync completed in ${result.totalTime}ms`)

    // Clear bulk sync flag
    ElasticsearchSyncMiddleware.setBulkSyncRunning(false)

    return result
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<SyncStats> {
    try {
      // Get counts from database
      const [jobsCount, companiesCount, profilesCount, applicationsCount] = await Promise.all([
        prisma.jobs.count(),
        prisma.companies.count(),
        prisma.profiles.count(),
        prisma.applications.count()
      ])

      // Get counts from Elasticsearch
      const client = elasticsearchService.getClient()
      const getEsCount = async (index: string) => {
        try {
          const response = await client.count({ index: elasticsearchService.getIndexName(index) })
          return response.count
        } catch {
          return 0
        }
      }

      const [jobsEsCount, companiesEsCount, profilesEsCount, applicationsEsCount] = await Promise.all([
        getEsCount('jobs'),
        getEsCount('companies'),
        getEsCount('profiles'),
        getEsCount('applications')
      ])

      // Get sync status counts
      const syncStatusCounts = await (prisma as any).sync_status.groupBy({
        by: ['sync_status'],
        _count: { sync_status: true }
      })

      const pendingCount = syncStatusCounts.find((s: any) => s.sync_status === 'pending')?._count?.sync_status || 0
      const successCount = syncStatusCounts.find((s: any) => s.sync_status === 'success')?._count?.sync_status || 0
      const failedCount = syncStatusCounts.find((s: any) => s.sync_status === 'failed')?._count?.sync_status || 0

      return {
        database: {
          jobs: jobsCount,
          companies: companiesCount,
          profiles: profilesCount,
          applications: applicationsCount,
          total: jobsCount + companiesCount + profilesCount + applicationsCount
        },
        elasticsearch: {
          jobs: jobsEsCount,
          companies: companiesEsCount,
          profiles: profilesEsCount,
          applications: applicationsEsCount,
          total: jobsEsCount + companiesEsCount + profilesEsCount + applicationsEsCount
        },
        timestamp: new Date().toISOString(),
        lastSyncAt: null,
        errors: failedCount,
        syncStatus: {
          pending: pendingCount,
          success: successCount,
          failed: failedCount,
          total: pendingCount + successCount + failedCount
        }
      }
    } catch (error) {
      console.error('Failed to get sync stats:', error)
      return {
        database: { jobs: 0, companies: 0, profiles: 0, applications: 0, total: 0 },
        elasticsearch: { jobs: 0, companies: 0, profiles: 0, applications: 0, total: 0 },
        timestamp: new Date().toISOString(),
        lastSyncAt: null,
        errors: 1
      }
    }
  }

  /**
   * Simple sync methods for seeding (no DB fetch, just sync provided document)
   */
  async syncToElasticsearch(index: string, id: string, document: any): Promise<boolean> {
    return this.syncToElasticsearchWithRetry(index, id, document)
  }

  /**
   * Delete a document from Elasticsearch
   */
  async deleteFromElasticsearch(index: string, id: string): Promise<void> {
    const client = elasticsearchService.getClient()

    try {
      await client.delete({
        index: elasticsearchService.getIndexName(index),
        id
      })

      console.log(`✅ Deleted ${index}:${id} from Elasticsearch`)
    } catch (error: any) {
      // Ignore 404 (already deleted)
      if (error.meta?.statusCode !== 404) {
        console.error(`❌ Failed to delete ${index}:${id} from Elasticsearch:`, error)
        throw error
      }
    }
  }
}

// Export singleton instance
export const elasticsearchSyncService = new ElasticsearchSyncService()
