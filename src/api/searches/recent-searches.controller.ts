import { Request, Response } from 'express'
import { prisma } from '../../config/database.service'
import { ApiResponse } from '../../shared/helpers/api-response.helper'
import { searchService } from './search.service'

/**
 * Recent Searches Controller
 * Handles user's search history and recent search queries
 */
export class RecentSearchesController {
  /**
   * GET /api/search/recent
   * Get recent searches for authenticated user
   */
  static async getRecentSearches(req: Request, res: Response) {
    try {
      const userId = req.decoded_authorization?.user_id
      const limit = parseInt(req.query.limit as string) || 10
      const days = parseInt(req.query.days as string) || 30

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

      // Calculate date threshold
      const dateThreshold = new Date()
      dateThreshold.setDate(dateThreshold.getDate() - days)

      const recentSearches = await prisma.search_history.findMany({
        where: {
          profile_id: profileId,
          searched_at: {
            gte: dateThreshold
          }
        },
        orderBy: {
          searched_at: 'desc'
        },
        take: limit,
        select: {
          id: true,
          search_query: true,
          search_type: true,
          searched_at: true,
          filters_used: true,
          result_count: true,
          clicked_jobs: true
        }
      })

      // Transform response to be more user-friendly
      const transformedSearches = recentSearches.map((search) => ({
        id: search.id,
        query: search.search_query,
        type: search.search_type,
        searchedAt: search.searched_at,
        filters: search.filters_used,
        resultCount: search.result_count,
        clickedJobs: search.clicked_jobs
      }))

      return ApiResponse.success(res, {
        searches: transformedSearches,
        total: transformedSearches.length
      })
    } catch (error) {
      console.error('Error getting recent searches:', error)
      return ApiResponse.error(res, 'Failed to get recent searches')
    }
  }

  /**
   * DELETE /api/search/recent/:id
   * Delete a specific recent search
   */
  static async deleteRecentSearch(req: Request, res: Response) {
    try {
      const userId = req.decoded_authorization?.user_id
      const searchId = parseInt(req.params.id)

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

      const deletedSearch = await prisma.search_history.deleteMany({
        where: {
          id: searchId,
          profile_id: profileId
        }
      })

      if (deletedSearch.count === 0) {
        return ApiResponse.notFound(res, 'Search history not found')
      }

      return ApiResponse.success(res, { message: 'Search history deleted successfully' })
    } catch (error) {
      console.error('Error deleting recent search:', error)
      return ApiResponse.error(res, 'Failed to delete search history')
    }
  }

  /**
   * DELETE /api/search/recent
   * Clear all recent searches for user
   */
  static async clearRecentSearches(req: Request, res: Response) {
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

      await prisma.search_history.deleteMany({
        where: {
          profile_id: profileId
        }
      })

      return ApiResponse.success(res, { message: 'All recent searches cleared successfully' })
    } catch (error) {
      console.error('Error clearing recent searches:', error)
      return ApiResponse.error(res, 'Failed to clear recent searches')
    }
  }

  /**
   * GET /api/search/popular-queries
   * Get popular search queries across all users (analytics)
   */
  static async getPopularQueries(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 10
      const days = parseInt(req.query.days as string) || 7

      // Use searchService để sử dụng ES aggregations
      const popularQueries = await searchService.getPopularQueries(days, limit)

      return ApiResponse.success(res, {
        queries: popularQueries,
        period: `${days} days`,
        source: 'elasticsearch' // Indicate data source for debugging
      })
    } catch (error) {
      console.error('Error getting popular queries:', error)
      return ApiResponse.error(res, 'Failed to get popular queries')
    }
  }
}
