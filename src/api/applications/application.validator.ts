import { z } from 'zod'
import { application_status } from '@prisma/client'

/**
 * Validator for creating a new application
 */
const CreateApplicationBodySchema = z.object({
  job_id: z.string().uuid({ message: 'Job ID must be a valid UUID' }),
  resume_id: z.string().uuid({ message: 'Resume ID must be a valid UUID' }).optional(),
  metadata: z.record(z.string(), z.any()).optional()
})

export const CreateApplicationSchema = {
  body: CreateApplicationBodySchema
}

export type CreateApplicationDTO = z.infer<typeof CreateApplicationBodySchema>

/**
 * Validator for getting applications list with filters
 */
const GetApplicationsQuerySchema = z.object({
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
  sort_by: z
    .enum(['applied_at', 'status'])
    .optional()
    .default('applied_at'),
  order: z
    .enum(['asc', 'desc'])
    .optional()
    .default('desc')
})

export const GetApplicationsSchema = {
  query: GetApplicationsQuerySchema
}

export type GetApplicationsDTO = z.infer<typeof GetApplicationsQuerySchema>

/**
 * Validator for UUID params (used for getting application by ID, stages, documents, etc.)
 */
const UUIDParamsSchema = z.object({
  id: z.string().uuid({ message: 'Application ID must be a valid UUID' })
})

export const UUIDParamSchema = {
  params: UUIDParamsSchema
}

export type UUIDParamDTO = z.infer<typeof UUIDParamsSchema>

/**
 * Validator for uploading application document
 */
const UploadDocumentParamsSchema = z.object({
  id: z.string().uuid({ message: 'Application ID must be a valid UUID' })
})

const UploadDocumentBodySchema = z.object({
  document_type: z
    .string()
    .min(1, { message: 'Document type is required' })
    .max(50, { message: 'Document type must not exceed 50 characters' })
})

export const UploadDocumentSchema = {
  params: UploadDocumentParamsSchema,
  body: UploadDocumentBodySchema
}

export type UploadDocumentDTO = {
  params: z.infer<typeof UploadDocumentParamsSchema>
  body: z.infer<typeof UploadDocumentBodySchema>
}

/**
 * Validator for submitting candidate feedback for interview stage
 */
const StageFeedbackParamsSchema = z.object({
  id: z.string().uuid({ message: 'Application ID must be a valid UUID' }),
  stageId: z.string().uuid({ message: 'Stage ID must be a valid UUID' })
})

const StageFeedbackBodySchema = z.object({
  candidate_feedback: z.string().min(1, { message: 'Candidate feedback is required' })
})

export const StageFeedbackSchema = {
  params: StageFeedbackParamsSchema,
  body: StageFeedbackBodySchema
}

export type StageFeedbackDTO = {
  params: z.infer<typeof StageFeedbackParamsSchema>
  body: z.infer<typeof StageFeedbackBodySchema>
}