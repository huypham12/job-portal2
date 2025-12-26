import { z } from 'zod'
import { job_type } from '@prisma/client'
import { zodValidate } from '../../shared/validators/validate-request'

// Import enum from Prisma
const jobTypeEnum = z.nativeEnum(job_type)

export const JobSearchRequestSchema = z.object({
  q: z.string().optional(),
  location: z.string().optional(),
  jobType: jobTypeEnum.optional(),
  experienceLevel: z.coerce.number().int().optional(),
  skills: z.array(z.string()).optional(),
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
  highlight: z.coerce.boolean().default(false)
})

export const SuggestionRequestSchema = z.object({
  q: z.string().min(1),
  type: z.enum(['jobs', 'profiles']).optional(),
  size: z.coerce.number().int().min(1).max(20).default(10),
  context: z.record(z.string(), z.any()).optional()
})

export const SuggestionSchema = z.object({
  text: z.string(),
  payload: z.any().optional(),
  score: z.number().optional()
})

export const SuggestionResponseSchema = z.object({
  suggestions: z.array(SuggestionSchema)
})

// Create validators after schema definitions
export const searchJobsValidator = zodValidate({ query: JobSearchRequestSchema })
export const suggestionsValidator = zodValidate({ query: SuggestionRequestSchema })

// Export types
export type JobSearchRequestDto = z.infer<typeof JobSearchRequestSchema>
export type SuggestionRequestDto = z.infer<typeof SuggestionRequestSchema>
export type SuggestionResponseDto = z.infer<typeof SuggestionResponseSchema>

export const JobHitSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  company: z.any().optional(),
  score: z.number().optional(),
  highlight: z.any().optional(),
  _source: z.any().optional()
})

export const JobSearchResponseSchema = z.object({
  total: z.number().int(),
  took_ms: z.number().int(),
  hits: z.array(JobHitSchema)
})

export type JobSearchResponseDto = z.infer<typeof JobSearchResponseSchema>
