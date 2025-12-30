import { Request, Response, NextFunction } from 'express'
import { HttpError } from '../shared/common/http-error'
import { MESSAGES } from '../shared/constants/messages'
import { HTTP_STATUS } from '../shared/constants/httpStatus'
import { TokenPayload } from '@/types/token-payload.type'
import { UserRole, UserVerifyStatus } from '../shared/constants/enums/user.enum'
import { prisma } from '@/config/database.service'

// Middleware kiểm tra quyền theo role
export const authorize = (allowedRoles: string[], requireVerified: boolean = true) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { role, user_id } = req.decoded_authorization as TokenPayload
      const userRole = role as string

      console.log('Authorization check:', {
        userId: user_id,
        userRole,
        allowedRoles,
        requireVerified
      })

      // Kiểm tra role permission
      if (!allowedRoles.includes(userRole)) {
        console.log('Authorization failed: role not allowed')
        return next(new HttpError(MESSAGES.INSUFFICIENT_PERMISSIONS, HTTP_STATUS.FORBIDDEN))
      }

      // Kiểm tra trạng thái verified từ database nếu được yêu cầu
      if (requireVerified) {
        const user = await prisma.users.findUnique({
          where: { id: user_id },
          select: { verified: true }
        })

        if (!user) {
          console.log('Authorization failed: user not found')
          return next(new HttpError(MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND))
        }

        if (!user.verified) {
          console.log('Authorization failed: user not verified')
          return next(new HttpError(MESSAGES.USER_NOT_VERIFIED, HTTP_STATUS.FORBIDDEN))
        }
      }

      next()
    } catch (error) {
      console.error('Authorization error:', error)
      return next(new HttpError('Authorization failed', HTTP_STATUS.INTERNAL_SERVER_ERROR))
    }
  }
}

// Middleware chỉ cho Admin (yêu cầu verified)
export const adminOnly = authorize(['admin'])

// Middleware chỉ cho Recruiter (yêu cầu verified)
export const recruiter = authorize(['recruiter'])

// Middleware chỉ cho Candidate (yêu cầu verified)
export const candidate = authorize(['candidate'])

// Middleware cho tất cả role đã đăng nhập (yêu cầu verified)
export const authenticatedUser = authorize(['admin', 'recruiter', 'candidate'])

// Middleware cho tất cả role đã đăng nhập (không yêu cầu verified - cho login/register)
export const authenticatedUserUnverified = authorize(['admin', 'recruiter', 'candidate'], false)
