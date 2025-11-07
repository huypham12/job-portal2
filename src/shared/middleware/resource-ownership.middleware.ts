import { Request, Response, NextFunction } from 'express'
import { prisma } from '@/config/database.service'
import { HttpError } from '../common/http-error'
import { MESSAGES } from '../constants/messages'
import { HTTP_STATUS } from '../constants/httpStatus'
import { TokenPayload } from '@/types/token-payload.type'
import { UserRole } from '../constants/enums/user.enum'

// Middleware kiểm tra user chỉ có thể truy cập data của chính họ
export const checkResourceOwnership = (
  resourceType: 'user' | 'profile' | 'resume' | 'application' | 'job' | 'company' | 'saved_job' | 'attachment'
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id, role } = req.decoded_authorization as TokenPayload
      const paramId = req.params.id || req.params.userId
      const resourceId = paramId ?? (resourceType === 'user' ? user_id : undefined)
      if (!resourceId) {
        return next(new HttpError('Missing resource ID in URL parameters', HTTP_STATUS.BAD_REQUEST))
      }

      if (role === UserRole.Admin) {
        return next()
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
          // Kiểm tra resume thuộc về user hiện tại
          const resume = await prisma.resumes.findUnique({
            where: { id: resourceId },
            select: { user_id: true }
          })

          if (!resume || resume.user_id !== user_id) {
            return next(new HttpError(MESSAGES.INSUFFICIENT_PERMISSIONS, HTTP_STATUS.FORBIDDEN))
          }
          break
        }

        case 'application': {
          // Candidate chỉ xem được application của họ
          // Recruiter chỉ xem được application cho job của công ty họ
          const application = await prisma.applications.findUnique({
            where: { id: resourceId },
            include: {
              jobs: {
                select: {
                  company_id: true,
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

          if (role === UserRole.Candidate && application.user_id !== user_id) {
            return next(new HttpError(MESSAGES.INSUFFICIENT_PERMISSIONS, HTTP_STATUS.FORBIDDEN))
          }

          if (role === UserRole.Recruiter) {
            // Kiểm tra recruiter có phải là owner của company không
            const isOwner = application.jobs.companies?.recruiter_id === user_id

            if (!isOwner) {
              return next(new HttpError(MESSAGES.INSUFFICIENT_PERMISSIONS, HTTP_STATUS.FORBIDDEN))
            }
          }
          break
        }

        case 'job': {
          // Chỉ recruiter owner của company mới có thể sửa/xóa job
          if (role !== UserRole.Recruiter) {
            return next(new HttpError(MESSAGES.INSUFFICIENT_PERMISSIONS, HTTP_STATUS.FORBIDDEN))
          }

          const job = await prisma.jobs.findUnique({
            where: { id: resourceId },
            include: {
              companies: {
                select: { recruiter_id: true }
              }
            }
          })

          if (!job) {
            return next(new HttpError('Job not found', HTTP_STATUS.NOT_FOUND))
          }

          if (job.companies?.recruiter_id !== user_id) {
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
          // User chỉ có thể truy cập saved jobs của họ
          const savedJob = await prisma.saved_jobs.findUnique({
            where: { id: resourceId },
            select: { user_id: true }
          })

          if (!savedJob || savedJob.user_id !== user_id) {
            return next(new HttpError(MESSAGES.INSUFFICIENT_PERMISSIONS, HTTP_STATUS.FORBIDDEN))
          }
          break
        }

        case 'attachment': {
          // Kiểm tra attachment thuộc về user hoặc company của user
          const attachment = await prisma.attachments.findUnique({
            where: { id: resourceId },
            select: {
              owner_id: true,
              owner_type: true
            }
          })

          if (!attachment) {
            return next(new HttpError('Attachment not found', HTTP_STATUS.NOT_FOUND))
          }

          let hasAccess = false

          if (attachment.owner_type === 'user' && attachment.owner_id === user_id) {
            hasAccess = true
          } else if (attachment.owner_type === 'company' && role === UserRole.Recruiter) {
            // Kiểm tra user có sở hữu company này không
            const company = await prisma.companies.findUnique({
              where: { id: attachment.owner_id },
              select: { recruiter_id: true }
            })

            if (company?.recruiter_id === user_id) {
              hasAccess = true
            }
          }

          if (!hasAccess) {
            return next(new HttpError(MESSAGES.INSUFFICIENT_PERMISSIONS, HTTP_STATUS.FORBIDDEN))
          }
          break
        }

        default:
          return next(new HttpError('Invalid resource type', HTTP_STATUS.BAD_REQUEST))
      }

      next()
    } catch (error) {
      next(new HttpError('Error checking resource ownership', HTTP_STATUS.INTERNAL_SERVER_ERROR))
    }
  }
}

// Middleware đặc biệt cho company subscription (chỉ company owner)
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

// Middleware kiểm tra quyền truy cập payment
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
