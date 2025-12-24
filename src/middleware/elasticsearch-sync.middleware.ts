import { Request, Response, NextFunction } from 'express'
import { elasticsearchSyncService } from '../../config/elasticsearch-sync.service'

interface SyncableData {
  id: string
  type: 'job' | 'company' | 'profile'
  action: 'create' | 'update' | 'delete'
  data?: any
}

export class ElasticsearchSyncMiddleware {
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
          const syncData = ElasticsearchSyncMiddleware.extractSyncData(req, data)
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
  private static extractSyncData(req: Request, data: any): SyncableData | null {
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
          const success = await elasticsearchSyncService.syncJobById(syncData.id, 'upsert')
          if (success) {
            console.log(`✅ Synced ${syncData.action} for ${syncData.type}:${syncData.id}`)
          }
          break
        }
        case 'delete': {
          const deleted = await elasticsearchSyncService.syncJobById(syncData.id, 'delete')
          if (deleted) {
            console.log(`✅ Synced delete for ${syncData.type}:${syncData.id}`)
          }
          break
        }
      }
    } catch (error) {
      console.error(`❌ Elasticsearch sync failed for ${syncData.type}:${syncData.id}`, error)
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
      bio: data.bio || '',
      desired_job_title: data.desired_job_title || data.desiredJobTitle,
      years_of_experience: data.years_of_experience || data.yearsOfExperience || 0,
      skills: Array.isArray(data.skills) ? data.skills.map((s: any) => (typeof s === 'object' ? s.name : s)) : [],
      location: data.location || data.address,
      resume_url: data.resume_url || data.resumeUrl
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
      const jobIds = items.filter((item) => item.type === 'job').map((item) => item.id)
      const companyIds = items.filter((item) => item.type === 'company').map((item) => item.id)
      const profileIds = items.filter((item) => item.type === 'profile').map((item) => item.id)

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
