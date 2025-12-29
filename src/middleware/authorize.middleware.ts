import { Request, Response, NextFunction } from 'express'
import { HttpError } from '../shared/common/http-error'
import { MESSAGES } from '../shared/constants/messages'
import { HTTP_STATUS } from '../shared/constants/httpStatus'
import { TokenPayload } from '@/types/token-payload.type'
import { UserRole, UserVerifyStatus } from '../shared/constants/enums/user.enum'

// Middleware kiểm tra quyền theo role
export const authorize = (allowedRoles: UserRole[], requireVerified: boolean = true) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { role, user_id, verify } = req.decoded_authorization as TokenPayload

    console.log('Authorization check:', {
      userId: user_id,
      userRole: role,
      userVerified: verify,
      allowedRoles,
      requireVerified,
      isRoleAllowed: allowedRoles.includes(role)
    })

    if (!allowedRoles.includes(role)) {
      console.log('Authorization failed: role not allowed')
      return next(new HttpError(MESSAGES.INSUFFICIENT_PERMISSIONS, HTTP_STATUS.FORBIDDEN))
    }

    // Kiểm tra trạng thái verified nếu được yêu cầu
    if (requireVerified && verify !== UserVerifyStatus.Verified) {
      console.log('Authorization failed: user not verified')
      return next(new HttpError(MESSAGES.USER_NOT_VERIFIED, HTTP_STATUS.FORBIDDEN))
    }

    next()
  }
}

// Middleware chỉ cho Admin (yêu cầu verified)
export const adminOnly = authorize([UserRole.Admin])

// Middleware chỉ cho Recruiter (yêu cầu verified)
export const recruiter = authorize([UserRole.Recruiter])

// Middleware chỉ cho Candidate (yêu cầu verified)
export const candidate = authorize([UserRole.Candidate])

// Middleware cho tất cả role đã đăng nhập (yêu cầu verified)
export const authenticatedUser = authorize([UserRole.Admin, UserRole.Recruiter, UserRole.Candidate])

// Middleware cho tất cả role đã đăng nhập (không yêu cầu verified - cho login/register)
export const authenticatedUserUnverified = authorize([UserRole.Admin, UserRole.Recruiter, UserRole.Candidate], false)
