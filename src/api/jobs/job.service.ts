import { prisma } from '@/config/database.service'
import { HttpError } from '@/shared/common/http-error'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'
import { MESSAGES } from '@/shared/constants/messages'
import { CreateJobDTO, UpdateJobDTO, FilterJobsDTO, MyJobsDTO, SuggestedCandidatesDTO } from './job.validator'
import { job_status, Prisma } from '@prisma/client'
import { matchingService } from '../matching/matching.service'
import { elasticsearchSyncService } from '@/config/elasticsearch-sync.service'
import { elasticsearchService } from '@/config/elasticsearch.service'
import { jobToESDoc } from '@/shared/utils/es-transformers'

export class JobService {
  // ==================== OWNERSHIP VERIFICATION ====================

  // REMOVED: Ownership verification methods - moved to middleware

  // ==================== EMPLOYER METHODS ====================

  /**
   * Create a new job posting
   * Note: Company ownership is verified by middleware, so we just need to validate the company exists and is verified
   */
  async createJob(companyId: string, data: CreateJobDTO) {
    // Verify company exists and is verified (ownership already checked by middleware)
    const company = await prisma.companies.findUnique({
      where: { id: companyId },
      select: { id: true, is_verified: true, name: true }
    })

    if (!company) {
      throw new HttpError('Company not found', HTTP_STATUS.NOT_FOUND)
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

    // Validate all category_ids exist (if provided)
    if (data.category_ids && data.category_ids.length > 0) {
      const categories = await prisma.categories.findMany({
        where: { id: { in: data.category_ids } },
        select: { id: true }
      })

      if (categories.length !== data.category_ids.length) {
        throw new HttpError('One or more category IDs are invalid.', HTTP_STATUS.BAD_REQUEST)
      }
    }

    // Create job with relations
    const job = await prisma.jobs.create({
      data: {
        title: data.title,
        description: data.description,
        company_id: companyId,
        location_id: data.location_id,
        salary_range: data.salary_range as any,
        job_type: data.job_type,
        experience_level: data.experience_level,
        expires_at: data.expires_at,
        status: job_status.draft, // Default to draft, admin will approve to 'approved'
        admin_approved: false, // Jobs mới tạo chưa được duyệt
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

        // Connect categories
        job_categories: data.category_ids
          ? {
              create: data.category_ids.map((category_id) => ({ category_id }))
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
        job_categories: {
          include: {
            categories: true
          }
        },
        job_work_arrangements: true
      }
    })

    // Sync to Elasticsearch immediately using full relations to ensure transformer has ownership info
    try {
      const jobWithRelations = await prisma.jobs.findUnique({
        where: { id: job.id },
        include: {
          companies: {
            include: {
              users: true,
              company_details: true
            }
          },
          locations: {
            include: { parent: true }
          },
          job_requirements: true,
          job_benefits: true,
          job_skills: {
            include: {
              skills: { include: { category: true } }
            }
          },
          job_categories: {
            include: {
              categories: true
            }
          },
          job_work_arrangements: true
        }
      })

      if (jobWithRelations) {
        // Ensure recruiter ownership is present for transformer
        if (!(jobWithRelations.companies as any)?.recruiter_id) {
          try {
            if (jobWithRelations.company_id) {
              const companyRecord = await prisma.companies.findUnique({
                where: { id: jobWithRelations.company_id as string },
                select: { recruiter_id: true }
              })
              if (companyRecord && jobWithRelations.companies) {
                ;(jobWithRelations.companies as any).recruiter_id = companyRecord.recruiter_id
              }
            }
          } catch (e) {
            // ignore, transformer will handle missing ownership
          }
        }

        const esDocument = jobToESDoc(jobWithRelations)
        await elasticsearchSyncService.syncToElasticsearch('jobs', job.id, esDocument)
        console.log(`✅ Job ${job.id} synced to Elasticsearch successfully`)
      } else {
        console.warn(`⚠️ Job ${job.id} not found when preparing ES sync`)
      }
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
    const { page, limit, search, status, sort_by, sort_order } = query

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

    // Search in title or description (case-insensitive)
    if (search && search.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } }
      ]
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
            include: {
              parent: {
                select: {
                  id: true,
                  name: true,
                  type: true
                }
              }
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
   * Get job by ID (business logic only - authorization handled by middleware)
   */
  async getJobById(jobId: string) {
    const job = await prisma.jobs.findUnique({
      where: { id: jobId },
      include: {
        companies: {
          select: {
            id: true,
            name: true,
            logo_url: true,
            description: true,
            recruiter_id: true,
            users: {
              select: {
                role: true
              }
            }
          }
        },
        locations: {
          include: {
            parent: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
          }
        },
        job_requirements: true,
        job_benefits: true,
        job_skills: {
          include: {
            skills: true
          }
        },
        job_categories: {
          include: {
            categories: true
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

    // REMOVED: Ownership checks - handled by middleware
    return job
  }

  /**
   * Update job
   */
  async updateJob(jobId: string, data: UpdateJobDTO) {
    // Ownership check handled by middleware
    const existingJob = await this.getJobById(jobId)

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

    // Validate category_ids if provided
    if (data.category_ids && data.category_ids.length > 0) {
      const categories = await prisma.categories.findMany({
        where: { id: { in: data.category_ids } },
        select: { id: true }
      })

      if (categories.length !== data.category_ids.length) {
        throw new HttpError('One or more category IDs are invalid.', HTTP_STATUS.BAD_REQUEST)
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

      // Update categories (delete old, create new)
      if (data.category_ids) {
        await tx.job_categories.deleteMany({ where: { job_id: jobId } })
        await tx.job_categories.createMany({
          data: data.category_ids.map((category_id) => ({ job_id: jobId, category_id }))
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
  async deleteJob(jobId: string) {
    // REMOVED: Ownership check - handled by middleware
    await this.getJobById(jobId)

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
  async updateJobStatus(jobId: string, status: 'approved' | 'closed') {
    // REMOVED: Ownership check - handled by middleware
    const job = await this.getJobById(jobId)

    // Chỉ cho phép thao tác với jobs đã được admin duyệt
    if (!job.admin_approved) {
      throw new HttpError('Job must be approved by admin before status changes', HTTP_STATUS.BAD_REQUEST)
    }

    // Chỉ cho phép toggle giữa approved và closed
    if (status === 'approved' && job.status !== job_status.closed) {
      throw new HttpError('Can only reopen closed jobs', HTTP_STATUS.BAD_REQUEST)
    }

    if (status === 'closed' && job.status !== job_status.approved) {
      throw new HttpError('Can only close approved jobs', HTTP_STATUS.BAD_REQUEST)
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

  /**
   * Bulk job actions (close, delete)
   * Note: Company ownership is verified by middleware, jobs ownership verified individually
   */
  async bulkJobActions(companyId: string, action: 'close' | 'open' | 'delete', jobIds: string[]) {
    // Get all jobs that belong to this company (ownership already verified by middleware)
    const jobs = await prisma.jobs.findMany({
      where: {
        id: { in: jobIds },
        company_id: companyId,
        deleted: false
      },
      select: {
        id: true,
        status: true,
        title: true,
        admin_approved: true
      }
    })

    // Check if all requested jobs exist and belong to the company
    const foundJobIds = jobs.map((job) => job.id)
    const notFoundJobs = jobIds.filter((id) => !foundJobIds.includes(id))

    if (notFoundJobs.length > 0) {
      throw new HttpError(
        `Jobs not found or do not belong to your company: ${notFoundJobs.join(', ')}`,
        HTTP_STATUS.NOT_FOUND
      )
    }

    // Determine actionable job IDs depending on action and current state/admin approval
    let actionableIds: string[] = []
    let skippedIds: string[] = []
    const updateData: any = {}
    let actionMessage = ''

    if (action === 'open') {
      const openable = jobs.filter((j) => j.status === job_status.closed && j.admin_approved)
      actionableIds = openable.map((j) => j.id)
      skippedIds = foundJobIds.filter((id) => !actionableIds.includes(id))
      if (actionableIds.length === 0) {
        throw new HttpError(
          'No valid jobs to open. Only closed jobs that have been approved by admin can be reopened.',
          HTTP_STATUS.BAD_REQUEST
        )
      }
      updateData.status = job_status.approved
      actionMessage = 'opened'
    } else if (action === 'close') {
      const closable = jobs.filter((j) => j.status === job_status.approved && j.admin_approved)
      actionableIds = closable.map((j) => j.id)
      skippedIds = foundJobIds.filter((id) => !actionableIds.includes(id))
      if (actionableIds.length === 0) {
        throw new HttpError('No valid jobs to close. Only approved jobs can be closed.', HTTP_STATUS.BAD_REQUEST)
      }
      updateData.status = job_status.closed
      actionMessage = 'closed'
    } else if (action === 'delete') {
      actionableIds = foundJobIds
      skippedIds = []
      updateData.deleted = true
      actionMessage = 'deleted'
    }

    await prisma.jobs.updateMany({
      where: {
        id: { in: actionableIds }
      },
      data: updateData
    })

    // Sync all updated jobs to Elasticsearch
    setImmediate(async () => {
      for (const jobId of actionableIds) {
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
      message: `Successfully ${actionMessage} ${actionableIds.length} job(s)`,
      affected_jobs: actionableIds.length,
      job_ids: actionableIds,
      skipped_job_ids: skippedIds
    }
  }

  /**
   * Publish jobs for recruiter review (draft -> pending_approval)
   * Note: Company ownership is verified by middleware, jobs ownership verified individually
   */
  async publishJobs(companyId: string, jobIds: string[]) {
    // Get all jobs that belong to this company (ownership already verified by middleware)
    const jobs = await prisma.jobs.findMany({
      where: {
        id: { in: jobIds },
        company_id: companyId,
        deleted: false
      },
      select: {
        id: true,
        status: true,
        title: true,
        admin_approved: true
      }
    })

    // Check if all requested jobs exist and belong to the company
    const foundJobIds = jobs.map((job) => job.id)
    const notFoundJobs = jobIds.filter((id) => !foundJobIds.includes(id))

    if (notFoundJobs.length > 0) {
      throw new HttpError(
        `Jobs not found or do not belong to your company: ${notFoundJobs.join(', ')}`,
        HTTP_STATUS.NOT_FOUND
      )
    }

    // Only allow publishing jobs that are in draft status
    const publishable = jobs.filter((j) => j.status === job_status.draft)
    const publishIds = publishable.map((j) => j.id)
    const skippedIds = jobIds.filter((id) => !publishIds.includes(id))

    if (publishIds.length > 0) {
      await prisma.jobs.updateMany({
        where: { id: { in: publishIds } },
        data: { status: job_status.pending_approval }
      })

      // Note: We don't sync to Elasticsearch here because pending_approval jobs shouldn't be visible to candidates
    }

    return {
      message: `Submitted ${publishIds.length} job(s) for admin approval.`,
      published_count: publishIds.length,
      published_ids: publishIds,
      skipped_job_ids: skippedIds
    }
  }

  /**
   * Bulk extend job expiry dates
   * Note: Company ownership is verified by middleware, jobs ownership verified individually
   */
  async bulkExtendExpiry(companyId: string, jobIds: string[], newExpiresAt: Date) {
    // Get all jobs that belong to this company and are not deleted
    const jobs = await prisma.jobs.findMany({
      where: {
        id: { in: jobIds },
        company_id: companyId,
        deleted: false,
        status: job_status.approved // Only extend active jobs
      },
      select: {
        id: true,
        title: true,
        expires_at: true
      }
    })

    // Check if all requested jobs exist and belong to the company
    const foundJobIds = jobs.map((job) => job.id)
    const notFoundJobs = jobIds.filter((id) => !foundJobIds.includes(id))

    if (notFoundJobs.length > 0) {
      throw new HttpError(
        `Cannot extend expiry for jobs: ${notFoundJobs.join(', ')}. Jobs must belong to your company and be active.`,
        HTTP_STATUS.NOT_FOUND
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
   * Get job statistics
   */
  async getJobStats(jobId: string) {
    // Ownership check handled by middleware
    await this.getJobById(jobId)

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
   * Search jobs using Elasticsearch with fallback to PostgreSQL
   * Optimized for performance with full-text search and filtering
   */
  private async getJobsFromES(query: FilterJobsDTO) {
    const {
      page,
      limit,
      search,
      skill_names,
      location_name,
      tags,
      company_id,
      location_id,
      job_type,
      experience_level,
      status,
      salary_min,
      salary_max,
      posted_after,
      posted_before,
      is_remote,
      flexible_hours,
      remote_percentage_min,
      job_category,
      job_category_type,
      benefits_type,
      sort_by,
      sort_order
    } = query

    const pageNum = typeof page === 'number' ? page : parseInt(String(page), 10) || 1
    const limitNum = typeof limit === 'number' ? limit : parseInt(String(limit), 10) || 20
    const skip = (pageNum - 1) * limitNum

    // Build Elasticsearch query
    const mustClauses: any[] = []
    const filterClauses: any[] = []
    const shouldClauses: any[] = []

    // Base filters - always applied
    filterClauses.push({ term: { status: status || 'approved' } })
    filterClauses.push({ range: { expires_at: { gt: 'now' } } })

    // Full-text search - optimized for both Vietnamese and English
    if (search && search.trim()) {
      const searchQuery = search.trim()

      // Enhanced Vietnamese character detection for better query optimization
      const vietnameseRegex =
        /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/u
      const hasVietnameseChars = vietnameseRegex.test(searchQuery)

      // Optimized query parameters for Vietnamese vs English
      // Vietnamese: more flexible to account for analyzer normalization
      // English: can be stricter due to better analyzer support
      const operator = hasVietnameseChars ? 'or' : 'and'
      const minShouldMatch = hasVietnameseChars ? '30%' : '60%' // More lenient for Vietnamese

      // Enhanced search fields covering all searchable content for comprehensive job discovery
      const searchFields = [
        'title^4', // Highest priority - job title
        'description^2.5', // High priority - job description
        'company_name^2', // High priority - company name
        'job_requirements_title^1.5', // Medium-high priority - requirements
        'job_benefits_type^1.2', // Medium priority - benefits
        'job_category^1', // Medium priority - categories
        'location_name^1', // Medium priority - location
        'location_combined^0.8', // Lower priority - combined location
        'tags^0.8' // Lower priority - tags
      ]

      // Single optimized multi_match query for Vietnamese
      mustClauses.push({
        multi_match: {
          query: searchQuery,
          fields: searchFields,
          type: 'best_fields',
          operator: operator,
          minimum_should_match: minShouldMatch,
          // Preserve exact matching for Vietnamese, enable fuzzy for Latin queries
          fuzziness: hasVietnameseChars ? 0 : 'AUTO',
          prefix_length: hasVietnameseChars ? 0 : 1
        }
      })
    }

    // Skill names filter (support multiple skills)
    if (skill_names && skill_names.trim()) {
      const skillNameList = skill_names
        .trim()
        .split(/[\s,]+/)
        .filter((s) => s.length > 0)
        .map((s) => s.trim().toLowerCase())

      if (skillNameList.length > 0) {
        filterClauses.push({
          terms: { skills: skillNameList }
        })
      }
    }

    // Tags filter (support multiple tags)
    if (tags && tags.trim()) {
      const tagList = tags
        .trim()
        .split(/[\s,]+/)
        .filter((t) => t.length > 0)
        .map((t) => t.trim().toLowerCase())

      if (tagList.length > 0) {
        filterClauses.push({
          terms: { tags: tagList }
        })
      }
    }

    // Work arrangements filters
    if (is_remote !== undefined) {
      filterClauses.push({ term: { is_remote_allowed: is_remote } })
    }

    if (flexible_hours !== undefined) {
      filterClauses.push({ term: { flexible_hours } })
    }

    if (remote_percentage_min !== undefined && remote_percentage_min > 0) {
      filterClauses.push({
        range: { remote_percentage: { gte: remote_percentage_min } }
      })
    }

    // Location filters
    if (location_id) {
      filterClauses.push({ term: { location_id } })
    }

    if (location_name && location_name.trim()) {
      const locationQuery = location_name.trim()

      // Enhanced location search with hierarchical matching
      shouldClauses.push({
        match: {
          location_name: {
            query: locationQuery,
            operator: 'and'
          }
        }
      })
      shouldClauses.push({
        match: {
          location_combined: {
            query: locationQuery,
            operator: 'and'
          }
        }
      })
      shouldClauses.push({
        match: {
          location_province: {
            query: locationQuery,
            operator: 'and'
          }
        }
      })
      shouldClauses.push({
        match: {
          location_district: {
            query: locationQuery,
            operator: 'and'
          }
        }
      })
    }

    // Company filter
    if (company_id) {
      filterClauses.push({ term: { company_id } })
    }

    // Job type filter
    if (job_type) {
      filterClauses.push({ term: { job_type } })
    }

    // Experience level filter
    if (experience_level !== undefined && experience_level !== null) {
      const expLevel = typeof experience_level === 'number' ? experience_level : parseInt(String(experience_level), 10)
      if (!isNaN(expLevel)) {
        filterClauses.push({ term: { experience_level: expLevel } })
      }
    }

    // Job category filters
    if (job_category && job_category.trim()) {
      filterClauses.push({ term: { job_category: job_category.trim() } })
    }

    if (job_category_type) {
      filterClauses.push({ term: { job_category_type } })
    }

    // Benefits type filter (support multiple benefit types)
    if (benefits_type && benefits_type.trim()) {
      const benefitTypeList = benefits_type
        .trim()
        .split(/[\s,]+/)
        .filter((b) => b.length > 0)
        .map((b) => b.trim())

      if (benefitTypeList.length > 0) {
        filterClauses.push({
          terms: { job_benefits_type: benefitTypeList }
        })
      }
    }

    // Salary range filter
    if (salary_min !== undefined && salary_min !== null) {
      filterClauses.push({
        range: {
          salary_max: { gte: salary_min }
        }
      })
    }

    if (salary_max !== undefined && salary_max !== null) {
      filterClauses.push({
        range: {
          salary_min: { lte: salary_max }
        }
      })
    }

    // Date filters
    if (posted_after) {
      filterClauses.push({
        range: {
          posted_at: { gte: posted_after.toISOString() }
        }
      })
    }

    if (posted_before) {
      filterClauses.push({
        range: {
          posted_at: { lte: posted_before.toISOString() }
        }
      })
    }

    // Business-aware scoring boosts for better UX
    // Fresh jobs boost: Recent jobs are more likely to be active positions
    shouldClauses.push({
      range: {
        posted_at: {
          gte: 'now-7d/d',
          boost: 1.2 // 20% boost for jobs posted in last 7 days
        }
      }
    })

    // Remote work boost: Remote jobs are increasingly popular
    if (is_remote !== false) {
      // Don't boost if user explicitly filtered out remote jobs
      shouldClauses.push({
        term: {
          is_remote_allowed: {
            value: true,
            boost: 1.1 // 10% boost for remote-allowed jobs
          }
        }
      })
    }

    // Flexible hours boost: Work-life balance preference
    shouldClauses.push({
      term: {
        flexible_hours: {
          value: true,
          boost: 1.05 // 5% boost for flexible hours jobs
        }
      }
    })

    // Company size boost: Larger companies may offer more stability
    shouldClauses.push({
      range: {
        company_size: {
          gte: 50,
          boost: 1.05 // 5% boost for companies with 50+ employees
        }
      }
    })

    // Build ES query
    const esQuery: any = {
      bool: {
        must: mustClauses.length > 0 ? mustClauses : undefined,
        filter: filterClauses.length > 0 ? filterClauses : undefined,
        should: shouldClauses.length > 0 ? shouldClauses : undefined,
        minimum_should_match: shouldClauses.length > 0 ? 1 : undefined
      }
    }

    // Build sort with enhanced options
    const esSort: any[] = []
    if (sort_by === 'salary_min') {
      esSort.push({ salary_min: { order: sort_order || 'asc', missing: '_last' } })
    } else if (sort_by === 'posted_at') {
      esSort.push({ posted_at: { order: sort_order || 'desc' } })
    } else if (sort_by === 'title') {
      esSort.push({ 'title.keyword': { order: sort_order || 'asc' } })
    } else if (sort_by === 'expires_at') {
      esSort.push({ expires_at: { order: sort_order || 'asc' } })
    } else if (sort_by === 'relevance') {
      // Pure relevance-based sorting
      esSort.push({ _score: { order: sort_order || 'desc' } })
      esSort.push({ posted_at: { order: 'desc' } }) // Tie-breaker
    } else {
      // Default: relevance score + posted_at (best for general search)
      esSort.push({ _score: { order: 'desc' } })
      esSort.push({ posted_at: { order: 'desc' } })
    }

    // Execute ES search with optimized scoring for Vietnamese and English
    const indexName = elasticsearchService.getIndexName('jobs')

    // Detect Vietnamese for scoring optimization (reuse regex pattern)
    const vietnameseRegexForScore =
      /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/u
    const hasVietnameseCharsForScore = search && search.trim() ? vietnameseRegexForScore.test(search.trim()) : false

    const searchBody: any = {
      index: indexName,
      query: esQuery,
      from: skip,
      size: limitNum,
      sort: esSort
    }

    // Optimized minimum_score based on search type and language
    // Much lower thresholds to ensure matches, especially for Vietnamese
    if (search && search.trim() && mustClauses.length > 0) {
      // Very low threshold for Vietnamese (0.001) to account for analyzer normalization
      // Slightly higher for English (0.01) but still very permissive
      searchBody.min_score = hasVietnameseCharsForScore ? 0.001 : 0.01
    }

    // Debug logging for ES query
    if (search && search.trim()) {
      console.log('🔍 [ES] Query details:', {
        searchQuery: search.trim(),
        hasVietnameseChars: hasVietnameseCharsForScore,
        index: indexName,
        queryStructure: JSON.stringify(esQuery, null, 2).substring(0, 500),
        minScore: searchBody.min_score,
        mustClausesCount: mustClauses.length,
        filterClausesCount: filterClauses.length
      })
    }

    const esResponse = await elasticsearchService.search(searchBody)

    // Debug logging for ES response
    if (search && search.trim()) {
      console.log('📊 [ES] Response:', {
        total: esResponse.total,
        hitsCount: esResponse.hits.length,
        topScores: esResponse.hits.slice(0, 3).map((h) => ({
          id: h.id,
          score: h._score,
          title: h._source?.title
        }))
      })
    }

    console.log(`🔍 [ES] ES response: total=${esResponse.total}, hits=${esResponse.hits.length}`)

    // DEBUG: Log score filtering
    if (search && search.trim()) {
      /* empty */
    }

    // Extract job IDs from ES results
    // ES _id is always the pure UUID
    // Filter out results with very low scores when search is provided
    let hits = esResponse.hits

    // Optimized score filtering for search queries
    // Much more lenient to ensure relevant results are not filtered out
    if (search && search.trim() && hits.length > 0) {
      const vietnameseRegex =
        /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/u
      const hasVietnameseChars = vietnameseRegex.test(search.trim())
      const topScore = hits[0]._score ?? 0

      // Very lenient thresholds to ensure matches
      // Vietnamese: 5% of top score or minimum 0.001 (extremely lenient)
      // English: 10% of top score or minimum 0.01 (still very permissive)
      const minScoreThreshold = hasVietnameseChars ? Math.max(topScore * 0.05, 0.001) : Math.max(topScore * 0.1, 0.01)

      hits = hits.filter((hit) => (hit._score ?? 0) >= minScoreThreshold)
    }

    const jobIds = hits.map((hit) => {
      // ES _id is now always the pure UUID
      return hit.id
    })

    if (jobIds.length === 0) {
      return {
        data: [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: 0,
          total_pages: 0
        }
      }
    }

    // Hydrate full job data from PostgreSQL with relations
    const jobs = await prisma.jobs.findMany({
      where: {
        id: { in: jobIds },
        deleted: false
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
        },
        _count: {
          select: {
            applications: true
          }
        }
      }
    })

    // Preserve ES sort order
    const jobMap = new Map(jobs.map((job) => [job.id, job]))
    const orderedJobs = jobIds.map((id) => jobMap.get(id)).filter(Boolean) as typeof jobs

    // Calculate total: if we filtered hits by score, use filtered count
    // Otherwise use ES total (which already accounts for min_score in query)
    const filteredTotal =
      search && search.trim() && hits.length < esResponse.hits.length
        ? hits.length // We filtered some out, so use filtered count
        : esResponse.total // Use ES total (already filtered by min_score if applied)

    return {
      data: orderedJobs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filteredTotal,
        total_pages: Math.ceil(filteredTotal / limitNum)
      }
    }
  }

  /**
   * Get all active jobs with filters (public)
   * Uses Elasticsearch for optimal performance with fallback to PostgreSQL
   */
  async getJobs(query: FilterJobsDTO) {
    // Try Elasticsearch first, fallback to PostgreSQL if ES fails or is disabled
    try {
      const esEnabled = !process.env.DISABLE_ELASTICSEARCH || process.env.DISABLE_ELASTICSEARCH === 'false'
      if (esEnabled) {
        const isConnected = await elasticsearchService.checkConnection()
        if (isConnected) {
          console.log(`🔍 [ES] Searching jobs with enhanced query:`, {
            search: query.search,
            filters: {
              skill_names: query.skill_names,
              location_name: query.location_name,
              tags: query.tags,
              job_type: query.job_type,
              experience_level: query.experience_level,
              is_remote: query.is_remote,
              flexible_hours: query.flexible_hours,
              remote_percentage_min: query.remote_percentage_min,
              job_category: query.job_category,
              job_category_type: query.job_category_type,
              benefits_type: query.benefits_type
            },
            pagination: { page: query.page, limit: query.limit },
            sort: { sort_by: query.sort_by, sort_order: query.sort_order }
          })
          console.log(`🔍 [ES] About to call getJobsFromES`)
          const result = await this.getJobsFromES(query)
          console.log(`✅ [ES] Search successful, found ${result.data.length} jobs, total: ${result.pagination.total}`)
          if (result.data.length > 0) {
            return result
          }
          // If ES returns empty, fallback to PostgreSQL
          console.log(`⚠️ [ES] Returned empty results, falling back to PostgreSQL`)
          throw new Error('ES returned empty results')
        } else {
          console.log('⚠️ [ES] Not connected, falling back to PostgreSQL')
        }
      } else {
        console.log('⚠️ [ES] Disabled, using PostgreSQL')
      }
    } catch (error) {
      console.warn('❌ [ES] Search failed, falling back to PostgreSQL:', error)
      // Fall through to PostgreSQL implementation
    }

    console.log(`📊 [PostgreSQL] Searching jobs with enhanced query:`, {
      search: query.search,
      filters: {
        skill_names: query.skill_names,
        location_name: query.location_name,
        tags: query.tags,
        job_type: query.job_type,
        experience_level: query.experience_level,
        is_remote: query.is_remote,
        flexible_hours: query.flexible_hours,
        remote_percentage_min: query.remote_percentage_min,
        job_category: query.job_category,
        job_category_type: query.job_category_type,
        benefits_type: query.benefits_type
      },
      sort: { sort_by: query.sort_by, sort_order: query.sort_order }
    })

    // Fallback to PostgreSQL implementation
    const {
      page,
      limit,
      search,
      skill_names,
      location_name,
      tags,
      company_id,
      location_id,
      job_type,
      experience_level,
      status,
      salary_min,
      salary_max,
      posted_after,
      posted_before,
      is_remote,
      flexible_hours,
      remote_percentage_min,
      job_category,
      job_category_type,
      benefits_type,
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

    // Build base where clause with enhanced filters
    const where: Prisma.jobsWhereInput = {
      deleted: false,
      status: status || job_status.approved, // Default to approved jobs only
      ...(company_id && { company_id }),
      ...(location_id && { location_id }),
      ...(job_type && { job_type }),
      ...(experienceLevelNum !== undefined && !isNaN(experienceLevelNum) && { experience_level: experienceLevelNum }),
      ...(posted_after && { posted_at: { gte: posted_after } }),
      ...(posted_before && { posted_at: { lte: posted_before } }),

      // Work arrangements filters
      ...(is_remote !== undefined && {
        job_work_arrangements: {
          is_remote_allowed: is_remote
        }
      }),
      ...(flexible_hours !== undefined && {
        job_work_arrangements: {
          flexible_hours
        }
      }),
      ...(remote_percentage_min !== undefined && {
        job_work_arrangements: {
          remote_percentage: { gte: remote_percentage_min }
        }
      }),

      // Job categories and benefits filters
      ...(job_category && {
        job_categories: {
          some: {
            categories: {
              name: { contains: job_category, mode: 'insensitive' }
            }
          }
        }
      }),
      ...(benefits_type && {
        job_benefits: {
          some: {
            benefit_type: { contains: benefits_type, mode: 'insensitive' }
          }
        }
      }),

      // Search in title, description, and job requirements
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          // Search in job requirements titles
          {
            job_requirements: {
              some: {
                title: { contains: search, mode: 'insensitive' }
              }
            }
          }
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
          job_requirements: true, // Include job requirements for search results
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
