import { PrismaClient } from '@prisma/client'
import { elasticsearchService, JobDocument, CompanyDocument, ProfileDocument } from './elasticsearch.service'

export interface SyncOptions {
  chunkSize?: number
  retryAttempts?: number
  retryDelay?: number
  concurrency?: number
  forceReindex?: boolean
}

export interface SyncResult {
  success: boolean
  processed: number
  errors: number
  duration: number
  errorDetails?: string[]
}

export interface SyncStats {
  totalRecords: number
  processed: number
  errors: number
  startTime: Date
  endTime?: Date
  duration?: number
}

class ElasticsearchSyncService {
  private prisma: PrismaClient
  private readonly DEFAULT_CHUNK_SIZE = 1000
  private readonly DEFAULT_RETRY_ATTEMPTS = 3
  private readonly DEFAULT_RETRY_DELAY = 1000
  private readonly DEFAULT_CONCURRENCY = 3

  constructor() {
    this.prisma = new PrismaClient()
  }

  // Full synchronization methods
  async syncAllData(options: SyncOptions = {}): Promise<Record<string, SyncResult>> {
    const results: Record<string, SyncResult> = {}

    console.log('🔄 Starting full data synchronization...')

    const entities = ['jobs', 'companies', 'profiles']

    for (const entity of entities) {
      console.log(`\n📊 Syncing ${entity}...`)

      switch (entity) {
        case 'jobs': {
          results.jobs = await this.syncJobs(options)
          break
        }
        case 'companies': {
          results.companies = await this.syncCompanies(options)
          break
        }
        case 'profiles': {
          results.profiles = await this.syncProfiles(options)
          break
        }
      }
    }

    console.log('\n✅ Full synchronization completed')
    console.log('📊 Summary:')
    Object.entries(results).forEach(([entity, result]) => {
      console.log(`  ${entity}: ${result.processed} processed, ${result.errors} errors, ${result.duration}ms`)
    })

    return results
  }

  async syncJobs(options: SyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now()
    const { chunkSize = this.DEFAULT_CHUNK_SIZE, forceReindex = false } = options

    try {
      // Get total count
      const totalCount = await this.prisma.jobs.count({
        where: { deleted: false }
      })

      console.log(`📊 Found ${totalCount} jobs to sync`)

      if (totalCount === 0) {
        return {
          success: true,
          processed: 0,
          errors: 0,
          duration: Date.now() - startTime
        }
      }

      let processed = 0
      let errors = 0
      const errorDetails: string[] = []

      // Process in chunks
      const totalChunks = Math.ceil(totalCount / chunkSize)

      for (let chunk = 0; chunk < totalChunks; chunk++) {
        const offset = chunk * chunkSize
        console.log(
          `📦 Processing jobs chunk ${chunk + 1}/${totalChunks} (${offset + 1}-${Math.min(offset + chunkSize, totalCount)})`
        )

        try {
          const jobs = await this.prisma.jobs.findMany({
            where: { deleted: false },
            include: {
              companies: {
                select: {
                  name: true,
                  logo_url: true,
                  size: true
                }
              },
              locations: {
                select: {
                  name: true
                }
              },
              job_skills: {
                include: {
                  skills: {
                    select: { name: true }
                  }
                }
              },
              job_tags: {
                include: {
                  tags: {
                    select: { name: true }
                  }
                }
              },
              job_benefits: true,
              job_requirements: true,
              job_work_arrangements: true,
              _count: {
                select: {
                  job_views: true,
                  applications: true
                }
              }
            },
            skip: offset,
            take: chunkSize,
            orderBy: { id: 'asc' }
          })

          if (jobs.length === 0) break

          // Convert to Elasticsearch documents
          const esDocuments = jobs.map((job) => this.transformJobToDocument(job))

          // Build bulk operations with optimistic concurrency
          const bulkOps = esDocuments.map((doc) => ({
            index: 'jobs',
            id: doc.id,
            document: doc
          }))

          // Execute bulk operation
          const bulkSuccess = await elasticsearchService.bulkUpsert(bulkOps, 'jobs')

          if (bulkSuccess) {
            processed += jobs.length
            console.log(`  ✅ Successfully indexed ${jobs.length} jobs`)
          } else {
            errors += jobs.length
            errorDetails.push(`Bulk operation failed for jobs chunk ${chunk + 1}`)
            console.log(`  ❌ Failed to index jobs chunk ${chunk + 1}`)
          }

          // Brief pause to avoid overwhelming Elasticsearch
          if (chunk < totalChunks - 1) {
            await this.sleep(100)
          }
        } catch (error) {
          errors += chunkSize
          const errorMsg = `Jobs chunk ${chunk + 1} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          errorDetails.push(errorMsg)
          console.error(`  ❌ ${errorMsg}`)
        }
      }

      // Refresh index
      await elasticsearchService.refreshIndex('jobs')

      const duration = Date.now() - startTime
      console.log(`📊 Jobs sync completed: ${processed} processed, ${errors} errors, ${duration}ms`)

      return {
        success: errors === 0,
        processed,
        errors,
        duration,
        errorDetails: errorDetails.length > 0 ? errorDetails : undefined
      }
    } catch (error) {
      const duration = Date.now() - startTime
      console.error('❌ Jobs sync failed:', error)

      return {
        success: false,
        processed: 0,
        errors: 1,
        duration,
        errorDetails: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  async syncCompanies(options: SyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now()
    const { chunkSize = this.DEFAULT_CHUNK_SIZE } = options

    try {
      const totalCount = await this.prisma.companies.count()

      console.log(`📊 Found ${totalCount} companies to sync`)

      if (totalCount === 0) {
        return {
          success: true,
          processed: 0,
          errors: 0,
          duration: Date.now() - startTime
        }
      }

      let processed = 0
      let errors = 0
      const errorDetails: string[] = []

      const totalChunks = Math.ceil(totalCount / chunkSize)

      for (let chunk = 0; chunk < totalChunks; chunk++) {
        const offset = chunk * chunkSize
        console.log(`📦 Processing companies chunk ${chunk + 1}/${totalChunks}`)

        try {
          const companies = await this.prisma.companies.findMany({
            include: {
              company_benefits: true,
              _count: {
                select: {
                  jobs: {
                    where: { deleted: false }
                  }
                }
              }
            },
            skip: offset,
            take: chunkSize,
            orderBy: { id: 'asc' }
          })

          if (companies.length === 0) break

          const esDocuments = companies.map((company: any) => this.transformCompanyToDocument(company))

          const bulkOps = esDocuments.map((doc: any) => ({
            index: 'companies',
            id: doc.id,
            document: doc
          }))

          const bulkSuccess = await elasticsearchService.bulkUpsert(bulkOps, 'companies')

          if (bulkSuccess) {
            processed += companies.length
            console.log(`  ✅ Successfully indexed ${companies.length} companies`)
          } else {
            errors += companies.length
            errorDetails.push(`Bulk operation failed for companies chunk ${chunk + 1}`)
          }

          await this.sleep(100)
        } catch (error) {
          errors += chunkSize
          const errorMsg = `Companies chunk ${chunk + 1} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          errorDetails.push(errorMsg)
          console.error(`  ❌ ${errorMsg}`)
        }
      }

      await elasticsearchService.refreshIndex('companies')

      const duration = Date.now() - startTime
      console.log(`📊 Companies sync completed: ${processed} processed, ${errors} errors, ${duration}ms`)

      return {
        success: errors === 0,
        processed,
        errors,
        duration,
        errorDetails: errorDetails.length > 0 ? errorDetails : undefined
      }
    } catch (error) {
      const duration = Date.now() - startTime
      console.error('❌ Companies sync failed:', error)

      return {
        success: false,
        processed: 0,
        errors: 1,
        duration,
        errorDetails: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  async syncProfiles(options: SyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now()
    const { chunkSize = this.DEFAULT_CHUNK_SIZE } = options

    try {
      const totalCount = await this.prisma.profiles.count()

      console.log(`📊 Found ${totalCount} profiles to sync`)

      if (totalCount === 0) {
        return {
          success: true,
          processed: 0,
          errors: 0,
          duration: Date.now() - startTime
        }
      }

      let processed = 0
      let errors = 0
      const errorDetails: string[] = []

      const totalChunks = Math.ceil(totalCount / chunkSize)

      for (let chunk = 0; chunk < totalChunks; chunk++) {
        const offset = chunk * chunkSize
        console.log(`📦 Processing profiles chunk ${chunk + 1}/${totalChunks}`)

        try {
          const profiles = await this.prisma.profiles.findMany({
            include: {
              users: {
                select: {
                  email: true,
                  created_at: true
                }
              },
              location: {
                select: {
                  name: true
                }
              },
              skills: {
                include: {
                  skills: {
                    select: { name: true }
                  }
                }
              },
              experiences: true,
              educations: true,
              certifications: true,
              awards: true
            },
            skip: offset,
            take: chunkSize,
            orderBy: { id: 'asc' }
          })

          if (profiles.length === 0) break

          const esDocuments = profiles.map((profile: any) => this.transformProfileToDocument(profile))

          const bulkOps = esDocuments.map((doc: any) => ({
            index: 'profiles',
            id: doc.id,
            document: doc
          }))

          const bulkSuccess = await elasticsearchService.bulkUpsert(bulkOps, 'profiles')

          if (bulkSuccess) {
            processed += profiles.length
            console.log(`  ✅ Successfully indexed ${profiles.length} profiles`)
          } else {
            errors += profiles.length
            errorDetails.push(`Bulk operation failed for profiles chunk ${chunk + 1}`)
          }

          await this.sleep(100)
        } catch (error) {
          errors += chunkSize
          const errorMsg = `Profiles chunk ${chunk + 1} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          errorDetails.push(errorMsg)
          console.error(`  ❌ ${errorMsg}`)
        }
      }

      await elasticsearchService.refreshIndex('profiles')

      const duration = Date.now() - startTime
      console.log(`📊 Profiles sync completed: ${processed} processed, ${errors} errors, ${duration}ms`)

      return {
        success: errors === 0,
        processed,
        errors,
        duration,
        errorDetails: errorDetails.length > 0 ? errorDetails : undefined
      }
    } catch (error) {
      const duration = Date.now() - startTime
      console.error('❌ Profiles sync failed:', error)

      return {
        success: false,
        processed: 0,
        errors: 1,
        duration,
        errorDetails: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  // Real-time sync methods for individual records
  async syncJobById(jobId: string, operation: 'upsert' | 'delete' = 'upsert'): Promise<boolean> {
    try {
      if (operation === 'delete') {
        return await elasticsearchService.deleteDocument('jobs', jobId)
      }

      const job = await this.prisma.jobs.findUnique({
        where: { id: jobId },
        include: {
          companies: {
            select: {
              name: true,
              logo_url: true,
              size: true
            }
          },
          locations: {
            select: {
              name: true
            }
          },
          job_skills: {
            include: {
              skills: {
                select: { name: true }
              }
            }
          },
          job_tags: {
            include: {
              tags: {
                select: { name: true }
              }
            }
          },
          job_benefits: true,
          job_requirements: true,
          job_work_arrangements: true,
          _count: {
            select: {
              job_views: true,
              applications: true
            }
          }
        }
      })

      if (!job || job.deleted) {
        return await elasticsearchService.deleteDocument('jobs', jobId)
      }

      const esDocument = this.transformJobToDocument(job)
      return await elasticsearchService.indexDocument('jobs', jobId, esDocument)
    } catch (error) {
      console.error(`❌ Failed to sync job ${jobId}:`, error)
      return false
    }
  }

  async syncCompanyById(companyId: string, operation: 'upsert' | 'delete' = 'upsert'): Promise<boolean> {
    try {
      if (operation === 'delete') {
        return await elasticsearchService.deleteDocument('companies', companyId)
      }

      const company = await this.prisma.companies.findUnique({
        where: { id: companyId },
        include: {
          company_benefits: true,
          _count: {
            select: {
              jobs: {
                where: { deleted: false }
              }
            }
          }
        }
      })

      if (!company) {
        return await elasticsearchService.deleteDocument('companies', companyId)
      }

      const esDocument = this.transformCompanyToDocument(company)
      return await elasticsearchService.indexDocument('companies', companyId, esDocument)
    } catch (error) {
      console.error(`❌ Failed to sync company ${companyId}:`, error)
      return false
    }
  }

  async syncProfileById(profileId: string, operation: 'upsert' | 'delete' = 'upsert'): Promise<boolean> {
    try {
      if (operation === 'delete') {
        return await elasticsearchService.deleteDocument('profiles', profileId)
      }

      const profile = await this.prisma.profiles.findUnique({
        where: { id: profileId },
        include: {
          users: {
            select: {
              email: true,
              created_at: true
            }
          },
          location: {
            select: {
              name: true
            }
          },
          skills: {
            include: {
              skills: {
                select: { name: true }
              }
            }
          },
          experiences: true,
          educations: true,
          certifications: true,
          awards: true
        }
      })

      if (!profile) {
        return await elasticsearchService.deleteDocument('profiles', profileId)
      }

      const esDocument = this.transformProfileToDocument(profile)
      return await elasticsearchService.indexDocument('profiles', profileId, esDocument)
    } catch (error) {
      console.error(`❌ Failed to sync profile ${profileId}:`, error)
      return false
    }
  }

  // Bulk sync methods for multiple IDs
  async bulkSyncJobsByIds(jobIds: string[], operation: 'upsert' | 'delete' = 'upsert'): Promise<SyncResult> {
    const startTime = Date.now()

    try {
      if (operation === 'delete') {
        const success = await elasticsearchService.bulkDelete(jobIds, 'jobs')
        return {
          success,
          processed: success ? jobIds.length : 0,
          errors: success ? 0 : jobIds.length,
          duration: Date.now() - startTime
        }
      }

      const jobs = await this.prisma.jobs.findMany({
        where: {
          id: { in: jobIds },
          deleted: false
        },
        include: {
          companies: {
            select: {
              name: true,
              logo_url: true,
              size: true
            }
          },
          locations: {
            select: {
              name: true
            }
          },
          job_skills: {
            include: {
              skills: {
                select: { name: true }
              }
            }
          },
          job_tags: {
            include: {
              tags: {
                select: { name: true }
              }
            }
          },
          job_benefits: true,
          job_requirements: true,
          job_work_arrangements: true,
          _count: {
            select: {
              job_views: true,
              applications: true
            }
          }
        }
      })

      const esDocuments = jobs.map((job: any) => this.transformJobToDocument(job))
      const bulkOps = esDocuments.map((doc: any) => ({
        index: 'jobs',
        id: doc.id,
        document: doc
      }))

      const success = await elasticsearchService.bulkUpsert(bulkOps, 'jobs')

      return {
        success,
        processed: success ? jobs.length : 0,
        errors: success ? 0 : jobs.length,
        duration: Date.now() - startTime
      }
    } catch (error) {
      console.error('❌ Bulk sync jobs failed:', error)
      return {
        success: false,
        processed: 0,
        errors: jobIds.length,
        duration: Date.now() - startTime,
        errorDetails: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  // Data transformation methods
  private transformJobToDocument(job: any): JobDocument {
    return {
      id: job.id,
      title: job.title,
      description: job.description || '',
      company_id: job.company_id,
      company_name: job.companies?.name || '',
      company_logo_url: job.companies?.logo_url,
      company_size: job.companies?.size,
      location_id: job.location_id,
      location_name: job.locations?.name || '',
      location_full_path: job.locations?.name || '',
      salary_min: job.salary_range?.min,
      salary_max: job.salary_range?.max,
      salary_currency: job.salary_range?.currency || 'VND',
      job_type: job.job_type,
      experience_level: job.experience_level,
      status: job.status,
      posted_at: job.posted_at?.toISOString() || new Date().toISOString(),
      expires_at: job.expires_at?.toISOString(),
      updated_at: job.updated_at?.toISOString() || new Date().toISOString(),
      skills: job.job_skills?.map((js: any) => js.skills.name) || [],
      tags: job.job_tags?.map((jt: any) => jt.tags.name) || [],
      benefits: job.job_benefits?.map((b: any) => b.title) || [],
      requirements: job.job_requirements?.map((r: any) => r.title) || [],
      work_arrangements: {
        is_remote_allowed: job.job_work_arrangements?.is_remote_allowed || false,
        remote_percentage: job.job_work_arrangements?.remote_percentage || 0,
        flexible_hours: job.job_work_arrangements?.flexible_hours || false,
        travel_requirement: job.job_work_arrangements?.travel_requirement,
        shift_type: job.job_work_arrangements?.shift_type
      },
      view_count: job._count?.job_views || 0,
      application_count: job._count?.applications || 0,
      // Completion suggesters
      title_suggest: {
        input: [job.title, ...job.title.split(' ')].filter(Boolean),
        weight: 10
      },
      company_suggest: job.companies?.name
        ? {
            input: [job.companies.name, ...job.companies.name.split(' ')].filter(Boolean),
            weight: 8
          }
        : undefined,
      skills_suggest:
        job.job_skills?.length > 0
          ? {
              input: job.job_skills.map((js: any) => js.skills.name),
              weight: 6
            }
          : undefined
    }
  }

  private transformCompanyToDocument(company: any): CompanyDocument {
    return {
      id: company.id,
      name: company.name,
      description: company.description,
      size: company.size,
      logo_url: company.logo_url,
      industry: company.company_details?.industry,
      founded_year: company.company_details?.founded_year,
      location: company.company_details?.headquarters_location?.name,
      website_url: company.company_details?.website_url,
      linkedin_url: company.linkedin_url,
      employee_count_range: this.buildEmployeeRange(
        company.company_details?.employee_count_min,
        company.company_details?.employee_count_max
      ),
      company_type: company.company_details?.company_type,
      benefits: company.company_benefits?.map((b: any) => b.title) || [],
      job_count: company._count?.jobs || 0,
      is_verified: company.is_verified || false,
      created_at: company.created_at?.toISOString() || new Date().toISOString(),
      updated_at: company.updated_at?.toISOString() || new Date().toISOString(),
      name_suggest: {
        input: [company.name, ...company.name.split(' ')].filter(Boolean),
        weight: 10
      }
    }
  }

  private transformProfileToDocument(profile: any): ProfileDocument {
    return {
      id: profile.id,
      user_id: profile.user_id,
      full_name: profile.full_name || '',
      display_name: profile.display_name,
      headline: profile.headline,
      bio: profile.bio,
      desired_job_title: profile.desired_job_title,
      desired_job_types: profile.desired_job_type || [],
      desired_salary_min: profile.desired_salary_min,
      desired_currency: profile.desired_currency,
      years_of_experience: profile.years_of_experience,
      location_id: profile.location_id,
      location_name: profile.location?.name,
      location_text: profile.location_text,
      skills:
        profile.skills?.map((ps: any) => ({
          name: ps.skills.name,
          proficiency: ps.proficiency,
          level: ps.level
        })) || [],
      experiences:
        profile.experiences?.map((exp: any) => ({
          company_name: exp.company_name,
          position: exp.position,
          duration_months: this.calculateDuration(exp.start_date, exp.end_date, exp.is_current),
          is_current: exp.is_current
        })) || [],
      educations:
        profile.educations?.map((edu: any) => ({
          school_name: edu.school_name,
          degree: edu.degree,
          field_of_study: edu.field_of_study
        })) || [],
      certifications:
        profile.certifications?.map((cert: any) => ({
          name: cert.name,
          issuing_org: cert.issuing_org,
          skills_acquired: cert.skills_acquired
        })) || [],
      awards:
        profile.awards?.map((award: any) => ({
          title: award.title,
          category: award.category,
          level: award.level
        })) || [],
      avatar_url: profile.avatar_url,
      linkedin_url: profile.linkedin_url,
      github_url: profile.github_url,
      personal_website: profile.personal_website,
      is_looking_for_job: profile.is_looking_for_job || false,
      created_at:
        profile.users?.created_at?.toISOString() || profile.created_at?.toISOString() || new Date().toISOString(),
      updated_at: profile.updated_at?.toISOString() || new Date().toISOString()
    }
  }

  // Utility methods
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private buildEmployeeRange(min?: number, max?: number): string | undefined {
    if (!min && !max) return undefined
    if (min && max) return `${min}-${max}`
    if (min) return `${min}+`
    if (max) return `<${max}`
    return undefined
  }

  private calculateDuration(startDate: Date, endDate: Date | null, isCurrent: boolean): number | undefined {
    const start = new Date(startDate)
    const end = isCurrent ? new Date() : endDate ? new Date(endDate) : new Date()

    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30))

    return diffMonths
  }

  // Statistics and monitoring
  async getSyncStats(): Promise<Record<string, any>> {
    try {
      const [jobsCount, companiesCount, profilesCount] = await Promise.all([
        this.prisma.jobs.count({ where: { deleted: false } }),
        this.prisma.companies.count(),
        this.prisma.profiles.count()
      ])

      // Get Elasticsearch index stats
      const esStats = await Promise.all([
        elasticsearchService
          .getClient()
          .count({ index: elasticsearchService['getIndexName']('jobs') })
          .catch(() => ({ count: 0 })),
        elasticsearchService
          .getClient()
          .count({ index: elasticsearchService['getIndexName']('companies') })
          .catch(() => ({ count: 0 })),
        elasticsearchService
          .getClient()
          .count({ index: elasticsearchService['getIndexName']('profiles') })
          .catch(() => ({ count: 0 }))
      ])

      return {
        database: {
          jobs: jobsCount,
          companies: companiesCount,
          profiles: profilesCount,
          total: jobsCount + companiesCount + profilesCount
        },
        elasticsearch: {
          jobs: esStats[0].count,
          companies: esStats[1].count,
          profiles: esStats[2].count,
          total: esStats[0].count + esStats[1].count + esStats[2].count
        },
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('❌ Failed to get sync stats:', error)
      throw error
    }
  }

  async cleanup(): Promise<void> {
    await this.prisma.$disconnect()
    console.log('🔌 Elasticsearch sync service cleanup completed')
  }
}

export const elasticsearchSyncService = new ElasticsearchSyncService()
