import { z } from 'zod'
import { Request, Response, NextFunction } from 'express'
import { HttpError } from '@/shared/common/http-error'
import { MESSAGES } from '@/shared/constants/messages'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'
import { prisma } from '@/config/database.service'
import { validateUUID } from '@/shared/utils/uuid'

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

    // Get companyId from validated data (if validateDto middleware used) or from params/body
    let companyId: string
    if (req.validated?.params?.companyId) {
      companyId = req.validated.params.companyId
    } else if (req.validated?.body?.companyId) {
      companyId = req.validated.body.companyId
    } else {
      companyId = req.params.companyId || req.body.companyId
    }

    if (!companyId) {
      return next(new HttpError('Company ID is required', HTTP_STATUS.BAD_REQUEST))
    }

    // Validate UUID format
    try {
      validateUUID(companyId, 'Company ID')
    } catch (error: any) {
      return next(new HttpError(error.message, HTTP_STATUS.BAD_REQUEST))
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

    // Get profileId from validated data (if validateDto middleware used) or from params/body
    let profileId: string
    if (req.validated?.params?.profileId) {
      profileId = req.validated.params.profileId
    } else if (req.validated?.body?.profileId) {
      profileId = req.validated.body.profileId
    } else {
      profileId = req.params.profileId || req.body.profileId
    }

    if (!profileId) {
      return next(new HttpError('Profile ID is required', HTTP_STATUS.BAD_REQUEST))
    }

    // Validate UUID format
    try {
      validateUUID(profileId, 'Profile ID')
    } catch (error: any) {
      return next(new HttpError(error.message, HTTP_STATUS.BAD_REQUEST))
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

    // Get applicationId from validated data (if validateDto middleware used) or from params/body
    let applicationId: string
    if (req.validated?.params?.applicationId) {
      applicationId = req.validated.params.applicationId
    } else if (req.validated?.body?.applicationId) {
      applicationId = req.validated.body.applicationId
    } else {
      applicationId = req.params.applicationId || req.body.applicationId
    }

    if (!applicationId) {
      return next(new HttpError('Application ID is required', HTTP_STATUS.BAD_REQUEST))
    }

    // Validate UUID format for applicationId
    try {
      validateUUID(applicationId, 'Application ID')
    } catch (error: any) {
      return next(new HttpError(error.message, HTTP_STATUS.BAD_REQUEST))
    }

    // Get documentType from validated data (if validateDto middleware used) or from body
    let documentType: string
    if (req.validated?.body?.documentType) {
      documentType = req.validated.body.documentType
    } else {
      documentType = req.body.documentType || req.body.document_type
    }

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

    // Attach validated data to request body for service layer access
    // Only set if not already present to avoid overriding validated data
    if (!req.body.applicationId) {
      req.body.applicationId = applicationId
    }
    if (!req.body.documentType) {
      req.body.documentType = documentType
    }

    next()
  } catch (error: any) {
    next(new HttpError(error.message || MESSAGES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST))
  }
}
