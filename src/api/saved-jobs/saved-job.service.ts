import { prisma } from '@/config/database.service'
import { HttpError } from '@/shared/common/http-error'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'
import { GetSavedJobsDTO } from './saved-job.validator'
import { Prisma } from '@prisma/client'

export class SavedJobService {
  /**
   * Save a job to user's saved list
   */
  async saveJob(profileId: string, jobId: string) {
    // Check if job exists and is active
    const job = await prisma.jobs.findUnique({
      where: { id: jobId }
    })

    if (!job) {
      throw new HttpError('Job not found', HTTP_STATUS.NOT_FOUND)
    }

    if (job.status !== 'approved') {
      throw new HttpError('This job is not available', HTTP_STATUS.BAD_REQUEST)
    }

    // Check if already saved
    const existingSaved = await prisma.saved_jobs.findUnique({
      where: {
        profile_id_job_id: {
          profile_id: profileId,
          job_id: jobId
        }
      }
    })

    if (existingSaved) {
      throw new HttpError('Job already saved', HTTP_STATUS.CONFLICT)
    }

    // Save the job
    const savedJob = await prisma.saved_jobs.create({
      data: {
        profile_id: profileId,
        job_id: jobId
      },
      include: {
        jobs: {
          include: {
            companies: {
              select: {
                id: true,
                name: true,
                logo_url: true,
                is_verified: true
              }
            },
            locations: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
          }
        }
      }
    })

    return savedJob
  }

  /**
   * Remove a job from user's saved list
   */
  async unsaveJob(profileId: string, jobId: string) {
    // Check if job is saved
    const savedJob = await prisma.saved_jobs.findUnique({
      where: {
        profile_id_job_id: {
          profile_id: profileId,
          job_id: jobId
        }
      }
    })

    if (!savedJob) {
      throw new HttpError('Job not found in saved list', HTTP_STATUS.NOT_FOUND)
    }

    // Remove from saved jobs
    await prisma.saved_jobs.delete({
      where: {
        profile_id_job_id: {
          profile_id: profileId,
          job_id: jobId
        }
      }
    })

    return { message: 'Job removed from saved list' }
  }

  /**
   * Get list of saved jobs with pagination and filters
   */
  async getSavedJobs(profileId: string, query: GetSavedJobsDTO) {
    const { page = 1, limit = 10, search, job_type, location_id, sort_by = 'saved_at', order = 'desc' } = query

    // Ensure page and limit are numbers (in case they come as strings from query params)
    const pageNum = typeof page === 'number' ? page : parseInt(String(page), 10) || 1
    const limitNum = typeof limit === 'number' ? limit : parseInt(String(limit), 10) || 10
    const skip = (pageNum - 1) * limitNum

    // Build where clause for jobs filter
    const jobWhere: Prisma.jobsWhereInput = {
      status: 'approved'
    }

    if (search) {
      jobWhere.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        {
          companies: {
            name: { contains: search, mode: 'insensitive' }
          }
        }
      ]
    }

    if (job_type) {
      jobWhere.job_type = job_type
    }

    if (location_id) {
      jobWhere.location_id = location_id
    }

    // Build where clause for saved_jobs
    const where: Prisma.saved_jobsWhereInput = {
      profile_id: profileId,
      jobs: jobWhere
    }

    // Build orderBy
    const orderBy: Prisma.saved_jobsOrderByWithRelationInput = {}
    if (sort_by === 'saved_at') {
      orderBy.saved_at = order
    } else if (sort_by === 'created_at') {
      orderBy.jobs = { posted_at: order }
    } else if (sort_by === 'salary') {
      // Note: Sorting by JSON field is complex, you may need raw query
      orderBy.saved_at = order // Fallback to saved_at
    }

    // Get total count
    const total = await prisma.saved_jobs.count({ where })

    // Get saved jobs
    const savedJobs = await prisma.saved_jobs.findMany({
      where,
      skip,
      take: limitNum,
      orderBy,
      include: {
        jobs: {
          include: {
            companies: {
              select: {
                id: true,
                name: true,
                logo_url: true,
                is_verified: true
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
              take: 5 // Limit skills shown
            },
            _count: {
              select: {
                applications: true
              }
            }
          }
        }
      }
    })

    const totalPages = Math.ceil(total / limitNum)

    return {
      data: savedJobs.map((saved) => ({
        id: saved.id,
        saved_at: saved.saved_at,
        job: {
          id: saved.jobs.id,
          title: saved.jobs.title,
          description: saved.jobs.description,
          job_type: saved.jobs.job_type,
          salary_range: saved.jobs.salary_range,
          experience_level: saved.jobs.experience_level,
          posted_at: saved.jobs.posted_at,
          expires_at: saved.jobs.expires_at,
          companies: saved.jobs.companies,
          locations: saved.jobs.locations,
          job_skills: saved.jobs.job_skills.map((js: any) => ({
            skills: js.skills
          })),
          _count: {
            applications: saved.jobs._count.applications
          }
        }
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    }
  }

  /**
   * Check if a job is saved by user
   */
  async checkSaved(profileId: string, jobId: string) {
    const savedJob = await prisma.saved_jobs.findUnique({
      where: {
        profile_id_job_id: {
          profile_id: profileId,
          job_id: jobId
        }
      },
      select: {
        id: true,
        saved_at: true
      }
    })

    return {
      is_saved: !!savedJob,
      saved_at: savedJob?.saved_at || null
    }
  }
}
