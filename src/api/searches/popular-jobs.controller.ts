import { Request, Response } from 'express'
import { prisma } from '../../config/database.service'
import { ApiResponse } from '../../shared/helpers/api-response.helper'

/**
 * Popular Jobs Controller
 * Handles trending and popular jobs based on view counts
 */
export class PopularJobsController {
  /**
   * GET /api/jobs/popular
   * Get popular jobs based on view counts
   */
  static async getPopularJobs(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 20
      const period = (req.query.period as string) || 'week' // 'day', 'week', 'month'
      const category = req.query.category as string

      // Calculate date threshold based on period
      const now = new Date()
      let dateThreshold: Date

      switch (period) {
        case 'day':
          dateThreshold = new Date(now.setHours(0, 0, 0, 0))
          break
        case 'month':
          dateThreshold = new Date(now.setMonth(now.getMonth() - 1))
          break
        case 'week':
        default:
          dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
      }

      // Build where clause for active jobs
      const whereClause: any = {
        status: 'approved',
        expires_at: {
          gt: new Date()
        }
      }

      // Add category filter if provided
      if (category) {
        whereClause.job_skills = {
          some: {
            skills: {
              category: category
            }
          }
        }
      }

      const popularJobs = await prisma.jobs.findMany({
        where: whereClause,
        include: {
          companies: {
            select: {
              id: true,
              name: true,
              logo_url: true,
              size: true
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
          },
          _count: {
            select: {
              job_views: {
                where: {
                  viewed_at: {
                    gte: dateThreshold
                  }
                }
              }
            }
          }
        },
        orderBy: {
          job_views: {
            _count: 'desc'
          }
        },
        take: limit
      })

      // Transform response
      const transformedJobs = popularJobs.map((job) => ({
        id: job.id,
        title: job.title,
        description: job.description,
        company: job.companies || null,
        location: job.locations || null,
        salary_range: job.salary_range,
        job_type: job.job_type,
        experience_level: job.experience_level,
        skills: job.job_skills.map((js: any) => js.skills),
        posted_at: job.posted_at,
        expires_at: job.expires_at,
        viewCount: job._count.job_views,
        popularity: job._count.job_views > 0 ? 'trending' : 'normal'
      }))

      return ApiResponse.success(res, {
        jobs: transformedJobs,
        period,
        total: transformedJobs.length
      })
    } catch (error) {
      console.error('Error getting popular jobs:', error)
      return ApiResponse.error(res, 'Failed to get popular jobs')
    }
  }

  /**
   * GET /api/jobs/trending
   * Get trending jobs (high view velocity in recent time)
   */
  static async getTrendingJobs(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 10

      // Get jobs with high view count in the last 24 hours
      // and compare with previous period
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)

      const trendingJobs = await prisma.$queryRaw`
        SELECT
          j.id,
          j.title,
          j.description,
          j.posted_at,
          j.expires_at,
          j.salary_range,
          j.job_type,
          j.experience_level,
          c.name as company_name,
          c.logo_url as company_logo,
          l.name as location_name,
          recent_views.view_count as recent_views,
          COALESCE(prev_views.view_count, 0) as prev_views,
          CASE
            WHEN COALESCE(prev_views.view_count, 0) = 0 THEN 999
            ELSE recent_views.view_count::float / GREATEST(prev_views.view_count, 1)
          END as growth_rate
        FROM jobs j
        JOIN companies c ON j.company_id = c.id
        LEFT JOIN locations l ON j.location_id = l.id
        LEFT JOIN (
          SELECT job_id, COUNT(*) as view_count
          FROM job_views
          WHERE viewed_at >= ${yesterday}
          GROUP BY job_id
        ) recent_views ON j.id = recent_views.job_id
        LEFT JOIN (
          SELECT job_id, COUNT(*) as view_count
          FROM job_views
          WHERE viewed_at >= ${twoDaysAgo} AND viewed_at < ${yesterday}
          GROUP BY job_id
        ) prev_views ON j.id = prev_views.job_id
        WHERE j.status = 'approved'
          AND j.expires_at > NOW()
          AND recent_views.view_count > 0
        ORDER BY growth_rate DESC, recent_views.view_count DESC
        LIMIT ${limit}
      `

      return ApiResponse.success(res, {
        jobs: trendingJobs,
        period: '24h',
        total: Array.isArray(trendingJobs) ? trendingJobs.length : 0
      })
    } catch (error) {
      console.error('Error getting trending jobs:', error)
      return ApiResponse.error(res, 'Failed to get trending jobs')
    }
  }

  /**
   * GET /api/jobs/popular-by-location
   * Get popular jobs grouped by location
   */
  static async getPopularJobsByLocation(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 5
      const period = (req.query.period as string) || 'week'

      // Calculate date threshold
      const now = new Date()
      let dateThreshold: Date

      switch (period) {
        case 'day':
          dateThreshold = new Date(now.setHours(0, 0, 0, 0))
          break
        case 'month':
          dateThreshold = new Date(now.setMonth(now.getMonth() - 1))
          break
        case 'week':
        default:
          dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
      }

      const popularByLocation = await prisma.$queryRaw`
        SELECT
          l.name as location_name,
          l.type as location_type,
          COUNT(jv.id) as total_views,
          COUNT(DISTINCT j.id) as unique_jobs,
          AVG(j.salary_range->>'max') as avg_max_salary
        FROM locations l
        JOIN jobs j ON l.id = j.location_id
        LEFT JOIN job_views jv ON j.id = jv.job_id AND jv.viewed_at >= ${dateThreshold}
        WHERE j.status = 'approved' AND j.expires_at > NOW()
        GROUP BY l.id, l.name, l.type
        HAVING COUNT(jv.id) > 0
        ORDER BY total_views DESC
        LIMIT ${limit}
      `

      return ApiResponse.success(res, {
        locations: popularByLocation,
        period,
        total: Array.isArray(popularByLocation) ? popularByLocation.length : 0
      })
    } catch (error) {
      console.error('Error getting popular jobs by location:', error)
      return ApiResponse.error(res, 'Failed to get popular jobs by location')
    }
  }
}
