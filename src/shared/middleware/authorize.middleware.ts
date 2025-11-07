import { Request, Response, NextFunction } from 'express'
import { HttpError } from '../common/http-error'
import { MESSAGES } from '../constants/messages'
import { HTTP_STATUS } from '../constants/httpStatus'
import { TokenPayload } from '@/types/token-payload.type'
import { UserRole } from '../constants/enums/user.enum'

// Middleware kiểm tra quyền theo role
export const authorize = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { role } = req.decoded_authorization as TokenPayload

    if (!allowedRoles.includes(role)) {
      return next(new HttpError(MESSAGES.INSUFFICIENT_PERMISSIONS, HTTP_STATUS.FORBIDDEN))
    }

    next()
  }
}

// Middleware chỉ cho Admin
export const adminOnly = authorize([UserRole.Admin])

// Middleware chỉ cho Recruiter và Admin
export const recruiterAndAdmin = authorize([UserRole.Recruiter, UserRole.Admin])

// Middleware chỉ cho Candidate và Admin
export const candidateAndAdmin = authorize([UserRole.Candidate, UserRole.Admin])

// Middleware cho tất cả role đã đăng nhập
export const authenticatedUser = authorize([UserRole.Admin, UserRole.Recruiter, UserRole.Candidate])
