import { Request, Response, NextFunction } from 'express'
import { prisma } from '@/config/database.service'
import { HttpError } from '../shared/common/http-error'
import { MESSAGES } from '../shared/constants/messages'
import { HTTP_STATUS } from '../shared/constants/httpStatus'
import { TokenPayload } from '@/types/token-payload.type'
import { UserRole } from '../shared/constants/enums/user.enum'
import { redisService } from '@/config/redis.service'

// Middleware kiểm tra user chỉ có thể truy cập data của chính họ
export const checkResourceOwnership = (
  resourceType: 'user' | 'profile' | 'resume' | 'application' | 'job' | 'company' | 'saved_job' | 'connection_interest'
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id, role } = req.decoded_authorization as TokenPayload
      const userRole = role as string
      const paramId =
        req.params.applicationId || req.params.id || req.params.userId || req.params.jobId || req.params.profileId
      const resourceId = paramId ?? (resourceType === 'user' ? user_id : undefined)
      if (!resourceId) {
        return next(new HttpError('Missing resource ID in URL parameters', HTTP_STATUS.BAD_REQUEST))
      }

      // Initial debug log to help trace ownership checks
      console.log('checkResourceOwnership:start', {
        resourceType,
        resourceId,
        userId: user_id,
        userRole,
        params: req.params,
        path: req.path,
        method: req.method
      })

      // Admin bypass all ownership checks
      if (userRole === 'admin') {
        console.log('checkResourceOwnership:admin_bypass', {
          resourceType,
          resourceId,
          userId: user_id
        })
        return next()
      }

      // Check cache first for performance
      const cacheKey = `ownership:${resourceType}:${user_id}:${resourceId}`
      try {
        const cachedResult = await redisService.get(cacheKey)
        if (cachedResult === 'true') {
          console.log('checkResourceOwnership:cache_hit', { cacheKey, resourceType, resourceId, userId: user_id })
          return next() // Ownership verified from cache
        } else {
          console.log('checkResourceOwnership:cache_miss', { cacheKey, resourceType, resourceId, userId: user_id })
        }
      } catch (error) {
        // Continue with DB check if cache fails
        console.warn('Ownership cache check failed:', error)
      }

      // Kiểm tra ownership dựa trên resource type
      switch (resourceType) {
        case 'user': {
          // User chỉ có thể truy cập thông tin của chính họ
          if (userRole !== 'admin' && user_id !== resourceId) {
            return next(new HttpError(MESSAGES.INSUFFICIENT_PERMISSIONS, HTTP_STATUS.FORBIDDEN))
          }
          break
        }

        case 'profile': {
          // Kiểm tra profile thuộc về user hiện tại
          if (userRole !== 'admin') {
            const profile = await prisma.profiles.findUnique({
              where: { id: resourceId },
              select: { user_id: true }
            })

            if (!profile || profile.user_id !== user_id) {
              return next(new HttpError(MESSAGES.INSUFFICIENT_PERMISSIONS, HTTP_STATUS.FORBIDDEN))
            }
          }
          break
        }

        case 'resume': {
          // Kiểm tra resume thuộc về profile của user hiện tại
          const resume = await prisma.resumes.findUnique({
            where: { id: resourceId },
            select: {
              profile_id: true,
              profiles: { select: { user_id: true } }
            }
          })

          if (!resume || resume.profiles.user_id !== user_id) {
            return next(new HttpError(MESSAGES.INSUFFICIENT_PERMISSIONS, HTTP_STATUS.FORBIDDEN))
          }
          break
        }

        case 'application': {
          // Dual ownership: Candidate owns via profile, Recruiter owns via job company, Admin owns all
          const application = await prisma.applications.findUnique({
            where: { id: resourceId },
            select: {
              id: true,
              profile_id: true,
              job_id: true,
              profiles: {
                select: { user_id: true }
              },
              jobs: {
                select: {
                  id: true,
                  title: true,
                  company_id: true,
                  companies: {
                    select: {
                      id: true,
                      name: true,
                      recruiter_id: true
                    }
                  }
                }
              }
            }
          })

          if (!application) {
            return next(new HttpError('Application not found', HTTP_STATUS.NOT_FOUND))
          }

          // Validate application relationships
          if (!application.job_id) {
            return next(new HttpError('Application is not associated with any job', HTTP_STATUS.BAD_REQUEST))
          }

          if (!application.jobs) {
            console.error('Application references non-existent job:', {
              applicationId: resourceId,
              jobId: application.job_id
            })
            return next(
              new HttpError('Application is associated with an invalid job', HTTP_STATUS.INTERNAL_SERVER_ERROR)
            )
          }

          if (!application.jobs.companies) {
            console.error('Job references non-existent company:', {
              applicationId: resourceId,
              jobId: application.jobs.id,
              companyId: application.jobs.company_id
            })
            return next(new HttpError('Job is associated with an invalid company', HTTP_STATUS.INTERNAL_SERVER_ERROR))
          }

          if (!application.jobs.companies.recruiter_id) {
            console.error('Company has no assigned recruiter:', {
              applicationId: resourceId,
              jobId: application.jobs.id,
              companyId: application.jobs.companies.id
            })
            return next(new HttpError('Company has no assigned recruiter', HTTP_STATUS.INTERNAL_SERVER_ERROR))
          }

          // Check ownership based on role
          let hasAccess = false

          if (userRole === 'candidate') {
            // Candidate owns application via their profile
            hasAccess = application.profiles?.user_id === user_id
          } else if (userRole === 'recruiter') {
            // Recruiter owns application via job's company
            hasAccess = application.jobs.companies.recruiter_id === user_id
          } else if (userRole === 'admin') {
            // Admin can access all applications
            hasAccess = true
          }

          if (!hasAccess) {
            console.log('Application access denied:', {
              applicationId: resourceId,
              userId: user_id,
              role,
              jobTitle: application.jobs.title,
              companyName: application.jobs.companies.name,
              companyRecruiterId: application.jobs.companies.recruiter_id
            })
            return next(new HttpError(MESSAGES.INSUFFICIENT_PERMISSIONS, HTTP_STATUS.FORBIDDEN))
          }

          console.log('Application ownership verified:', {
            applicationId: resourceId,
            jobTitle: application.jobs.title,
            companyName: application.jobs.companies.name,
            userRole: role
          })
          break
        }

        case 'job': {
          // Only recruiter owner of company can modify/delete job, Admin can access all
          if (userRole !== 'recruiter' && userRole !== 'admin') {
            return next(new HttpError(MESSAGES.INSUFFICIENT_PERMISSIONS, HTTP_STATUS.FORBIDDEN))
          }

          // Admin can access all jobs, skip ownership check
          if (userRole === 'admin') {
            break
          }

          const job = await prisma.jobs.findUnique({
            where: { id: resourceId },
            select: {
              id: true,
              title: true,
              company_id: true,
              companies: {
                select: {
                  id: true,
                  name: true,
                  recruiter_id: true
                }
              }
            }
          })

          if (!job) {
            return next(new HttpError('Job not found', HTTP_STATUS.NOT_FOUND))
          }

          // Validate job relationships
          if (!job.company_id) {
            return next(new HttpError('Job is not associated with any company', HTTP_STATUS.BAD_REQUEST))
          }

          if (!job.companies) {
            console.error('Job references non-existent company:', {
              jobId: resourceId,
              companyId: job.company_id
            })
            return next(new HttpError('Job is associated with an invalid company', HTTP_STATUS.INTERNAL_SERVER_ERROR))
          }

          if (!job.companies.recruiter_id) {
            console.error('Company has no assigned recruiter:', {
              jobId: resourceId,
              companyId: job.company_id,
              companyName: job.companies.name
            })
            return next(new HttpError('Company has no assigned recruiter', HTTP_STATUS.INTERNAL_SERVER_ERROR))
          }

          if (job.companies.recruiter_id !== user_id) {
            console.log('Job access denied:', {
              jobId: resourceId,
              jobTitle: job.title,
              companyName: job.companies.name,
              companyRecruiterId: job.companies.recruiter_id,
              userId: user_id
            })
            return next(new HttpError(MESSAGES.INSUFFICIENT_PERMISSIONS, HTTP_STATUS.FORBIDDEN))
          }

          console.log('Job ownership verified:', {
            jobId: resourceId,
            jobTitle: job.title,
            companyName: job.companies.name
          })
          break
        }

        case 'company': {
          // Only recruiter owner of company can modify company, Admin can access all
          if (userRole !== 'recruiter' && userRole !== 'admin') {
            return next(new HttpError(MESSAGES.INSUFFICIENT_PERMISSIONS, HTTP_STATUS.FORBIDDEN))
          }

          // Admin can access all companies, skip ownership check
          if (userRole === 'admin') {
            break
          }

          const company = await prisma.companies.findUnique({
            where: { id: resourceId },
            select: {
              id: true,
              name: true,
              recruiter_id: true
            }
          })

          if (!company) {
            return next(new HttpError('Company not found', HTTP_STATUS.NOT_FOUND))
          }

          if (!company.recruiter_id) {
            console.error('Company has no assigned recruiter:', {
              companyId: resourceId,
              companyName: company.name
            })
            return next(new HttpError('Company has no assigned recruiter', HTTP_STATUS.INTERNAL_SERVER_ERROR))
          }

          if (company.recruiter_id !== user_id) {
            console.log('Company access denied:', {
              companyId: resourceId,
              companyName: company.name,
              companyRecruiterId: company.recruiter_id,
              userId: user_id
            })
            return next(new HttpError(MESSAGES.INSUFFICIENT_PERMISSIONS, HTTP_STATUS.FORBIDDEN))
          }

          console.log('Company ownership verified:', {
            companyId: resourceId,
            companyName: company.name
          })
          break
        }

        case 'saved_job': {
          // User chỉ có thể truy cập saved jobs của profile của họ
          if (userRole !== 'admin') {
            const savedJob = await prisma.saved_jobs.findUnique({
              where: { id: resourceId },
              select: {
                profile_id: true,
                profiles: { select: { user_id: true } }
              }
            })

            if (!savedJob || savedJob.profiles.user_id !== user_id) {
              return next(new HttpError(MESSAGES.INSUFFICIENT_PERMISSIONS, HTTP_STATUS.FORBIDDEN))
            }
          }
          break
        }

        case 'connection_interest': {
          // User can access connection interests where they are the candidate or recruiter
          if (userRole !== 'admin') {
            const connectionInterest = await prisma.connection_interests.findUnique({
              where: { id: resourceId },
              select: {
                candidate_id: true,
                recruiter_id: true,
                candidate: { select: { user_id: true } }
              }
            })

            if (!connectionInterest) {
              return next(new HttpError('Connection interest not found', HTTP_STATUS.NOT_FOUND))
            }

            // Check if user is the candidate (via profile) or the recruiter
            const isCandidate = connectionInterest.candidate.user_id === user_id
            const isRecruiter = connectionInterest.recruiter_id === user_id

            if (!isCandidate && !isRecruiter) {
              return next(new HttpError(MESSAGES.INSUFFICIENT_PERMISSIONS, HTTP_STATUS.FORBIDDEN))
            }
          }
          break
        }

        default:
          return next(new HttpError('Invalid resource type', HTTP_STATUS.BAD_REQUEST))
      }

      // Cache successful ownership verification (TTL ngắn hơn để tránh stale data)
      try {
        await redisService.set(cacheKey, 'true', 120) // 2 minutes TTL - giảm từ 5 phút
      } catch (error) {
        // Non-critical error, continue
        console.warn('Failed to cache ownership result:', error)
      }

      next()
    } catch (error) {
      next(new HttpError('Error checking resource ownership', HTTP_STATUS.INTERNAL_SERVER_ERROR))
    }
  }
}

// Middleware đặc biệt cho company subscription (chỉ company owner)
// TODO: Uncomment when company_subscriptions table is added to schema
/*
export const checkCompanySubscriptionOwnership = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id, role } = req.decoded_authorization as TokenPayload
    const subscriptionId = req.params.id

    if (!subscriptionId) {
      return next(new HttpError('Missing subscription ID in URL parameters', HTTP_STATUS.BAD_REQUEST))
    }

    if (role === 'admin') {
      return next()
    }

    if (role !== 'recruiter') {
      return next(new HttpError(MESSAGES.INSUFFICIENT_PERMISSIONS, HTTP_STATUS.FORBIDDEN))
    }

    const subscription = await prisma.company_subscriptions.findUnique({
      where: { id: subscriptionId },
      include: {
        companies: {
          select: { recruiter_id: true }
        }
      }
    })

    if (!subscription) {
      return next(new HttpError('Subscription not found', HTTP_STATUS.NOT_FOUND))
    }

    if (subscription.companies.recruiter_id !== user_id) {
      return next(new HttpError(MESSAGES.INSUFFICIENT_PERMISSIONS, HTTP_STATUS.FORBIDDEN))
    }

    next()
  } catch (error) {
    next(new HttpError('Error checking subscription ownership', HTTP_STATUS.INTERNAL_SERVER_ERROR))
  }
}
*/

// Middleware kiểm tra quyền truy cập payment
// TODO: Uncomment when payments table is added to schema
/*
export const checkPaymentOwnership = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id, role } = req.decoded_authorization as TokenPayload
    const paymentId = req.params.id

    if (!paymentId) {
      return next(new HttpError('Missing payment ID in URL parameters', HTTP_STATUS.BAD_REQUEST))
    }

    if (role === 'admin') {
      return next()
    }

    // Note: This function references a payments table that doesn't exist in current schema
    const payment = await prisma.payments.findUnique({
      where: { id: paymentId },
      select: {
        user_id: true,
        company_id: true,
        companies: {
          select: { recruiter_id: true }
        }
      }
    })

    if (!payment) {
      return next(new HttpError('Payment not found', HTTP_STATUS.NOT_FOUND))
    }

    const hasAccess = payment.user_id === user_id || payment.companies?.recruiter_id === user_id

    if (!hasAccess) {
      return next(new HttpError(MESSAGES.INSUFFICIENT_PERMISSIONS, HTTP_STATUS.FORBIDDEN))
    }

    next()
  } catch (error) {
    next(new HttpError('Error checking payment ownership', HTTP_STATUS.INTERNAL_SERVER_ERROR))
  }
}
*/
