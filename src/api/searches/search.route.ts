import { Router } from 'express'
import { searchJobsController } from './search.controller'
import { suggestionsController } from './suggestions.controller'
import { eventsController } from './events.controller'
import { searchCompaniesController, companiesSuggestionsController } from './company-search.controller'
import {
  getRecentlyViewedJobsValidator,
  getPopularJobsValidator,
  getTrendingJobsValidator,
  getPopularJobsByLocationValidator
} from '../../shared/validators/enhanced-features.validator'
import {
  searchJobsValidator,
  suggestionsValidator,
  searchCompaniesValidator,
  companiesSuggestionsValidator,
  skillsSuggestionValidator,
  categoriesSuggestionValidator
} from './search.dto'
import { getSearchHistoryValidator, searchHistoryIdValidator } from './search-history.validator'
import { authenticateAccessToken } from '../../middleware/verify.middleware'
import { authenticatedUser } from '../../middleware/authorize.middleware'
import { apiRateLimit, strictRateLimit } from '../../middleware/rate-limit.middleware'
import { envConfig } from '../../config/getEnvConfig'

// Cache headers middleware for public endpoints
const cacheHeaders = (maxAge: number) => (req: any, res: any, next: any) => {
  res.set('Cache-Control', `public, max-age=${maxAge}`)
  next()
}

// Controllers for enhanced search features
import { PopularJobsController } from './popular-jobs.controller'
import { RecentlyViewedController } from './recently-viewed.controller'
import { SearchHistoryController } from './search-history.controller'
import { jobController } from '../jobs/job.controller'
import { skillsSuggestionController } from './skills-suggestions.controller'
import { categoriesSuggestionController } from './categories-suggestions.controller'

// Validators from jobs module
import { filterJobsValidator } from '../jobs/job.validator'

// Import moved utilities from recommendations module

const router = Router()

// Feature flag middleware for gradual rollout
const gradualRolloutMiddleware = (featureFlag: string, defaultEnabled = false) => {
  return (req: any, res: any, next: any) => {
    const flagValue = envConfig[featureFlag as keyof typeof envConfig] || defaultEnabled

    // Simple percentage-based rollout (0-100)
    if (typeof flagValue === 'number' && flagValue < 100) {
      const userHash = simpleHash(req.ip || req.user?.id || 'anonymous')
      const rolloutPercentage = userHash % 100

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
    hash = (hash << 5) - hash + char
    hash = hash & 0xffffffff // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Search routes - Centralized search functionality
 *
 * Public routes (no auth required):
 *  - GET  /api/search/jobs (enhanced job search with ES)
 *  - GET  /api/search/suggestions (autocomplete suggestions)
 *  - POST /api/search/events (log search events)
 *  - GET  /api/search/companies (company search)
 *  - GET  /api/search/companies/suggestions (company autocomplete)
 *  - GET  /api/search/skills/suggestions (skills autocomplete)
 *  - GET  /api/search/categories/suggestions (categories autocomplete)
 *
 * Protected routes (auth required):
 *  - GET    /api/search/history (user's search history)
 *  - DELETE /api/search/history (clear search history)
 *  - DELETE /api/search/history/:id (delete specific history entry)
 *
 *
 * Job discovery routes (moved from jobs module):
 *  - GET  /api/search/jobs/list (basic job listing)
 *  - GET  /api/search/jobs/featured (featured jobs)
 *  - GET  /api/search/jobs/popular (popular jobs by views)
 *  - GET  /api/search/jobs/trending (trending jobs)
 *  - GET  /api/search/jobs/popular-by-location (popular by location)
 *  - GET  /api/search/jobs/latest (latest jobs)
 *  - GET  /api/search/jobs/recently-viewed (user's viewed jobs)
 *  - DELETE /api/search/jobs/recently-viewed (clear viewed history)
 *  - GET  /api/search/jobs/recently-viewed/stats (viewing stats)
 */

// ==================== JOB DISCOVERY ROUTES ====================
// Moved from jobs module for centralized search functionality

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
router.get('/jobs/popular', cacheHeaders(300), getPopularJobsValidator, PopularJobsController.getPopularJobs)

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

// ==================== USER-SPECIFIC JOB ROUTES ====================
// User behavior and personalization features

/**
 * GET /api/search/jobs/recently-viewed
 * Get jobs recently viewed by authenticated user
 */
router.get(
  '/jobs/recently-viewed',
  authenticateAccessToken,
  getRecentlyViewedJobsValidator,
  RecentlyViewedController.getRecentlyViewedJobs
)

/**
 * DELETE /api/search/jobs/recently-viewed
 * Clear recently viewed jobs history
 */
router.delete('/jobs/recently-viewed', authenticateAccessToken, RecentlyViewedController.clearRecentlyViewed)

/**
 * GET /api/search/jobs/recently-viewed/stats
 * Get viewing statistics for user
 */
router.get('/jobs/recently-viewed/stats', authenticateAccessToken, RecentlyViewedController.getViewingStats)

// ==================== CORE SEARCH ROUTES ====================
// Main search functionality with Elasticsearch

router.get('/jobs', apiRateLimit, searchJobsValidator, searchJobsController)
router.get('/suggestions', strictRateLimit, suggestionsValidator, suggestionsController)
router.post('/events', apiRateLimit, eventsController)

// ==================== USER SEARCH HISTORY ====================
// Recent searches and popular queries

/**
 * GET /api/search/history
 * Get user's search history with pagination
 */
router.get('/history', authenticateAccessToken, getSearchHistoryValidator, SearchHistoryController.getSearchHistory)

/**
 * DELETE /api/search/history
 * Clear all user's search history
 */
router.delete('/history', authenticateAccessToken, SearchHistoryController.clearSearchHistory)

/**
 * DELETE /api/search/history/:id
 * Delete a specific search history entry
 */
router.delete(
  '/history/:id',
  authenticateAccessToken,
  searchHistoryIdValidator,
  SearchHistoryController.deleteSearchHistoryEntry
)

// ==================== COMPANY SEARCH ROUTES ====================
// Company discovery and search

router.get('/companies', apiRateLimit, searchCompaniesValidator, searchCompaniesController)
router.get('/companies/suggestions', strictRateLimit, companiesSuggestionsValidator, companiesSuggestionsController)

// ==================== SKILLS & CATEGORIES AUTOCOMPLETE ====================
// Skills and categories suggestions for enhanced search UX

router.get('/skills/suggestions', strictRateLimit, skillsSuggestionValidator, skillsSuggestionController)
router.get('/categories/suggestions', strictRateLimit, categoriesSuggestionValidator, categoriesSuggestionController)

export default router
