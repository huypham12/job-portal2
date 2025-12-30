import { Router } from 'express'
import { matchCandidatesController, matchJobsController } from './matching.controller'
import { authenticateAccessToken, verifiedUserValidator } from '../../middleware/verify.middleware'
import { checkResourceOwnership } from '../../middleware/resource-ownership.middleware'
import { apiRateLimit } from '../../middleware/rate-limit.middleware'

const router = Router()

// GET /api/matching/job/:jobId/candidates
// Chỉ Recruiter sở hữu job mới có thể xem candidates phù hợp
router.get(
  '/job/:jobId/candidates',
  apiRateLimit,
  authenticateAccessToken,
  verifiedUserValidator,
  checkResourceOwnership('job'),
  matchCandidatesController
)

// GET /api/matching/profile/:profileId/jobs
// Chỉ Candidate sở hữu profile mới có thể xem jobs phù hợp
router.get(
  '/profile/:profileId/jobs',
  apiRateLimit,
  authenticateAccessToken,
  verifiedUserValidator,
  checkResourceOwnership('profile'),
  matchJobsController
)

export default router
