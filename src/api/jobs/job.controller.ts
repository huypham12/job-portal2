import { Request, Response, NextFunction } from 'express'
import { JobService } from './job.service'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'
import {
  CreateJobDTO,
  UpdateJobDTO,
  UpdateJobStatusDTO,
  PublishJobDTO,
  BulkJobActionsDTO,
  BulkExtendExpiryDTO,
  SuggestedCandidatesDTO,
  FilterJobsDTO,
  MyJobsDTO
} from './job.validator'
import { prisma } from '@/config/database.service'

export class JobController {
  private jobService: JobService

  constructor() {
    this.jobService = new JobService()
  }

  // ==================== EMPLOYER ENDPOINTS ====================

  /**
   * POST /api/jobs
   * Create a new job posting
   */
  createJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.decoded_authorization!.user_id
      const data: CreateJobDTO = req.validated!.body

      const job = await this.jobService.createJob(userId, data)

      res.status(HTTP_STATUS.CREATED).json({
        message: 'Job created successfully. Pending approval.',
        data: job
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/jobs/my-jobs
   * Get all jobs posted by the employer
   */
  getMyJobs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.decoded_authorization!.user_id
      const query: MyJobsDTO = req.validated!.query

      const result = await this.jobService.getMyJobs(userId, query)

      res.status(HTTP_STATUS.OK).json({
        message: 'Jobs retrieved successfully',
        ...result
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/jobs/:id/manage
   * Get job details for management (employer view)
   */
  getJobForManage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.validated!.params
      const userId = req.decoded_authorization!.user_id

      const job = await this.jobService.getJobById(id, userId, true)

      res.status(HTTP_STATUS.OK).json({
        message: 'Job retrieved successfully',
        data: job
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * PUT /api/jobs/:id
   * Update a job posting
   */
  updateJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.validated!.params
      const userId = req.decoded_authorization!.user_id
      const data: UpdateJobDTO = req.validated!.body

      const job = await this.jobService.updateJob(id, userId, data)

      res.status(HTTP_STATUS.OK).json({
        message: 'Job updated successfully',
        data: job
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * DELETE /api/jobs/:id
   * Soft delete a job posting
   */
  deleteJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.validated!.params
      const userId = req.decoded_authorization!.user_id

      const result = await this.jobService.deleteJob(id, userId)

      res.status(HTTP_STATUS.OK).json(result)
    } catch (error) {
      next(error)
    }
  }

  /**
   * PATCH /api/jobs/:id/status
   * Update job status (open/close)
   */
  updateJobStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.validated!.params
      const userId = req.decoded_authorization!.user_id
      const { status }: UpdateJobStatusDTO = req.validated!.body

      const result = await this.jobService.updateJobStatus(id, userId, status)

      res.status(HTTP_STATUS.OK).json(result)
    } catch (error) {
      next(error)
    }
  }

  /**
   * PATCH /api/jobs/:id/publish
   * Publish a draft job (change status to approved)
   */
  publishJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.validated!.params
      const userId = req.decoded_authorization!.user_id

      const result = await this.jobService.publishJob(id, userId)

      res.status(HTTP_STATUS.OK).json(result)
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /api/jobs/bulk-actions
   * Perform bulk actions on multiple jobs (close, delete, publish)
   */
  bulkJobActions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.decoded_authorization!.user_id
      const { action, job_ids }: BulkJobActionsDTO = req.validated!.body

      const result = await this.jobService.bulkJobActions(userId, action, job_ids)

      res.status(HTTP_STATUS.OK).json(result)
    } catch (error) {
      next(error)
    }
  }

  /**
   * PATCH /api/jobs/bulk-extend
   * Bulk extend job expiry dates
   */
  bulkExtendExpiry = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.decoded_authorization!.user_id
      const { job_ids, new_expires_at }: BulkExtendExpiryDTO = req.validated!.body

      const result = await this.jobService.bulkExtendExpiry(userId, job_ids, new_expires_at)

      res.status(HTTP_STATUS.OK).json(result)
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/jobs/:id/suggested-candidates
   * Get suggested candidates for a job
   */
  getSuggestedCandidates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.validated!.params
      const userId = req.decoded_authorization!.user_id
      const { size }: SuggestedCandidatesDTO = req.validated!.query

      const result = await this.jobService.getSuggestedCandidates(id, userId, size)

      res.status(HTTP_STATUS.OK).json({
        message: 'Suggested candidates retrieved successfully',
        data: result
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/jobs/:id/stats
   * Get job statistics (views, applications)
   */
  getJobStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.validated!.params
      const userId = req.decoded_authorization!.user_id

      const stats = await this.jobService.getJobStats(id, userId)

      res.status(HTTP_STATUS.OK).json({
        message: 'Job statistics retrieved successfully',
        data: stats
      })
    } catch (error) {
      next(error)
    }
  }

  // ==================== PUBLIC ENDPOINTS ====================

  /**
   * GET /api/jobs
   * Get all active jobs with filters (public)
   */
  getJobs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query: FilterJobsDTO = req.validated!.query

      const result = await this.jobService.getJobs(query)

      res.status(HTTP_STATUS.OK).json({
        message: 'Jobs retrieved successfully',
        ...result
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/jobs/:id/public
   * Get job detail (public view)
   */
  getJobPublic = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.validated!.params

      const job = await this.jobService.getJobById(id)

      res.status(HTTP_STATUS.OK).json({
        message: 'Job retrieved successfully',
        data: job
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/jobs/featured
   * Get featured jobs
   */
  getFeaturedJobs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10

      const jobs = await this.jobService.getFeaturedJobs(limit)

      res.status(HTTP_STATUS.OK).json({
        message: 'Featured jobs retrieved successfully',
        data: jobs
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/jobs/latest
   * Get latest jobs
   */
  getLatestJobs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20

      const jobs = await this.jobService.getLatestJobs(limit)

      res.status(HTTP_STATUS.OK).json({
        message: 'Latest jobs retrieved successfully',
        data: jobs
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /api/jobs/:id/view
   * Track job view
   */
  trackView = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params

      // Get profile_id if user is authenticated
      let profileId: string | undefined
      if (req.decoded_authorization?.user_id) {
        const profile = await prisma.profiles.findUnique({
          where: { user_id: req.decoded_authorization.user_id },
          select: { id: true }
        })
        profileId = profile?.id
      }

      // Get source from query or default to 'direct'
      const source = (req.query.source as string) || 'direct'

      const result = await this.jobService.trackView(id, profileId, source)

      res.status(HTTP_STATUS.OK).json(result)
    } catch (error) {
      next(error)
    }
  }
}

// Export singleton instance
export const jobController = new JobController()
