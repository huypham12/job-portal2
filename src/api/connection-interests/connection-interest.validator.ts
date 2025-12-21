import { z } from 'zod'

/**
 * Validator for creating connection interest
 */
const CreateInterestBodySchema = z.object({
  candidate_id: z.string().uuid({ message: 'Candidate ID must be a valid UUID' }),
  job_id: z.string().uuid({ message: 'Job ID must be a valid UUID' }).optional(),
  suggested_job_ids: z
    .array(z.string().uuid({ message: 'Each job ID must be a valid UUID' }))
    .max(10, { message: 'Maximum 10 suggested jobs allowed' })
    .optional(),
  interest_type: z.enum(['job_invitation', 'profile_view', 'network_connection']),
  message: z.string().optional(),
  contact_info: z
    .object({
      email: z.string().email().optional(),
      phone: z.string().optional()
    })
    .optional()
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
      // Handle empty string or invalid values as undefined to use default
      if (val === undefined || val === null || val === '') return undefined
      const num = Number(val)
      return isNaN(num) ? undefined : num
    },
    z.number().int().min(1, { message: 'Page must be greater than 0' }).default(1)
  ),
  limit: z.preprocess(
    (val) => {
      // Handle empty string or invalid values as undefined to use default
      if (val === undefined || val === null || val === '') return undefined
      const num = Number(val)
      return isNaN(num) ? undefined : num
    },
    z.number().int().min(1, { message: 'Limit must be at least 1' }).max(100, { message: 'Limit must be at most 100' }).default(20)
  ),
  // Status filter removed - invitations don't have accept/reject status
  interest_type: z.enum(['job_invitation', 'profile_view', 'network_connection']).optional(),
  role: z.enum(['sent', 'received']).optional()
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

