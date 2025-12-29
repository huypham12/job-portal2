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
  resourceType: 'user' | 'profile' | 'resume' | 'application' | 'job' | 'company' | 'saved_job'
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id, role } = req.decoded_authorization as TokenPayload
      const paramId = req.params.id || req.params.userId || req.params.jobId || req.params.profileId
      const resourceId = paramId ?? (resourceType === 'user' ? user_id : undefined)
      if (!resourceId) {
        return next(new HttpError('Missing resource ID in URL parameters', HTTP_STATUS.BAD_REQUEST))
      }

      if (role === UserRole.Admin) {
        return next()
      }

      // Check cache first for performance
      const cacheKey = `ownership:${resourceType}:${user_id}:${resourceId}`
      try {
        const cachedResult = await redisService.get(cacheKey)
        if (cachedResult === 'true') {
          return next() // Ownership verified from cache
        }
      } catch (error) {
        // Continue with DB check if cache fails
        console.warn('Ownership cache check failed:', error)
      }

      // Kiểm tra ownership dựa trên resource type
      switch (resourceType) {
        case 'user': {
          // User chỉ có thể truy cập thông tin của chính họ
          if (user_id !== resourceId) {
            return next(new HttpError(MESSAGES.INSUFFICIENT_PERMISSIONS, HTTP_STATUS.FORBIDDEN))
          }
          break
        }

        case 'profile': {
          // Kiểm tra profile thuộc về user hiện tại
          const profile = await prisma.profiles.findUnique({
            where: { id: resourceId },
            select: { user_id: true }
          })

          if (!profile || profile.user_id !== user_id) {
            return next(new HttpError(MESSAGES.INSUFFICIENT_PERMISSIONS, HTTP_STATUS.FORBIDDEN))
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
          // Dual ownership: Candidate owns via profile, Recruiter owns via job company
          const application = await prisma.applications.findUnique({
            where: { id: resourceId },
            select: {
              profile_id: true,
              job_id: true,
              profiles: {
                select: { user_id: true }
              },
              jobs: {
                select: {
                  companies: {
                    select: { recruiter_id: true }
                  }
                }
              }
            }
          })

          if (!application) {
            return next(new HttpError('Application not found', HTTP_STATUS.NOT_FOUND))
          }

          // Check dual ownership - chỉ Candidate và Recruiter mới có quyền truy cập application
          let hasAccess = false

          if (role === UserRole.Candidate) {
            // Candidate owns application via their profile
            hasAccess = application.profiles?.user_id === user_id
          } else if (role === UserRole.Recruiter) {
            // Recruiter owns application via job's company
            hasAccess = application.jobs?.companies?.recruiter_id === user_id
          } else {
            // Admin và các role khác không có quyền truy cập application
            hasAccess = false
          }

          if (!hasAccess) {
            return next(new HttpError(MESSAGES.INSUFFICIENT_PERMISSIONS, HTTP_STATUS.FORBIDDEN))
          }
          break
        }

        case 'job': {
          // Chỉ recruiter owner của company mới có thể sửa/xóa job
          console.log(role)
          if (role !== UserRole.Recruiter) {
            return next(new HttpError(MESSAGES.INSUFFICIENT_PERMISSIONS, HTTP_STATUS.FORBIDDEN))
          }

          const job = await prisma.jobs.findUnique({
            where: { id: resourceId },
            select: {
              id: true,
              company_id: true,
              companies: {
                select: { id: true, recruiter_id: true }
              }
            }
          })

          if (!job) {
            return next(new HttpError('Job not found', HTTP_STATUS.NOT_FOUND))
          }

          // Kiểm tra job có company không
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
              companyId: job.company_id
            })
            return next(new HttpError('Company has no assigned recruiter', HTTP_STATUS.INTERNAL_SERVER_ERROR))
          }

          if (job.companies.recruiter_id !== user_id) {
            console.log('hi', job.companies.recruiter_id)
            console.log('hello', user_id)
            return next(new HttpError(MESSAGES.INSUFFICIENT_PERMISSIONS, HTTP_STATUS.FORBIDDEN))
          }
          break
        }

        case 'company': {
          // Chỉ recruiter owner của company mới có thể sửa company
          if (role !== UserRole.Recruiter) {
            return next(new HttpError(MESSAGES.INSUFFICIENT_PERMISSIONS, HTTP_STATUS.FORBIDDEN))
          }

          const company = await prisma.companies.findUnique({
            where: { id: resourceId },
            select: { recruiter_id: true }
          })

          if (!company || company.recruiter_id !== user_id) {
            return next(new HttpError(MESSAGES.INSUFFICIENT_PERMISSIONS, HTTP_STATUS.FORBIDDEN))
          }
          break
        }

        case 'saved_job': {
          // User chỉ có thể truy cập saved jobs của profile của họ
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

    if (role === UserRole.Admin) {
      return next()
    }

    if (role !== UserRole.Recruiter) {
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

    if (role === UserRole.Admin) {
      return next()
    }

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
