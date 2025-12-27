import { elasticsearchService } from './elasticsearch.service'
import { prisma } from './database.service'
import { jobToESDoc, profileToESDoc, companyToESDoc, applicationToESDoc } from '../shared/utils/es-transformers'

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
   * Sync a job by ID
   */
  async syncJobById(jobId: string, action: 'upsert' | 'delete'): Promise<boolean> {
    try {
      if (action === 'delete') {
        await elasticsearchSyncService.deleteFromElasticsearch('jobs', jobId)
        return true
      }

      // Fetch job with relations
      const job = await prisma.jobs.findUnique({
        where: { id: jobId },
        include: {
          companies: true,
          locations: true,
          job_skills: {
            include: { skills: true }
          }
        }
      })

      if (!job) {
        console.log(`⚠️ Job ${jobId} not found`)
        return false
      }

      const document = jobToESDoc(job)
      await this.syncDocument('jobs', jobId, document)
      return true
    } catch (error) {
      console.error(`❌ Failed to sync job ${jobId}:`, error)
      return false
    }
  }

  /**
   * Sync a company by ID
   */
  async syncCompanyById(companyId: string, action: 'upsert' | 'delete'): Promise<boolean> {
    try {
      if (action === 'delete') {
        await elasticsearchSyncService.deleteFromElasticsearch('companies', companyId)
        return true
      }

      // Fetch company with details
      const company = await prisma.companies.findUnique({
        where: { id: companyId },
        include: {
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

      const document = {
        id: company.id,
        name: company.name,
        description: company.description,
        recruiter_id: company.recruiter_id,
        logo_url: company.logo_url,
        size: company.size,
        contact_email: company.contact_email,
        contact_phone: company.contact_phone,
        contact_address: company.contact_address,
        linkedin_url: company.linkedin_url,
        facebook_url: company.facebook_url,
        twitter_url: company.twitter_url,
        tax_code: company.tax_code,
        // From company_details
        industry: company.company_details?.industry,
        founded_year: company.company_details?.founded_year,
        employee_count_min: company.company_details?.employee_count_min,
        employee_count_max: company.company_details?.employee_count_max,
        website_url: company.company_details?.website_url,
        headquarters_location: company.company_details?.headquarters_location?.name,
        company_type: company.company_details?.company_type,
        revenue_range: company.company_details?.revenue_range,
        stock_symbol: company.company_details?.stock_symbol,
        culture_description: company.company_details?.culture_description
      }

      await this.syncDocument('companies', companyId, document)
      return true
    } catch (error) {
      console.error(`❌ Failed to sync company ${companyId}:`, error)
      return false
    }
  }

  /**
   * Sync a profile by ID
   */
  async syncProfileById(profileId: string, action: 'upsert' | 'delete'): Promise<boolean> {
    try {
      if (action === 'delete') {
        await elasticsearchSyncService.deleteFromElasticsearch('profiles', profileId)
        return true
      }

      // Fetch profile with relations
      const profile = await prisma.profiles.findUnique({
        where: { id: profileId },
        include: {
          skills: {
            include: { skills: true }
          }
        }
      })

      if (!profile) {
        console.log(`⚠️ Profile ${profileId} not found`)
        return false
      }

      const document = profileToESDoc(profile)
      await this.syncDocument('profiles', profileId, document)
      return true
    } catch (error) {
      console.error(`❌ Failed to sync profile ${profileId}:`, error)
      return false
    }
  }

  /**
   * Sync an application by ID
   */
  async syncApplicationById(applicationId: string, action: 'upsert' | 'delete'): Promise<boolean> {
    try {
      if (action === 'delete') {
        await elasticsearchSyncService.deleteFromElasticsearch('applications', applicationId)
        return true
      }

      // Fetch application with full relations
      const application = (await prisma.applications.findUnique({
        where: { id: applicationId },
        include: {
          jobs: {
            include: {
              companies: true,
              locations: true
            }
          },
          profiles: {
            include: {
              users: true,
              skills: {
                include: { skills: true }
              },
              educations: true
            }
          }
        }
      })) as any // Cast to any to bypass Prisma type issues

      if (!application) {
        console.log(`⚠️ Application ${applicationId} not found`)
        return false
      }

      // Transform to match applicationToESDoc format
      const transformedApplication = {
        ...application,
        profiles: {
          ...application.profiles,
          skills: application.profiles?.skills,
          educations: application.profiles?.educations
        }
      }

      const document = applicationToESDoc(transformedApplication)
      await this.syncDocument('applications', applicationId, document)
      return true
    } catch (error) {
      console.error(`❌ Failed to sync application ${applicationId}:`, error)
      return false
    }
  }

  /**
   * Bulk sync jobs by IDs
   */
  async bulkSyncJobsByIds(jobIds: string[], action: 'upsert' | 'delete'): Promise<{ synced: number; errors: number }> {
    let synced = 0
    let errors = 0

    for (const jobId of jobIds) {
      const success = await this.syncJobById(jobId, action)
      if (success) {
        synced++
      } else {
        errors++
      }
    }

    return { synced, errors }
  }

  /**
   * Bulk sync applications by IDs
   */
  async bulkSyncApplicationsByIds(
    applicationIds: string[],
    action: 'upsert' | 'delete'
  ): Promise<{ synced: number; errors: number }> {
    let synced = 0
    let errors = 0

    for (const applicationId of applicationIds) {
      const success = await this.syncApplicationById(applicationId, action)
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

    const result: SyncAllResult = {
      jobs: { processed: 0, errors: 0, duration: 0 },
      companies: { processed: 0, errors: 0, duration: 0 },
      profiles: { processed: 0, errors: 0, duration: 0 },
      applications: { processed: 0, errors: 0, duration: 0 },
      totalTime: 0
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
          await elasticsearchSyncService.syncCompanyById(company.id, 'upsert')
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
          await elasticsearchSyncService.syncProfileById(profile.id, 'upsert')
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
          await elasticsearchSyncService.syncJobById(job.id, 'upsert')
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
          await elasticsearchSyncService.syncApplicationById(application.id, 'upsert')
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
    }

    result.totalTime = Date.now() - startTime
    console.log(`✅ Sync completed in ${result.totalTime}ms`)
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
        lastSyncAt: null, // TODO: Track last sync time
        errors: 0 // TODO: Track errors
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
  async syncToElasticsearch(index: string, id: string, document: any): Promise<void> {
    return this.syncDocument(index, id, document)
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
