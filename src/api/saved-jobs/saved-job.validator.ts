import { RequestHandler } from 'express'
import { z } from 'zod'
import { job_type } from '@prisma/client'
import { validateDto } from '@/middleware/validateDto.middleware'

// ==================== SAVE JOB SCHEMA ====================
const saveJobBody = z.object({
  job_id: z.string().uuid('Invalid job ID')
})

export type SaveJobDTO = z.infer<typeof saveJobBody>

export const saveJobValidator = validateDto({
  body: saveJobBody
})

// ==================== JOB ID PARAM ====================
const jobIdParams = z.object({
  jobId: z.string().uuid('Invalid job ID')
})

export const jobIdValidator = validateDto({
  params: jobIdParams
})

// ==================== GET SAVED JOBS SCHEMA ====================
// Helper function to convert string to number or return default
const stringToNumber = (val: unknown, defaultValue: number): number => {
  if (val === undefined || val === null || val === '') return defaultValue
  const num = Number(val)
  return isNaN(num) ? defaultValue : num
}

// Helper function to handle optional string values
const optionalString = (val: unknown): string | undefined => {
  if (val === undefined || val === null || val === '') return undefined
  return String(val)
}

const getSavedJobsQuery = z.object({
  page: z.preprocess((val) => stringToNumber(val, 1), z.number().int().min(1, 'Page must be greater than 0')),
  limit: z.preprocess(
    (val) => stringToNumber(val, 10),
    z.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit must be at most 100')
  ),
  search: z.preprocess(optionalString, z.string().optional()),
  job_type: z.preprocess(optionalString, z.nativeEnum(job_type).optional()),
  location_id: z.preprocess(optionalString, z.string().uuid('Invalid location ID').optional()),
  sort_by: z.preprocess((val) => optionalString(val) || 'saved_at', z.enum(['saved_at', 'salary', 'created_at'])),
  order: z.preprocess((val) => optionalString(val) || 'desc', z.enum(['asc', 'desc']))
})

export type GetSavedJobsDTO = z.infer<typeof getSavedJobsQuery>

export const getSavedJobsValidator = validateDto({
  query: getSavedJobsQuery
})
