import { z } from 'zod'

// Availability status enum for filtering
const availabilityStatusEnum = z.enum(['OPEN', 'PASSIVE', 'NOT_LOOKING'])

/**
 * Validator for creating connection interest
 */
const CreateInterestBodySchema = z.object({
  candidate_id: z.string().uuid({ message: 'Candidate ID must be a valid UUID' }),
  job_id: z.string().uuid({ message: 'Job ID must be a valid UUID' }).optional(),
  suggested_job_ids: z
    .array(z.string().uuid({ message: 'Each job ID must be a valid UUID' }))
    .max(10, { message: 'Maximum 10 suggested jobs allowed' })
    .optional()
    .transform((val) => val || null),
  interest_type: z.enum(['job_invitation', 'profile_view', 'network_connection']),
  message: z.string().optional(),
  contact_info: z
    .object({
      email: z.string().email().optional(),
      phone: z.string().optional()
    })
    .optional()
    .transform((val) => val || null)
})

export const CreateInterestSchema = {
  body: CreateInterestBodySchema
}

export type CreateInterestDTO = z.infer<typeof CreateInterestBodySchema>

/**
 * Validator for getting connection interests list
 */
const GetInterestsQuerySchema = z.object({
  page: z.preprocess(
    (val) => {
      // Handle empty string or invalid values, return default if invalid
      if (val === undefined || val === null || val === '') return 1
      const num = Number(val)
      return isNaN(num) ? 1 : num
    },
    z.number().int().min(1, { message: 'Page must be greater than 0' })
  ),
  limit: z.preprocess(
    (val) => {
      // Handle empty string or invalid values, return default if invalid
      if (val === undefined || val === null || val === '') return 20
      const num = Number(val)
      return isNaN(num) ? 20 : num
    },
    z.number().int().min(1, { message: 'Limit must be at least 1' }).max(100, { message: 'Limit must be at most 100' })
  ),
  // Status filter removed - invitations don't have accept/reject status
  interest_type: z.enum(['job_invitation', 'profile_view', 'network_connection']).optional(),
  role: z.enum(['sent', 'received']).optional(),
})

export const GetInterestsSchema = {
  query: GetInterestsQuerySchema
}

export type GetInterestsDTO = z.infer<typeof GetInterestsQuerySchema>

/**
 * Validator for UUID param
 */
const InterestIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Interest ID must be a valid UUID' })
})

export const InterestIdSchema = {
  params: InterestIdParamSchema
}

export type InterestIdDTO = z.infer<typeof InterestIdParamSchema>
