import { z } from 'zod'
import { Request, Response, NextFunction } from 'express'
import { HttpError } from '@/shared/common/http-error'
import { MESSAGES } from '@/shared/constants/messages'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'
import { prisma } from '@/config/database.service'

// Schema cho upload avatar
export const uploadAvatarValidator = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Kiểm tra file đã được upload chưa
    if (!req.file) {
      return next(new HttpError('File is required', HTTP_STATUS.BAD_REQUEST))
    }

    // File đã được validate bởi multer middleware
    next()
  } catch (error: any) {
    next(new HttpError(error.message || MESSAGES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST))
  }
}

// Schema cho upload company logo
export const uploadCompanyLogoValidator = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return next(new HttpError('File is required', HTTP_STATUS.BAD_REQUEST))
    }

    // Validate company_id nếu có trong params hoặc body
    const companyId = req.params.companyId || req.body.companyId
    if (!companyId) {
      return next(new HttpError('Company ID is required', HTTP_STATUS.BAD_REQUEST))
    }

    // Validate company exists và user có quyền (sẽ check trong service)
    const company = await prisma.companies.findUnique({
      where: { id: companyId }
    })

    if (!company) {
      return next(new HttpError(MESSAGES.COMPANY_NOT_FOUND, HTTP_STATUS.NOT_FOUND))
    }

    next()
  } catch (error: any) {
    next(new HttpError(error.message || MESSAGES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST))
  }
}

// Schema cho upload resume
export const uploadResumeValidator = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return next(new HttpError('File is required', HTTP_STATUS.BAD_REQUEST))
    }

    // Validate profile_id nếu có trong params hoặc body
    const profileId = req.params.profileId || req.body.profileId
    if (!profileId) {
      return next(new HttpError('Profile ID is required', HTTP_STATUS.BAD_REQUEST))
    }

    // Validate profile exists (sẽ check ownership trong service)
    const profile = await prisma.profiles.findUnique({
      where: { id: profileId }
    })

    if (!profile) {
      return next(new HttpError('Profile not found', HTTP_STATUS.NOT_FOUND))
    }

    next()
  } catch (error: any) {
    next(new HttpError(error.message || MESSAGES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST))
  }
}

// Schema cho upload application document
const documentTypeSchema = z.enum(['resume', 'cover_letter', 'certificate', 'portfolio', 'other'])

export const uploadApplicationDocumentValidator = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return next(new HttpError('File is required', HTTP_STATUS.BAD_REQUEST))
    }

    // Validate application_id
    const applicationId = req.params.applicationId || req.body.applicationId
    if (!applicationId) {
      return next(new HttpError('Application ID is required', HTTP_STATUS.BAD_REQUEST))
    }

    // Validate document_type
    const documentType = req.body.documentType || req.body.document_type
    if (!documentType) {
      return next(new HttpError('Document type is required', HTTP_STATUS.BAD_REQUEST))
    }

    // Validate document type với Zod
    try {
      documentTypeSchema.parse(documentType)
    } catch {
      return next(
        new HttpError(
          `Invalid document type. Allowed types: ${documentTypeSchema.options.join(', ')}`,
          HTTP_STATUS.BAD_REQUEST
        )
      )
    }

    // Validate application exists (sẽ check ownership trong service)
    const application = await prisma.applications.findUnique({
      where: { id: applicationId }
    })

    if (!application) {
      return next(new HttpError('Application not found', HTTP_STATUS.NOT_FOUND))
    }

    // Attach validated data to request
    req.body.documentType = documentType
    req.body.applicationId = applicationId

    next()
  } catch (error: any) {
    next(new HttpError(error.message || MESSAGES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST))
  }
}
