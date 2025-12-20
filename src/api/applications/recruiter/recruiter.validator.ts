import { z } from 'zod'
import { application_status } from '@prisma/client'

/**
 * Validator for getting applications by job ID
 */
const GetApplicationsByJobParamsSchema = z.object({
  jobId: z.string().uuid({ message: 'Job ID must be a valid UUID' })
})

const GetApplicationsByJobQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => {
      if (!val || val.trim() === '') return 1
      const parsed = parseInt(val, 10)
      return isNaN(parsed) ? 1 : parsed
    })
    .pipe(z.number().int().positive({ message: 'Page must be greater than 0' })),
  limit: z
    .string()
    .optional()
    .transform((val) => {
      if (!val || val.trim() === '') return 20
      const parsed = parseInt(val, 10)
      return isNaN(parsed) ? 20 : parsed
    })
    .pipe(z.number().int().min(1, { message: 'Limit must be at least 1' }).max(100, { message: 'Limit must not exceed 100' })),
  status: z.nativeEnum(application_status).optional(),
  stage: z.string().optional(),
  sort_by: z
    .enum(['applied_at', 'rating', 'name'])
    .optional()
    .default('applied_at'),
  order: z
    .enum(['asc', 'desc'])
    .optional()
    .default('desc')
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
  id: z.string().uuid({ message: 'Application ID must be a valid UUID' })
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
  id: z.string().uuid({ message: 'Application ID must be a valid UUID' })
})

const UpdateStageBodySchema = z.object({
  stage_id: z.string().uuid({ message: 'Stage ID must be a valid UUID' }),
  status: z.string().min(1).max(50),
  feedback: z.string().optional(),
  rating: z
    .union([
      z.number().int().min(1).max(5),
      z.string().transform((val) => {
        const parsed = parseInt(val, 10)
        if (isNaN(parsed)) {
          throw new Error('Rating must be a number between 1 and 5')
        }
        return parsed
      })
    ])
    .refine((val) => Number.isInteger(val) && val >= 1 && val <= 5, {
      message: 'Rating must be an integer between 1 and 5'
    })
    .optional(),
  interviewer_notes: z.string().optional(),
  completed_at: z
    .string()
    .refine(
      (val) => {
        const date = new Date(val)
        return !isNaN(date.getTime())
      },
      { message: 'Invalid datetime format. Use ISO 8601 format.' }
    )
    .optional()
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
  id: z.string().uuid({ message: 'Application ID must be a valid UUID' })
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
    .string()
    .refine(
      (val) => {
        const date = new Date(val)
        return !isNaN(date.getTime())
      },
      { message: 'Invalid datetime format. Use ISO 8601 format.' }
    )
    .optional(),
  location: z.string().max(255).optional(),
  meeting_link: z.string().max(500).url({ message: 'Invalid URL format' }).optional().or(z.literal('')),
  meeting_password: z.string().max(50).optional(),
  interviewer_id: z.string().uuid({ message: 'Interviewer ID must be a valid UUID' }).optional(),
  duration_minutes: z
    .union([
      z.number().int().positive(),
      z.string().transform((val) => {
        const parsed = parseInt(val, 10)
        if (isNaN(parsed) || parsed <= 0) {
          throw new Error('Duration must be a positive integer')
        }
        return parsed
      })
    ])
    .refine((val) => Number.isInteger(val) && val > 0, {
      message: 'Duration must be a positive integer'
    })
    .optional(),
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
 * Validator for adding notes
 */
const AddNotesParamsSchema = z.object({
  id: z.string().uuid({ message: 'Application ID must be a valid UUID' })
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
  id: z.string().uuid({ message: 'Application ID must be a valid UUID' })
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
    id: z.string().uuid({ message: 'Application ID must be a valid UUID' })
  })
}

export type ApplicationIdParamDTO = z.infer<(typeof ApplicationIdParamSchema)['params']>

/**
 * Validator for sending offer
 */
const SendOfferParamsSchema = z.object({
  id: z.string().uuid({ message: 'Application ID must be a valid UUID' })
})

const SendOfferBodySchema = z.object({
  salary: z
    .object({
      min: z.number().positive().optional(),
      max: z.number().positive().optional(),
      currency: z.string().default('VND')
    })
    .optional(),
  start_date: z
    .string()
    .refine(
      (val) => {
        const date = new Date(val)
        return !isNaN(date.getTime())
      },
      { message: 'Invalid date format. Use ISO 8601 format.' }
    )
    .optional(),
  message: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional()
})

export const SendOfferSchema = {
  params: SendOfferParamsSchema,
  body: SendOfferBodySchema
}

export type SendOfferDTO = {
  params: z.infer<typeof SendOfferParamsSchema>
  body: z.infer<typeof SendOfferBodySchema>
}
