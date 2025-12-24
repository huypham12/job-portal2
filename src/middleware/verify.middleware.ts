import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt'
import { HttpError } from '../common/http-error'
import { MESSAGES } from '../constants/messages'
import { TokenExpiredError } from 'jsonwebtoken'
import { prisma } from '@/config/database.service'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'
import { envConfig } from '@/config/getEnvConfig'
import { TokenPayload } from '@/types/token-payload.type'
import { UserVerifyStatus } from '@/shared/constants/enums'
import { compareHash } from '@/shared/utils/crypto' // <-- [THÊM MỚI]

// Middleware xác thực access token
export const authenticateAccessToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authorization = req.headers.authorization
    if (!authorization) {
      return next(new HttpError(MESSAGES.ACCESS_TOKEN_IS_REQUIRED, 401))
    }

    const [bearer, token] = authorization.split(' ')
    if (!token || bearer !== 'Bearer') {
      return next(new HttpError(MESSAGES.INVALID_TOKEN_FORMAT, HTTP_STATUS.UNAUTHORIZED))
    }

    const decodedToken = await verifyToken({
      token,
      secretKey: envConfig.secrets.jwt.access as string
    })

    // Gắn decoded token vào request
    req.decoded_authorization = decodedToken as TokenPayload
    next()
  } catch (error) {
    const message = error instanceof TokenExpiredError ? MESSAGES.TOKEN_EXPIRED : MESSAGES.UNAUTHORIZED
    return next(new HttpError(message, 401))
  }
}

// Middleware xác thực email verify token
// Hàm này chỉ decode. Validator (bên Zod) sẽ làm nhiệm vụ kiểm tra DB.
export const authenticateEmailVerifyToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body
    if (typeof token !== 'string') {
      return next(new HttpError(MESSAGES.TOKEN_INVALID_FORMAT, 400))
    }

    const decodedToken = await verifyToken({
      token,
      secretKey: envConfig.secrets.jwt.emailVerify as string
    })

    // Gắn decoded token vào request object thông qua global property
    req.decoded_email_verify_token = decodedToken as TokenPayload
    next()
  } catch (error) {
    return next(new HttpError(MESSAGES.UNAUTHORIZED, 401))
  }
}

// Validator (forgotPasswordTokenSchema) đã kiểm tra CSDL rồi.
// Middleware này chỉ cần decode token (giống hệt authenticateEmailVerifyToken)
export const authenticateForgotPasswordToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body
    if (typeof token !== 'string') {
      return next(new HttpError(MESSAGES.TOKEN_INVALID_FORMAT, 400))
    }

    const decodedToken = await verifyToken({
      token,
      secretKey: envConfig.secrets.jwt.forgotPassword as string
    })

    // Gắn decoded token vào request object thông qua global property
    req.decoded_forgot_password_token = decodedToken as TokenPayload
    next()
  } catch (error) {
    return next(new HttpError(MESSAGES.UNAUTHORIZED, 401))
  }
}

// Middleware xác thực refresh token
export const authenticateRefreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refresh_token } = req.body
    if (!refresh_token) {
      return next(new HttpError(MESSAGES.REFRESH_TOKEN_IS_REQUIRED, 401))
    }

    // 1. Giải mã token (kiểm tra chữ ký, exp)
    const decodedToken = (await verifyToken({
      token: refresh_token,
      secretKey: process.env.JWT_SECRET_REFRESH_TOKEN as string
    })) as TokenPayload

    // 2. Tìm token (đã hash) trong CSDL
    // (Thay thế cho: databaseService.refreshTokens.findOne)
    const userTokens = await prisma.refresh_tokens.findMany({
      where: {
        user_id: decodedToken.user_id,
        expires_at: { gt: new Date() } // Chỉ lấy token còn hạn
      }
    })

    if (userTokens.length === 0) {
      return next(new HttpError(MESSAGES.REFRESH_TOKEN_INVALID_OR_REVOKED, HTTP_STATUS.UNAUTHORIZED))
    }

    // 3. So sánh hash
    let isMatch = false
    for (const record of userTokens) {
      if (await compareHash(refresh_token, record.token_hash)) {
        isMatch = true
        break
      }
    }

    if (!isMatch) {
      return next(new HttpError(MESSAGES.REFRESH_TOKEN_INVALID_OR_REVOKED, HTTP_STATUS.UNAUTHORIZED))
    }

    // 4. Gắn token vào request
    req.decoded_refresh_token = decodedToken
    next()
  } catch (error) {
    const message = error instanceof TokenExpiredError ? MESSAGES.TOKEN_EXPIRED : MESSAGES.UNAUTHORIZED
    return next(new HttpError(message, 401))
  }
}

export const verifiedUserValidator = (req: Request, res: Response, next: NextFunction) => {
  const { verify } = req.decoded_authorization as TokenPayload
  if (verify !== UserVerifyStatus.Verified) {
    next(
      new HttpError(MESSAGES.USER_NOT_VERIFIED, HTTP_STATUS.FORBIDDEN, {
        verify: [MESSAGES.USER_NOT_VERIFIED]
      })
    )
    return
  }
  next()
}
