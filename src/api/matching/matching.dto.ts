import { z } from 'zod'

// Request schema for matching endpoints
export const MatchingRequestSchema = z.object({
  // Query params are strings — coerce to number so `req.query` works without errors
  size: z.coerce.number().int().min(1).max(500).optional().default(50)
})

export type MatchingRequestDto = z.infer<typeof MatchingRequestSchema>

// Base schema for matched items (used for both candidates and jobs)
export const MatchedItemSchema = z.object({
  id: z.string(),
  score_percent: z.number().min(0).max(100), // Allow decimal values for precision
  explanation: z.record(z.string(), z.number()), // Score breakdown as key-value pairs
  _source: z.any().optional() // Raw source data from Elasticsearch
})

export type MatchedItemDto = z.infer<typeof MatchedItemSchema>

// Response schema for candidate matching (job -> candidates)
export const MatchingCandidatesResponseSchema = z.object({
  jobId: z.string(),
  total: z.number().int().min(0),
  candidates: z.array(MatchedItemSchema)
})

// Response schema for job matching (profile -> jobs)
export const MatchingJobsResponseSchema = z.object({
  profileId: z.string(),
  total: z.number().int().min(0),
  jobs: z.array(MatchedItemSchema)
})

// Type exports
export type MatchingCandidatesResponseDto = z.infer<typeof MatchingCandidatesResponseSchema>
export type MatchingJobsResponseDto = z.infer<typeof MatchingJobsResponseSchema>
