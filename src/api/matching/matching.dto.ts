import { z } from 'zod'

// Request schema for matching endpoints
export const MatchingRequestSchema = z.object({
  // Query params are strings — coerce to number so `req.query` works without errors
  size: z.coerce.number().int().min(1).max(500).optional().default(50),
  minScore: z.coerce.number().min(0).max(100).optional().default(0)
})

export type MatchingRequestDto = z.infer<typeof MatchingRequestSchema>

// Schema for matching dimensions
export const MatchingDimensionsSchema = z.object({
  experience: z.number().min(0).max(1),
  location: z.number().min(0).max(1),
  skills: z.number().min(0).max(1),
  preferences: z.number().min(0).max(1),
  activity: z.number().min(0).max(1),
  completeness: z.number().min(0).max(1)
})

// Schema for match quality assessment
export const MatchQualitySchema = z.object({
  overall: z.enum(['excellent', 'good', 'fair', 'poor']),
  strengths: z.array(z.string()),
  concerns: z.array(z.string()),
  recommendations: z.array(z.string())
})

// Schema for detailed explanation
export const ExplanationSchema = z.object({
  confidence: z.enum(['high', 'medium', 'low']),
  reasons: z.array(z.string()),
  quality: MatchQualitySchema,
  dimensions: MatchingDimensionsSchema,
  data_completeness: z.number().min(0).max(1),
  text_match: z.number().min(0).max(100),
  overall_score: z.number().min(0).max(100)
})

// Base schema for matched items (used for both candidates and jobs)
export const MatchedItemSchema = z.object({
  id: z.string(),
  score_percent: z.number().min(0).max(100), // Allow decimal values for precision
  explanation: ExplanationSchema, // Detailed explanation object
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
