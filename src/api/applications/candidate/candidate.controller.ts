import { Request, Response, NextFunction } from 'express'
import { ApplicationService } from '../application.service'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'
import { CreateApplicationDTO, GetApplicationsDTO } from '../application.validator'
import { TokenPayload } from '@/types/token-payload.type'

export class CandidateApplicationController {
  private applicationService: ApplicationService

  constructor() {
    this.applicationService = new ApplicationService()
  }

  /**
   * POST /api/applications
   * Create a new job application
   */
  createApplication = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const data = req.body as CreateApplicationDTO

      const application = await this.applicationService.createApplication(user_id, data)

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: application,
        message: 'Application submitted successfully'
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/applications
   * Get list of user's applications with pagination and filters
   */
  getApplications = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const filters = req.validated?.query as GetApplicationsDTO

      const result = await this.applicationService.getApplications(user_id, filters)

      // Convert BigInt to string for JSON serialization
      const serializedResult = {
        ...result,
        data: JSON.parse(JSON.stringify(result.data, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value
        ))
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        ...serializedResult
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/applications/:id
   * Get application details by ID
   */
  getApplicationById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const { applicationId } = req.params
      const application = await this.applicationService.getApplicationById(user_id, applicationId)

      // Convert BigInt to string for JSON serialization
      const serializedApplication = JSON.parse(JSON.stringify(application, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ))

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: serializedApplication
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/applications/:id/stages
   * Get application stages history
   */
  getApplicationStages = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const { applicationId } = req.params

      const stages = await this.applicationService.getApplicationStages(user_id, applicationId)

      // Convert BigInt to string for JSON serialization
      const serializedStages = JSON.parse(JSON.stringify(stages, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ))

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: serializedStages
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/applications/:id/stage/:stageId
   * Get stage details
   */
  getStageDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const { applicationId, stageId } = req.params

      const stage = await this.applicationService.getStageDetails(user_id, applicationId, stageId)

      // Convert BigInt to string for JSON serialization
      const serializedStage = JSON.parse(JSON.stringify(stage, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ))

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: serializedStage
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * PATCH /api/applications/:id/stage/:stageId/accept
   * Candidate accepts a scheduled stage
   */
  acceptStage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const { applicationId, stageId } = req.params

      const updated = await this.applicationService.acceptStage(user_id, applicationId, stageId)

      // Convert BigInt to string for JSON serialization
      const serializedUpdated = JSON.parse(JSON.stringify(updated, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ))

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: serializedUpdated,
        message: 'Stage accepted successfully'
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * PATCH /api/applications/:id/stage/:stageId/decline
   * Candidate declines a scheduled stage
   */
  declineStage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const { applicationId, stageId } = req.params
      const { reason } = req.body as { reason: string }

      const updated = await this.applicationService.declineStage(user_id, applicationId, stageId, reason)

      // Convert BigInt to string for JSON serialization
      const serializedUpdated = JSON.parse(JSON.stringify(updated, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ))

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: serializedUpdated,
        message: 'Stage declined successfully'
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/applications/:id/documents
   * Get application documents
   */
  getApplicationDocuments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const { applicationId } = req.params

      const documents = await this.applicationService.getApplicationDocuments(user_id, applicationId)

      // Convert BigInt to string for JSON serialization
      const serializedDocuments = JSON.parse(JSON.stringify(documents, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ))

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: serializedDocuments
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /api/applications/:id/documents
   * Upload additional document for application
   */
  uploadDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const { applicationId } = req.params
      const { document_type } = req.body
      const file = req.file

      if (!file) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: {
            code: 'FILE_REQUIRED',
            message: 'File is required'
          }
        })
      }

      const document = await this.applicationService.uploadApplicationDocument(
        user_id,
        applicationId,
        document_type,
        file
      )

      // Convert BigInt to string for JSON serialization
      const serializedDocument = JSON.parse(JSON.stringify(document, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ))

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: serializedDocument,
        message: 'Document uploaded successfully'
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * DELETE /api/applications/:id
   * Withdraw application
   */
  withdrawApplication = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = req.decoded_authorization as TokenPayload
      const { applicationId } = req.params

      const application = await this.applicationService.withdrawApplication(user_id, applicationId)

      // Convert BigInt to string for JSON serialization
      const serializedApplication = JSON.parse(JSON.stringify(application, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ))

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: serializedApplication,
        message: 'Application withdrawn successfully'
      })
    } catch (error) {
      next(error)
    }
  }

}
