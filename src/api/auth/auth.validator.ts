import { Request, Response, NextFunction } from 'express'
import { z, ZodError, ZodTypeAny } from 'zod'
import { HttpError } from '@/shared/common/http-error'
import { MESSAGES } from '@/shared/constants/messages'
import { verifyToken } from '@/shared/utils/jwt'
import { compareHash, generateHash } from '@/shared/utils/crypto'
import { prisma } from '@/config/database.service'
import { TokenExpiredError } from 'jsonwebtoken'
import { TokenPayload } from '@/types/token-payload.type'
import { envConfig } from '@/config/getEnvConfig'

// Schema cho password
const passwordSchema = z
  .string({
    message: MESSAGES.PASSWORD_MUST_BE_STRING
  })
  .min(1, MESSAGES.PASSWORD_IS_REQUIRED)
  .refine(
    (value) =>
      value.length >= 6 &&
      /[a-z]/.test(value) &&
      /[A-Z]/.test(value) &&
      /[0-9]/.test(value) &&
      /[^a-zA-Z0-9]/.test(value),
    { message: MESSAGES.PASSWORD_MUST_BE_STRONG }
  )

// Schema cho confirm password
export const confirmPasswordSchema = z
  .object({
    body: z.object({
      password: passwordSchema,
      confirm_password: passwordSchema
    })
  })
  .refine((data) => data.body.password === data.body.confirm_password, {
    message: MESSAGES.CONFIRM_PASSWORD_DOES_NOT_MATCH,
    path: ['body', 'confirm_password']
  })

// Schema cho forgot password token (chỉ validate format, không kiểm tra DB)
const forgotPasswordTokenSchema = z
  .string({
    message: MESSAGES.FORGOT_PASSWORD_TOKEN_IS_REQUIRED
  })
  .min(1, MESSAGES.FORGOT_PASSWORD_TOKEN_IS_REQUIRED)
  .superRefine(async (token, ctx) => {
    // Chỉ kiểm tra JWT format và signature, không kiểm tra DB
    try {
      await verifyToken({
        token: token,
        secretKey: envConfig.secrets.jwt.forgotPassword
      })
    } catch (error: any) {
      ctx.addIssue({
        code: 'custom',
        message: error.message || MESSAGES.UNAUTHORIZED,
        path: ['forgot_password_token']
      })
      return
    }
  })

// Middleware để validate dữ liệu bằng Zod
export const validate = <T extends ZodTypeAny>(schema: T) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await schema.parseAsync({
        body: req.body,
        query: req.query,
        headers: req.headers,
        params: req.params
      })

      req.validatedData = result
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string[]> = {}
        error.issues.forEach((issue) => {
          const path = issue.path.join('.') || 'validation'
          if (!errors[path]) errors[path] = []
          errors[path].push(issue.message)
        })
        return next(new HttpError('Validation failed', 400, errors))
      }

      console.error('Unexpected validation error:', error)
      return next(new HttpError('Internal Server Error', 500))
    }
  }
}

// Register validator
export const registerValidator = validate(
  z
    .object({
      body: z.object({
        name: z
          .string({
            message: MESSAGES.NAME_MUST_BE_STRING
          })
          .min(1, MESSAGES.NAME_IS_REQUIRED)
          .max(100, MESSAGES.NAME_LENGTH_MUST_BE_FROM_1_TO_100)
          .trim(),
        email: z
          .email({
            message: MESSAGES.EMAIL_MUST_BE_VALID
          })
          .trim(),
        password: passwordSchema,
        confirm_password: passwordSchema
      })
    })
    .refine((data) => data.body.password === data.body.confirm_password, {
      message: MESSAGES.CONFIRM_PASSWORD_DOES_NOT_MATCH,
      path: ['body', 'confirm_password']
    })
)

// Login validator
export const loginValidator = validate(
  z.object({
    body: z.object({
      email: z
        .email({
          message: MESSAGES.EMAIL_MUST_BE_VALID
        })
        .trim(),
      password: z
        .string({
          message: MESSAGES.PASSWORD_MUST_BE_STRING
        })
        .min(1, MESSAGES.PASSWORD_IS_REQUIRED)
    })
  })
)

// Access token validator
export const accessTokenValidator = validate(
  z.object({
    headers: z.object({
      authorization: z
        .string({
          message: MESSAGES.ACCESS_TOKEN_IS_REQUIRED
        })
        .min(1, MESSAGES.ACCESS_TOKEN_IS_REQUIRED)
        .refine(
          (value) => {
            const [bearer, token] = value.split(' ')
            return bearer === 'Bearer' && token
          },
          { message: MESSAGES.INVALID_TOKEN_FORMAT }
        )
    })
  })
)

// Refresh token validator
export const refreshTokenValidator = validate(
  z.object({
    body: z.object({
      refresh_token: z
        .string({
          message: MESSAGES.REFRESH_TOKEN_IS_REQUIRED
        })
        .min(1, MESSAGES.REFRESH_TOKEN_IS_REQUIRED)
    })
  })
)

// Validator cho endpoint /verify-email
export const verifyEmailValidator = validate(
  z.object({
    body: z.object({
      token: z
        .string({
          message: MESSAGES.TOKEN_MUST_BE_STRING
        })
        .min(1, MESSAGES.TOKEN_IS_REQUIRED)
    })
  })
)

// Change password validator
export const changePasswordValidator = validate(
  z
    .object({
      body: z.object({
        old_password: z
          .string({ message: MESSAGES.OLD_PASSWORD_MUST_BE_STRING })
          .min(1, MESSAGES.OLD_PASSWORD_IS_REQUIRED),
        new_password: passwordSchema,
        confirm_password: z.string().min(1, MESSAGES.CONFIRM_PASSWORD_IS_REQUIRED),
        logout_all_devices: z
          .boolean({
            message: 'logout_all_devices must be a boolean'
          })
          .optional()
      })
    })
    .refine((data) => data.body.new_password === data.body.confirm_password, {
      message: MESSAGES.CONFIRM_PASSWORD_DOES_NOT_MATCH,
      path: ['body', 'confirm_password']
    })
)
