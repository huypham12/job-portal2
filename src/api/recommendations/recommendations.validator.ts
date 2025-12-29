import { z } from 'zod'
import { zodValidate } from '../../shared/validators/validate-request'

// Candidate recommendations query schema
const getCandidateRecommendationsQuerySchema = z.object({
  limit: z
    .union([z.number().int().min(1).max(50), z.string()])
    .default(20)
    .transform((val) => {
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10)
        if (isNaN(parsed) || parsed < 1 || parsed > 50) {
          throw new Error('limit must be an integer between 1 and 50')
        }
        return parsed
      }
      return val
    }),
  experiment_id: z.string().optional()
})

// Recruiter recommendations query schema
const getRecruiterRecommendationsQuerySchema = z.object({
  company_id: z.string().optional(),
  limit: z
    .union([z.number().int().min(1).max(20), z.string()])
    .default(10)
    .transform((val) => {
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10)
        if (isNaN(parsed) || parsed < 1 || parsed > 20) {
          throw new Error('limit must be an integer between 1 and 20')
        }
        return parsed
      }
      return val
    }),
  experiment_id: z.string().optional()
})

// Create validators
export const getCandidateRecommendationsValidator = zodValidate({
  query: getCandidateRecommendationsQuerySchema
})

export const getRecruiterRecommendationsValidator = zodValidate({
  query: getRecruiterRecommendationsQuerySchema
})
