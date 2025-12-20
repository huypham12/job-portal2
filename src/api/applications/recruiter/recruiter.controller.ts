import { Request, Response, NextFunction } from 'express'
import { RecruiterApplicationService } from './recruiter.service'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'
import {
  GetApplicationsByJobDTO,
  UpdateStatusDTO,
  UpdateStageDTO,
  CreateStageDTO,
  AddNotesDTO,
  ContactCandidateDTO,
  BulkUpdateDTO
} from './recruiter.validator'
import { TokenPayload } from '@/types/token-payload.type'

export class RecruiterApplicationController {
  private recruiterService: RecruiterApplicationService

  constructor() {
    this.recruiterService = new RecruiterApplicationService()
  }

  /**
   * GET /api/applications/job/:jobId
   * Get all applications for a specific job
   */
  getApplicationsByJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const params = req.params as GetApplicationsByJobDTO['params']
      const filters = req.query as unknown as GetApplicationsByJobDTO['query']

      const result = await this.recruiterService.getApplicationsByJob(user_id, params, filters)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        ...result
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/applications/job/:jobId/stats
   * Get application statistics for a job
   */
  getJobApplicationStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const { jobId } = req.params

      const stats = await this.recruiterService.getJobApplicationStats(user_id, jobId)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: stats
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/applications/:id/cv
   * View detailed CV of an applicant
   */
  getApplicationCV = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const { id } = req.params

      const cv = await this.recruiterService.getApplicationCV(user_id, id)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: cv
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * PATCH /api/applications/:id/status
   * Update application status
   */
  updateApplicationStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const { id } = req.params
      const data = req.body as UpdateStatusDTO['body']

      const result = await this.recruiterService.updateApplicationStatus(user_id, id, data)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
        message: 'Application status updated successfully'
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * PATCH /api/applications/:id/stage
   * Update existing application stage
   */
  updateApplicationStage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const { id } = req.params
      const data = req.body as UpdateStageDTO['body']

      const result = await this.recruiterService.updateApplicationStage(user_id, id, data)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
        message: 'Application stage updated successfully'
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /api/applications/:id/stage
   * Create new application stage
   */
  createApplicationStage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const { id } = req.params
      const data = req.body as CreateStageDTO['body']

      const result = await this.recruiterService.createApplicationStage(user_id, id, data)

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: result,
        message: 'Application stage created successfully'
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /api/applications/:id/notes
   * Add internal notes to application
   */
  addApplicationNotes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const { id } = req.params
      const data = req.body as AddNotesDTO['body']

      const result = await this.recruiterService.addApplicationNotes(user_id, id, data)

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: result,
        message: 'Note added successfully'
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /api/applications/:id/contact
   * Contact candidate via email/notification
   */
  contactCandidate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const { id } = req.params
      const data = req.body as ContactCandidateDTO['body']

      const result = await this.recruiterService.contactCandidate(user_id, id, data)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
        message: 'Message sent successfully'
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /api/applications/bulk-update
   * Bulk update multiple applications
   */
  bulkUpdateApplications = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const data = req.body as BulkUpdateDTO

      const result = await this.recruiterService.bulkUpdateApplications(user_id, data)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
        message: 'Applications updated successfully'
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /api/applications/:id/offer
   * Send offer to candidate
   */
  sendOffer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const { id } = req.params
      const data = req.body

      const application = await this.recruiterService.sendOffer(user_id, id, data)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: application,
        message: 'Offer sent successfully'
      })
    } catch (error) {
      next(error)
    }
  }
}
