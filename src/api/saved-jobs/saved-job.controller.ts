import { Request, Response, NextFunction } from 'express'
import { SavedJobService } from './saved-job.service'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'
import { SaveJobDTO, GetSavedJobsDTO } from './saved-job.validator'
import { prisma } from '@/config/database.service'
import { HttpError } from '@/shared/common/http-error'

export class SavedJobController {
  private savedJobService: SavedJobService

  constructor() {
    this.savedJobService = new SavedJobService()
  }

  /**
   * POST /api/saved-jobs
   * Save a job to favorites
   */
  saveJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.decoded_authorization!.user_id
      const { job_id }: SaveJobDTO = req.body

      // Get user's profile
      const profile = await this.getProfileByUserId(userId)

      const savedJob = await this.savedJobService.saveJob(profile.id, job_id)

      res.status(HTTP_STATUS.CREATED).json({
        message: 'Job saved successfully',
        data: savedJob
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * DELETE /api/saved-jobs/:jobId
   * Remove a job from favorites
   */
  unsaveJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.decoded_authorization!.user_id
      const { jobId } = req.params

      // Get user's profile
      const profile = await this.getProfileByUserId(userId)

      const result = await this.savedJobService.unsaveJob(profile.id, jobId)

      res.status(HTTP_STATUS.OK).json({
        message: result.message
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/saved-jobs
   * Get list of saved jobs with pagination and filters
   */
  getSavedJobs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.decoded_authorization!.user_id
      const query: GetSavedJobsDTO = req.query as any

      // Get user's profile
      const profile = await this.getProfileByUserId(userId)

      const result = await this.savedJobService.getSavedJobs(profile.id, query)

      res.status(HTTP_STATUS.OK).json({
        message: 'Saved jobs retrieved successfully',
        ...result
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/saved-jobs/check/:jobId
   * Check if a job is saved
   */
  checkSaved = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.decoded_authorization!.user_id
      const { jobId } = req.params

      // Get user's profile
      const profile = await this.getProfileByUserId(userId)

      const result = await this.savedJobService.checkSaved(profile.id, jobId)

      res.status(HTTP_STATUS.OK).json({
        message: 'Check completed',
        data: result
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Helper method to get profile by user ID
   */
  private async getProfileByUserId(userId: string) {
    const profile = await prisma.profiles.findUnique({
      where: { user_id: userId },
      select: { id: true }
    })

    if (!profile) {
      throw new HttpError('Profile not found', HTTP_STATUS.NOT_FOUND)
    }

    return profile
  }
}

export const savedJobController = new SavedJobController()
