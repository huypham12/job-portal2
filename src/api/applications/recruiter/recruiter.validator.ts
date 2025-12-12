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
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => val > 0, { message: 'Page must be greater than 0' }),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .refine((val) => val > 0 && val <= 100, { message: 'Limit must be between 1 and 100' }),
  status: z.nativeEnum(application_status).optional(),
  stage: z.string().optional(),
  sort_by: z.enum(['applied_at', 'rating', 'name']).optional().default('applied_at'),
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
  rating: z.number().int().min(1).max(5).optional(),
  interviewer_notes: z.string().optional(),
  completed_at: z.string().datetime().optional()
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
  stage_order: z.number().int().positive(),
  scheduled_at: z.string().datetime().optional(),
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
  send_email: z.boolean().optional().default(false)
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
