import { RequestHandler } from 'express'
import { z } from 'zod'

type SchemaParts = {
  body?: z.ZodTypeAny
  query?: z.ZodTypeAny
  params?: z.ZodTypeAny
}

const zodValidate = (parts: SchemaParts): RequestHandler => {
  return (req, res, next) => {
    try {
      // Validate each part separately to ensure proper type coercion
      if (parts.body) {
        const result = parts.body.safeParse(req.body)
        if (!result.success) {
          res.status(400).json({
            message: 'Validation error',
            errors: result.error.issues.map((i) => ({
              path: i.path.join('.'),
              message: i.message
            }))
          })
          return
        }
        req.body = result.data
      }

      if (parts.query) {
        const result = parts.query.safeParse(req.query)
        if (!result.success) {
          res.status(400).json({
            message: 'Validation error',
            errors: result.error.issues.map((i) => ({
              path: i.path.join('.'),
              message: i.message
            }))
          })
          return
        }
        // Clear existing query and assign validated data
        Object.keys(req.query).forEach((key) => delete (req.query as any)[key])
        Object.assign(req.query, result.data)
      }

      if (parts.params) {
        const result = parts.params.safeParse(req.params)
        if (!result.success) {
          res.status(400).json({
            message: 'Validation error',
            errors: result.error.issues.map((i) => ({
              path: i.path.join('.'),
              message: i.message
            }))
          })
          return
        }
        // Clear existing params and assign validated data
        Object.keys(req.params).forEach((key) => delete (req.params as any)[key])
        Object.assign(req.params, result.data)
      }

      next()
    } catch (error) {
      res.status(500).json({
        message: 'Internal validation error'
      })
    }
  }
}

// ==================== SAVE JOB SCHEMA ====================
const saveJobBody = z.object({
  job_id: z.string().uuid('Invalid job ID')
})

export type SaveJobDTO = z.infer<typeof saveJobBody>

export const saveJobValidator = zodValidate({
  body: saveJobBody
})

// ==================== JOB ID PARAM ====================
const jobIdParams = z.object({
  jobId: z.string().uuid('Invalid job ID')
})

export const jobIdValidator = zodValidate({
  params: jobIdParams
})

// ==================== GET SAVED JOBS SCHEMA ====================
const getSavedJobsQuery = z.object({
  page: z.preprocess((val) => {
    // Handle empty string or invalid values as undefined to use default
    if (val === undefined || val === null || val === '') return undefined
    const num = Number(val)
    return isNaN(num) ? undefined : num
  }, z.number().int().min(1, 'Page must be greater than 0').default(1)),
  limit: z.preprocess((val) => {
    // Handle empty string or invalid values as undefined to use default
    if (val === undefined || val === null || val === '') return undefined
    const num = Number(val)
    return isNaN(num) ? undefined : num
  }, z.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit must be at most 100').default(10)),
  search: z.preprocess((val) => {
    // Handle empty string as undefined
    if (val === undefined || val === null || val === '') return undefined
    return val
  }, z.string().optional()),
  job_type: z.preprocess((val) => {
    // Handle empty string as undefined
    if (val === undefined || val === null || val === '') return undefined
    return val
  }, z.string().optional()),
  location_id: z.preprocess((val) => {
    // Handle empty string as undefined
    if (val === undefined || val === null || val === '') return undefined
    return val
  }, z.string().uuid('Invalid location ID').optional()),
  sort_by: z.preprocess(
    (val) => {
      // Handle empty string as undefined to use default
      if (val === undefined || val === null || val === '') return undefined
      return val
    },
    z
      .enum(['saved_at', 'salary', 'created_at'], { message: 'sort_by must be one of: saved_at, salary, created_at' })
      .default('saved_at')
  ),
  order: z.preprocess(
    (val) => {
      // Handle empty string as undefined to use default
      if (val === undefined || val === null || val === '') return undefined
      return val
    },
    z.enum(['asc', 'desc'], { message: 'order must be either asc or desc' }).default('desc')
  )
})

export type GetSavedJobsDTO = z.infer<typeof getSavedJobsQuery>

export const getSavedJobsValidator = zodValidate({
  query: getSavedJobsQuery
})
