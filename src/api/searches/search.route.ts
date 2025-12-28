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
  getRecentSearchesValidator,
  deleteRecentSearchValidator,
  getPopularQueriesValidator
} from '../../shared/validators/enhanced-features.validator'
import {
  searchJobsValidator,
  suggestionsValidator,
  searchCompaniesValidator,
  companiesSuggestionsValidator,
  getPopularCompaniesValidator
} from './search.dto'

/**
 * Search routes:
 *  - GET  /api/search/jobs
 *  - GET  /api/search/suggestions
 *  - POST /api/events
 *  - GET  /api/search/recent
 *  - DELETE /api/search/recent/:id
 *  - DELETE /api/search/recent
 *  - GET  /api/search/popular-queries
 *  - GET  /api/search/companies
 *  - GET  /api/search/companies/suggestions
 *  - GET  /api/search/companies/popular
 *
 * Controller functions handle validation and responses.
 */
const router = Router()

router.get('/jobs', searchJobsValidator, searchJobsController)
router.get('/suggestions', suggestionsValidator, suggestionsController)
router.post('/events', eventsController)

// Recent searches routes
router.get('/recent', getRecentSearchesValidator, RecentSearchesController.getRecentSearches)
router.delete('/recent/:id', deleteRecentSearchValidator, RecentSearchesController.deleteRecentSearch)
router.delete('/recent', RecentSearchesController.clearRecentSearches)
router.get('/popular-queries', getPopularQueriesValidator, RecentSearchesController.getPopularQueries)

// Company search routes
router.get('/companies', searchCompaniesValidator, searchCompaniesController)
router.get('/companies/suggestions', companiesSuggestionsValidator, companiesSuggestionsController)
router.get('/companies/popular', getPopularCompaniesValidator, getPopularCompaniesController)

export default router
