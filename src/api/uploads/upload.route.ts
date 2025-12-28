import { Router } from 'express'
import { UploadController } from './upload.controller'
import { UploadService } from './services/upload.service'
import { S3Service } from './services/s3.service'
import { wrapController } from '@/shared/utils/wrap-controller'
import { authenticateAccessToken } from '@/middleware/verify.middleware'
import { accessTokenValidator } from '../auth/auth.validator'
import {
  uploadAvatarValidator,
  uploadCompanyLogoValidator,
  uploadResumeValidator,
  uploadApplicationDocumentValidator
} from './upload.validator'
import {
  uploadImage,
  uploadDocument,
  uploadApplicationDocument as multerUploadApplicationDocument,
  handleMulterError
} from './middleware/upload.middleware'
import { candidate, recruiter } from '@/middleware/authorize.middleware'

const uploadRouter = Router()

// Khởi tạo services và controller
const s3Service = new S3Service()
const uploadService = new UploadService(s3Service)
const uploadController = new UploadController(uploadService)

// Middleware chung cho authentication
const authMiddleware = [accessTokenValidator, authenticateAccessToken]

/**
 * @route POST /api/uploads/avatar
 * @desc Upload profile avatar (image)
 * @access Private - Candidate only
 */
uploadRouter.post(
  '/avatar',
  ...authMiddleware,
  candidate,
  uploadImage.single('file'),
  handleMulterError,
  uploadAvatarValidator,
  wrapController(uploadController.uploadAvatar)
)

/**
 * @route POST /api/uploads/company-logo/:companyId
 * @desc Upload company logo (image)
 * @access Private - Recruiter only (owner of company)
 */
uploadRouter.post(
  '/company-logo/:companyId',
  ...authMiddleware,
  recruiter,
  uploadImage.single('file'),
  handleMulterError,
  uploadCompanyLogoValidator,
  wrapController(uploadController.uploadCompanyLogo)
)

/**
 * @route POST /api/uploads/resume/:profileId
 * @desc Upload resume file (PDF, DOCX)
 * @access Private - Candidate only (owner of profile)
 */
uploadRouter.post(
  '/resume/:profileId',
  ...authMiddleware,
  candidate,
  uploadDocument.single('file'),
  handleMulterError,
  uploadResumeValidator,
  wrapController(uploadController.uploadResume)
)

/**
 * @route POST /api/uploads/application-document/:applicationId
 * @desc Upload application document (PDF, DOCX, Images)
 * @access Private - Candidate only (owner of application)
 */
uploadRouter.post(
  '/application-document/:applicationId',
  ...authMiddleware,
  candidate,
  multerUploadApplicationDocument.single('file'),
  handleMulterError,
  uploadApplicationDocumentValidator,
  wrapController(uploadController.uploadApplicationDocument)
)

export { uploadRouter }
