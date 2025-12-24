import { z } from 'zod'

export const MatchCandidatesRequestSchema = z.object({
  filters: z.record(z.string(), z.any()).optional(),
  size: z.number().int().min(1).max(200).default(10)
})

export type MatchCandidatesRequestDto = z.infer<typeof MatchCandidatesRequestSchema>

export const ScoreBreakdownSchema = z.object({
  text: z.number(),
  skills: z.number(),
  location: z.number(),
  experience: z.number(),
  recency: z.number(),
  activity: z.number()
})

export const CandidateHitSchema = z.object({
  id: z.string(),
  score_percent: z.number().int(),
  explanation: ScoreBreakdownSchema,
  _source: z.any().optional()
})

export const MatchCandidatesResponseSchema = z.object({
  job_id: z.string(),
  total: z.number().int(),
  candidates: z.array(CandidateHitSchema)
})

export type MatchCandidatesResponseDto = z.infer<typeof MatchCandidatesResponseSchema>

/**
 * Phase 5 — Job-for-Candidate DTOs
 *
 * Request: filters + size (same shape as MatchCandidatesRequestSchema)
 * Response: profile_id, total, jobs: [{ id, score_percent, explanation, _source }]
 */
export const MatchJobsRequestSchema = z.object({
  filters: z.record(z.string(), z.any()).optional(),
  size: z.number().int().min(1).max(200).default(10)
})

export type MatchJobsRequestDto = z.infer<typeof MatchJobsRequestSchema>

export const JobHitSchema = z.object({
  id: z.string(),
  score_percent: z.number().int(),
  explanation: ScoreBreakdownSchema,
  _source: z.any().optional()
})

export const MatchJobsResponseSchema = z.object({
  profile_id: z.string(),
  total: z.number().int(),
  jobs: z.array(JobHitSchema)
})

export type MatchJobsResponseDto = z.infer<typeof MatchJobsResponseSchema>
