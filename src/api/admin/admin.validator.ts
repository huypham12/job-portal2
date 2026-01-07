import { Request, Response, NextFunction } from 'express'
import { z, ZodError } from 'zod'
import { user_role } from '@prisma/client'
import { HttpError } from '@/shared/common/http-error'
import { HTTP_STATUS } from '@/shared/constants/httpStatus'
import { MESSAGES } from '@/shared/constants/messages'

// Tạo type mở rộng cho Request để có thể thêm validatedBody, validatedParams, validatedQuery
declare module 'express-serve-static-core' {
  interface Request {
    validatedBody?: any
    validatedParams?: any
    validatedQuery?: any
  }
}

/**
 * Middleware chung để validate request dùng Zod
 * @param schemas - Một object chứa các schema cho body, params, và query
 */
export const validate =
  (schemas: { body?: z.ZodSchema; params?: z.ZodSchema; query?: z.ZodSchema }) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate params
      if (schemas.params) {
        const result = schemas.params.safeParse(req.params)
        if (!result.success) throw result.error
        req.validatedParams = result.data // ✅ không gán lại req.params
      }

      // Validate body
      if (schemas.body) {
        const result = schemas.body.safeParse(req.body)
        if (!result.success) throw result.error
        req.validatedBody = result.data // ✅
      }

      // Validate query
      if (schemas.query) {
        const result = schemas.query.safeParse(req.query)
        if (!result.success) throw result.error
        req.validatedQuery = result.data // ✅
      }

      next()
    } catch (error) {
      console.error('Validation error:', error)

      if (error instanceof ZodError) {
        const errors: Record<string, string[]> = {}
        error.issues.forEach((issue) => {
          const path = issue.path.join('.') || 'validation'
          if (!errors[path]) errors[path] = []
          errors[path].push(issue.message)
        })

        return next(new HttpError(MESSAGES.VALIDATION_ERROR, HTTP_STATUS.UNPROCESSABLE_ENTITY, errors))
      }

      return next(new HttpError('Lỗi máy chủ nội bộ', HTTP_STATUS.INTERNAL_SERVER_ERROR))
    }
  }

// --- Các Schemas cụ thể ---

/**
 * 1. Schema cho :userId (dùng cho params)
 */
export const userIdParamsSchema = z.object({
  userId: z.string({ message: 'userId là bắt buộc' }).uuid({ message: 'userId phải là UUID' })
})

/**
 * 2. Schema cho Query của GET /admin/users
 */
export const getAllUsersQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val, ctx) => {
      const num = parseInt(val, 10)
      if (isNaN(num) || num <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Page phải là số nguyên dương'
        })
        return z.NEVER
      }
      return num
    }),
  limit: z
    .string()
    .optional()
    .default('10')
    .transform((val, ctx) => {
      const num = parseInt(val, 10)
      if (isNaN(num) || num <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Limit phải là số nguyên dương'
        })
        return z.NEVER
      }
      return num
    }),
  search: z.string().trim().optional(),
  role: z.nativeEnum(user_role).optional(),
  verified: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true'),
  deleted: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true')
})

/**
 * 3. Schema cho Body của PATCH /admin/users/:userId
 */
export const adminUpdateUserBodySchema = z
  .object({
    role: z.nativeEnum(user_role).optional(),
    verified: z.boolean().optional(),
    deleted: z.boolean().optional()
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Body không được rỗng. Cần ít nhất một trường để cập nhật.'
  })

// --- Inferred Types từ Zod Schemas ---

/**
 * Type được suy ra từ userIdParamsSchema
 */
export type UserIdParams = z.infer<typeof userIdParamsSchema>

/**
 * Type được suy ra từ getAllUsersQuerySchema
 */
export type GetAllUsersQuery = z.infer<typeof getAllUsersQuerySchema>

/**
 * Type được suy ra từ adminUpdateUserBodySchema
 */
export type AdminUpdateUserBody = z.infer<typeof adminUpdateUserBodySchema>

// ========================== JOB MANAGEMENT SCHEMAS ==========================

/**
 * 4. Schema cho :id (jobId) trong params
 */
export const jobIdParamsSchema = z.object({
  id: z.string({ message: 'id là bắt buộc' }).uuid({ message: 'id phải là UUID' })
})

/**
 * 5. Schema cho Query của GET /admin/jobs
 */
export const getAllJobsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val, ctx) => {
      const num = parseInt(val, 10)
      if (isNaN(num) || num <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Page phải là số nguyên dương'
        })
        return z.NEVER
      }
      return num
    }),
  limit: z
    .string()
    .optional()
    .default('10')
    .transform((val, ctx) => {
      const num = parseInt(val, 10)
      if (isNaN(num) || num <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Limit phải là số nguyên dương'
        })
        return z.NEVER
      }
      return num
    }),
  search: z.string().trim().optional(),
  status: z.enum(['draft', 'pending_approval', 'approved', 'closed']).optional(),
  deleted: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true')
})


/**
 * 7. Schema cho Body của PATCH /admin/jobs/:id/reject
 */
export const jobRejectBodySchema = z.object({
  reason: z.string().min(10, 'Lý do từ chối phải có ít nhất 10 ký tự').max(500)
})

// --- Inferred Types từ Zod Schemas (Jobs) ---

export type JobIdParams = z.infer<typeof jobIdParamsSchema>
export type GetAllJobsQuery = z.infer<typeof getAllJobsQuerySchema>
export type JobRejectBody = z.infer<typeof jobRejectBodySchema>
