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
  BulkUpdateSchema
} from './recruiter.validator'
import { authenticateAccessToken } from '@/middleware/verify.middleware'
import { recruiter } from '@/middleware/authorize.middleware'

const router = Router()
const recruiterController = new RecruiterApplicationController()

/**
 * All routes require authentication and recruiter role
 */
router.use(authenticateAccessToken, recruiter)

/**
 * GET /api/applications/job/:jobId
 * Get all applications for a specific job
 */
router.get('/job/:jobId', validateDto(GetApplicationsByJobSchema), recruiterController.getApplicationsByJob)

/**
 * GET /api/applications/job/:jobId/stats
 * Get application statistics for a job
 */
router.get('/job/:jobId/stats', validateDto(JobIdParamSchema), recruiterController.getJobApplicationStats)

/**
 * POST /api/applications/bulk-update
 * Bulk update multiple applications
 * Note: This must come before /:id routes to avoid conflict
 */
router.post('/bulk-update', validateDto(BulkUpdateSchema), recruiterController.bulkUpdateApplications)

/**
 * GET /api/applications/:id/cv
 * View detailed CV of an applicant
 */
router.get('/:id/cv', validateDto(ApplicationIdParamSchema), recruiterController.getApplicationCV)

/**
 * PATCH /api/applications/:id/status
 * Update application status
 */
router.patch('/:id/status', validateDto(UpdateStatusSchema), recruiterController.updateApplicationStatus)

/**
 * PATCH /api/applications/:id/stage
 * Update existing application stage
 */
router.patch('/:id/stage', validateDto(UpdateStageSchema), recruiterController.updateApplicationStage)

/**
 * POST /api/applications/:id/stage
 * Create new application stage (e.g., schedule interview)
 */
router.post('/:id/stage', validateDto(CreateStageSchema), recruiterController.createApplicationStage)

/**
 * POST /api/applications/:id/notes
 * Add internal notes to application
 */
router.post('/:id/notes', validateDto(AddNotesSchema), recruiterController.addApplicationNotes)

/**
 * POST /api/applications/:id/contact
 * Contact candidate via email/notification
 */
router.post('/:id/contact', validateDto(ContactCandidateSchema), recruiterController.contactCandidate)

export default router
