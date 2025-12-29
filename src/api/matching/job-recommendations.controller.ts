import { Request, Response } from 'express'
import { prisma } from '../../config/database.service'
import { ApiResponse } from '../../shared/helpers/api-response.helper'

/**
 * Job Recommendations Controller
 * Provides personalized job recommendations based on user behavior
 */
export class JobRecommendationsController {
  /**
   * GET /api/matching/recommendations
   * Get personalized job recommendations for authenticated user
   */
  static async getRecommendations(req: Request, res: Response) {
    try {
      const userId = req.decoded_authorization?.user_id
      const limit = parseInt(req.query.limit as string) || 10
      const type = (req.query.type as string) || 'mixed' // 'viewed', 'searched', 'mixed'

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

      let recommendedJobs: any[] = []

      switch (type) {
        case 'viewed':
          recommendedJobs = await this.getViewedBasedRecommendations(profileId, limit)
          break
        case 'searched':
          recommendedJobs = await this.getSearchBasedRecommendations(profileId, limit)
          break
        case 'mixed':
        default:
          recommendedJobs = await this.getMixedRecommendations(profileId, limit)
          break
      }

      return ApiResponse.success(res, {
        recommendations: recommendedJobs,
        type,
        total: recommendedJobs.length
      })
    } catch (error) {
      console.error('Error getting job recommendations:', error)
      return ApiResponse.error(res, 'Failed to get job recommendations')
    }
  }

  /**
   * Get recommendations based on jobs user has viewed
   */
  private static async getViewedBasedRecommendations(profileId: string, limit: number) {
    // Get user's recently viewed jobs
    const viewedJobs = await prisma.job_views.findMany({
      where: { profile_id: profileId },
      orderBy: { viewed_at: 'desc' },
      take: 10,
      include: {
        jobs: {
          include: {
            job_skills: {
              include: { skills: true }
            },
            locations: true,
            companies: true
          }
        }
      }
    })

    if (viewedJobs.length === 0) {
      return []
    }

    // Extract skills, locations, and companies from viewed jobs
    const skills = viewedJobs.flatMap((vj) => vj.jobs.job_skills.map((js: any) => js.skill_id))
    const locations = viewedJobs.map((vj) => vj.jobs.location_id).filter(Boolean) as string[]
    const companies = viewedJobs.map((vj) => vj.jobs.company_id).filter(Boolean) as string[]

    // Find similar jobs
    const similarJobs = await prisma.jobs.findMany({
      where: {
        status: 'approved',
        expires_at: { gt: new Date() },
        // Not already viewed
        job_views: {
          none: {
            profile_id: profileId
          }
        },
        OR: [
          // Same skills
          {
            job_skills: {
              some: {
                skill_id: { in: skills }
              }
            }
          },
          // Same location
          {
            location_id: { in: locations }
          },
          // Same company (other jobs)
          {
            company_id: { in: companies }
          }
        ]
      },
      include: {
        companies: {
          select: { id: true, name: true, logo_url: true }
        },
        locations: {
          select: { id: true, name: true, type: true }
        },
        job_skills: {
          include: {
            skills: { select: { id: true, name: true } }
          }
        }
      },
      take: limit * 2, // Get more to filter
      orderBy: { posted_at: 'desc' }
    })

    // Score and rank recommendations
    const scoredJobs = similarJobs.map((job) => {
      let score = 0
      const skillMatches = job.job_skills.filter((js: any) => skills.includes(js.skill_id)).length
      const locationMatch = job.location_id && locations.includes(job.location_id)
      const companyMatch = job.company_id && companies.includes(job.company_id)

      score += skillMatches * 3 // Skills are most important
      score += locationMatch ? 2 : 0
      score += companyMatch ? 1 : 0

      return { ...job, score }
    })

    return scoredJobs
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((job) => ({
        id: job.id,
        title: job.title,
        company: job.companies || null,
        location: job.locations || null,
        salary_range: job.salary_range,
        job_type: job.job_type,
        skills: job.job_skills.map((js: any) => js.skills),
        posted_at: job.posted_at,
        score: job.score,
        reason: job.score > 5 ? 'high_match' : job.score > 2 ? 'good_match' : 'similar'
      }))
  }

  /**
   * Get recommendations based on user's search history
   */
  private static async getSearchBasedRecommendations(profileId: string, limit: number) {
    // Get user's recent search history
    const searchHistory = await prisma.search_history.findMany({
      where: { profile_id: profileId },
      orderBy: { searched_at: 'desc' },
      take: 5
    })

    if (searchHistory.length === 0) {
      return []
    }

    // Extract search patterns
    const searchQueries = searchHistory.map((sh) => sh.search_query as any)
    const filtersUsed = searchHistory.map((sh) => sh.filters_used as any)

    // Find jobs matching search patterns
    const recommendedJobs: any[] = []

    for (const searchQuery of searchQueries) {
      if (searchQuery && typeof searchQuery === 'object') {
        const queryText = searchQuery.q || searchQuery.query || ''
        if (queryText) {
          const jobs = await prisma.jobs.findMany({
            where: {
              status: 'approved',
              expires_at: { gt: new Date() },
              OR: [
                { title: { contains: queryText, mode: 'insensitive' } },
                { description: { contains: queryText, mode: 'insensitive' } }
              ]
            },
            include: {
              companies: { select: { id: true, name: true, logo_url: true } },
              locations: { select: { id: true, name: true, type: true } },
              job_skills: {
                include: { skills: { select: { id: true, name: true } } }
              }
            },
            take: 5
          })
          recommendedJobs.push(...jobs)
        }
      }
    }

    // Remove duplicates and limit
    const uniqueJobs = recommendedJobs
      .filter((job, index, self) => index === self.findIndex((j) => j.id === job.id))
      .slice(0, limit)

    return uniqueJobs.map((job) => ({
      id: job.id,
      title: job.title,
      company: job.companies,
      location: job.locations,
      salary_range: job.salary_range,
      job_type: job.job_type,
      skills: job.job_skills.map((js: any) => js.skills),
      posted_at: job.posted_at,
      reason: 'search_match'
    }))
  }

  /**
   * Get mixed recommendations combining viewed and search history
   */
  private static async getMixedRecommendations(profileId: string, limit: number) {
    const [viewedBased, searchBased] = await Promise.all([
      this.getViewedBasedRecommendations(profileId, Math.ceil(limit / 2)),
      this.getSearchBasedRecommendations(profileId, Math.ceil(limit / 2))
    ])

    // Combine and remove duplicates
    const combined = [...viewedBased, ...searchBased]
    const unique = combined.filter((job, index, self) => index === self.findIndex((j) => j.id === job.id))

    return unique.slice(0, limit)
  }

  /**
   * GET /api/matching/recommendations/for-you
   * Get "For You" recommendations with smart scoring
   */
  static async getForYouRecommendations(req: Request, res: Response) {
    try {
      const userId = req.decoded_authorization?.user_id
      const limit = parseInt(req.query.limit as string) || 5

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

      // Get user profile for personalized recommendations
      const userProfile = await prisma.profiles.findUnique({
        where: { id: profileId },
        include: {
          skills: {
            include: { skills: true }
          },
          experiences: true,
          educations: true
        }
      })

      if (!userProfile) {
        return ApiResponse.notFound(res, 'User profile not found')
      }

      // Build recommendation query based on profile
      const userSkills = userProfile.skills.map((ps: any) => ps.skill_id)
      const desiredJobTypes = userProfile.desired_job_type || []
      const desiredSalary = userProfile.desired_salary_min
      const experienceYears = userProfile.years_of_experience || 0

      const recommendations = await prisma.jobs.findMany({
        where: {
          status: 'approved',
          expires_at: { gt: new Date() },
          // Not already viewed by user
          job_views: {
            none: {
              profile_id: profileId
            }
          },
          // Match user's preferences
          ...(desiredJobTypes.length > 0 && {
            job_type: { in: desiredJobTypes }
          }),
          // Match experience level
          experience_level: {
            lte: Math.max(1, Math.ceil(experienceYears / 2)) // Rough mapping
          }
        },
        include: {
          companies: { select: { id: true, name: true, logo_url: true } },
          locations: { select: { id: true, name: true, type: true } },
          job_skills: {
            include: { skills: { select: { id: true, name: true } } }
          }
        },
        take: limit * 3, // Get more for scoring
        orderBy: { posted_at: 'desc' }
      })

      // Score recommendations
      const scoredRecommendations = recommendations.map((job) => {
        let score = 0
        const skillMatches = job.job_skills.filter((js) => userSkills.includes(js.skill_id)).length

        // Skills match (40% weight)
        score += (skillMatches / Math.max(userSkills.length, 1)) * 40

        // Job type match (20% weight)
        if (job.job_type && desiredJobTypes.includes(job.job_type)) {
          score += 20
        }

        // Salary match (20% weight)
        const salaryRange = job.salary_range as any
        if (desiredSalary && salaryRange?.min && salaryRange.min >= desiredSalary * 0.8) {
          score += 20
        }

        // Experience match (10% weight)
        if (job.experience_level && job.experience_level <= Math.ceil(experienceYears / 2)) {
          score += 10
        }

        // Recent posting bonus (10% weight)
        if (job.posted_at) {
          const daysSincePosted = (Date.now() - job.posted_at.getTime()) / (1000 * 60 * 60 * 24)
          if (daysSincePosted <= 7) {
            score += 10
          }
        }

        return { ...job, score: Math.round(score) }
      })

      // Sort by score and return top results
      const topRecommendations = scoredRecommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((job) => ({
          id: job.id,
          title: job.title,
          company: job.companies,
          location: job.locations,
          salary_range: job.salary_range,
          job_type: job.job_type,
          skills: job.job_skills.map((js: any) => js.skills),
          posted_at: job.posted_at,
          score: job.score,
          matchLevel: job.score >= 80 ? 'excellent' : job.score >= 60 ? 'good' : job.score >= 40 ? 'fair' : 'basic'
        }))

      return ApiResponse.success(res, {
        recommendations: topRecommendations,
        total: topRecommendations.length,
        profile: {
          skillsCount: userSkills.length,
          desiredJobTypes,
          experienceYears
        }
      })
    } catch (error) {
      console.error('Error getting for-you recommendations:', error)
      return ApiResponse.error(res, 'Failed to get personalized recommendations')
    }
  }
}
