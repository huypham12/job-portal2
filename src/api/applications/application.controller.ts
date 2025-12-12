import { Request, Response, NextFunction } from 'express'
import { ApplicationService } from './application.service'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'
import { CreateApplicationDTO, GetApplicationsDTO } from './application.validator'
import { TokenPayload } from '@/types/token-payload.type'

export class ApplicationController {
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
      const { profile_id } = req.decoded_authorization as TokenPayload
      const data = req.body as CreateApplicationDTO

      const application = await this.applicationService.createApplication(profile_id, data)

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
      const { profile_id } = req.decoded_authorization as TokenPayload
      const filters = req.query as unknown as GetApplicationsDTO

      const result = await this.applicationService.getApplications(profile_id, filters)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        ...result
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
      const { profile_id } = req.decoded_authorization as TokenPayload
      const { id } = req.params

      const application = await this.applicationService.getApplicationById(profile_id, id)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: application
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
      const { profile_id } = req.decoded_authorization as TokenPayload
      const { id } = req.params

      const stages = await this.applicationService.getApplicationStages(profile_id, id)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: stages
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
      const { profile_id } = req.decoded_authorization as TokenPayload
      const { id } = req.params

      const documents = await this.applicationService.getApplicationDocuments(profile_id, id)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: documents
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
      const { profile_id } = req.decoded_authorization as TokenPayload
      const { id } = req.params
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

      const document = await this.applicationService.uploadApplicationDocument(profile_id, id, document_type, file)

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: document,
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
      const { profile_id } = req.decoded_authorization as TokenPayload
      const { id } = req.params

      const application = await this.applicationService.withdrawApplication(profile_id, id)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: application,
        message: 'Application withdrawn successfully'
      })
    } catch (error) {
      next(error)
    }
  }
}
