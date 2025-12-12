import { prisma } from '@/config/database.service'
import { HttpError } from '@/shared/common/http-error'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'
import { MESSAGES } from '@/shared/constants/messages'
import { CreateJobDTO, UpdateJobDTO, FilterJobsDTO, MyJobsDTO } from './job.validator'
import { job_status, Prisma } from '@prisma/client'

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

    return job
  }

  /**
   * Get all jobs posted by the employer
   */
  async getMyJobs(userId: string, query: MyJobsDTO) {
    const { page, limit, status, sort_by, sort_order } = query

    // Get company of the user
    const company = await prisma.companies.findUnique({
      where: { recruiter_id: userId },
      select: { id: true }
    })

    if (!company) {
      throw new HttpError('You must have a company to view your jobs', HTTP_STATUS.NOT_FOUND)
    }

    const skip = (page - 1) * limit

    const where: Prisma.jobsWhereInput = {
      company_id: company.id,
      deleted: false,
      ...(status && { status })
    }

    const [jobs, total] = await Promise.all([
      prisma.jobs.findMany({
        where,
        skip,
        take: limit,
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
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
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
    const updatedJob = await prisma.$transaction(async (tx) => {
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

    // Return updated job with relations
    return this.getJobById(jobId)
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

    return { message: `Job ${status === 'approved' ? 'opened' : 'closed'} successfully` }
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

    const skip = (page - 1) * limit

    const where: Prisma.jobsWhereInput = {
      deleted: false,
      status: status || job_status.approved, // Default to approved jobs only
      ...(company_id && { company_id }),
      ...(location_id && { location_id }),
      ...(job_type && { job_type }),
      ...(experience_level !== undefined && { experience_level }),
      ...(posted_after && { posted_at: { gte: posted_after } }),
      ...(posted_before && { posted_at: { lte: posted_before } }),

      // Search in title and description
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      }),

      // Salary range filter
      ...(salary_min && {
        salary_range: {
          path: ['min'],
          gte: salary_min
        }
      }),
      ...(salary_max && {
        salary_range: {
          path: ['max'],
          lte: salary_max
        }
      })
    }

    const [jobs, total] = await Promise.all([
      prisma.jobs.findMany({
        where,
        skip,
        take: limit,
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
      prisma.jobs.count({ where })
    ])

    return {
      data: jobs,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    }
  }

  /**
   * Get featured jobs
   */
  async getFeaturedJobs(limit = 10) {
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
      take: limit,
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
    const jobs = await prisma.jobs.findMany({
      where: {
        deleted: false,
        status: job_status.approved,
        expires_at: { gt: new Date() }
      },
      take: limit,
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
