import { z } from 'zod'

export const MatchingRequestSchema = z.object({
  size: z.number().int().min(1).max(500).optional().default(50),
  filters: z.record(z.any()).optional(),
})

export type MatchingRequestDto = z.infer<typeof MatchingRequestSchema>

export const MatchingCandidateSchema = z.object({
  id: z.string(),
  score_percent: z.number().int(),
  explanation: z.record(z.number()),
  _source: z.any().optional(),
})

export const MatchingCandidatesResponseSchema = z.object({
  jobId: z.string().optional(),
  total: z.number().int(),
  candidates: z.array(MatchingCandidateSchema),
})

export const MatchingJobsResponseSchema = z.object({
  profileId: z.string().optional(),
  total: z.number().int(),
  jobs: z.array(MatchingCandidateSchema),
})

export type MatchingCandidatesResponseDto = z.infer<typeof MatchingCandidatesResponseSchema>
export type MatchingJobsResponseDto = z.infer<typeof MatchingJobsResponseSchema>


