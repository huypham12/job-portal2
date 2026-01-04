import { Request, Response } from 'express'
import { prisma } from '../../config/database.service'
import { ApiResponse } from '../../shared/helpers/api-response.helper'
import { NotificationHelper } from '../../shared/helpers/notification.helper'

/**
 * Enhanced Notifications Controller
 * Handles advanced notification features like job alerts and location-based notifications
 */
export class EnhancedNotificationsController {
  /**
   * POST /api/notifications/send-popular-job-alerts
   * Send alerts about trending/popular jobs
   */
  static async sendPopularJobAlerts(req: Request, res: Response) {
    try {
      const userId = req.decoded_authorization?.user_id
      const threshold = parseInt(req.body.threshold) || 10 // Minimum view count

      if (!userId) {
        return ApiResponse.unauthorized(res, 'Authentication required')
      }

      // Get popular jobs from the last week
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

      const popularJobs = await prisma.jobs.findMany({
        where: {
          status: 'approved',
          expires_at: { gt: new Date() }
        },
        include: {
          companies: { select: { id: true, name: true } },
          _count: {
            select: {
              job_views: {
                where: { viewed_at: { gte: weekAgo } }
              }
            }
          }
        },
        orderBy: {
          job_views: {
            _count: 'desc'
          }
        },
        take: 5
      })

      // Filter jobs above threshold
      const trendingJobs = popularJobs.filter((job) => job._count.job_views >= threshold)

      // Send notifications
      const notificationsSent = []
      for (const job of trendingJobs) {
        await NotificationHelper.notifyPopularJob({
          userId,
          jobId: job.id,
          jobTitle: job.title,
          viewCount: job._count.job_views
        })
        notificationsSent.push({
          jobId: job.id,
          jobTitle: job.title,
          viewCount: job._count.job_views
        })
      }

      return ApiResponse.success(res, {
        message: 'Popular job alerts sent successfully',
        notificationsSent,
        totalSent: notificationsSent.length
      })
    } catch (error) {
      console.error('Error sending popular job alerts:', error)
      return ApiResponse.error(res, 'Failed to send popular job alerts')
    }
  }

  /**
   * POST /api/notifications/send-location-based-alerts
   * Send job alerts based on user's preferred locations
   */
  static async sendLocationBasedAlerts(req: Request, res: Response) {
    try {
      const userId = req.user?.id
      const profileId = req.user?.profileId

      if (!userId || !profileId) {
        return ApiResponse.unauthorized(res, 'Authentication required')
      }

      // Get user's preferred locations from profile and recent searches
      const userProfile = await prisma.profiles.findUnique({
        where: { id: profileId },
        select: { location_id: true }
      })

      const recentSearches = await prisma.search_history.findMany({
        where: { profile_id: profileId },
        orderBy: { searched_at: 'desc' },
        take: 5,
        select: { filters_used: true }
      })

      // Extract locations from recent searches
      const searchLocations = recentSearches.map((search) => (search.filters_used as any)?.location).filter(Boolean)

      const preferredLocations = [...(userProfile?.location_id ? [userProfile.location_id] : []), ...searchLocations]

      if (preferredLocations.length === 0) {
        return ApiResponse.success(res, {
          message: 'No location preferences found',
          notificationsSent: []
        })
      }

      // Find new jobs in preferred locations (posted in last 24h)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)

      const newJobsByLocation = await prisma.$queryRaw`
        SELECT
          l.name as location_name,
          l.id as location_id,
          COUNT(j.id) as job_count,
          array_agg(json_build_object(
            'id', j.id,
            'title', j.title,
            'company_name', c.name
          )) as recent_jobs
        FROM locations l
        JOIN jobs j ON l.id = j.location_id
        JOIN companies c ON j.company_id = c.id
        WHERE l.id = ANY(${preferredLocations})
          AND j.status = 'approved'
          AND j.posted_at >= ${yesterday}
          AND j.expires_at > NOW()
        GROUP BY l.id, l.name
        HAVING COUNT(j.id) > 0
        ORDER BY job_count DESC
        LIMIT 3
      `

      // Send notifications for each location
      const notificationsSent = []
      for (const locationData of newJobsByLocation as any[]) {
        await NotificationHelper.notifyLocationJobAlert({
          userId,
          locationId: locationData.location_id,
          locationName: locationData.location_name,
          jobCount: parseInt(locationData.job_count)
        })
        notificationsSent.push({
          locationName: locationData.location_name,
          jobCount: parseInt(locationData.job_count),
          recentJobs: locationData.recent_jobs
        })
      }

      return ApiResponse.success(res, {
        message: 'Location-based job alerts sent successfully',
        notificationsSent,
        totalSent: notificationsSent.length
      })
    } catch (error) {
      console.error('Error sending location-based alerts:', error)
      return ApiResponse.error(res, 'Failed to send location-based alerts')
    }
  }

  /**
   * POST /api/notifications/send-search-based-alerts
   * Send job alerts based on user's saved searches
   */
  static async sendSearchBasedAlerts(req: Request, res: Response) {
    try {
      const userId = req.user?.id
      const profileId = req.user?.profileId

      if (!userId || !profileId) {
        return ApiResponse.unauthorized(res, 'Authentication required')
      }

      // Get user's recent search history
      const recentSearches = await prisma.search_history.findMany({
        where: { profile_id: profileId },
        orderBy: { searched_at: 'desc' },
        take: 5
      })

      if (recentSearches.length === 0) {
        return ApiResponse.success(res, {
          message: 'No recent searches found',
          notificationsSent: []
        })
      }

      // For each recent search, find new matching jobs
      const notificationsSent = []

      for (const search of recentSearches.slice(0, 2)) {
        // Limit to 2 most recent
        const searchQuery = search.search_query as any
        const filters = search.filters_used as any

        if (!searchQuery) continue

        // Build job query based on search
        const whereClause: any = {
          status: 'approved',
          expires_at: { gt: new Date() },
          posted_at: { gt: search.searched_at } // Jobs posted after this search
        }

        // Add filters from search
        if (filters?.jobType) whereClause.job_type = filters.jobType
        if (filters?.experienceLevel !== undefined) whereClause.experience_level = filters.experienceLevel

        // Simple text search (in real implementation, would use Elasticsearch)
        if (searchQuery.q) {
          whereClause.OR = [
            { title: { contains: searchQuery.q, mode: 'insensitive' } },
            { description: { contains: searchQuery.q, mode: 'insensitive' } }
          ]
        }

        const matchingJobs = await prisma.jobs.count({
          where: whereClause
        })

        if (matchingJobs > 0) {
          await NotificationHelper.notifySearchBasedAlert({
            userId,
            searchQuery: searchQuery.q || 'your recent search',
            jobCount: matchingJobs
          })

          notificationsSent.push({
            searchQuery: searchQuery.q,
            jobCount: matchingJobs,
            searchDate: search.searched_at
          })
        }
      }

      return ApiResponse.success(res, {
        message: 'Search-based job alerts sent successfully',
        notificationsSent,
        totalSent: notificationsSent.length
      })
    } catch (error) {
      console.error('Error sending search-based alerts:', error)
      return ApiResponse.error(res, 'Failed to send search-based alerts')
    }
  }

  /**
   * GET /api/notifications/enhanced-stats
   * Get statistics about enhanced notifications
   */
  static async getEnhancedStats(req: Request, res: Response) {
    try {
      const userId = req.user?.id

      if (!userId) {
        return ApiResponse.unauthorized(res, 'Authentication required')
      }

      const [totalEnhanced, byType, recent] = await Promise.all([
        prisma.notifications.count({
          where: {
            user_id: userId,
            type: {
              in: ['popular_job_alert', 'location_job_alert', 'search_based_alert']
            }
          }
        }),
        prisma.notifications.groupBy({
          by: ['type'],
          where: {
            user_id: userId,
            type: {
              in: ['popular_job_alert', 'location_job_alert', 'search_based_alert']
            }
          },
          _count: true
        }),
        prisma.notifications.findMany({
          where: {
            user_id: userId,
            type: {
              in: ['popular_job_alert', 'location_job_alert', 'search_based_alert']
            }
          },
          orderBy: { sent_at: 'desc' },
          take: 5,
          select: {
            type: true,
            sent_at: true,
            read: true
          }
        })
      ])

      return ApiResponse.success(res, {
        totalEnhanced,
        byType,
        recent
      })
    } catch (error) {
      console.error('Error getting enhanced notification stats:', error)
      return ApiResponse.error(res, 'Failed to get notification statistics')
    }
  }
}
