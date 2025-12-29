import { Router } from 'express'
import { matchCandidatesController, matchJobsController } from './matching.controller'
import { authenticateAccessToken, verifiedUserValidator } from '../../middleware/verify.middleware'
import { checkResourceOwnership } from '../../middleware/resource-ownership.middleware'

const router = Router()

// POST /api/matching/job/:jobId/candidates
// Chỉ Recruiter sở hữu job mới có thể xem candidates phù hợp
router.post(
  '/job/:jobId/candidates',
  authenticateAccessToken,
  verifiedUserValidator,
  checkResourceOwnership('job'),
  matchCandidatesController
)

// POST /api/matching/profile/:profileId/jobs
// Chỉ Candidate sở hữu profile mới có thể xem jobs phù hợp
router.post(
  '/profile/:profileId/jobs',
  authenticateAccessToken,
  verifiedUserValidator,
  checkResourceOwnership('profile'),
  matchJobsController
)

export default router
