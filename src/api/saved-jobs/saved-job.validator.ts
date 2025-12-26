import { RequestHandler } from 'express'
import { z } from 'zod'

type SchemaParts = {
  body?: z.ZodTypeAny
  query?: z.ZodTypeAny
  params?: z.ZodTypeAny
}

// Extend Request interface to include validated property
declare global {
  namespace Express {
    interface Request {
      validated?: {
        body?: any
        params?: any
        query?: any
      }
    }
  }
}

const zodValidate = (parts: SchemaParts): RequestHandler => {
  const schema = z.object({
    body: parts.body ?? z.any(),
    query: parts.query ?? z.any(),
    params: parts.params ?? z.any()
  })

  return (req, res, next) => {
    const parsed = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params
    })
    if (!parsed.success) {
      res.status(400).json({
        message: 'Validation error',
        errors: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message
        }))
      })
      return
    }

    // Store validated data in req.validated, DO NOT mutate req.*
    req.validated = {
      body: parts.body ? parsed.data.body : undefined,
      query: parts.query ? parsed.data.query : undefined,
      params: parts.params ? parsed.data.params : undefined
    }

    next()
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
    z.enum(['saved_at', 'salary', 'created_at']).default('saved_at')
  ),
  order: z.preprocess(
    (val) => {
      // Handle empty string as undefined to use default
      if (val === undefined || val === null || val === '') return undefined
      return val
    },
    z.enum(['asc', 'desc']).default('desc')
  )
})

export type GetSavedJobsDTO = z.infer<typeof getSavedJobsQuery>

export const getSavedJobsValidator = zodValidate({
  query: getSavedJobsQuery
})
