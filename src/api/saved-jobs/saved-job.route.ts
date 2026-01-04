import { Router } from 'express'
import { savedJobController } from './saved-job.controller'
import { authenticateAccessToken } from '@/middleware/verify.middleware'
import { candidate } from '@/middleware/authorize.middleware'
import { saveJobValidator, jobIdValidator, getSavedJobsValidator } from './saved-job.validator'

const router = Router()

// ==================== AUTHENTICATED ROUTES ====================
// All saved jobs routes require authentication

/**
 * POST /api/saved-jobs
 * Save a job to user's favorites
 * @access Private (Candidate only)
 */
router.post('/', authenticateAccessToken, candidate, saveJobValidator, savedJobController.saveJob)

/**
 * DELETE /api/saved-jobs/:jobId
 * Remove a job from user's favorites
 * @access Private (Candidate only)
 */
router.delete('/:jobId', authenticateAccessToken, candidate, jobIdValidator, savedJobController.unsaveJob)

/**
 * GET /api/saved-jobs
 * Get list of saved jobs with pagination and filters
 * @access Private (Candidate only)
 */
router.get('/', authenticateAccessToken, candidate, getSavedJobsValidator, savedJobController.getSavedJobs)

/**
 * GET /api/saved-jobs/check/:jobId
 * Check if a job is saved
 * @access Private (Candidate only)
 */
router.get('/check/:jobId', authenticateAccessToken, candidate, jobIdValidator, savedJobController.checkSaved)

export default router
