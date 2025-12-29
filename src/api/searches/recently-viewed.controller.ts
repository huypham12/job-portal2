import { Request, Response } from 'express'
import { prisma } from '../../config/database.service'
import { ApiResponse } from '../../shared/helpers/api-response.helper'

/**
 * Recently Viewed Jobs Controller
 * Handles user's recently viewed job history
 */
export class RecentlyViewedController {
  /**
   * GET /api/jobs/recently-viewed
   * Get jobs recently viewed by authenticated user
   */
  static async getRecentlyViewedJobs(req: Request, res: Response) {
    try {
      const userId = req.decoded_authorization?.user_id
      const limit = parseInt(req.query.limit as string) || 20
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

      const recentlyViewed = await prisma.job_views.findMany({
        where: {
          profile_id: profileId,
          viewed_at: {
            gte: dateThreshold
          }
        },
        orderBy: {
          viewed_at: 'desc'
        },
        take: limit,
        include: {
          jobs: {
            include: {
              companies: {
                select: {
                  id: true,
                  name: true,
                  logo_url: true
                }
              },
              locations: {
                select: {
                  id: true,
                  name: true,
                  type: true
                }
              },
              job_skills: {
                include: {
                  skills: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              }
            }
          }
        }
      })

      // Transform response
      const transformedJobs = recentlyViewed.map((view) => ({
        job: {
          id: view.jobs.id,
          title: view.jobs.title,
          company: view.jobs.companies,
          location: view.jobs.locations,
          salary_range: view.jobs.salary_range,
          job_type: view.jobs.job_type,
          skills: view.jobs.job_skills.map((js) => js.skills),
          posted_at: view.jobs.posted_at,
          expires_at: view.jobs.expires_at
        },
        viewedAt: view.viewed_at,
        duration: view.duration_seconds,
        source: view.source
      }))

      return ApiResponse.success(res, {
        jobs: transformedJobs,
        total: transformedJobs.length
      })
    } catch (error) {
      console.error('Error getting recently viewed jobs:', error)
      return ApiResponse.error(res, 'Failed to get recently viewed jobs')
    }
  }

  /**
   * DELETE /api/jobs/recently-viewed
   * Clear all recently viewed jobs for user
   */
  static async clearRecentlyViewed(req: Request, res: Response) {
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

      await prisma.job_views.deleteMany({
        where: {
          profile_id: profileId
        }
      })

      return ApiResponse.success(res, { message: 'Recently viewed jobs cleared successfully' })
    } catch (error) {
      console.error('Error clearing recently viewed jobs:', error)
      return ApiResponse.error(res, 'Failed to clear recently viewed jobs')
    }
  }

  /**
   * GET /api/jobs/recently-viewed/stats
   * Get viewing statistics for user
   */
  static async getViewingStats(req: Request, res: Response) {
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

      const [totalViews, todayViews, weekViews, monthViews] = await Promise.all([
        prisma.job_views.count({
          where: { profile_id: profileId }
        }),
        prisma.job_views.count({
          where: {
            profile_id: profileId,
            viewed_at: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        }),
        prisma.job_views.count({
          where: {
            profile_id: profileId,
            viewed_at: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        }),
        prisma.job_views.count({
          where: {
            profile_id: profileId,
            viewed_at: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        })
      ])

      // Get most viewed job types
      const jobTypeStats = await prisma.$queryRaw`
        SELECT
          j.job_type,
          COUNT(*) as view_count
        FROM job_views jv
        JOIN jobs j ON jv.job_id = j.id
        WHERE jv.profile_id = ${profileId}
        GROUP BY j.job_type
        ORDER BY view_count DESC
        LIMIT 5
      `

      return ApiResponse.success(res, {
        totalViews,
        todayViews,
        weekViews,
        monthViews,
        jobTypeStats
      })
    } catch (error) {
      console.error('Error getting viewing stats:', error)
      return ApiResponse.error(res, 'Failed to get viewing statistics')
    }
  }
}
