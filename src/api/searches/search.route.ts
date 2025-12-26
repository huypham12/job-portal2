import { Router } from 'express'
import { searchJobsController } from './search.controller'
import { suggestionsController } from './suggestions.controller'
import { eventsController } from './events.controller'
import { RecentSearchesController } from './recent-searches.controller'
import {
  getRecentSearchesValidator,
  deleteRecentSearchValidator,
  getPopularQueriesValidator
} from '../../shared/validators/enhanced-features.validator'
import { searchJobsValidator, suggestionsValidator } from './search.dto'

/**
 * Search routes:
 *  - GET  /api/search/jobs
 *  - GET  /api/search/suggestions
 *  - POST /api/events
 *  - GET  /api/search/recent
 *  - DELETE /api/search/recent/:id
 *  - DELETE /api/search/recent
 *  - GET  /api/search/popular-queries
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

export default router
