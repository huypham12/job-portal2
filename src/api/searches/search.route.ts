import { Router } from 'express'
import { searchJobsController } from './search.controller'
import { suggestionsController } from './suggestions.controller'
import { eventsController } from './events.controller'
import { RecentSearchesController } from './recent-searches.controller'
import {
  searchCompaniesController,
  companiesSuggestionsController,
  getPopularCompaniesController
} from './company-search.controller'
import {
  getRecentlyViewedJobsValidator,
  getPopularJobsValidator,
  getTrendingJobsValidator,
  getPopularJobsByLocationValidator,
  getJobRecommendationsValidator,
  getForYouRecommendationsValidator,
  getRecentSearchesValidator,
  deleteRecentSearchValidator,
  getPopularQueriesValidator
} from '../../shared/validators/enhanced-features.validator'
import {
  getCandidateRecommendationsValidator,
  getRecruiterRecommendationsValidator
} from '../recommendations/recommendations.validator'
import {
  searchJobsValidator,
  suggestionsValidator,
  searchCompaniesValidator,
  companiesSuggestionsValidator,
  getPopularCompaniesValidator
} from './search.dto'
import { authenticateAccessToken } from '../../middleware/verify.middleware'
import { authenticatedUser } from '../../middleware/authorize.middleware'
import { checkResourceOwnership } from '../../middleware/resource-ownership.middleware'
import { envConfig } from '../../config/getEnvConfig'

// Import moved controllers from jobs module
import { jobController } from '../jobs/job.controller'
import { PopularJobsController } from './popular-jobs.controller'
import { JobRecommendationsController } from './job-recommendations.controller'
import { RecentlyViewedController } from './recently-viewed.controller'

// Import moved controllers from recommendations module
import { recommendationsController } from '../recommendations/recommendations.controller'

// Import moved validators
import { filterJobsValidator } from '../jobs/job.validator'

// Import moved utilities from recommendations module
import { rolloutMetricsMiddleware } from '../../shared/utils/rollout-monitoring.util'

const router = Router()

// Feature flag middleware for gradual rollout
const gradualRolloutMiddleware = (featureFlag: string, defaultEnabled = false) => {
  return (req: any, res: any, next: any) => {
    const flagValue = envConfig[featureFlag as keyof typeof envConfig] || defaultEnabled

    // Simple percentage-based rollout (0-100)
    if (typeof flagValue === 'number' && flagValue < 100) {
      const userHash = simpleHash(req.ip || req.user?.id || 'anonymous')
      const rolloutPercentage = (userHash % 100)

      if (rolloutPercentage >= flagValue) {
        // User not in rollout group, continue to next middleware (old endpoint)
        return next('route')
      }
    }

    // User in rollout group or flag fully enabled
    next()
  }
}

// Simple hash function for consistent user bucketing
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Search routes:
 * Public routes:
 *  - GET  /api/search/jobs (search jobs - public)
 *  - GET  /api/search/suggestions (search suggestions - public)
 *  - POST /api/events (log search events - public)
 *  - GET  /api/search/popular-queries (popular queries - public)
 *  - GET  /api/search/companies (search companies - public)
 *  - GET  /api/search/companies/suggestions (company suggestions - public)
 *  - GET  /api/search/companies/popular (popular companies - public)
 *
 * Authenticated routes (require login):
 *  - GET  /api/search/recent (get recent searches)
 *  - DELETE /api/search/recent/:id (delete specific recent search)
 *  - DELETE /api/search/recent (clear all recent searches)
 *  - GET  /api/search/recommendations/for-candidate (job recommendations for candidates)
 *  - GET  /api/search/recommendations/for-recruiter (candidate recommendations for recruiters)
 *
 * Controller functions handle validation and responses.
 */

// ==================== MOVED FROM JOB MODULE ====================
// These endpoints were moved from job.route.ts to centralize all search functionality

/**
 * GET /api/search/jobs/list
 * Get all active jobs with basic filters (moved from /api/jobs)
 */
router.get('/jobs/list', filterJobsValidator, jobController.getJobs)

/**
 * GET /api/search/jobs/featured
 * Get featured jobs (moved from /api/jobs/featured)
 */
router.get('/jobs/featured', jobController.getFeaturedJobs)

/**
 * GET /api/search/jobs/popular
 * Get popular jobs based on view counts (moved from /api/jobs/popular)
 */
router.get('/jobs/popular', getPopularJobsValidator, PopularJobsController.getPopularJobs)

/**
 * GET /api/search/jobs/trending
 * Get trending jobs with high growth rate (moved from /api/jobs/trending)
 */
router.get('/jobs/trending', getTrendingJobsValidator, PopularJobsController.getTrendingJobs)

/**
 * GET /api/search/jobs/popular-by-location
 * Get popular jobs grouped by location (moved from /api/jobs/popular-by-location)
 */
router.get(
  '/jobs/popular-by-location',
  getPopularJobsByLocationValidator,
  PopularJobsController.getPopularJobsByLocation
)

/**
 * GET /api/search/jobs/latest
 * Get latest jobs (moved from /api/jobs/latest)
 */
router.get('/jobs/latest', jobController.getLatestJobs)

// ==================== AUTHENTICATED JOB ROUTES (MOVED) ====================

/**
 * GET /api/search/jobs/recently-viewed
 * Get jobs recently viewed by authenticated user (moved from /api/jobs/recently-viewed)
 */
router.get(
  '/jobs/recently-viewed',
  authenticateAccessToken,
  getRecentlyViewedJobsValidator,
  RecentlyViewedController.getRecentlyViewedJobs
)

/**
 * DELETE /api/search/jobs/recently-viewed
 * Clear recently viewed jobs history (moved from /api/jobs/recently-viewed)
 */
router.delete('/jobs/recently-viewed', authenticateAccessToken, RecentlyViewedController.clearRecentlyViewed)

/**
 * GET /api/search/jobs/recently-viewed/stats
 * Get viewing statistics for user (moved from /api/jobs/recently-viewed/stats)
 */
router.get('/jobs/recently-viewed/stats', authenticateAccessToken, RecentlyViewedController.getViewingStats)

/**
 * GET /api/search/jobs/recommendations
 * Get personalized job recommendations (moved from /api/jobs/recommendations)
 */
router.get(
  '/jobs/recommendations',
  authenticateAccessToken,
  getJobRecommendationsValidator,
  JobRecommendationsController.getRecommendations
)

/**
 * GET /api/search/jobs/recommendations/for-you
 * Get "For You" personalized recommendations (moved from /api/jobs/recommendations/for-you)
 */
router.get(
  '/jobs/recommendations/for-you',
  authenticateAccessToken,
  getForYouRecommendationsValidator,
  JobRecommendationsController.getForYouRecommendations
)

// ==================== EXISTING SEARCH ROUTES ====================

router.get('/jobs', searchJobsValidator, searchJobsController)
router.get('/suggestions', suggestionsValidator, suggestionsController)
router.post('/events', eventsController)

// Recent searches routes - require authentication
router.get(
  '/recent',
  authenticateAccessToken,
  authenticatedUser,
  getRecentSearchesValidator,
  RecentSearchesController.getRecentSearches
)
router.delete(
  '/recent/:id',
  authenticateAccessToken,
  authenticatedUser,
  deleteRecentSearchValidator,
  RecentSearchesController.deleteRecentSearch
)
router.delete('/recent', authenticateAccessToken, authenticatedUser, RecentSearchesController.clearRecentSearches)
router.get('/popular-queries', getPopularQueriesValidator, RecentSearchesController.getPopularQueries)

// Company search routes
router.get('/companies', searchCompaniesValidator, searchCompaniesController)
router.get('/companies/suggestions', companiesSuggestionsValidator, companiesSuggestionsController)
router.get('/companies/popular', getPopularCompaniesValidator, getPopularCompaniesController)

// ==================== RECOMMENDATIONS ROUTES (MOVED) ====================

/**
 * GET /api/search/recommendations/for-candidate
 * Get personalized job recommendations for authenticated candidate
 */
router.get(
  '/recommendations/for-candidate',
  rolloutMetricsMiddleware('recommendations_candidate'),
  authenticateAccessToken,
  getCandidateRecommendationsValidator,
  recommendationsController.getCandidateRecommendations
)

/**
 * GET /api/search/recommendations/for-recruiter
 * Get candidate recommendations for recruiter's jobs
 */
router.get(
  '/recommendations/for-recruiter',
  rolloutMetricsMiddleware('recommendations_recruiter'),
  authenticateAccessToken,
  checkResourceOwnership('company'),
  getRecruiterRecommendationsValidator,
  recommendationsController.getRecruiterRecommendations
)

export default router
