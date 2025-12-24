import { Router } from 'express'
import { searchJobsController } from './search.controller'
import { suggestionsController } from './suggestions.controller'
import { eventsController } from './events.controller'

/**
 * Search routes:
 *  - GET  /api/search/jobs
 *  - GET  /api/search/suggestions
 *  - POST /api/events
 *
 * Controller functions handle validation and responses.
 */
const router = Router()

router.get('/jobs', searchJobsController)
router.get('/suggestions', suggestionsController)
router.post('/events', eventsController)

export default router
