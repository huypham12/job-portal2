import { UploadService } from './services/upload.service'
import { PostHandler } from '@/types/controller-handler.type'
import { Request, Response } from 'express'
import { TokenPayload } from '@/types/token-payload.type'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'
import { MESSAGES } from '@/shared/constants/messages'

interface UploadAvatarResponse {
  statusCode: number
  message: string
  data: {
    url: string
  }
}

interface UploadCompanyLogoResponse {
  statusCode: number
  message: string
  data: {
    url: string
  }
}

interface UploadResumeResponse {
  statusCode: number
  message: string
  data: {
    url: string
    resumeId: string
  }
}

interface UploadApplicationDocumentResponse {
  statusCode: number
  message: string
  data: {
    url: string
    documentId: string
  }
}

export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * Upload profile avatar
   * POST /api/uploads/avatar
   */
  uploadAvatar: PostHandler<any, UploadAvatarResponse> = async (req, res) => {
    const { user_id } = req.decoded_authorization as TokenPayload

    if (!req.file) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: 'File is required',
        data: { url: '' }
      })
      return
    }

    const result = await this.uploadService.uploadAvatar({
      file: req.file,
      userId: user_id
    })

    res.status(HTTP_STATUS.OK).json({
      statusCode: HTTP_STATUS.OK,
      message: MESSAGES.UPLOAD_AVATAR_SUCCESS,
      data: result
    })
  }

  /**
   * Upload company logo
   * POST /api/uploads/company-logo/:companyId
   */
  uploadCompanyLogo: PostHandler<any, UploadCompanyLogoResponse> = async (req, res) => {
    const { user_id } = req.decoded_authorization as TokenPayload
    const { companyId } = req.params

    if (!req.file) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: 'File is required',
        data: { url: '' }
      })
      return
    }

    const result = await this.uploadService.uploadCompanyLogo({
      file: req.file,
      companyId,
      userId: user_id
    })

    res.status(HTTP_STATUS.OK).json({
      statusCode: HTTP_STATUS.OK,
      message: MESSAGES.UPLOAD_COMPANY_LOGO_SUCCESS,
      data: result
    })
  }

  /**
   * Upload resume
   * POST /api/uploads/resume/:profileId
   */
  uploadResume: PostHandler<any, UploadResumeResponse> = async (req, res) => {
    const { user_id } = req.decoded_authorization as TokenPayload
    const { profileId } = req.params

    if (!req.file) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: 'File is required',
        data: { url: '', resumeId: '' }
      })
      return
    }

    const result = await this.uploadService.uploadResume({
      file: req.file,
      profileId,
      userId: user_id
    })

    res.status(HTTP_STATUS.OK).json({
      statusCode: HTTP_STATUS.OK,
      message: MESSAGES.UPLOAD_RESUME_SUCCESS,
      data: result
    })
  }

  /**
   * Upload application document
   * POST /api/uploads/application-document/:applicationId
   */
  uploadApplicationDocument: PostHandler<any, UploadApplicationDocumentResponse> = async (req, res) => {
    const { user_id } = req.decoded_authorization as TokenPayload
    const { applicationId } = req.params
    const { documentType } = req.body

    if (!req.file) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: 'File is required',
        data: { url: '', documentId: '' }
      })
      return
    }

    const result = await this.uploadService.uploadApplicationDocument({
      file: req.file,
      applicationId,
      documentType,
      userId: user_id
    })

    res.status(HTTP_STATUS.OK).json({
      statusCode: HTTP_STATUS.OK,
      message: MESSAGES.UPLOAD_APPLICATION_DOCUMENT_SUCCESS,
      data: result
    })
  }
}
