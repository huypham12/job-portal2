import { Request, Response } from 'express'
import { prisma } from '../../config/database.service'
import { ApiResponse } from '../../shared/helpers/api-response.helper'

/**
 * Search History Controller
 * Handles user's search history for personalization and UX
 */
export class SearchHistoryController {
  /**
   * GET /api/search/history
   * Get user's search history with pagination
   */
  static async getSearchHistory(req: Request, res: Response) {
    try {
      const userId = req.decoded_authorization?.user_id
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50) // Max 50 items
      const offset = parseInt(req.query.offset as string) || 0

      if (!userId) {
        return ApiResponse.unauthorized(res, 'Authentication required')
      }

      // Get profile ID from user ID
      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: { profiles: { select: { id: true } } }
      })
      const profileId = user?.profiles?.id

      if (!profileId) {
        return ApiResponse.notFound(res, 'User profile not found')
      }

      // Get search history with pagination
      const [searchHistory, totalCount] = await Promise.all([
        prisma.search_history.findMany({
          where: { profile_id: profileId },
          orderBy: { searched_at: 'desc' },
          take: limit,
          skip: offset,
          select: {
            id: true,
            search_query: true,
            search_type: true,
            searched_at: true,
            result_count: true,
            filters_used: true
          }
        }),
        prisma.search_history.count({
          where: { profile_id: profileId }
        })
      ])

      // Transform response to match frontend expectations
      const history = searchHistory.map((item) => ({
        id: item.id,
        query: item.search_query,
        type: item.search_type,
        searched_at: item.searched_at,
        result_count: item.result_count,
        filters: item.filters_used
      }))

      return ApiResponse.success(res, {
        history,
        pagination: {
          total: totalCount,
          limit,
          offset,
          has_more: offset + limit < totalCount
        }
      })
    } catch (error) {
      console.error('Error fetching search history:', error)
      return ApiResponse.error(res, 'Failed to fetch search history')
    }
  }

  /**
   * DELETE /api/search/history
   * Clear all user's search history
   */
  static async clearSearchHistory(req: Request, res: Response) {
    try {
      const userId = req.decoded_authorization?.user_id

      if (!userId) {
        return ApiResponse.unauthorized(res, 'Authentication required')
      }

      // Get profile ID from user ID
      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: { profiles: { select: { id: true } } }
      })
      const profileId = user?.profiles?.id

      if (!profileId) {
        return ApiResponse.notFound(res, 'User profile not found')
      }

      // Delete all search history for this user
      const deleteResult = await prisma.search_history.deleteMany({
        where: { profile_id: profileId }
      })

      return ApiResponse.success(res, {
        message: 'Search history cleared successfully',
        deleted_count: deleteResult.count
      })
    } catch (error) {
      console.error('Error clearing search history:', error)
      return ApiResponse.error(res, 'Failed to clear search history')
    }
  }

  /**
   * DELETE /api/search/history/:id
   * Delete a specific search history entry
   */
  static async deleteSearchHistoryEntry(req: Request, res: Response) {
    try {
      const userId = req.decoded_authorization?.user_id
      const historyId = req.params.id

      if (!userId) {
        return ApiResponse.unauthorized(res, 'Authentication required')
      }

      if (!historyId) {
        return ApiResponse.badRequest(res, 'History ID is required')
      }

      // Get profile ID from user ID
      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: { profiles: { select: { id: true } } }
      })
      const profileId = user?.profiles?.id

      if (!profileId) {
        return ApiResponse.notFound(res, 'User profile not found')
      }

      // Delete specific history entry (ensure it belongs to the user)
      const deleteResult = await prisma.search_history.deleteMany({
        where: {
          id: parseInt(historyId),
          profile_id: profileId
        }
      })

      if (deleteResult.count === 0) {
        return ApiResponse.notFound(res, 'Search history entry not found')
      }

      return ApiResponse.success(res, {
        message: 'Search history entry deleted successfully'
      })
    } catch (error) {
      console.error('Error deleting search history entry:', error)
      return ApiResponse.error(res, 'Failed to delete search history entry')
    }
  }
}
