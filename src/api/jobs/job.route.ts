import { Router } from 'express'
import { jobController } from './job.controller'
import { authenticateAccessToken } from '@/shared/middleware/verify.middleware'
import { recruiter } from '@/shared/middleware/authorize.middleware'
import {
  createJobValidator,
  updateJobValidator,
  updateJobStatusValidator,
  filterJobsValidator,
  myJobsValidator,
  jobIdValidator
} from './job.validator'

const router = Router()

// ==================== PUBLIC ROUTES ====================
// These routes don't require authentication

/**
 * GET /api/jobs
 * Get all active jobs with filters (public)
 */
router.get('/', filterJobsValidator, jobController.getJobs)

/**
 * GET /api/jobs/featured
 * Get featured jobs
 */
router.get('/featured', jobController.getFeaturedJobs)

/**
 * GET /api/jobs/latest
 * Get latest jobs
 */
router.get('/latest', jobController.getLatestJobs)

/**
 * GET /api/jobs/:id/public
 * Get job detail (public view)
 */
router.get('/:id/public', jobIdValidator, jobController.getJobPublic)

/**
 * POST /api/jobs/:id/view
 * Track job view (can be anonymous or authenticated)
 */
router.post('/:id/view', jobIdValidator, jobController.trackView)

// ==================== EMPLOYER ROUTES ====================
// These routes require authentication and recruiter role

/**
 * POST /api/jobs
 * Create a new job posting
 */
router.post('/', authenticateAccessToken, recruiter, createJobValidator, jobController.createJob)

/**
 * GET /api/jobs/my-jobs
 * Get all jobs posted by the employer
 * Note: This must come before /:id routes to avoid conflict
 */
router.get('/my-jobs', authenticateAccessToken, recruiter, myJobsValidator, jobController.getMyJobs)

/**
 * GET /api/jobs/:id/manage
 * Get job details for management (employer view)
 */
router.get('/:id/manage', authenticateAccessToken, recruiter, jobIdValidator, jobController.getJobForManage)

/**
 * GET /api/jobs/:id/stats
 * Get job statistics (views, applications)
 */
router.get('/:id/stats', authenticateAccessToken, recruiter, jobIdValidator, jobController.getJobStats)

/**
 * PUT /api/jobs/:id
 * Update a job posting
 */
router.put('/:id', authenticateAccessToken, recruiter, updateJobValidator, jobController.updateJob)

/**
 * PATCH /api/jobs/:id/status
 * Update job status (open/close)
 */
router.patch('/:id/status', authenticateAccessToken, recruiter, updateJobStatusValidator, jobController.updateJobStatus)

/**
 * DELETE /api/jobs/:id
 * Soft delete a job posting
 */
router.delete('/:id', authenticateAccessToken, recruiter, jobIdValidator, jobController.deleteJob)

export default router
