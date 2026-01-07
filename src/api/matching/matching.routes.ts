import { Router } from 'express'
import { matchCandidatesController } from './matching.controller'
import { authenticateAccessToken, verifiedUserValidator } from '../../middleware/verify.middleware'
import { checkResourceOwnership } from '../../middleware/resource-ownership.middleware'
import { apiRateLimit } from '../../middleware/rate-limit.middleware'

const router = Router()

// GET /api/matching/job/:jobId/candidates
// Chỉ Recruiter sở hữu job mới có thể xem candidates phù hợp
router.get('/job/:jobId/candidates', matchCandidatesController)

// TEMP: Test route
router.get('/test', (req, res) => {
  console.log('🔍 [Test] Hit test route')
  return res.json({ message: 'Test route works', timestamp: new Date().toISOString() })
})

export default router
