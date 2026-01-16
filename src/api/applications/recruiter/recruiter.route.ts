import { Router } from 'express'
import { RecruiterApplicationController } from './recruiter.controller'
import { validateDto } from '@/middleware/validateDto.middleware'
import {
  GetApplicationsByJobSchema,
  JobIdParamSchema,
  ApplicationIdParamSchema,
  UpdateStatusSchema,
  UpdateStageSchema,
  CreateStageSchema,
  AddNotesSchema,
  ContactCandidateSchema,
  BulkUpdateSchema,
  CompareCandidatesSchema,
  ShortlistCandidateSchema,
  GetShortlistedSchema,
  GetApplicationTimelineSchema,
  StageDecisionSchema
} from './recruiter.validator'
import { authenticateAccessToken } from '@/middleware/verify.middleware'
import { recruiter } from '@/middleware/authorize.middleware'
import { checkResourceOwnership } from '@/middleware/resource-ownership.middleware'

const router = Router()
const recruiterController = new RecruiterApplicationController()

/**
 * All routes require authentication and recruiter role
 */
router.use(authenticateAccessToken, recruiter)

/**
 * GET /api/applications/dashboard/stats
 * Get dashboard statistics overview for recruiter
 */
router.get('/dashboard/stats', recruiterController.getDashboardStats)

/**
 * GET /api/applications/job/:jobId
 * Get all applications for a specific job
 */
router.get(
  '/job/:jobId',
  checkResourceOwnership('job'),
  validateDto(GetApplicationsByJobSchema),
  recruiterController.getApplicationsByJob
)

/**
 * GET /api/applications/job/:jobId/stats
 * Get application statistics for a job
 */
router.get(
  '/job/:jobId/stats',
  checkResourceOwnership('job'),
  validateDto(JobIdParamSchema),
  recruiterController.getJobApplicationStats
)

/**
 * POST /api/applications/shortlist
 * Add or remove candidate from shortlist
 */
router.post('/shortlist', validateDto(ShortlistCandidateSchema), recruiterController.shortlistCandidate)

/**
 * GET /api/applications/shortlisted
 * Get shortlisted candidates
 */
router.get('/shortlisted', validateDto(GetShortlistedSchema), recruiterController.getShortlistedCandidates)

/**
 * POST /api/applications/compare
 * Compare multiple candidates side-by-side
 */
router.post('/compare', validateDto(CompareCandidatesSchema), recruiterController.compareCandidates)

/**
 * POST /api/applications/bulk-update
 * Bulk update multiple applications
 * Note: This must come before /:id routes to avoid conflict
 */
router.post('/bulk-update', validateDto(BulkUpdateSchema), recruiterController.bulkUpdateApplications)

/**
 * GET /api/applications/:id/timeline
 * Get full application timeline with all stages
 */
router.get(
  '/:applicationId/timeline',
  checkResourceOwnership('application'),
  validateDto(GetApplicationTimelineSchema),
  recruiterController.getApplicationTimeline
)

/**
 * GET /api/applications/:id/cv
 * View detailed CV of an applicant
 */
router.get(
  '/:applicationId/cv',
  checkResourceOwnership('application'),
  validateDto(ApplicationIdParamSchema),
  recruiterController.getApplicationCV
)

/**
 * GET /api/applications/:id/documents
 * Get application documents (recruiter view)
 */
router.get(
  '/:applicationId/documents',
  checkResourceOwnership('application'),
  validateDto(ApplicationIdParamSchema),
  recruiterController.getApplicationDocuments
)

/**
 * GET /api/applications/:id
 * Get full application details (Recruiter)
 * Keep this after more specific routes to avoid path conflicts.
 */
router.get(
  '/:applicationId',
  checkResourceOwnership('application'),
  validateDto(ApplicationIdParamSchema),
  recruiterController.getApplicationById
)

/**
 * PATCH /api/applications/:id/status
 * Update application status
 */
router.patch(
  '/:applicationId/status',
  checkResourceOwnership('application'),
  validateDto(UpdateStatusSchema),
  recruiterController.updateApplicationStatus
)

/**
 * PATCH /api/applications/:id/stage
 * Update existing application stage
 */
router.patch(
  '/:applicationId/stage',
  checkResourceOwnership('application'),
  validateDto(UpdateStageSchema),
  recruiterController.updateApplicationStage
)

/**
 * POST /api/applications/:id/stage
 * Create new application stage (e.g., schedule interview)
 */
router.post(
  '/:applicationId/stage',
  checkResourceOwnership('application'),
  validateDto(CreateStageSchema),
  recruiterController.createApplicationStage
)

/**
 * POST /api/applications/:id/notes
 * Add internal notes to application
 */
router.post(
  '/:applicationId/notes',
  checkResourceOwnership('application'),
  validateDto(AddNotesSchema),
  recruiterController.addApplicationNotes
)

/**
 * POST /api/applications/:id/contact
 * Contact candidate via email/notification
 */
router.post(
  '/:applicationId/contact',
  checkResourceOwnership('application'),
  validateDto(ContactCandidateSchema),
  recruiterController.contactCandidate
)

/**
 * POST /api/applications/:id/stage/:stageId/decision
 * Recruiter decision after a stage (create next stage or accept application)
 */
router.post(
  '/:applicationId/stage/:stageId/decision',
  checkResourceOwnership('application'),
  validateDto(StageDecisionSchema),
  recruiterController.makeStageDecision
)

export default router
