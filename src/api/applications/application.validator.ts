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
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => val > 0, { message: 'Page must be greater than 0' }),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .refine((val) => val > 0 && val <= 100, { message: 'Limit must be between 1 and 100' }),
  status: z.nativeEnum(application_status).optional(),
  sort_by: z.enum(['applied_at', 'status']).optional().default('applied_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc')
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
