import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../shared/utils/jwt'
import { HttpError } from '../shared/common/http-error'
import { MESSAGES } from '../shared/constants/messages'
import { TokenExpiredError } from 'jsonwebtoken'
import { prisma } from '@/config/database.service'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'
import { envConfig } from '@/config/getEnvConfig'
import { TokenPayload } from '@/types/token-payload.type'
import { UserVerifyStatus } from '@/shared/constants/enums'
import { compareHash, generateHash } from '@/shared/utils/crypto'

// Middleware xác thực access token
export const authenticateAccessToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('Auth middleware - checking token for path:', req.path)
    const authorization = req.headers.authorization
    if (!authorization) {
      console.log('Auth middleware - no authorization header')
      return next(new HttpError(MESSAGES.ACCESS_TOKEN_IS_REQUIRED, 401))
    }

    const [bearer, token] = authorization.split(' ')
    if (!token || bearer !== 'Bearer') {
      console.log('Auth middleware - invalid token format')
      return next(new HttpError(MESSAGES.INVALID_TOKEN_FORMAT, HTTP_STATUS.UNAUTHORIZED))
    }

    const decodedToken = await verifyToken({
      token,
      secretKey: envConfig.secrets.jwt.access as string
    })

    console.log('Auth middleware - decoded token:', {
      userId: decodedToken.user_id,
      role: decodedToken.role
    })

    // Gắn decoded token vào request
    req.decoded_authorization = decodedToken as TokenPayload
    next()
  } catch (error) {
    console.log('Auth middleware - token verification failed:', error instanceof Error ? error.message : String(error))
    const message = error instanceof TokenExpiredError ? MESSAGES.TOKEN_EXPIRED : MESSAGES.UNAUTHORIZED
    return next(new HttpError(message, 401))
  }
}

// Middleware xác thực forgot password token
export const authenticateForgotPasswordToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body
    if (typeof token !== 'string') {
      return next(new HttpError(MESSAGES.TOKEN_INVALID_FORMAT, 400))
    }

    // 1. Giải mã JWT (Kiểm tra chữ ký và Hạn sử dụng (exp))
    const decodedToken = await verifyToken({
      token,
      secretKey: envConfig.secrets.jwt.forgotPassword
    }) as TokenPayload

    // 2. Tìm user
    const user = await prisma.users.findUnique({
      where: { id: decodedToken.user_id }
    })

    if (!user) {
      return next(new HttpError(MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND))
    }

    // 3. Tìm tất cả token 'reset_password' còn hạn của user
    const userTokens = await prisma.user_tokens.findMany({
      where: {
        user_id: decodedToken.user_id,
        type: 'reset_password',
        expires_at: { gt: new Date() } // Kiểm tra hạn sử dụng trong CSDL
      }
    })

    if (userTokens.length === 0) {
      return next(new HttpError(MESSAGES.INVALID_FORGOT_PASSWORD_TOKEN, HTTP_STATUS.BAD_REQUEST))
    }

    // 4. So sánh hash
    let isMatch = false
    for (const record of userTokens) {
      if (await compareHash(token, record.token_hash)) {
        isMatch = true
        break
      }
    }

    if (!isMatch) {
      return next(new HttpError(MESSAGES.INVALID_FORGOT_PASSWORD_TOKEN, HTTP_STATUS.BAD_REQUEST))
    }

    // 5. Gắn decoded token vào request
    req.decoded_forgot_password_token = decodedToken
    next()
  } catch (error) {
    console.error('Error validating forgot password token:', error)
    return next(new HttpError(MESSAGES.UNAUTHORIZED, 401))
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

// Middleware cũ chỉ decode token (không kiểm tra DB)
// Được giữ lại để tương thích ngược, nhưng khuyến nghị dùng authenticateForgotPasswordToken mới
export const authenticateForgotPasswordTokenOld = async (req: Request, res: Response, next: NextFunction) => {
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
      secretKey: envConfig.secrets.jwt.refresh
    })) as TokenPayload

    // 2. Hash token và query trực tiếp bằng token_hash (vì token_hash là unique)
    const tokenHash = await generateHash(refresh_token)

    const userToken = await prisma.refresh_tokens.findFirst({
      where: {
        user_id: decodedToken.user_id,
        token_hash: tokenHash,
        expires_at: { gt: new Date() } // Chỉ lấy token còn hạn
      }
    })

    if (!userToken) {
      return next(new HttpError(MESSAGES.REFRESH_TOKEN_INVALID_OR_REVOKED, HTTP_STATUS.UNAUTHORIZED))
    }

    // 3. Gắn token vào request
    req.decoded_refresh_token = decodedToken
    next()
  } catch (error) {
    const message = error instanceof TokenExpiredError ? MESSAGES.TOKEN_EXPIRED : MESSAGES.UNAUTHORIZED
    return next(new HttpError(message, 401))
  }
}

export const verifiedUserValidator = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id } = req.decoded_authorization as TokenPayload

    // Kiểm tra trạng thái verified từ database thay vì JWT token
    const user = await prisma.users.findUnique({
      where: { id: user_id },
      select: { verified: true }
    })

    if (!user) {
      return next(new HttpError(MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND))
    }

    if (!user.verified) {
      return next(
        new HttpError(MESSAGES.USER_NOT_VERIFIED, HTTP_STATUS.FORBIDDEN, {
          verify: [MESSAGES.USER_NOT_VERIFIED]
        })
      )
    }

    next()
  } catch (error) {
    console.error('Error checking user verification status:', error)
    return next(new HttpError('Internal server error', HTTP_STATUS.INTERNAL_SERVER_ERROR))
  }
}
