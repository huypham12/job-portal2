import { Router } from 'express'
import { ConnectionInterestController } from './connection-interest.controller'
import { validateDto } from '@/shared/middleware/validateDto.middleware'
import {
  CreateInterestSchema,
  GetInterestsSchema,
  InterestIdSchema,
  RespondInterestSchema
} from './connection-interest.validator'
import { authenticateAccessToken } from '@/shared/middleware/verify.middleware'
import { recruiter, candidate, authenticatedUser } from '@/shared/middleware/authorize.middleware'

const router = Router()
const connectionInterestController = new ConnectionInterestController()

/**
 * All routes require authentication
 */
router.use(authenticateAccessToken)

/**
 * POST /api/connection-interests
 * Create a new connection interest (Recruiter only)
 */
router.post('/', recruiter, validateDto(CreateInterestSchema), connectionInterestController.createInterest)

/**
 * GET /api/connection-interests
 * Get list of connection interests with filters (Both roles)
 */
router.get('/', authenticatedUser, validateDto(GetInterestsSchema), connectionInterestController.getInterests)

/**
 * GET /api/connection-interests/stats
 * Get connection interest statistics (Both roles)
 */
router.get('/stats', authenticatedUser, connectionInterestController.getStats)

/**
 * GET /api/connection-interests/:id
 * Get connection interest by ID (Both roles)
 */
router.get('/:id', authenticatedUser, validateDto(InterestIdSchema), connectionInterestController.getInterestById)

/**
 * PATCH /api/connection-interests/:id/respond
 * Respond to connection interest (accept/reject) - Candidate only
 */
router.patch(
  '/:id/respond',
  candidate,
  validateDto(RespondInterestSchema),
  connectionInterestController.respondToInterest
)

/**
 * DELETE /api/connection-interests/:id
 * Delete connection interest (Recruiter only)
 */
router.delete('/:id', recruiter, validateDto(InterestIdSchema), connectionInterestController.deleteInterest)

export default router

