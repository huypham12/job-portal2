import { z } from 'zod'
import { application_status } from '@prisma/client'
import { StageStatus } from '@/shared/constants/enums/application.enum'

/**
 * Validator for getting applications by job ID
 */
const GetApplicationsByJobParamsSchema = z.object({
  jobId: z.string().uuid({ message: 'Job ID must be a valid UUID' })
})

const GetApplicationsByJobQuerySchema = z.object({
  page: z
    .union([z.string(), z.undefined()])
    .optional()
    .transform((val) => {
      if (!val || val.trim() === '') return 1
      const parsed = parseInt(val, 10)
      return isNaN(parsed) || parsed <= 0 ? 1 : parsed
    })
    .pipe(z.number().int().positive({ message: 'Page must be greater than 0' })),
  limit: z
    .union([z.string(), z.undefined()])
    .optional()
    .transform((val) => {
      if (!val || val.trim() === '') return 20
      const parsed = parseInt(val, 10)
      return isNaN(parsed) || parsed < 1 || parsed > 100 ? 20 : parsed
    })
    .pipe(
      z
        .number()
        .int()
        .min(1, { message: 'Limit must be at least 1' })
        .max(100, { message: 'Limit must not exceed 100' })
    ),
  status: z.nativeEnum(application_status).optional(),
  stage: z.string().optional(),
  // Advanced filters
  skills: z
    .union([
      z.string().transform((val) =>
        val
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      ),
      z.array(z.string())
    ])
    .optional(),
  experience_min: z
    .union([z.string(), z.undefined()])
    .optional()
    .transform((val) => {
      if (!val || val.trim() === '') return undefined
      const parsed = parseInt(val, 10)
      return isNaN(parsed) || parsed < 0 ? undefined : parsed
    })
    .pipe(z.number().int().min(0).optional()),
  experience_max: z
    .union([z.string(), z.undefined()])
    .optional()
    .transform((val) => {
      if (!val || val.trim() === '') return undefined
      const parsed = parseInt(val, 10)
      return isNaN(parsed) || parsed < 0 ? undefined : parsed
    })
    .pipe(z.number().int().min(0).optional()),
  education_level: z
    .union([
      z.string().transform((val) =>
        val
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      ),
      z.array(z.string())
    ])
    .optional(),
  location: z.string().optional(),
  salary_min: z
    .union([z.string(), z.undefined()])
    .optional()
    .transform((val) => {
      if (!val || val.trim() === '') return undefined
      const parsed = parseInt(val, 10)
      return isNaN(parsed) || parsed < 0 ? undefined : parsed
    })
    .pipe(z.number().int().min(0).optional()),
  salary_max: z
    .union([z.string(), z.undefined()])
    .optional()
    .transform((val) => {
      if (!val || val.trim() === '') return undefined
      const parsed = parseInt(val, 10)
      return isNaN(parsed) || parsed < 0 ? undefined : parsed
    })
    .pipe(z.number().int().min(0).optional()),
  applied_after: z
    .union([z.string(), z.undefined()])
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true
        return !isNaN(new Date(val).getTime())
      },
      { message: 'Invalid date format. Use ISO 8601 format.' }
    ),
  applied_before: z
    .union([z.string(), z.undefined()])
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true
        return !isNaN(new Date(val).getTime())
      },
      { message: 'Invalid date format. Use ISO 8601 format.' }
    ),
  sort_by: z.enum(['applied_at', 'name', 'experience', 'salary']).optional().default('applied_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc')
})

export const GetApplicationsByJobSchema = {
  params: GetApplicationsByJobParamsSchema,
  query: GetApplicationsByJobQuerySchema
}

export type GetApplicationsByJobDTO = {
  params: z.infer<typeof GetApplicationsByJobParamsSchema>
  query: z.infer<typeof GetApplicationsByJobQuerySchema>
}

/**
 * Validator for job ID param (for stats endpoint)
 */
export const JobIdParamSchema = {
  params: z.object({
    jobId: z.string().uuid({ message: 'Job ID must be a valid UUID' })
  })
}

export type JobIdParamDTO = z.infer<(typeof JobIdParamSchema)['params']>

/**
 * Validator for updating application status
 */
const UpdateStatusParamsSchema = z.object({
  applicationId: z.string().uuid({ message: 'Application ID must be a valid UUID' })
})

const UpdateStatusBodySchema = z.object({
  status: z.nativeEnum(application_status),
  reason: z.string().optional()
})

export const UpdateStatusSchema = {
  params: UpdateStatusParamsSchema,
  body: UpdateStatusBodySchema
}

export type UpdateStatusDTO = {
  params: z.infer<typeof UpdateStatusParamsSchema>
  body: z.infer<typeof UpdateStatusBodySchema>
}

/**
 * Validator for updating application stage
 */
const UpdateStageParamsSchema = z.object({
  applicationId: z.string().uuid({ message: 'Application ID must be a valid UUID' })
})

const UpdateStageBodySchema = z.object({
  stage_id: z.string().uuid({ message: 'Stage ID must be a valid UUID' }),
  status: z.nativeEnum(StageStatus),
  interviewer_notes: z.string().optional(),
  completed_at: z
    .union([z.string(), z.undefined()])
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true
        const date = new Date(val)
        return !isNaN(date.getTime())
      },
      { message: 'Invalid datetime format. Use ISO 8601 format.' }
    )
})

export const UpdateStageSchema = {
  params: UpdateStageParamsSchema,
  body: UpdateStageBodySchema
}

export type UpdateStageDTO = {
  params: z.infer<typeof UpdateStageParamsSchema>
  body: z.infer<typeof UpdateStageBodySchema>
}

/**
 * Validator for creating new stage
 */
const CreateStageParamsSchema = z.object({
  applicationId: z.string().uuid({ message: 'Application ID must be a valid UUID' })
})

const CreateStageBodySchema = z.object({
  stage_name: z.string().min(1).max(100),
  stage_order: z
    .union([
      z.number().int().positive(),
      z.string().transform((val) => {
        const parsed = parseInt(val, 10)
        if (isNaN(parsed) || parsed <= 0) {
          throw new Error('Stage order must be a positive integer')
        }
        return parsed
      })
    ])
    .refine((val) => Number.isInteger(val) && val > 0, {
      message: 'Stage order must be a positive integer'
    }),
  scheduled_at: z
    .union([z.string(), z.undefined()])
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true
        const date = new Date(val)
        return !isNaN(date.getTime())
      },
      { message: 'Invalid datetime format. Use ISO 8601 format.' }
    ),
  recruiter_decision: z.string().max(50).optional(),
  decision_at: z
    .union([z.string(), z.undefined()])
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true
        const date = new Date(val)
        return !isNaN(date.getTime())
      },
      { message: 'Invalid datetime format. Use ISO 8601 format.' }
    ),
  candidate_response_deadline: z
    .union([z.string(), z.undefined()])
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true
        const date = new Date(val)
        return !isNaN(date.getTime())
      },
      { message: 'Invalid datetime format. Use ISO 8601 format.' }
    ),
  candidate_accepted_at: z
    .union([z.string(), z.undefined()])
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true
        const date = new Date(val)
        return !isNaN(date.getTime())
      },
      { message: 'Invalid datetime format. Use ISO 8601 format.' }
    ),
  candidate_declined_at: z
    .union([z.string(), z.undefined()])
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true
        const date = new Date(val)
        return !isNaN(date.getTime())
      },
      { message: 'Invalid datetime format. Use ISO 8601 format.' }
    ),
  decline_reason: z.string().max(255).optional(),
  location: z.string().max(255).optional(),
  interviewer_id: z.string().uuid().optional(),
  duration_minutes: z
    .union([
      z.number().int().positive(),
      z.string().transform((val) => {
        const parsed = parseInt(val, 10)
        if (isNaN(parsed) || parsed <= 0) {
          return undefined
        }
        return parsed
      }),
      z.undefined()
    ])
    .optional()
    .refine((val) => val === undefined || (Number.isInteger(val) && val > 0), {
      message: 'Duration must be a positive integer'
    }),
  interviewer_notes: z.string().optional()
})

export const CreateStageSchema = {
  params: CreateStageParamsSchema,
  body: CreateStageBodySchema
}

export type CreateStageDTO = {
  params: z.infer<typeof CreateStageParamsSchema>
  body: z.infer<typeof CreateStageBodySchema>
}

/**
 * Validator for stage decision by recruiter
 */
const StageDecisionBodySchema = z.object({
  action: z.enum(['create_next_stage', 'accept_application', 'reject_application']),
  // Optional reason (used for reject_application)
  reason: z.string().max(255).optional(),
  // If creating next stage, provide minimal next stage info
  next_stage: z
    .object({
      stage_name: z.string().min(1).max(100),
      scheduled_at: z.string().optional(),
      location: z.string().max(255).optional(),
      duration_minutes: z.union([z.number().int().positive(), z.string().optional()]).optional(),
      interviewer_id: z.string().uuid().optional()
    })
    .optional()
})

const StageDecisionParamsSchema = z.object({
  applicationId: z.string().uuid({ message: 'Application ID must be a valid UUID' }),
  stageId: z.string().uuid({ message: 'Stage ID must be a valid UUID' })
})

export const StageDecisionSchema = {
  params: StageDecisionParamsSchema,
  body: StageDecisionBodySchema
}

export type StageDecisionDTO = {
  params: z.infer<typeof StageDecisionParamsSchema>
  body: z.infer<typeof StageDecisionBodySchema>
}

/**
 * Validator for adding notes
 */
const AddNotesParamsSchema = z.object({
  applicationId: z.string().uuid({ message: 'Application ID must be a valid UUID' })
})

const AddNotesBodySchema = z.object({
  note: z.string().min(1, { message: 'Note cannot be empty' })
})

export const AddNotesSchema = {
  params: AddNotesParamsSchema,
  body: AddNotesBodySchema
}

export type AddNotesDTO = {
  params: z.infer<typeof AddNotesParamsSchema>
  body: z.infer<typeof AddNotesBodySchema>
}

/**
 * Validator for contacting candidate
 */
const ContactCandidateParamsSchema = z.object({
  applicationId: z.string().uuid({ message: 'Application ID must be a valid UUID' })
})

const ContactCandidateBodySchema = z.object({
  subject: z.string().min(1, { message: 'Subject is required' }),
  message: z.string().min(1, { message: 'Message is required' }),
  send_email: z
    .union([
      z.boolean(),
      z.string().transform((val) => {
        if (val === 'true' || val === '1') return true
        if (val === 'false' || val === '0' || val === '') return false
        return Boolean(val)
      })
    ])
    .refine((val) => typeof val === 'boolean', {
      message: 'send_email must be a boolean value'
    })
    .optional()
    .default(false)
})

export const ContactCandidateSchema = {
  params: ContactCandidateParamsSchema,
  body: ContactCandidateBodySchema
}

export type ContactCandidateDTO = {
  params: z.infer<typeof ContactCandidateParamsSchema>
  body: z.infer<typeof ContactCandidateBodySchema>
}

/**
 * Validator for bulk update applications
 */
const BulkUpdateBodySchema = z.object({
  application_ids: z.array(z.string().uuid()).min(1, { message: 'At least one application ID is required' }),
  action: z.enum(['reject', 'accept', 'review']),
  reason: z.string().optional()
})

export const BulkUpdateSchema = {
  body: BulkUpdateBodySchema
}

export type BulkUpdateDTO = z.infer<typeof BulkUpdateBodySchema>

/**
 * Validator for application ID param
 */
export const ApplicationIdParamSchema = {
  params: z.object({
    applicationId: z.string().uuid({ message: 'Application ID must be a valid UUID' })
  })
}

export type ApplicationIdParamDTO = z.infer<(typeof ApplicationIdParamSchema)['params']>

/**
 * Validator for comparing multiple candidates
 */
const CompareCandidatesBodySchema = z.object({
  application_ids: z
    .array(z.string().uuid())
    .min(2, { message: 'At least 2 applications are required for comparison' })
    .max(10, { message: 'Maximum 10 applications can be compared at once' }),
  criteria: z
    .array(z.enum(['skills', 'experience', 'education', 'certifications', 'awards', 'salary_expectation', 'location']))
    .optional()
    .default(['skills', 'experience', 'education', 'certifications'])
})

export const CompareCandidatesSchema = {
  body: CompareCandidatesBodySchema
}

export type CompareCandidatesDTO = z.infer<typeof CompareCandidatesBodySchema>

/**
 * Validator for shortlisting candidates
 */
const ShortlistCandidateBodySchema = z.object({
  application_id: z.string().uuid({ message: 'Application ID must be a valid UUID' }),
  action: z.enum(['add', 'remove']),
  note: z.string().optional()
})

export const ShortlistCandidateSchema = {
  body: ShortlistCandidateBodySchema
}

export type ShortlistCandidateDTO = z.infer<typeof ShortlistCandidateBodySchema>

/**
 * Validator for getting shortlisted candidates
 */
const GetShortlistedQuerySchema = z.object({
  job_id: z.string().uuid().optional(),
  page: z
    .union([z.string(), z.undefined()])
    .optional()
    .transform((val) => {
      if (!val || val.trim() === '') return 1
      const parsed = parseInt(val, 10)
      return isNaN(parsed) || parsed <= 0 ? 1 : parsed
    })
    .pipe(z.number().int().positive({ message: 'Page must be greater than 0' })),
  limit: z
    .union([z.string(), z.undefined()])
    .optional()
    .transform((val) => {
      if (!val || val.trim() === '') return 20
      const parsed = parseInt(val, 10)
      return isNaN(parsed) || parsed < 1 || parsed > 100 ? 20 : parsed
    })
    .pipe(
      z
        .number()
        .int()
        .min(1, { message: 'Limit must be at least 1' })
        .max(100, { message: 'Limit must not exceed 100' })
    )
})

export const GetShortlistedSchema = {
  query: GetShortlistedQuerySchema
}

export type GetShortlistedDTO = z.infer<typeof GetShortlistedQuerySchema>

/**
 * Validator for getting application timeline
 */
export const GetApplicationTimelineSchema = {
  params: z.object({
    applicationId: z.string().uuid({ message: 'Application ID must be a valid UUID' })
  })
}

export type GetApplicationTimelineDTO = z.infer<(typeof GetApplicationTimelineSchema)['params']>
