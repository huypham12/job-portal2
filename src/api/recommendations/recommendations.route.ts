import { Router } from 'express'
import { recommendationsController } from './recommendations.controller'
import { authenticateAccessToken } from '../../middleware/verify.middleware'
import { checkResourceOwnership } from '../../middleware/resource-ownership.middleware'
import {
  getCandidateRecommendationsValidator,
  getRecruiterRecommendationsValidator
} from './recommendations.validator'
import { rolloutMetricsMiddleware } from '../../shared/utils/rollout-monitoring.util'

const router = Router()

/**
 * GET /api/recommendations/for-candidate
 * Get personalized job recommendations for authenticated candidate
 */
router.get(
  '/for-candidate',
  rolloutMetricsMiddleware('recommendations_candidate'),
  authenticateAccessToken,
  getCandidateRecommendationsValidator,
  recommendationsController.getCandidateRecommendations
)

/**
 * GET /api/recommendations/for-recruiter
 * Get candidate recommendations for recruiter's jobs
 */
router.get(
  '/for-recruiter',
  rolloutMetricsMiddleware('recommendations_recruiter'),
  authenticateAccessToken,
  checkResourceOwnership('company'),
  getRecruiterRecommendationsValidator,
  recommendationsController.getRecruiterRecommendations
)

export default router
