import { Router } from 'express'
import { ApplicationController } from './application.controller'
import { validateDto } from '@/shared/middleware/validateDto.middleware'
import {
  CreateApplicationSchema,
  GetApplicationsSchema,
  UUIDParamSchema,
  UploadDocumentSchema,
  GetOffersSchema,
  AcceptOfferSchema,
  DeclineOfferSchema,
  CandidateFeedbackSchema
} from './application.validator'
import { authenticateAccessToken } from '@/shared/middleware/verify.middleware'
import { candidate } from '@/shared/middleware/authorize.middleware'
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
 * GET /api/applications/offers
 * Get list of offers for current candidate
 * Note: This must come before /:id routes to avoid conflict
 */
router.get('/offers', validateDto(GetOffersSchema), applicationController.getOffers)

/**
 * GET /api/applications/:id
 * Get application details by ID
 */
router.get('/:id', validateDto(UUIDParamSchema), applicationController.getApplicationById)

/**
 * GET /api/applications/:id/stages
 * Get application stages history
 */
router.get('/:id/stages', validateDto(UUIDParamSchema), applicationController.getApplicationStages)

/**
 * GET /api/applications/:id/documents
 * Get application documents
 */
router.get('/:id/documents', validateDto(UUIDParamSchema), applicationController.getApplicationDocuments)

/**
 * POST /api/applications/:id/documents
 * Upload additional document for application
 */
router.post(
  '/:id/documents',
  uploadApplicationDocument.single('file'),
  handleMulterError,
  validateDto(UploadDocumentSchema),
  applicationController.uploadDocument
)

/**
 * DELETE /api/applications/:id
 * Withdraw application
 */
router.delete('/:id', validateDto(UUIDParamSchema), applicationController.withdrawApplication)

/**
 * PATCH /api/applications/:id/offer/accept
 * Accept offer
 */
router.patch('/:id/offer/accept', validateDto(AcceptOfferSchema), applicationController.acceptOffer)

/**
 * PATCH /api/applications/:id/offer/decline
 * Decline offer
 */
router.patch('/:id/offer/decline', validateDto(DeclineOfferSchema), applicationController.declineOffer)

/**
 * PATCH /api/applications/:id/stages/:stageId/feedback
 * Add candidate feedback for interview stage
 */
router.patch(
  '/:id/stages/:stageId/feedback',
  validateDto(CandidateFeedbackSchema),
  applicationController.addCandidateFeedback
)

export default router
