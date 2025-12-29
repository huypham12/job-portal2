import { Router } from 'express'
import { jobController } from './job.controller'
import { ElasticsearchSyncMiddleware } from '@/middleware/elasticsearch-sync.middleware'
import { RecentlyViewedController } from '../searches/recently-viewed.controller'
import { PopularJobsController } from '../searches/popular-jobs.controller'
import { JobRecommendationsController } from '../searches/job-recommendations.controller'
import { authenticateAccessToken } from '@/middleware/verify.middleware'
import { recruiter } from '@/middleware/authorize.middleware'
import { checkResourceOwnership } from '@/middleware/resource-ownership.middleware'
import {
  createJobValidator,
  updateJobValidator,
  updateJobStatusValidator,
  publishJobValidator,
  bulkJobActionsValidator,
  bulkExtendExpiryValidator,
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
 * @deprecated Moved to /api/search/jobs/list - will be removed in v2.0
 */
router.get(
  '/',
  filterJobsValidator,
  (req, res, next) => {
    res.set('Deprecation', 'true')
    res.set('Link', '</api/search/jobs/list>; rel="successor"')
    res.set('X-Migration-Info', 'This endpoint has been moved to /api/search/jobs/list. Please update your client.')
    next()
  },
  jobController.getJobs
)

/**
 * GET /api/jobs/featured
 * Get featured jobs
 * @deprecated Moved to /api/search/jobs/featured - will be removed in v2.0
 */
router.get(
  '/featured',
  (req, res, next) => {
    res.set('Deprecation', 'true')
    res.set('Link', '</api/search/jobs/featured>; rel="successor"')
    res.set('X-Migration-Info', 'This endpoint has been moved to /api/search/jobs/featured. Please update your client.')
    next()
  },
  jobController.getFeaturedJobs
)

/**
 * GET /api/jobs/popular
 * Get popular jobs based on view counts
 * @deprecated Moved to /api/search/jobs/popular - will be removed in v2.0
 */
router.get(
  '/popular',
  (req, res, next) => {
    res.set('Deprecation', 'true')
    res.set('Link', '</api/search/jobs/popular>; rel="successor"')
    res.set('X-Migration-Info', 'This endpoint has been moved to /api/search/jobs/popular. Please update your client.')
    next()
  },
  getPopularJobsValidator,
  PopularJobsController.getPopularJobs
)

/**
 * GET /api/jobs/trending
 * Get trending jobs with high growth rate
 * @deprecated Moved to /api/search/jobs/trending - will be removed in v2.0
 */
router.get(
  '/trending',
  (req, res, next) => {
    res.set('Deprecation', 'true')
    res.set('Link', '</api/search/jobs/trending>; rel="successor"')
    res.set('X-Migration-Info', 'This endpoint has been moved to /api/search/jobs/trending. Please update your client.')
    next()
  },
  getTrendingJobsValidator,
  PopularJobsController.getTrendingJobs
)

/**
 * GET /api/jobs/popular-by-location
 * Get popular jobs grouped by location
 * @deprecated Moved to /api/search/jobs/popular-by-location - will be removed in v2.0
 */
router.get(
  '/popular-by-location',
  (req, res, next) => {
    res.set('Deprecation', 'true')
    res.set('Link', '</api/search/jobs/popular-by-location>; rel="successor"')
    res.set(
      'X-Migration-Info',
      'This endpoint has been moved to /api/search/jobs/popular-by-location. Please update your client.'
    )
    next()
  },
  getPopularJobsByLocationValidator,
  PopularJobsController.getPopularJobsByLocation
)

/**
 * GET /api/jobs/latest
 * Get latest jobs
 * @deprecated Moved to /api/search/jobs/latest - will be removed in v2.0
 */
router.get(
  '/latest',
  (req, res, next) => {
    res.set('Deprecation', 'true')
    res.set('Link', '</api/search/jobs/latest>; rel="successor"')
    res.set('X-Migration-Info', 'This endpoint has been moved to /api/search/jobs/latest. Please update your client.')
    next()
  },
  jobController.getLatestJobs
)

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
 * @deprecated Moved to /api/search/jobs/recently-viewed - will be removed in v2.0
 */
router.get(
  '/recently-viewed',
  (req, res, next) => {
    res.set('Deprecation', 'true')
    res.set('Link', '</api/search/jobs/recently-viewed>; rel="successor"')
    res.set(
      'X-Migration-Info',
      'This endpoint has been moved to /api/search/jobs/recently-viewed. Please update your client.'
    )
    next()
  },
  authenticateAccessToken,
  getRecentlyViewedJobsValidator,
  RecentlyViewedController.getRecentlyViewedJobs
)

/**
 * DELETE /api/jobs/recently-viewed
 * Clear recently viewed jobs history
 * @deprecated Moved to /api/search/jobs/recently-viewed - will be removed in v2.0
 */
router.delete(
  '/recently-viewed',
  (req, res, next) => {
    res.set('Deprecation', 'true')
    res.set('Link', '</api/search/jobs/recently-viewed>; rel="successor"')
    res.set(
      'X-Migration-Info',
      'This endpoint has been moved to /api/search/jobs/recently-viewed. Please update your client.'
    )
    next()
  },
  authenticateAccessToken,
  RecentlyViewedController.clearRecentlyViewed
)

/**
 * GET /api/jobs/recently-viewed/stats
 * Get viewing statistics for user
 * @deprecated Moved to /api/search/jobs/recently-viewed/stats - will be removed in v2.0
 */
router.get(
  '/recently-viewed/stats',
  (req, res, next) => {
    res.set('Deprecation', 'true')
    res.set('Link', '</api/search/jobs/recently-viewed/stats>; rel="successor"')
    res.set(
      'X-Migration-Info',
      'This endpoint has been moved to /api/search/jobs/recently-viewed/stats. Please update your client.'
    )
    next()
  },
  authenticateAccessToken,
  RecentlyViewedController.getViewingStats
)

/**
 * GET /api/jobs/recommendations
 * Get personalized job recommendations
 * @deprecated Moved to /api/search/jobs/recommendations - will be removed in v2.0
 */
router.get(
  '/recommendations',
  (req, res, next) => {
    res.set('Deprecation', 'true')
    res.set('Link', '</api/search/jobs/recommendations>; rel="successor"')
    res.set(
      'X-Migration-Info',
      'This endpoint has been moved to /api/search/jobs/recommendations. Please update your client.'
    )
    next()
  },
  authenticateAccessToken,
  getJobRecommendationsValidator,
  JobRecommendationsController.getRecommendations
)

/**
 * GET /api/jobs/recommendations/for-you
 * Get "For You" personalized recommendations
 * @deprecated Moved to /api/search/jobs/recommendations/for-you - will be removed in v2.0
 */
router.get(
  '/recommendations/for-you',
  (req, res, next) => {
    res.set('Deprecation', 'true')
    res.set('Link', '</api/search/jobs/recommendations/for-you>; rel="successor"')
    res.set(
      'X-Migration-Info',
      'This endpoint has been moved to /api/search/jobs/recommendations/for-you. Please update your client.'
    )
    next()
  },
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
router.post(
  '/',
  authenticateAccessToken,
  recruiter,
  checkResourceOwnership('company'),
  createJobValidator,
  jobController.createJob
)

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
 * PATCH /api/jobs/:id/publish
 * Publish a draft job (change status to approved)
 */
router.patch(
  '/:id/publish',
  authenticateAccessToken,
  recruiter,
  checkResourceOwnership('job'),
  publishJobValidator,
  jobController.publishJob
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
