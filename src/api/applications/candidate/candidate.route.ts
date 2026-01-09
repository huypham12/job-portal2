import { Router } from 'express'
import { CandidateApplicationController } from './candidate.controller'
import { validateDto } from '@/middleware/validateDto.middleware'
import {
  CreateApplicationSchema,
  GetApplicationsSchema,
  UUIDParamSchema,
  UploadDocumentSchema,
  StageFeedbackParamsSchema,
  StageDeclineSchema
} from '../application.validator'
import { authenticateAccessToken } from '@/middleware/verify.middleware'
import { candidate } from '@/middleware/authorize.middleware'
import { checkResourceOwnership } from '@/middleware/resource-ownership.middleware'
import { uploadApplicationDocument, handleMulterError } from '@/api/uploads/middleware/upload.middleware'

const router = Router()
const candidateController = new CandidateApplicationController()

// All routes require authentication and candidate role
router.use(authenticateAccessToken, candidate)

/**
 * POST /api/applications/candidate
 * Create a new job application
 */
router.post('/', validateDto(CreateApplicationSchema), candidateController.createApplication)

/**
 * GET /api/applications/candidate
 * Get list of user's applications with pagination and filters
 */
router.get('/', validateDto(GetApplicationsSchema), candidateController.getApplications)

/**
 * GET /api/applications/candidate/:id
 * Get application details by ID
 */
router.get(
  '/:applicationId',
  checkResourceOwnership('application'),
  validateDto(UUIDParamSchema),
  candidateController.getApplicationById
)

/**
 * GET /api/applications/candidate/:id/stages
 * Get application stages history
 */
router.get(
  '/:applicationId/stages',
  checkResourceOwnership('application'),
  validateDto(UUIDParamSchema),
  candidateController.getApplicationStages
)

/**
 * GET /api/applications/candidate/:id/documents
 * Get application documents
 */
router.get(
  '/:applicationId/documents',
  checkResourceOwnership('application'),
  validateDto(UUIDParamSchema),
  candidateController.getApplicationDocuments
)

/**
 * POST /api/applications/candidate/:id/documents
 * Upload additional document for application
 */
router.post(
  '/:applicationId/documents',
  checkResourceOwnership('application'),
  uploadApplicationDocument.single('file'),
  handleMulterError,
  validateDto(UploadDocumentSchema),
  candidateController.uploadDocument
)

/**
 * DELETE /api/applications/candidate/:id
 * Withdraw application
 */
router.delete(
  '/:applicationId',
  checkResourceOwnership('application'),
  validateDto(UUIDParamSchema),
  candidateController.withdrawApplication
)

/**
 * GET /api/applications/candidate/:applicationId/stage/:stageId
 * Get single stage details
 */
router.get(
  '/:applicationId/stage/:stageId',
  checkResourceOwnership('application'),
  validateDto({ params: StageFeedbackParamsSchema }),
  candidateController.getStageDetails
)

/**
 * PATCH /api/applications/candidate/:applicationId/stage/:stageId/accept
 * Candidate accepts a stage
 */
router.patch(
  '/:applicationId/stage/:stageId/accept',
  checkResourceOwnership('application'),
  validateDto({ params: StageFeedbackParamsSchema }),
  candidateController.acceptStage
)

/**
 * PATCH /api/applications/candidate/:applicationId/stage/:stageId/decline
 * Candidate declines a stage
 */
router.patch(
  '/:applicationId/stage/:stageId/decline',
  checkResourceOwnership('application'),
  validateDto(StageDeclineSchema),
  candidateController.declineStage
)

export default router
