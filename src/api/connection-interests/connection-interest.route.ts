import { Router } from 'express'
import * as ConnectionInterestController from './connection-interest.controller'
import {
  CreateInterestSchema,
  GetInterestsSchema,
  InterestIdSchema,
  RespondInterestSchema
} from './connection-interest.validator'
import { authenticateAccessToken } from '@/shared/middleware/verify.middleware'
import { authorize, recruiter, candidate } from '@/shared/middleware/authorize.middleware'
import { validateDto } from '@/shared/middleware/validateDto.middleware'
import { UserRole } from '@/shared/constants/enums/user.enum'

const router = Router()

// All routes require authentication
router.use(authenticateAccessToken)

/**
 * GET /api/connection-interests/stats
 * Get connection interest statistics
 * Accessible by: Candidate, Recruiter
 */
router.get(
  '/stats',
  authorize([UserRole.Candidate, UserRole.Recruiter]),
  ConnectionInterestController.getConnectionInterestStats
)

/**
 * POST /api/connection-interests
 * Create a new connection interest
 * Accessible by: Recruiter only
 */
router.post('/', recruiter, validateDto(CreateInterestSchema), ConnectionInterestController.createConnectionInterest)

/**
 * GET /api/connection-interests
 * Get connection interests list with filters
 * Accessible by: Candidate, Recruiter
 */
router.get(
  '/',
  authorize([UserRole.Candidate, UserRole.Recruiter]),
  validateDto(GetInterestsSchema),
  ConnectionInterestController.getConnectionInterests
)

/**
 * GET /api/connection-interests/:id
 * Get connection interest details by ID
 * Accessible by: Candidate, Recruiter
 */
router.get(
  '/:id',
  authorize([UserRole.Candidate, UserRole.Recruiter]),
  validateDto(InterestIdSchema),
  ConnectionInterestController.getConnectionInterestById
)

/**
 * PATCH /api/connection-interests/:id/respond
 * Respond to connection interest (accept/reject)
 * Accessible by: Candidate only
 */
router.patch(
  '/:id/respond',
  candidate,
  validateDto(RespondInterestSchema),
  ConnectionInterestController.respondToInterest
)

/**
 * DELETE /api/connection-interests/:id
 * Delete connection interest
 * Accessible by: Recruiter only
 */
router.delete('/:id', recruiter, validateDto(InterestIdSchema), ConnectionInterestController.deleteConnectionInterest)

export default router
