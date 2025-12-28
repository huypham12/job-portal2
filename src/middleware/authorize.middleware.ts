import { Request, Response, NextFunction } from 'express'
import { HttpError } from '../shared/common/http-error'
import { MESSAGES } from '../shared/constants/messages'
import { HTTP_STATUS } from '../shared/constants/httpStatus'
import { TokenPayload } from '@/types/token-payload.type'
import { UserRole } from '../shared/constants/enums/user.enum'

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

// Middleware chỉ cho Recruiter
export const recruiter = authorize([UserRole.Recruiter])

// Middleware chỉ cho Candidate
export const candidate = authorize([UserRole.Candidate])

// Middleware cho tất cả role đã đăng nhập
export const authenticatedUser = authorize([UserRole.Admin, UserRole.Recruiter, UserRole.Candidate])
