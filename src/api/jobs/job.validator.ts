import { RequestHandler } from 'express'
import { z } from 'zod'
import { job_type, job_status } from '@prisma/client'

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

    // Store validated data in req.validated, DO NOT mutate req.*
    req.validated = {
      body: parts.body ? parsed.data.body : undefined,
      query: parts.query ? parsed.data.query : undefined,
      params: parts.params ? parsed.data.params : undefined
    }

    next()
  }
}

// ==================== ENUMS ====================
const jobTypeEnum = z.nativeEnum(job_type)
const jobStatusEnum = z.nativeEnum(job_status)

// ==================== SALARY RANGE SCHEMA ====================
const salaryRangeSchema = z
  .object({
    // Accept numeric strings by coercing to number
    min: z.coerce.number().int().min(0, 'Minimum salary must be >= 0'),
    max: z.coerce.number().int().min(0, 'Maximum salary must be >= 0'),
    currency: z.string().default('VND')
  })
  .refine((data) => data.max >= data.min, {
    message: 'Maximum salary must be greater than or equal to minimum salary'
  })

// ==================== CREATE JOB SCHEMA ====================
const createJobBody = z
  .object({
    title: z.string().trim().min(10, 'Title must be at least 10 characters').max(255),
    description: z.string().trim().min(50, 'Description must be at least 50 characters'),
    company_id: z.string().uuid('Invalid company ID'),
    location_id: z.string().uuid('Invalid location ID').optional().nullable(),
    salary_range: salaryRangeSchema.optional(),
    job_type: jobTypeEnum,
    // Coerce numeric strings to numbers for robustness
    experience_level: z.coerce.number().int().min(0).max(30).optional().nullable(),
    expires_at: z
      .string()
      .datetime()
      .transform((str) => new Date(str))
      .refine((date) => date > new Date(), {
        message: 'Expiry date must be in the future'
      })
      .optional(),

    // Optional metadata
    metadata: z.record(z.string(), z.any()).optional(),

    // Job requirements (array of requirement objects)
    requirements: z
      .array(
        z.object({
          requirement_type: z.string().max(50),
          title: z.string().max(255),
          description: z.string().optional(),
          is_required: z.boolean().default(true),
          level: z.string().max(50).optional(),
          years_experience: z.coerce.number().int().min(0).optional()
        })
      )
      .optional(),

    // Job benefits (array of benefit objects)
    benefits: z
      .array(
        z.object({
          benefit_type: z.string().max(50),
          title: z.string().max(255),
          description: z.string().optional(),
          // Accept numeric strings and coerce
          value_amount: z.coerce.number().optional(),
          value_currency: z.string().max(10).default('VND')
        })
      )
      .optional(),

    // Skills (array of skill IDs)
    skill_ids: z.array(z.string().uuid()).optional(),

    // Categories (array of category IDs)
    category_ids: z.array(z.string().uuid()).optional(),

    // Work arrangements
    work_arrangements: z
      .object({
        is_remote_allowed: z.boolean().default(false),
        remote_percentage: z.coerce.number().int().min(0).max(100).default(0),
        flexible_hours: z.boolean().default(false),
        travel_requirement: z.string().max(50).optional(),
        overtime_expected: z.boolean().default(false),
        shift_type: z.string().max(50).optional()
      })
      .optional()
  })
  .strict()

// ==================== UPDATE JOB SCHEMA ====================
const updateJobBody = z
  .object({
    title: z.string().trim().min(10).max(255).optional(),
    description: z.string().trim().min(50).optional(),
    location_id: z.string().uuid().optional().nullable(),
    salary_range: salaryRangeSchema.optional(),
    job_type: jobTypeEnum.optional(),
    experience_level: z.coerce.number().int().min(0).max(30).optional().nullable(),
    expires_at: z
      .string()
      .datetime()
      .transform((str) => new Date(str))
      .refine((date) => date > new Date(), {
        message: 'Expiry date must be in the future'
      })
      .optional(),

    metadata: z.record(z.string(), z.any()).optional(),
    requirements: z
      .array(
        z.object({
          requirement_type: z.string().max(50),
          title: z.string().max(255),
          description: z.string().optional(),
          is_required: z.boolean().default(true),
          level: z.string().max(50).optional(),
          years_experience: z.coerce.number().int().min(0).optional()
        })
      )
      .optional(),
    benefits: z
      .array(
        z.object({
          benefit_type: z.string().max(50),
          title: z.string().max(255),
          description: z.string().optional(),
          value_amount: z.coerce.number().optional(),
          value_currency: z.string().max(10).default('VND')
        })
      )
      .optional(),
    skill_ids: z.array(z.string().uuid()).optional(),
    category_ids: z.array(z.string().uuid()).optional(),
    work_arrangements: z
      .object({
        is_remote_allowed: z.boolean().optional(),
        remote_percentage: z.coerce.number().int().min(0).max(100).optional(),
        flexible_hours: z.boolean().optional(),
        travel_requirement: z.string().max(50).optional(),
        overtime_expected: z.boolean().optional(),
        shift_type: z.string().max(50).optional()
      })
      .optional()
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field must be provided' })

// ==================== UPDATE STATUS SCHEMA ====================
const updateJobStatusBody = z
  .object({
    status: z.enum(['approved', 'closed'])
  })
  .strict()

// ==================== PUBLISH JOBS SCHEMA ====================
// For recruiter to publish jobs from draft to pending_approval
const publishJobsBody = z
  .object({
    job_ids: z.array(z.string().uuid()).min(1, 'At least one job ID is required').max(50, 'Maximum 50 jobs per request')
  })
  .strict()

// ==================== BULK JOB ACTIONS SCHEMA ====================
// Support close/open/delete for jobs management
const bulkJobActionsBody = z
  .object({
    action: z.enum(['close', 'open', 'delete']),
    job_ids: z.array(z.string().uuid()).min(1, 'At least one job ID is required').max(50, 'Maximum 50 jobs per request')
  })
  .strict()

// ==================== BULK EXTEND EXPIRY SCHEMA ====================
const bulkExtendExpiryBody = z
  .object({
    job_ids: z
      .array(z.string().uuid())
      .min(1, 'At least one job ID is required')
      .max(50, 'Maximum 50 jobs per request'),
    new_expires_at: z
      .string()
      .datetime()
      .transform((str) => new Date(str))
      .refine((date) => date > new Date(), {
        message: 'New expiry date must be in the future'
      })
  })
  .strict()

// ==================== SUGGESTED CANDIDATES QUERY SCHEMA ====================
const suggestedCandidatesQuery = z.object({
  size: z.coerce.number().int().min(1).max(50).default(20)
})

// ==================== FILTER JOBS SCHEMA ====================
const filterJobsQuery = z.object({
  // Pagination
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),

  // Search
  search: z.string().trim().optional(),
  skill_names: z.string().trim().optional(), // Comma-separated or space-separated skill names
  location_name: z.string().trim().optional(), // Location name to search in locations table
  tags: z.string().trim().optional(), // Comma-separated tags

  // Filters
  company_id: z.string().uuid().optional(),
  location_id: z.string().uuid().optional(),
  job_type: jobTypeEnum.optional(),
  experience_level: z.coerce.number().int().optional(),
  status: jobStatusEnum.optional(),

  // Salary range
  salary_min: z.coerce.number().int().optional(),
  salary_max: z.coerce.number().int().optional(),

  // Date filters
  posted_after: z
    .string()
    .datetime()
    .transform((str) => new Date(str))
    .optional(),
  posted_before: z
    .string()
    .datetime()
    .transform((str) => new Date(str))
    .optional(),

  // Work arrangements filters
  is_remote: z.coerce.boolean().optional(), // Remote work allowed
  flexible_hours: z.coerce.boolean().optional(), // Flexible working hours
  remote_percentage_min: z.coerce.number().int().min(0).max(100).optional(), // Minimum remote percentage

  // Job categories and benefits filters
  job_category: z.string().trim().optional(), // Job category
  job_category_type: z.enum(['industry', 'technical', 'work_type']).optional(), // Category type
  benefits_type: z.string().trim().optional(), // Benefits type (comma-separated)

  // Sorting
  sort_by: z.enum(['posted_at', 'title', 'salary_min', 'expires_at', 'relevance']).default('posted_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
})

// ==================== MY JOBS QUERY SCHEMA ====================
const myJobsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: jobStatusEnum.optional(),
  sort_by: z.enum(['posted_at', 'title', 'expires_at', 'updated_at']).default('posted_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
})

// ==================== PARAMS SCHEMAS ====================
const jobIdParams = z.object({
  id: z.string().uuid('Invalid job ID')
})

// ==================== TYPE EXPORTS ====================
export type CreateJobDTO = z.infer<typeof createJobBody>
export type UpdateJobDTO = z.infer<typeof updateJobBody>
export type UpdateJobStatusDTO = z.infer<typeof updateJobStatusBody>
export type PublishJobsDTO = z.infer<typeof publishJobsBody>
export type BulkJobActionsDTO = z.infer<typeof bulkJobActionsBody>
export type BulkExtendExpiryDTO = z.infer<typeof bulkExtendExpiryBody>
export type SuggestedCandidatesDTO = z.infer<typeof suggestedCandidatesQuery>
export type FilterJobsDTO = z.infer<typeof filterJobsQuery>
export type MyJobsDTO = z.infer<typeof myJobsQuery>
export type JobIdParams = z.infer<typeof jobIdParams>

// ==================== VALIDATOR EXPORTS ====================
export const createJobValidator = zodValidate({ body: createJobBody })
export const updateJobValidator = zodValidate({ body: updateJobBody, params: jobIdParams })
export const updateJobStatusValidator = zodValidate({ body: updateJobStatusBody, params: jobIdParams })
export const publishJobsValidator = zodValidate({ body: publishJobsBody })
export const bulkJobActionsValidator = zodValidate({ body: bulkJobActionsBody })
export const bulkExtendExpiryValidator = zodValidate({ body: bulkExtendExpiryBody })
export const suggestedCandidatesValidator = zodValidate({ query: suggestedCandidatesQuery, params: jobIdParams })
export const filterJobsValidator = zodValidate({ query: filterJobsQuery })
export const myJobsValidator = zodValidate({ query: myJobsQuery })
export const jobIdValidator = zodValidate({ params: jobIdParams })
