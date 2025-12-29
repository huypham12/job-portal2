import { Router } from 'express'
import { ApplicationController } from './application.controller'
import { validateDto } from '@/middleware/validateDto.middleware'
import {
  CreateApplicationSchema,
  GetApplicationsSchema,
  UUIDParamSchema,
  UploadDocumentSchema,
  StageFeedbackSchema
} from './application.validator'
import { authenticateAccessToken } from '@/middleware/verify.middleware'
import { candidate } from '@/middleware/authorize.middleware'
import { checkResourceOwnership } from '@/middleware/resource-ownership.middleware'
import { uploadApplicationDocument, handleMulterError } from '@/api/uploads/middleware/upload.middleware'
import recruiterRouter from './recruiter/recruiter.route'

const router = Router()
const applicationController = new ApplicationController()

/**
 * Recruiter routes - handle job-specific and bulk operations
 * These routes are mounted first to avoid conflicts with candidate routes
 */
router.use(recruiterRouter)

/**
 * Candidate routes - all routes below require authentication and candidate role
 */
router.use(authenticateAccessToken, candidate)

/**
 * POST /api/applications
 * Create a new job application
 */
router.post('/', validateDto(CreateApplicationSchema), applicationController.createApplication)

/**
 * GET /api/applications
 * Get list of user's applications with pagination and filters
 */
router.get('/', validateDto(GetApplicationsSchema), applicationController.getApplications)

/**
 * GET /api/applications/:id
 * Get application details by ID
 */
router.get('/:id', checkResourceOwnership('application'), validateDto(UUIDParamSchema), applicationController.getApplicationById)

/**
 * GET /api/applications/:id/stages
 * Get application stages history
 */
router.get('/:id/stages', checkResourceOwnership('application'), validateDto(UUIDParamSchema), applicationController.getApplicationStages)

/**
 * GET /api/applications/:id/documents
 * Get application documents
 */
router.get('/:id/documents', checkResourceOwnership('application'), validateDto(UUIDParamSchema), applicationController.getApplicationDocuments)

/**
 * POST /api/applications/:id/documents
 * Upload additional document for application
 */
router.post(
  '/:id/documents',
  checkResourceOwnership('application'),
  uploadApplicationDocument.single('file'),
  handleMulterError,
  validateDto(UploadDocumentSchema),
  applicationController.uploadDocument
)

/**
 * DELETE /api/applications/:id
 * Withdraw application
 */
router.delete('/:id', checkResourceOwnership('application'), validateDto(UUIDParamSchema), applicationController.withdrawApplication)

/**
 * PATCH /api/applications/:id/stages/:stageId/feedback
 * Submit candidate feedback for interview stage
 */
router.patch(
  '/:id/stages/:stageId/feedback',
  checkResourceOwnership('application'),
  validateDto(StageFeedbackSchema),
  applicationController.submitStageFeedback
)

export default router
