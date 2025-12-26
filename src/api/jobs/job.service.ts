import { prisma } from '@/config/database.service'
import { HttpError } from '@/shared/common/http-error'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'
import { MESSAGES } from '@/shared/constants/messages'
import { CreateJobDTO, UpdateJobDTO, FilterJobsDTO, MyJobsDTO, SuggestedCandidatesDTO } from './job.validator'
import { job_status, Prisma } from '@prisma/client'
import { matchingService } from '../matching/matching.service'
import { elasticsearchSyncService } from '@/shared/services/elasticsearch-sync.service'
import { jobToESDoc } from '@/shared/utils/es-transformers'

export class JobService {
  // ==================== EMPLOYER METHODS ====================

  /**
   * Create a new job posting
   */
  async createJob(userId: string, data: CreateJobDTO) {
    // Verify company belongs to user
    const company = await prisma.companies.findUnique({
      where: { id: data.company_id }
    })

    if (!company) {
      throw new HttpError('Company not found', HTTP_STATUS.NOT_FOUND)
    }

    if (company.recruiter_id !== userId) {
      throw new HttpError('You do not have permission to post jobs for this company', HTTP_STATUS.FORBIDDEN)
    }

    // Verify company is verified
    if (!company.is_verified) {
      throw new HttpError('Company must be verified before posting jobs', HTTP_STATUS.FORBIDDEN)
    }

    // Validate all skill_ids exist
    if (data.skill_ids && data.skill_ids.length > 0) {
      const skills = await prisma.skills.findMany({
        where: { id: { in: data.skill_ids } },
        select: { id: true }
      })

      if (skills.length !== data.skill_ids.length) {
        const foundIds = skills.map((s) => s.id)
        const invalidIds = data.skill_ids.filter((id) => !foundIds.includes(id))
        throw new HttpError(
          `Invalid skill IDs: ${invalidIds.join(', ')}. Please select valid skills from the list.`,
          HTTP_STATUS.BAD_REQUEST
        )
      }
    }

    // Validate all tag_ids exist (if provided)
    if (data.tag_ids && data.tag_ids.length > 0) {
      const tags = await prisma.tags.findMany({
        where: { id: { in: data.tag_ids } },
        select: { id: true }
      })

      if (tags.length !== data.tag_ids.length) {
        throw new HttpError('One or more tag IDs are invalid.', HTTP_STATUS.BAD_REQUEST)
      }
    }

    // Create job with relations
    const job = await prisma.jobs.create({
      data: {
        title: data.title,
        description: data.description,
        company_id: data.company_id,
        location_id: data.location_id,
        salary_range: data.salary_range as any,
        job_type: data.job_type,
        experience_level: data.experience_level,
        expires_at: data.expires_at,
        status: job_status.draft, // Default to draft, admin will approve to 'approved'
        metadata: data.metadata as any,

        // Create requirements
        job_requirements: data.requirements
          ? {
              create: data.requirements
            }
          : undefined,

        // Create benefits
        job_benefits: data.benefits
          ? {
              create: data.benefits
            }
          : undefined,

        // Connect skills
        job_skills: data.skill_ids
          ? {
              create: data.skill_ids.map((skill_id) => ({ skill_id }))
            }
          : undefined,

        // Connect tags
        job_tags: data.tag_ids
          ? {
              create: data.tag_ids.map((tag_id) => ({ tag_id }))
            }
          : undefined,

        // Create work arrangements
        job_work_arrangements: data.work_arrangements
          ? {
              create: data.work_arrangements
            }
          : undefined
      },
      include: {
        companies: {
          select: {
            id: true,
            name: true,
            logo_url: true
          }
        },
        locations: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        job_requirements: true,
        job_benefits: true,
        job_skills: {
          include: {
            skills: true
          }
        },
        job_tags: {
          include: {
            tags: true
          }
        },
        job_work_arrangements: true
      }
    })

    // Sync to Elasticsearch immediately
    try {
      const esDocument = jobToESDoc(job)
      await elasticsearchSyncService.syncToElasticsearch('jobs', job.id, esDocument)
      console.log(`✅ Job ${job.id} synced to Elasticsearch successfully`)
    } catch (error) {
      console.error(`❌ Failed to sync job ${job.id} to Elasticsearch:`, error)
      // Don't fail job creation due to sync error
    }

    return job
  }

  /**
   * Get all jobs posted by the employer
   */
  async getMyJobs(userId: string, query: MyJobsDTO) {
    const { page, limit, status, sort_by, sort_order } = query

    // Ensure page and limit are numbers
    const pageNum = typeof page === 'string' ? parseInt(page, 10) : Number(page)
    const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : Number(limit)

    // Get company of the user
    const company = await prisma.companies.findUnique({
      where: { recruiter_id: userId },
      select: { id: true }
    })

    if (!company) {
      throw new HttpError('You must have a company to view your jobs', HTTP_STATUS.NOT_FOUND)
    }

    const skip = (pageNum - 1) * limitNum

    const where: Prisma.jobsWhereInput = {
      company_id: company.id,
      deleted: false,
      ...(status && { status })
    }

    const [jobs, total] = await Promise.all([
      prisma.jobs.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sort_by]: sort_order },
        include: {
          companies: {
            select: {
              id: true,
              name: true,
              logo_url: true
            }
          },
          locations: {
            select: {
              id: true,
              name: true,
              type: true
            }
          },
          _count: {
            select: {
              applications: true,
              job_views: true
            }
          }
        }
      }),
      prisma.jobs.count({ where })
    ])

    return {
      data: jobs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        total_pages: Math.ceil(total / limitNum)
      }
    }
  }

  /**
   * Get job by ID (with ownership check for employer)
   */
  async getJobById(jobId: string, userId?: string, checkOwnership = false) {
    const job = await prisma.jobs.findUnique({
      where: { id: jobId },
      include: {
        companies: {
          select: {
            id: true,
            name: true,
            logo_url: true,
            description: true,
            recruiter_id: true
          }
        },
        locations: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        job_requirements: true,
        job_benefits: true,
        job_skills: {
          include: {
            skills: true
          }
        },
        job_tags: {
          include: {
            tags: true
          }
        },
        job_work_arrangements: true,
        _count: {
          select: {
            applications: true,
            job_views: true,
            saved_jobs: true
          }
        }
      }
    })

    if (!job || job.deleted) {
      throw new HttpError('Job not found', HTTP_STATUS.NOT_FOUND)
    }

    // Check ownership if required
    if (checkOwnership && userId) {
      if (job.companies?.recruiter_id !== userId) {
        throw new HttpError('You do not have permission to access this job', HTTP_STATUS.FORBIDDEN)
      }
    }

    return job
  }

  /**
   * Update job
   */
  async updateJob(jobId: string, userId: string, data: UpdateJobDTO) {
    // Check ownership
    const existingJob = await this.getJobById(jobId, userId, true)

    // Cannot update if job is deleted
    if (existingJob.deleted) {
      throw new HttpError('Cannot update deleted job', HTTP_STATUS.BAD_REQUEST)
    }

    // Validate skill_ids if provided
    if (data.skill_ids && data.skill_ids.length > 0) {
      const skills = await prisma.skills.findMany({
        where: { id: { in: data.skill_ids } },
        select: { id: true }
      })

      if (skills.length !== data.skill_ids.length) {
        const foundIds = skills.map((s) => s.id)
        const invalidIds = data.skill_ids.filter((id) => !foundIds.includes(id))
        throw new HttpError(
          `Invalid skill IDs: ${invalidIds.join(', ')}. Please select valid skills from the list.`,
          HTTP_STATUS.BAD_REQUEST
        )
      }
    }

    // Validate tag_ids if provided
    if (data.tag_ids && data.tag_ids.length > 0) {
      const tags = await prisma.tags.findMany({
        where: { id: { in: data.tag_ids } },
        select: { id: true }
      })

      if (tags.length !== data.tag_ids.length) {
        throw new HttpError('One or more tag IDs are invalid.', HTTP_STATUS.BAD_REQUEST)
      }
    }

    // Update job
    const jobUpdateResult = await prisma.$transaction(async (tx) => {
      // Update main job data
      const job = await tx.jobs.update({
        where: { id: jobId },
        data: {
          title: data.title,
          description: data.description,
          location_id: data.location_id,
          salary_range: data.salary_range as any,
          job_type: data.job_type,
          experience_level: data.experience_level,
          expires_at: data.expires_at,
          metadata: data.metadata as any,
          version: { increment: 1 }
        }
      })

      // Update requirements (delete old, create new)
      if (data.requirements) {
        await tx.job_requirements.deleteMany({ where: { job_id: jobId } })
        await tx.job_requirements.createMany({
          data: data.requirements.map((req) => ({ job_id: jobId, ...req }))
        })
      }

      // Update benefits (delete old, create new)
      if (data.benefits) {
        await tx.job_benefits.deleteMany({ where: { job_id: jobId } })
        await tx.job_benefits.createMany({
          data: data.benefits.map((benefit) => ({ job_id: jobId, ...benefit }))
        })
      }

      // Update skills (delete old, create new)
      if (data.skill_ids) {
        await tx.job_skills.deleteMany({ where: { job_id: jobId } })
        await tx.job_skills.createMany({
          data: data.skill_ids.map((skill_id) => ({ job_id: jobId, skill_id }))
        })
      }

      // Update tags (delete old, create new)
      if (data.tag_ids) {
        await tx.job_tags.deleteMany({ where: { job_id: jobId } })
        await tx.job_tags.createMany({
          data: data.tag_ids.map((tag_id) => ({ job_id: jobId, tag_id }))
        })
      }

      // Update work arrangements
      if (data.work_arrangements) {
        await tx.job_work_arrangements.upsert({
          where: { job_id: jobId },
          create: { job_id: jobId, ...data.work_arrangements },
          update: data.work_arrangements
        })
      }

      return job
    })

    // Get updated job with relations
    const jobWithRelations = await this.getJobById(jobId)

    // Sync to Elasticsearch
    setImmediate(async () => {
      try {
        const esDocument = jobToESDoc(jobWithRelations)
        await elasticsearchSyncService.syncToElasticsearch('jobs', jobId, esDocument)
      } catch (error) {
        console.error(`Job update sync failed: ${jobId}`, error)
      }
    })

    return jobWithRelations
  }

  /**
   * Soft delete job
   */
  async deleteJob(jobId: string, userId: string) {
    // Check ownership
    await this.getJobById(jobId, userId, true)

    await prisma.jobs.update({
      where: { id: jobId },
      data: {
        deleted: true,
        status: job_status.draft // Change status to draft when deleted
      }
    })

    // Delete from Elasticsearch
    setImmediate(async () => {
      try {
        await elasticsearchSyncService.deleteFromElasticsearch('jobs', jobId)
      } catch (error) {
        console.error(`Job delete sync failed: ${jobId}`, error)
      }
    })

    return { message: 'Job deleted successfully' }
  }

  /**
   * Update job status (open/close)
   */
  async updateJobStatus(jobId: string, userId: string, status: 'approved' | 'closed') {
    // Check ownership
    const job = await this.getJobById(jobId, userId, true)

    // Can only activate if job was previously approved or draft
    if (job.status === job_status.closed && status === 'approved') {
      // Allow reopening closed jobs
    } else if (job.status === job_status.draft && status === 'approved') {
      throw new HttpError('Job must be approved by admin before activation', HTTP_STATUS.BAD_REQUEST)
    }

    await prisma.jobs.update({
      where: { id: jobId },
      data: { status: status as job_status }
    })

    // Get updated job for sync
    const updatedJob = await this.getJobById(jobId)

    // Sync to Elasticsearch
    setImmediate(async () => {
      try {
        const esDocument = jobToESDoc(updatedJob)
        await elasticsearchSyncService.syncToElasticsearch('jobs', jobId, esDocument)
      } catch (error) {
        console.error(`Job status update sync failed: ${jobId}`, error)
      }
    })

    return { message: `Job ${status === 'approved' ? 'opened' : 'closed'} successfully` }
  }

  /**
   * Publish a draft job (change status from draft to approved)
   */
  async publishJob(jobId: string, userId: string) {
    // Check ownership
    const job = await this.getJobById(jobId, userId, true)

    // Only draft jobs can be published
    if (job.status !== job_status.draft) {
      throw new HttpError('Only draft jobs can be published', HTTP_STATUS.BAD_REQUEST)
    }

    // Update status to approved
    await prisma.jobs.update({
      where: { id: jobId },
      data: { status: job_status.approved }
    })

    // Get updated job for sync
    const updatedJob = await this.getJobById(jobId)

    // Sync to Elasticsearch immediately
    try {
      const esDocument = jobToESDoc(updatedJob)
      await elasticsearchSyncService.syncToElasticsearch('jobs', jobId, esDocument)
      console.log(`✅ Job ${jobId} synced to Elasticsearch after publish`)
    } catch (error) {
      console.error(`❌ Failed to sync job ${jobId} to Elasticsearch after publish:`, error)
      // Don't fail publish due to sync error
    }

    return { message: 'Job published successfully' }
  }

  /**
   * Bulk job actions (close, delete, publish)
   */
  async bulkJobActions(userId: string, action: 'close' | 'delete' | 'publish', jobIds: string[]) {
    // Get all jobs that belong to this user
    const jobs = await prisma.jobs.findMany({
      where: {
        id: { in: jobIds },
        companies: {
          recruiter_id: userId
        },
        deleted: false
      },
      select: {
        id: true,
        status: true,
        title: true
      }
    })

    // Check if all requested jobs belong to this user
    const foundJobIds = jobs.map((job) => job.id)
    const notOwnedJobs = jobIds.filter((id) => !foundJobIds.includes(id))

    if (notOwnedJobs.length > 0) {
      throw new HttpError(
        `You don't have permission to perform this action on jobs: ${notOwnedJobs.join(', ')}`,
        HTTP_STATUS.FORBIDDEN
      )
    }

    // Validate action-specific constraints
    if (action === 'publish') {
      const nonDraftJobs = jobs.filter((job) => job.status !== job_status.draft)
      if (nonDraftJobs.length > 0) {
        throw new HttpError(
          `Only draft jobs can be published. Non-draft jobs: ${nonDraftJobs.map((j) => j.title).join(', ')}`,
          HTTP_STATUS.BAD_REQUEST
        )
      }
    }

    // Perform bulk action
    const updateData: any = {}
    let actionMessage = ''

    switch (action) {
      case 'close':
        updateData.status = job_status.closed
        actionMessage = 'closed'
        break
      case 'delete':
        updateData.deleted = true
        actionMessage = 'deleted'
        break
      case 'publish':
        updateData.status = job_status.approved
        actionMessage = 'published'
        break
    }

    await prisma.jobs.updateMany({
      where: {
        id: { in: foundJobIds }
      },
      data: updateData
    })

    // Sync all updated jobs to Elasticsearch
    setImmediate(async () => {
      for (const jobId of foundJobIds) {
        try {
          // Fetch updated job data
          const updatedJob = await this.getJobById(jobId)
          const esDocument = jobToESDoc(updatedJob)
          await elasticsearchSyncService.syncToElasticsearch('jobs', jobId, esDocument)
        } catch (error) {
          console.error(`Bulk job ${action} sync failed for ${jobId}:`, error)
        }
      }
    })

    return {
      message: `Successfully ${actionMessage} ${foundJobIds.length} job(s)`,
      affected_jobs: foundJobIds.length,
      job_ids: foundJobIds
    }
  }

  /**
   * Bulk extend job expiry dates
   */
  async bulkExtendExpiry(userId: string, jobIds: string[], newExpiresAt: Date) {
    // Get all jobs that belong to this user and are not deleted
    const jobs = await prisma.jobs.findMany({
      where: {
        id: { in: jobIds },
        companies: {
          recruiter_id: userId
        },
        deleted: false,
        status: job_status.approved // Only extend active jobs
      },
      select: {
        id: true,
        title: true,
        expires_at: true
      }
    })

    // Check if all requested jobs belong to this user and are active
    const foundJobIds = jobs.map((job) => job.id)
    const notOwnedOrInactiveJobs = jobIds.filter((id) => !foundJobIds.includes(id))

    if (notOwnedOrInactiveJobs.length > 0) {
      throw new HttpError(
        `Cannot extend expiry for jobs: ${notOwnedOrInactiveJobs.join(', ')}. Jobs must be owned by you and active.`,
        HTTP_STATUS.FORBIDDEN
      )
    }

    // Update expiry dates
    await prisma.jobs.updateMany({
      where: {
        id: { in: foundJobIds }
      },
      data: {
        expires_at: newExpiresAt
      }
    })

    // Sync all updated jobs to Elasticsearch
    setImmediate(async () => {
      for (const jobId of foundJobIds) {
        try {
          // Fetch updated job data
          const updatedJob = await this.getJobById(jobId)
          const esDocument = jobToESDoc(updatedJob)
          await elasticsearchSyncService.syncToElasticsearch('jobs', jobId, esDocument)
        } catch (error) {
          console.error(`Bulk extend expiry sync failed for ${jobId}:`, error)
        }
      }
    })

    return {
      message: `Successfully extended expiry for ${foundJobIds.length} job(s)`,
      affected_jobs: foundJobIds.length,
      job_ids: foundJobIds,
      new_expires_at: newExpiresAt
    }
  }

  /**
   * Get suggested candidates for a job
   */
  async getSuggestedCandidates(jobId: string, userId: string, size: number = 20) {
    // Check ownership
    await this.getJobById(jobId, userId, true)

    // Get suggested candidates using matching service
    const result = await matchingService.matchCandidatesForJob(jobId, size)

    return {
      job_id: jobId,
      total: result.total,
      candidates: result.candidates.map((candidate) => ({
        id: candidate.id,
        score_percent: candidate.score_percent,
        explanation: candidate.explanation,
        profile: {
          full_name: candidate._source?.full_name,
          display_name: candidate._source?.display_name,
          headline: candidate._source?.headline,
          location_text: candidate._source?.location_text,
          years_of_experience: candidate._source?.years_of_experience,
          is_looking_for_job: candidate._source?.is_looking_for_job,
          avatar_url: candidate._source?.avatar_url
        }
      }))
    }
  }

  /**
   * Get job statistics
   */
  async getJobStats(jobId: string, userId: string) {
    // Check ownership
    await this.getJobById(jobId, userId, true)

    const [applicationStats, viewStats] = await Promise.all([
      // Application statistics
      prisma.applications.groupBy({
        by: ['status'],
        where: { job_id: jobId },
        _count: true
      }),

      // View statistics
      prisma.job_views.aggregate({
        where: { job_id: jobId },
        _count: true,
        _max: { viewed_at: true }
      })
    ])

    // Get recent applications
    const recentApplications = await prisma.applications.findMany({
      where: { job_id: jobId },
      take: 5,
      orderBy: { applied_at: 'desc' },
      include: {
        profiles: {
          select: {
            id: true,
            full_name: true,
            avatar_url: true,
            headline: true
          }
        }
      }
    })

    return {
      views: {
        total: viewStats._count,
        last_viewed: viewStats._max.viewed_at
      },
      applications: {
        total: applicationStats.reduce((sum, stat) => sum + stat._count, 0),
        by_status: applicationStats.reduce(
          (acc, stat) => {
            acc[stat.status!] = stat._count
            return acc
          },
          {} as Record<string, number>
        ),
        recent: recentApplications
      }
    }
  }

  // ==================== PUBLIC METHODS ====================

  /**
   * Get all active jobs with filters (public)
   */
  async getJobs(query: FilterJobsDTO) {
    const {
      page,
      limit,
      search,
      skill_names,
      location_name,
      company_id,
      location_id,
      job_type,
      experience_level,
      status,
      salary_min,
      salary_max,
      posted_after,
      posted_before,
      sort_by,
      sort_order
    } = query

    // Ensure page and limit are numbers (in case they come as strings from query params)
    const pageNum = typeof page === 'number' ? page : parseInt(String(page), 10) || 1
    const limitNum = typeof limit === 'number' ? limit : parseInt(String(limit), 10) || 20
    const skip = (pageNum - 1) * limitNum

    // Ensure experience_level is a number if provided
    const experienceLevelNum =
      experience_level !== undefined && experience_level !== null
        ? typeof experience_level === 'number'
          ? experience_level
          : parseInt(String(experience_level), 10)
        : undefined

    // Build base where clause
    const where: Prisma.jobsWhereInput = {
      deleted: false,
      status: status || job_status.approved, // Default to approved jobs only
      ...(company_id && { company_id }),
      ...(location_id && { location_id }),
      ...(job_type && { job_type }),
      ...(experienceLevelNum !== undefined && !isNaN(experienceLevelNum) && { experience_level: experienceLevelNum }),
      ...(posted_after && { posted_at: { gte: posted_after } }),
      ...(posted_before && { posted_at: { lte: posted_before } }),

      // Search in title and description
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      }),

      // Filter by skill names (search in job_skills relation)
      // Support multiple skills separated by space or comma
      ...(skill_names &&
        (() => {
          const skillNameList = skill_names
            .trim()
            .split(/[\s,]+/)
            .filter((s) => s.length > 0)
            .map((s) => s.trim())

          if (skillNameList.length === 0) return {}

          return {
            job_skills: {
              some: {
                skills: {
                  OR: skillNameList.map((skillName) => ({
                    name: {
                      contains: skillName,
                      mode: 'insensitive' as const
                    }
                  }))
                }
              }
            }
          }
        })()),

      // Filter by location name (search in locations relation)
      ...(location_name &&
        location_name.trim() && {
          locations: {
            name: {
              contains: location_name.trim(),
              mode: 'insensitive' as const
            }
          }
        })
    }

    // Handle salary range filter
    // Use Prisma JSON filter - if it doesn't work, we'll filter after fetch
    if (salary_min || salary_max) {
      const salaryConditions: any[] = []

      if (salary_min) {
        // Job's max salary should be >= requested min (overlap condition)
        salaryConditions.push({
          salary_range: {
            path: ['max'],
            gte: salary_min
          }
        })
      }

      if (salary_max) {
        // Job's min salary should be <= requested max (overlap condition)
        salaryConditions.push({
          salary_range: {
            path: ['min'],
            lte: salary_max
          }
        })
      }

      if (salaryConditions.length > 0) {
        const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []
        where.AND = [...existingAnd, ...salaryConditions]
      }
    }

    // Remove salary filter from where clause temporarily to fetch all matching jobs
    // We'll filter salary in memory as Prisma JSON filter may not work correctly
    const whereWithoutSalary = { ...where }
    if (whereWithoutSalary.AND) {
      whereWithoutSalary.AND = (whereWithoutSalary.AND as any[]).filter((condition: any) => !condition.salary_range)
      if (whereWithoutSalary.AND.length === 0) {
        delete whereWithoutSalary.AND
      }
    }

    // Determine orderBy - if sorting by salary, we'll sort in memory
    // For other fields, use Prisma orderBy
    const orderByField = sort_by === 'salary_min' ? 'posted_at' : sort_by
    const orderByDirection = sort_by === 'salary_min' ? 'desc' : sort_order

    const [allJobs, totalBeforeFilter] = await Promise.all([
      prisma.jobs.findMany({
        where: whereWithoutSalary,
        skip: 0, // Fetch all to filter in memory (needed for salary filter)
        take: 10000, // Large limit to get all matching jobs
        orderBy:
          sort_by === 'salary_min'
            ? { posted_at: 'desc' } // Temporary sort, will be re-sorted by salary
            : { [sort_by]: sort_order },
        include: {
          companies: {
            select: {
              id: true,
              name: true,
              logo_url: true
            }
          },
          locations: {
            select: {
              id: true,
              name: true,
              type: true
            }
          },
          job_skills: {
            include: {
              skills: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            take: 5 // Limit skills shown in list
          },
          _count: {
            select: {
              applications: true
            }
          }
        }
      }),
      prisma.jobs.count({ where: whereWithoutSalary })
    ])

    // Filter by salary in memory
    let filteredJobs = allJobs
    if (salary_min || salary_max) {
      filteredJobs = allJobs.filter((job: any) => {
        if (!job.salary_range || typeof job.salary_range !== 'object') {
          return false // Exclude jobs without salary range
        }

        const jobMin = job.salary_range?.min
        const jobMax = job.salary_range?.max

        // Check overlap: job range overlaps with requested range if:
        // job.max >= requested.min AND job.min <= requested.max
        if (salary_min !== undefined && salary_min !== null) {
          if (jobMax === null || jobMax === undefined || jobMax < salary_min) {
            return false
          }
        }

        if (salary_max !== undefined && salary_max !== null) {
          if (jobMin === null || jobMin === undefined || jobMin > salary_max) {
            return false
          }
        }

        return true
      })
    }

    // Sort by salary if needed (in memory)
    if (sort_by === 'salary_min') {
      filteredJobs.sort((a: any, b: any) => {
        const aMin = a.salary_range?.min ?? a.salary_range?.max ?? 0
        const bMin = b.salary_range?.min ?? b.salary_range?.max ?? 0

        if (sort_order === 'asc') {
          return aMin - bMin
        } else {
          return bMin - aMin
        }
      })
    }

    // Apply pagination after filtering and sorting
    const skipCount = (pageNum - 1) * limitNum
    const paginatedJobs = filteredJobs.slice(skipCount, skipCount + limitNum)
    const total = filteredJobs.length

    return {
      data: paginatedJobs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        total_pages: Math.ceil(total / limitNum)
      }
    }
  }

  /**
   * Get featured jobs
   */
  async getFeaturedJobs(limit = 10) {
    // Ensure limit is a number
    const limitNum = typeof limit === 'number' ? limit : parseInt(String(limit), 10) || 10
    const jobs = await prisma.jobs.findMany({
      where: {
        deleted: false,
        status: job_status.approved,
        expires_at: { gt: new Date() },
        // Assuming metadata contains featured flag
        metadata: {
          path: ['featured'],
          equals: true
        }
      },
      take: limitNum,
      orderBy: { posted_at: 'desc' },
      include: {
        companies: {
          select: {
            id: true,
            name: true,
            logo_url: true
          }
        },
        locations: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        job_skills: {
          include: {
            skills: {
              select: {
                id: true,
                name: true
              }
            }
          },
          take: 5
        }
      }
    })

    return jobs
  }

  /**
   * Get latest jobs
   */
  async getLatestJobs(limit = 20) {
    // Ensure limit is a number
    const limitNum = typeof limit === 'number' ? limit : parseInt(String(limit), 10) || 20
    const jobs = await prisma.jobs.findMany({
      where: {
        deleted: false,
        status: job_status.approved,
        expires_at: { gt: new Date() }
      },
      take: limitNum,
      orderBy: { posted_at: 'desc' },
      include: {
        companies: {
          select: {
            id: true,
            name: true,
            logo_url: true
          }
        },
        locations: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        job_skills: {
          include: {
            skills: {
              select: {
                id: true,
                name: true
              }
            }
          },
          take: 5
        }
      }
    })

    return jobs
  }

  /**
   * Track job view (async - should be queued in production)
   */
  async trackView(jobId: string, profileId?: string, source?: string) {
    // Check if job exists
    const job = await prisma.jobs.findUnique({
      where: { id: jobId },
      select: { id: true }
    })

    if (!job) {
      throw new HttpError('Job not found', HTTP_STATUS.NOT_FOUND)
    }

    // Create view record
    await prisma.job_views.create({
      data: {
        job_id: jobId,
        profile_id: profileId,
        source: source || 'direct'
      }
    })

    return { message: 'View tracked successfully' }
  }
}
