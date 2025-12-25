import { Request, Response, NextFunction } from 'express'
import { elasticsearchSyncService } from '../config/elasticsearch-sync.service'
import { prisma } from '../config/database.service'

interface SyncableData {
  id?: string
  type: 'job' | 'company' | 'profile' | 'application'
  action: 'create' | 'update' | 'delete' | 'bulk_update'
  data?: any
  job_ids?: string[]
  application_ids?: string[]
}

export class ElasticsearchSyncMiddleware {
  /**
   * Get middleware instance for routes
   */
  static getMiddleware() {
    return this.syncToElasticsearch
  }
  /**
   * Middleware to automatically sync data changes to Elasticsearch
   */
  static async syncToElasticsearch(req: Request, res: Response, next: NextFunction) {
    // Store original res.json method
    const originalJson = res.json.bind(res)

    res.json = function (data: any) {
      // Call original json method first
      const result = originalJson(data)

      // Async sync to Elasticsearch (don't block response)
      setImmediate(async () => {
        try {
          const syncData = await ElasticsearchSyncMiddleware.extractSyncData(req, data)
          if (syncData) {
            await ElasticsearchSyncMiddleware.performSync(syncData)
          }
        } catch (error) {
          console.error('🔄 Elasticsearch sync error:', error)
        }
      })

      return result
    }

    next()
  }

  /**
   * Extract syncable data from request and response
   */
  private static async extractSyncData(req: Request, data: any): Promise<SyncableData | null> {
    const method = req.method.toUpperCase()
    const path = req.path.toLowerCase()

    // Jobs sync
    if (path.includes('/jobs')) {
      if (method === 'POST' && data?.data?.id) {
        return {
          id: data.data.id,
          type: 'job',
          action: 'create',
          data: ElasticsearchSyncMiddleware.transformJobData(data.data)
        }
      }
      if (method === 'PUT' && data?.data?.id) {
        return {
          id: data.data.id,
          type: 'job',
          action: 'update',
          data: ElasticsearchSyncMiddleware.transformJobData(data.data)
        }
      }
      if (method === 'PATCH') {
        // Handle job publish
        if (path.includes('/publish') && req.params.id) {
          return { id: req.params.id, type: 'job', action: 'update' }
        }
        // Handle bulk extend expiry
        if (path.includes('/bulk-extend') && data?.job_ids) {
          return {
            type: 'job',
            action: 'bulk_update',
            job_ids: data.job_ids
          } as any
        }
      }
      // Handle bulk actions (close/delete)
      if (method === 'POST' && path.includes('/bulk-actions') && data?.job_ids) {
        return {
          type: 'job',
          action: 'bulk_update',
          job_ids: data.job_ids
        } as any
      }
      if (method === 'DELETE' && req.params.id) {
        return { id: req.params.id, type: 'job', action: 'delete' }
      }
    }

    // Companies sync
    if (path.includes('/companies')) {
      if (method === 'POST' && data?.data?.id) {
        return {
          id: data.data.id,
          type: 'company',
          action: 'create',
          data: ElasticsearchSyncMiddleware.transformCompanyData(data.data)
        }
      }
      if (method === 'PUT' && data?.data?.id) {
        return {
          id: data.data.id,
          type: 'company',
          action: 'update',
          data: ElasticsearchSyncMiddleware.transformCompanyData(data.data)
        }
      }
      if (method === 'DELETE' && req.params.id) {
        return { id: req.params.id, type: 'company', action: 'delete' }
      }
    }

    // Profiles sync
    if (path.includes('/profiles') || (path.includes('/user') && path.includes('profile'))) {
      const profileData = data?.data?.profile || data?.data
      if (method === 'POST' && profileData?.id) {
        return {
          id: profileData.id,
          type: 'profile',
          action: 'create',
          data: ElasticsearchSyncMiddleware.transformProfileData(profileData)
        }
      }
      if (method === 'PUT' && profileData?.id) {
        return {
          id: profileData.id,
          type: 'profile',
          action: 'update',
          data: ElasticsearchSyncMiddleware.transformProfileData(profileData)
        }
      }
      if (method === 'DELETE' && req.params.id) {
        return { id: req.params.id, type: 'profile', action: 'delete' }
      }
    }

    // Applications sync
    if (path.includes('/applications')) {
      // Application status/stage updates
      if ((method === 'PATCH' || method === 'POST') && req.params.id && data?.data?.id) {
        return {
          id: data.data.id,
          type: 'application',
          action: 'update',
          data: await ElasticsearchSyncMiddleware.transformApplicationData(data.data.id)
        }
      }
      // New application
      if (method === 'POST' && !req.params.id && data?.data?.id) {
        return {
          id: data.data.id,
          type: 'application',
          action: 'create',
          data: await ElasticsearchSyncMiddleware.transformApplicationData(data.data.id)
        }
      }
      // Bulk updates
      if (method === 'POST' && path.includes('/bulk-update') && data?.data?.updated_count) {
        return {
          type: 'application',
          action: 'bulk_update',
          application_ids: data.data.updated_applications || []
        } as any
      }
      // Shortlist actions
      if (method === 'POST' && path.includes('/shortlist') && data?.data?.action) {
        return {
          id: req.body.application_id,
          type: 'application',
          action: 'update',
          data: await ElasticsearchSyncMiddleware.transformApplicationData(req.body.application_id)
        }
      }
    }

    return null
  }

  /**
   * Perform the actual sync to Elasticsearch
   */
  private static async performSync(syncData: SyncableData): Promise<void> {
    try {
      switch (syncData.action) {
        case 'create':
        case 'update': {
          if (syncData.id) {
            const success = await elasticsearchSyncService.syncJobById(syncData.id, 'upsert')
            if (success) {
              console.log(`✅ Synced ${syncData.action} for ${syncData.type}:${syncData.id}`)
            }
          }
          break
        }
        case 'bulk_update': {
          // Handle bulk updates for jobs
          if (syncData.job_ids && Array.isArray(syncData.job_ids)) {
            const success = await elasticsearchSyncService.bulkSyncJobsByIds(syncData.job_ids, 'upsert')
            if (success) {
              console.log(`✅ Bulk synced ${syncData.job_ids.length} jobs to Elasticsearch`)
            }
          }
          // Handle bulk updates for applications
          if (syncData.application_ids && Array.isArray(syncData.application_ids)) {
            const success = await Promise.all(
              syncData.application_ids.map((id) => elasticsearchSyncService.syncApplicationById(id, 'upsert'))
            )
            if (success) {
              console.log(`✅ Bulk synced ${syncData.application_ids.length} applications to Elasticsearch`)
            }
          }
          break
        }
        case 'delete': {
          if (syncData.id) {
            const deleted = await elasticsearchSyncService.syncJobById(syncData.id, 'delete')
            if (deleted) {
              console.log(`✅ Synced delete for ${syncData.type}:${syncData.id}`)
            }
          }
          break
        }
      }
    } catch (error) {
      console.error(`❌ Elasticsearch sync failed for ${syncData.type}:${syncData.id || 'bulk'}`, error)
    }
  }

  /**
   * Transform job data for Elasticsearch indexing
   */
  private static transformJobData(data: any) {
    return {
      id: data.id,
      title: data.title || '',
      description: data.description || '',
      company_id: data.company_id || data.companyId,
      company_name: data.company?.name || data.companyName,
      location_id: data.location_id || data.locationId,
      location_name: data.location?.name || data.locationName,
      salary_range: data.salary_range || data.salaryRange,
      salary_min: ElasticsearchSyncMiddleware.extractSalaryMin(data.salary_range || data.salaryRange),
      salary_max: ElasticsearchSyncMiddleware.extractSalaryMax(data.salary_range || data.salaryRange),
      job_type: data.job_type || data.jobType,
      status: data.status || 'active',
      posted_at: data.posted_at || data.postedAt || data.created_at || new Date().toISOString(),
      expires_at: data.expires_at || data.expiresAt,
      skills: Array.isArray(data.skills) ? data.skills : [],
      tags: Array.isArray(data.tags) ? data.tags : []
    }
  }

  /**
   * Transform company data for Elasticsearch indexing
   */
  private static transformCompanyData(data: any) {
    return {
      id: data.id,
      name: data.name || '',
      description: data.description || '',
      size: data.size || data.companySize,
      location: data.location || data.address,
      website: data.website,
      industry: data.industry
    }
  }

  /**
   * Transform profile data for Elasticsearch indexing
   */
  private static transformProfileData(data: any) {
    return {
      id: data.id,
      user_id: data.user_id || data.userId,
      full_name: data.full_name || data.fullName || '',
      display_name: data.display_name || data.displayName || '',
      headline: data.headline || '',
      bio: data.bio || '',
      desired_job_title: data.desired_job_title || data.desiredJobTitle,
      desired_salary_min: data.desired_salary_min || data.desiredSalaryMin,
      desired_salary_max: data.desired_salary_max || data.desiredSalaryMax,
      years_of_experience: data.years_of_experience || data.yearsOfExperience || 0,
      skills: Array.isArray(data.skills) ? data.skills.map((s: any) => (typeof s === 'object' ? s.name : s)) : [],
      location_id: data.location_id || data.locationId,
      location_text: data.location_text || data.locationText || '',
      is_looking_for_job: data.is_looking_for_job || data.isLookingForJob || false,
      availability_status: data.availability_status || data.availabilityStatus || 'OPEN',
      last_active_at: data.last_active_at || data.lastActiveAt,
      resume_url: data.resume_url || data.resumeUrl,
      avatar_url: data.avatar_url || data.avatarUrl
    }
  }

  /**
   * Transform application data for Elasticsearch indexing
   */
  static async transformApplicationData(applicationId: string) {
    // Fetch full application data from database
    const application = await prisma.applications.findUnique({
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
              include: {
                skills: true
              }
            },
            educations: true
          }
        },
        application_stages: {
          orderBy: {
            stage_order: 'desc'
          }
        }
      }
    })

    if (!application) return null

    // Calculate aggregated data
    const stages = application.application_stages
    const completedStages = stages.filter((s) => s.status === 'completed')
    const ratedStages = stages.filter((s) => s.rating)

    // Check if shortlisted
    const shortlist = await prisma.connection_interests.findFirst({
      where: {
        candidate_id: application.profile_id,
        recruiter_id: application.jobs.companies?.recruiter_id || '',
        interest_type: 'shortlist',
        job_id: application.job_id,
        status: 'active'
      }
    })

    return {
      id: application.id,
      job_id: application.job_id,
      profile_id: application.profile_id,
      user_id: application.profiles.user_id,
      status: application.status,
      applied_at: application.applied_at,
      first_viewed_at: application.first_viewed_at,
      last_viewed_at: application.last_viewed_at,
      view_count: application.view_count || 0,
      // Candidate info
      candidate_name: application.profiles.display_name || application.profiles.full_name,
      candidate_email: application.profiles.users?.email,
      candidate_headline: application.profiles.headline,
      candidate_location: application.profiles.location_text,
      candidate_years_experience: application.profiles.years_of_experience,
      candidate_desired_salary_min: application.profiles.desired_salary_min,
      candidate_desired_salary_max: application.profiles.desired_salary_min, // Use min as max if no max field
      candidate_skills: application.profiles.skills.map((s) => s.skills.name),
      candidate_education: application.profiles.educations.map((e: any) => e.degree).filter(Boolean),
      // Job info
      job_title: application.jobs.title,
      job_company_name: application.jobs.companies?.name,
      job_location: application.jobs.locations?.name,
      job_type: application.jobs.job_type,
      job_salary_min: application.jobs.salary_range
        ? this.extractSalaryMin(application.jobs.salary_range as any)
        : null,
      job_salary_max: application.jobs.salary_range
        ? this.extractSalaryMax(application.jobs.salary_range as any)
        : null,
      // Application stages
      current_stage_name: stages[0]?.stage_name,
      current_stage_status: stages[0]?.status,
      stages_count: stages.length,
      completed_stages_count: completedStages.length,
      average_rating:
        ratedStages.length > 0 ? ratedStages.reduce((sum, s) => sum + s.rating!, 0) / ratedStages.length : null,
      // Metadata
      has_notes: (application.metadata as any)?.notes?.length > 0,
      has_rating: ratedStages.length > 0,
      is_shortlisted: !!shortlist
    }
  }

  /**
   * Extract minimum salary from salary range string
   */
  private static extractSalaryMin(salaryRange?: string): number | null {
    if (!salaryRange) return null

    const match = salaryRange.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)/g)
    if (match && match.length >= 1) {
      return parseInt(match[0].replace(/,/g, ''))
    }
    return null
  }

  /**
   * Extract maximum salary from salary range string
   */
  private static extractSalaryMax(salaryRange?: string): number | null {
    if (!salaryRange) return null

    const match = salaryRange.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)/g)
    if (match && match.length >= 2) {
      return parseInt(match[1].replace(/,/g, ''))
    }
    return null
  }

  /**
   * Manual bulk sync method for initial data seeding or bulk operations
   */
  static async bulkSync(items: SyncableData[]): Promise<void> {
    if (items.length === 0) return

    try {
      // Group by type for efficient bulk operations
      const jobIds = items.filter((item) => item.type === 'job' && item.id).map((item) => item.id!)
      const companyIds = items.filter((item) => item.type === 'company' && item.id).map((item) => item.id!)
      const profileIds = items.filter((item) => item.type === 'profile' && item.id).map((item) => item.id!)

      const promises = []

      if (jobIds.length > 0) {
        promises.push(elasticsearchSyncService.bulkSyncJobsByIds(jobIds, 'upsert'))
      }

      if (companyIds.length > 0) {
        promises.push(Promise.all(companyIds.map((id) => elasticsearchSyncService.syncCompanyById(id, 'upsert'))))
      }

      if (profileIds.length > 0) {
        promises.push(Promise.all(profileIds.map((id) => elasticsearchSyncService.syncProfileById(id, 'upsert'))))
      }

      // Sync applications if any
      const applicationIds = items.filter((item) => item.type === 'application' && item.id).map((item) => item.id!)
      if (applicationIds.length > 0) {
        promises.push(
          Promise.all(applicationIds.map((id) => elasticsearchSyncService.syncApplicationById(id, 'upsert')))
        )
      }

      await Promise.all(promises)
      console.log(`📦 Bulk synced ${items.length} items to Elasticsearch`)
    } catch (error) {
      console.error('❌ Bulk sync to Elasticsearch failed:', error)
      throw error
    }
  }

  /**
   * Sync existing database records to Elasticsearch (for initial setup)
   */
  static async syncExistingData(): Promise<void> {
    try {
      console.log('🔄 Starting initial Elasticsearch data sync...')

      const results = await elasticsearchSyncService.syncAllData({
        chunkSize: 1000,
        forceReindex: true
      })

      console.log('✅ Initial sync completed:', results)
    } catch (error) {
      console.error('❌ Initial Elasticsearch sync failed:', error)
      throw error
    }
  }

  /**
   * Sync all applications data to Elasticsearch
   */
  static async syncAllApplications(): Promise<void> {
    try {
      console.log('🔄 Starting applications Elasticsearch sync...')

      const applications = await prisma.applications.findMany({
        select: { id: true }
      })

      const applicationIds = applications.map((app) => app.id)
      const success = await elasticsearchSyncService.bulkSyncApplicationsByIds(applicationIds, 'upsert')

      if (success) {
        console.log(`✅ Synced ${applicationIds.length} applications to Elasticsearch`)
      }
    } catch (error) {
      console.error('❌ Applications Elasticsearch sync failed:', error)
      throw error
    }
  }

  /**
   * Health check for Elasticsearch sync
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const stats = await elasticsearchSyncService.getSyncStats()
      console.log('📊 Elasticsearch sync stats:', stats)
      return true
    } catch (error) {
      console.error('❌ Elasticsearch sync health check failed:', error)
      return false
    }
  }
}
