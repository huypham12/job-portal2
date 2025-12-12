import { z } from 'zod'

/**
 * Validator for creating connection interest
 */
const CreateInterestBodySchema = z.object({
  candidate_id: z.string().uuid({ message: 'Candidate ID must be a valid UUID' }),
  job_id: z.string().uuid({ message: 'Job ID must be a valid UUID' }).optional(),
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
  status: z.enum(['pending', 'accepted', 'rejected', 'expired']).optional(),
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

/**
 * Validator for responding to interest
 */
const RespondInterestParamsSchema = z.object({
  id: z.string().uuid({ message: 'Interest ID must be a valid UUID' })
})

const RespondInterestBodySchema = z.object({
  action: z.enum(['accept', 'reject']),
  message: z.string().optional()
})

export const RespondInterestSchema = {
  params: RespondInterestParamsSchema,
  body: RespondInterestBodySchema
}

export type RespondInterestDTO = {
  params: z.infer<typeof RespondInterestParamsSchema>
  body: z.infer<typeof RespondInterestBodySchema>
}
