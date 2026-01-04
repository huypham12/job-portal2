import { Router } from 'express'
import { jobController } from './job.controller'
import { ElasticsearchSyncMiddleware } from '@/middleware/elasticsearch-sync.middleware'
import { authenticateAccessToken } from '@/middleware/verify.middleware'
import { recruiter } from '@/middleware/authorize.middleware'
import { checkResourceOwnership } from '@/middleware/resource-ownership.middleware'
import {
  createJobValidator,
  updateJobValidator,
  updateJobStatusValidator,
  bulkJobActionsValidator,
  bulkExtendExpiryValidator,
  myJobsValidator,
  jobIdValidator
} from './job.validator'

const router = Router()

// DISABLED: Elasticsearch sync middleware - now using service-layer sync
router.use(ElasticsearchSyncMiddleware.getMiddleware())

// ==================== PUBLIC ROUTES ====================
// Note: Most public job routes have been moved to /api/search/jobs/*
// This file now focuses on core job management operations

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
// These routes require authentication and recruiter role for job management

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
// These routes require authentication and recruiter role for job management

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
router.get(
  '/:id/manage',
  authenticateAccessToken,
  recruiter,
  checkResourceOwnership('job'),
  jobIdValidator,
  jobController.getJobForManage
)

/**
 * GET /api/jobs/:id/stats
 * Get job statistics (views, applications)
 */
router.get(
  '/:id/stats',
  authenticateAccessToken,
  recruiter,
  checkResourceOwnership('job'),
  jobIdValidator,
  jobController.getJobStats
)

/**
 * PUT /api/jobs/:id
 * Update a job posting
 */
router.put(
  '/:id',
  authenticateAccessToken,
  recruiter,
  checkResourceOwnership('job'),
  updateJobValidator,
  jobController.updateJob
)

/**
 * PATCH /api/jobs/:id/status
 * Update job status (open/close)
 */
router.patch(
  '/:id/status',
  authenticateAccessToken,
  recruiter,
  checkResourceOwnership('job'),
  updateJobStatusValidator,
  jobController.updateJobStatus
)

/**
 * POST /api/jobs/bulk-actions
 * Perform bulk actions on multiple jobs (close, delete, publish)
 */
router.post(
  '/bulk-actions',
  authenticateAccessToken,
  recruiter,
  checkResourceOwnership('company'),
  bulkJobActionsValidator,
  jobController.bulkJobActions
)

/**
 * PATCH /api/jobs/bulk-extend
 * Bulk extend job expiry dates
 */
router.patch(
  '/bulk-extend',
  authenticateAccessToken,
  recruiter,
  checkResourceOwnership('company'),
  bulkExtendExpiryValidator,
  jobController.bulkExtendExpiry
)

/**
 * DELETE /api/jobs/:id
 * Soft delete a job posting
 */
router.delete(
  '/:id',
  authenticateAccessToken,
  recruiter,
  checkResourceOwnership('job'),
  jobIdValidator,
  jobController.deleteJob
)

export default router
