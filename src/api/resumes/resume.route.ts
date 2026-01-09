import { Router, Request, Response, NextFunction } from 'express'
import { ResumeController } from './resume.controller'
import { ResumeService } from './resume.service'
import { wrapController } from '@/shared/utils/wrap-controller'
import { authenticateAccessToken } from '@/middleware/verify.middleware'
import { accessTokenValidator } from '../auth/auth.validator'
import { envConfig } from '@/config/getEnvConfig'
import {
  createResumeValidator,
  updateResumeValidator,
  setDefaultResumeValidator,
  deleteResumeValidator,
  getResumeValidator,
  uploadResumeValidator,
  replaceResumeFileValidator,
  exportResumeValidator,
  createResumeFromProfileValidator,
  duplicateResumeValidator
} from './resume.validator'
import { uploadDocument, handleMulterError } from '@/api/uploads/middleware/upload.middleware'
import { candidate } from '@/middleware/authorize.middleware'

const resumeRouter = Router()

// Initialize service and controller
const resumeService = new ResumeService()
const resumeController = new ResumeController(resumeService)

// Middleware chung cho authentication (only candidates can manage resumes)
const authMiddleware = [accessTokenValidator, authenticateAccessToken, candidate]

// Dev-only request body logger to help debug validation issues
const logRequestBody = (req: Request, _res: Response, next: NextFunction) => {
  if (envConfig.app.nodeEnv !== 'production') {
    try {
      const preview = JSON.stringify(req.body, (_k, v) =>
        typeof v === 'string' && v.length > 10000 ? `${v.slice(0, 10000)}...[truncated]` : v
      )
      console.log('[debug] Request body for', req.method, req.originalUrl, ':', preview)
    } catch (e) {
      console.log('[debug] Request body could not be stringified')
    }
  }
  next()
}

/**
 * @route GET /api/resumes/themes
 * @desc Lấy danh sách themes có sẵn
 * @access Private - Candidate only
 */
resumeRouter.get('/themes', ...authMiddleware, wrapController(resumeController.getAvailableThemes))

/**
 * @route GET /api/resumes/profile-data
 * @desc Lấy profile data formatted cho việc tạo CV
 * @access Private - Candidate only
 */
resumeRouter.get('/profile-data', ...authMiddleware, wrapController(resumeController.getProfileData))

/**
 * @route POST /api/resumes/from-profile
 * @desc Tạo CV từ profile - Include ALL profile data
 * @access Private - Candidate only
 */
resumeRouter.post(
  '/from-profile',
  ...authMiddleware,
  createResumeFromProfileValidator,
  wrapController(resumeController.createResumeFromProfile)
)

/**
 * @route POST /api/resumes
 * @desc Tạo CV mới từ đầu (manual input)
 * @access Private - Candidate only
 */
resumeRouter.post('/', ...authMiddleware, createResumeValidator, wrapController(resumeController.createResume))

/**
 * @route GET /api/resumes
 * @desc Lấy danh sách CV của user
 * @access Private - Candidate only
 */
resumeRouter.get('/', ...authMiddleware, wrapController(resumeController.getResumes))

/**
 * @route GET /api/resumes/:id
 * @desc Lấy chi tiết CV
 * @access Private - Candidate only
 */
resumeRouter.get('/:id', ...authMiddleware, getResumeValidator, wrapController(resumeController.getResumeById))

/**
 * @route PUT /api/resumes/:id
 * @desc Cập nhật CV
 * @access Private - Candidate only
 */
resumeRouter.put('/:id', ...authMiddleware, updateResumeValidator, wrapController(resumeController.updateResume))

/**
 * @route PATCH /api/resumes/:id/default
 * @desc Đặt CV làm mặc định
 * @access Private - Candidate only
 */
resumeRouter.patch(
  '/:id/default',
  ...authMiddleware,
  setDefaultResumeValidator,
  wrapController(resumeController.setDefaultResume)
)

/**
 * @route DELETE /api/resumes/:id
 * @desc Xóa CV
 * @access Private - Candidate only
 */
resumeRouter.delete('/:id', ...authMiddleware, deleteResumeValidator, wrapController(resumeController.deleteResume))

/**
 * @route POST /api/resumes/upload
 * @desc Upload CV file (PDF/DOCX) với tự động parse
 * @access Private - Candidate only
 */
resumeRouter.post(
  '/upload',
  ...authMiddleware,
  uploadDocument.single('file'),
  handleMulterError,
  uploadResumeValidator,
  wrapController(resumeController.uploadResume)
)

/**
 * @route GET /api/resumes/:id/download
 * @desc Download CV file
 * @access Private - Candidate only
 */
resumeRouter.get(
  '/:id/download',
  ...authMiddleware,
  getResumeValidator,
  wrapController(resumeController.downloadResume)
)

/**
 * @route POST /api/resumes/:id/export
 * @desc Export CV sang PDF với template tùy chọn
 * @access Private - Candidate only
 */
resumeRouter.post(
  '/:id/export',
  ...authMiddleware,
  // log body before validation (dev only)
  logRequestBody,
  exportResumeValidator,
  wrapController(resumeController.exportResume)
)

/**
 * @route GET /api/resumes/:id/preview
 * @desc Preview CV dạng HTML
 * @access Private - Candidate only
 */
resumeRouter.get('/:id/preview', ...authMiddleware, getResumeValidator, wrapController(resumeController.previewResume))

export default resumeRouter
