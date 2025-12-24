import { z } from 'zod'

export const JobSearchRequestSchema = z.object({
  q: z.string().optional(),
  location: z.string().optional(),
  jobType: z.string().optional(),
  experienceLevel: z.number().int().optional(),
  skills: z.array(z.string()).optional(),
  page: z.number().int().min(1).optional().default(1),
  size: z.number().int().min(1).max(100).optional().default(20),
  highlight: z.boolean().optional().default(false),
})

export type JobSearchRequestDto = z.infer<typeof JobSearchRequestSchema>

export const JobHitSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  company: z.any().optional(),
  score: z.number().optional(),
  highlight: z.any().optional(),
  _source: z.any().optional(),
})

export const JobSearchResponseSchema = z.object({
  total: z.number().int(),
  took_ms: z.number().int(),
  hits: z.array(JobHitSchema),
})

export type JobSearchResponseDto = z.infer<typeof JobSearchResponseSchema>

export const SuggestionRequestSchema = z.object({
  q: z.string().min(1),
  type: z.enum(['jobs', 'profiles']).optional(),
  size: z.number().int().min(1).max(20).optional().default(10),
  context: z.record(z.any()).optional(),
})

export type SuggestionRequestDto = z.infer<typeof SuggestionRequestSchema>

export const SuggestionSchema = z.object({
  text: z.string(),
  payload: z.any().optional(),
  score: z.number().optional(),
})

export const SuggestionResponseSchema = z.object({
  suggestions: z.array(SuggestionSchema),
})

export type SuggestionResponseDto = z.infer<typeof SuggestionResponseSchema>


