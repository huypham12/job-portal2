import { Router } from 'express'
import { jobController } from './job.controller'
import { ElasticsearchSyncMiddleware } from '@/middleware/elasticsearch-sync.middleware'
import { RecentlyViewedController } from './recently-viewed.controller'
import { PopularJobsController } from './popular-jobs.controller'
import { JobRecommendationsController } from './job-recommendations.controller'
import { authenticateAccessToken } from '@/middleware/verify.middleware'
import { recruiter } from '@/middleware/authorize.middleware'
import {
  createJobValidator,
  updateJobValidator,
  updateJobStatusValidator,
  publishJobValidator,
  bulkJobActionsValidator,
  bulkExtendExpiryValidator,
  suggestedCandidatesValidator,
  filterJobsValidator,
  myJobsValidator,
  jobIdValidator
} from './job.validator'
import {
  getRecentlyViewedJobsValidator,
  getPopularJobsValidator,
  getTrendingJobsValidator,
  getPopularJobsByLocationValidator,
  getJobRecommendationsValidator,
  getForYouRecommendationsValidator
} from '../../shared/validators/enhanced-features.validator'

const router = Router()

// DISABLED: Elasticsearch sync middleware - now using service-layer sync
// router.use(ElasticsearchSyncMiddleware.getMiddleware())

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
 * GET /api/jobs/popular
 * Get popular jobs based on view counts
 */
router.get('/popular', getPopularJobsValidator, PopularJobsController.getPopularJobs)

/**
 * GET /api/jobs/trending
 * Get trending jobs with high growth rate
 */
router.get('/trending', getTrendingJobsValidator, PopularJobsController.getTrendingJobs)

/**
 * GET /api/jobs/popular-by-location
 * Get popular jobs grouped by location
 */
router.get('/popular-by-location', getPopularJobsByLocationValidator, PopularJobsController.getPopularJobsByLocation)

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

// ==================== AUTHENTICATED USER ROUTES ====================

/**
 * GET /api/jobs/recently-viewed
 * Get jobs recently viewed by authenticated user
 */
router.get(
  '/recently-viewed',
  authenticateAccessToken,
  getRecentlyViewedJobsValidator,
  RecentlyViewedController.getRecentlyViewedJobs
)

/**
 * DELETE /api/jobs/recently-viewed
 * Clear recently viewed jobs history
 */
router.delete('/recently-viewed', authenticateAccessToken, RecentlyViewedController.clearRecentlyViewed)

/**
 * GET /api/jobs/recently-viewed/stats
 * Get viewing statistics for user
 */
router.get('/recently-viewed/stats', authenticateAccessToken, RecentlyViewedController.getViewingStats)

/**
 * GET /api/jobs/recommendations
 * Get personalized job recommendations
 */
router.get(
  '/recommendations',
  authenticateAccessToken,
  getJobRecommendationsValidator,
  JobRecommendationsController.getRecommendations
)

/**
 * GET /api/jobs/recommendations/for-you
 * Get "For You" personalized recommendations
 */
router.get(
  '/recommendations/for-you',
  authenticateAccessToken,
  getForYouRecommendationsValidator,
  JobRecommendationsController.getForYouRecommendations
)

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
 * GET /api/jobs/:id/suggested-candidates
 * Get suggested candidates for a job
 */
router.get(
  '/:id/suggested-candidates',
  authenticateAccessToken,
  recruiter,
  suggestedCandidatesValidator,
  jobController.getSuggestedCandidates
)

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
 * PATCH /api/jobs/:id/publish
 * Publish a draft job (change status to approved)
 */
router.patch('/:id/publish', authenticateAccessToken, recruiter, publishJobValidator, jobController.publishJob)

/**
 * POST /api/jobs/bulk-actions
 * Perform bulk actions on multiple jobs (close, delete, publish)
 */
router.post('/bulk-actions', authenticateAccessToken, recruiter, bulkJobActionsValidator, jobController.bulkJobActions)

/**
 * PATCH /api/jobs/bulk-extend
 * Bulk extend job expiry dates
 */
router.patch(
  '/bulk-extend',
  authenticateAccessToken,
  recruiter,
  bulkExtendExpiryValidator,
  jobController.bulkExtendExpiry
)

/**
 * DELETE /api/jobs/:id
 * Soft delete a job posting
 */
router.delete('/:id', authenticateAccessToken, recruiter, jobIdValidator, jobController.deleteJob)

export default router
