import { Request, Response } from 'express'
import { recommendationsService } from './recommendations.service'
import { ApiResponse } from '../../shared/helpers/api-response.helper'

/**
 * Recommendations Controller
 * Handles personalized recommendations for candidates and recruiters
 */
export class RecommendationsController {
  /**
   * GET /api/recommendations/for-candidate
   * Get personalized job recommendations for authenticated candidate
   */
  static async getCandidateRecommendations(req: Request, res: Response) {
    try {
      const userId = req.decoded_authorization?.user_id
      const limit = parseInt(req.query.limit as string) || 20
      const experimentId = req.query.experiment_id as string

      if (!userId) {
        return ApiResponse.unauthorized(res, 'Authentication required')
      }

      const recommendations = await recommendationsService.getCandidateRecommendations(
        userId,
        limit,
        experimentId
      )

      return ApiResponse.success(res, {
        recommendations,
        experiment_id: experimentId,
        total: recommendations.length
      })
    } catch (error) {
      console.error('Error getting candidate recommendations:', error)
      return ApiResponse.error(res, 'Failed to get recommendations')
    }
  }

  /**
   * GET /api/recommendations/for-recruiter
   * Get candidate recommendations for recruiter's jobs
   */
  static async getRecruiterRecommendations(req: Request, res: Response) {
    try {
      const userId = req.decoded_authorization?.user_id
      const companyId = req.query.company_id as string
      const limit = parseInt(req.query.limit as string) || 10
      const experimentId = req.query.experiment_id as string

      if (!userId) {
        return ApiResponse.unauthorized(res, 'Authentication required')
      }

      const recommendations = await recommendationsService.getRecruiterRecommendations(
        userId,
        companyId,
        limit,
        experimentId
      )

      return ApiResponse.success(res, {
        recommendations,
        experiment_id: experimentId,
        total: recommendations.length
      })
    } catch (error) {
      console.error('Error getting recruiter recommendations:', error)
      return ApiResponse.error(res, 'Failed to get recommendations')
    }
  }
}

export const recommendationsController = RecommendationsController
