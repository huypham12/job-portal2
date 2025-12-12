import { RequestHandler } from 'express'
import { z } from 'zod'

type SchemaParts = {
  body?: z.ZodTypeAny
  query?: z.ZodTypeAny
  params?: z.ZodTypeAny
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

    // Safely assign parsed data
    if (parts.body) req.body = parsed.data.body
    if (parts.query) {
      try {
        Object.assign(req.query, parsed.data.query)
      } catch {
        req.query = parsed.data.query
      }
    }
    if (parts.params) {
      try {
        Object.assign(req.params, parsed.data.params)
      } catch {
        req.params = parsed.data.params
      }
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
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => val > 0, { message: 'Page must be greater than 0' }),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .refine((val) => val > 0 && val <= 100, { message: 'Limit must be between 1 and 100' }),
  search: z.string().optional(),
  job_type: z.string().optional(),
  location_id: z.string().uuid('Invalid location ID').optional(),
  sort_by: z.enum(['saved_at', 'salary', 'created_at']).optional().default('saved_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc')
})

export type GetSavedJobsDTO = z.infer<typeof getSavedJobsQuery>

export const getSavedJobsValidator = zodValidate({
  query: getSavedJobsQuery
})
