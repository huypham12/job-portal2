import { z } from 'zod'
import { job_type } from '@prisma/client'
import { zodValidate } from '../../shared/validators/validate-request'

// Import enum from Prisma
const jobTypeEnum = z.nativeEnum(job_type)

export const JobSearchRequestSchema = z.object({
  q: z.string().optional(),
  location: z.string().trim().min(1).optional(),
  locationId: z.string().uuid().optional(),
  jobType: jobTypeEnum.optional(),
  experienceLevel: z
    .union([z.number().int().min(0).max(50), z.string()])
    .optional()
    .transform((val) => {
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10)
        if (isNaN(parsed) || parsed < 0 || parsed > 50) {
          throw new Error('experienceLevel must be an integer between 0 and 50')
        }
        return parsed
      }
      return val
    }),
  skills: z
    .union([
      z.array(z.string().trim().min(1)),
      z.string()
    ])
    .optional()
    .transform((val) => {
      if (typeof val === 'string') {
        // Handle comma-separated string
        const parsed = val.split(',').map(s => s.trim()).filter(s => s.length > 0)
        if (parsed.length === 0) {
          throw new Error('Skills array must not be empty when provided')
        }
        return parsed
      }
      return val
    })
    .refine((arr) => !arr || arr.length > 0, {
      message: 'Skills array must not be empty when provided'
    }),
  // Salary range filters
  salaryMin: z
    .union([z.number().int().min(0), z.string()])
    .optional()
    .transform((val) => {
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10)
        if (isNaN(parsed) || parsed < 0) {
          throw new Error('salaryMin must be a non-negative integer')
        }
        return parsed
      }
      return val
    }),
  salaryMax: z
    .union([z.number().int().min(0), z.string()])
    .optional()
    .transform((val) => {
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10)
        if (isNaN(parsed) || parsed < 0) {
          throw new Error('salaryMax must be a non-negative integer')
        }
        return parsed
      }
      return val
    }),
  // Job categories and benefits
  jobCategories: z
    .union([
      z.array(z.string().trim().min(1)),
      z.string()
    ])
    .optional()
    .transform((val) => {
      if (typeof val === 'string') {
        // Handle comma-separated string
        const parsed = val.split(',').map(s => s.trim()).filter(s => s.length > 0)
        if (parsed.length === 0) {
          throw new Error('Job categories array must not be empty when provided')
        }
        return parsed
      }
      return val
    })
    .refine((arr) => !arr || arr.length > 0, {
      message: 'Job categories array must not be empty when provided'
    }),
  jobBenefits: z
    .union([
      z.array(z.string().trim().min(1)),
      z.string()
    ])
    .optional()
    .transform((val) => {
      if (typeof val === 'string') {
        // Handle comma-separated string
        const parsed = val.split(',').map(s => s.trim()).filter(s => s.length > 0)
        if (parsed.length === 0) {
          throw new Error('Job benefits array must not be empty when provided')
        }
        return parsed
      }
      return val
    })
    .refine((arr) => !arr || arr.length > 0, {
      message: 'Job benefits array must not be empty when provided'
    }),
  // Work arrangement filters
  remotePercentageMin: z
    .union([z.number().int().min(0).max(100), z.string()])
    .optional()
    .transform((val) => {
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10)
        if (isNaN(parsed) || parsed < 0 || parsed > 100) {
          throw new Error('remotePercentageMin must be an integer between 0 and 100')
        }
        return parsed
      }
      return val
    }),
  flexibleHours: z
    .union([z.boolean(), z.string(), z.number()])
    .optional()
    .transform((val) => {
      if (typeof val === 'string') {
        const v = val.trim().toLowerCase()
        if (v === 'true' || v === '1') return true
        if (v === 'false' || v === '0') return false
        throw new Error('flexibleHours must be boolean-like ("true"/"false" or "1"/"0")')
      }
      if (typeof val === 'number') return val === 1
      return val
    }),
  // Sort options
  sort: z.enum(['relevance', 'newest', 'oldest', 'salary_high', 'salary_low', 'experience_high', 'experience_low']).default('relevance'),
  page: z
    .union([z.number().int().min(1), z.string()])
    .default(1)
    .transform((val) => {
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10)
        if (isNaN(parsed) || parsed < 1) {
          throw new Error('page must be a positive integer')
        }
        return parsed
      }
      return val
    }),
  size: z
    .union([z.number().int().min(1).max(100), z.string()])
    .default(20)
    .transform((val) => {
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10)
        if (isNaN(parsed) || parsed < 1 || parsed > 100) {
          throw new Error('size must be an integer between 1 and 100')
        }
        return parsed
      }
      return val
    }),
  highlight: z
    .union([z.boolean(), z.string(), z.number()])
    .default(false)
    .transform((val) => {
      if (typeof val === 'string') {
        const v = val.trim().toLowerCase()
        if (v === 'true' || v === '1') return true
        if (v === 'false' || v === '0') return false
        throw new Error('highlight must be boolean-like ("true"/"false" or "1"/"0")')
      }
      if (typeof val === 'number') return val === 1
      return val
    }),
  // User context fields for personalized search (used by search.service.ts)
  userExperienceLevel: z
    .union([z.number().int().min(0).max(50), z.string()])
    .optional()
    .transform((val) => {
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10)
        if (isNaN(parsed) || parsed < 0 || parsed > 50) {
          throw new Error('userExperienceLevel must be an integer between 0 and 50')
        }
        return parsed
      }
      return val
    }),
  userLocationId: z.string().uuid().optional(),
  userPrefersRemote: z
    .union([z.boolean(), z.string(), z.number()])
    .optional()
    .transform((val) => {
      if (typeof val === 'string') {
        const v = val.trim().toLowerCase()
        if (v === 'true' || v === '1') return true
        if (v === 'false' || v === '0') return false
        throw new Error('userPrefersRemote must be boolean-like ("true"/"false" or "1"/"0")')
      }
      if (typeof val === 'number') return val === 1
      return val
    }),
  userSkills: z
    .union([
      z.array(z.string().trim().min(1)),
      z.string()
    ])
    .optional()
    .transform((val) => {
      if (typeof val === 'string') {
        // Handle comma-separated string
        const parsed = val.split(',').map(s => s.trim()).filter(s => s.length > 0)
        return parsed.length > 0 ? parsed : undefined
      }
      return val
    }),
  userDesiredSalaryMin: z
    .union([z.number().int().min(0), z.string()])
    .optional()
    .transform((val) => {
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10)
        if (isNaN(parsed) || parsed < 0) {
          throw new Error('userDesiredSalaryMin must be a non-negative integer')
        }
        return parsed
      }
      return val
    }),
  userDesiredSalaryMax: z
    .union([z.number().int().min(0), z.string()])
    .optional()
    .transform((val) => {
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10)
        if (isNaN(parsed) || parsed < 0) {
          throw new Error('userDesiredSalaryMax must be a non-negative integer')
        }
        return parsed
      }
      return val
    }),
  userPreferredCategories: z
    .union([
      z.array(z.string().trim().min(1)),
      z.string()
    ])
    .optional()
    .transform((val) => {
      if (typeof val === 'string') {
        // Handle comma-separated string
        const parsed = val.split(',').map(s => s.trim()).filter(s => s.length > 0)
        return parsed.length > 0 ? parsed : undefined
      }
      return val
    }),
  userDesiredBenefits: z
    .union([
      z.array(z.string().trim().min(1)),
      z.string()
    ])
    .optional()
    .transform((val) => {
      if (typeof val === 'string') {
        // Handle comma-separated string
        const parsed = val.split(',').map(s => s.trim()).filter(s => s.length > 0)
        return parsed.length > 0 ? parsed : undefined
      }
      return val
    }),
  userRemotePercentageMin: z
    .union([z.number().int().min(0).max(100), z.string()])
    .optional()
    .transform((val) => {
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10)
        if (isNaN(parsed) || parsed < 0 || parsed > 100) {
          throw new Error('userRemotePercentageMin must be an integer between 0 and 100')
        }
        return parsed
      }
      return val
    }),
  userPrefersFlexibleHours: z
    .union([z.boolean(), z.string(), z.number()])
    .optional()
    .transform((val) => {
      if (typeof val === 'string') {
        const v = val.trim().toLowerCase()
        if (v === 'true' || v === '1') return true
        if (v === 'false' || v === '0') return false
        throw new Error('userPrefersFlexibleHours must be boolean-like ("true"/"false" or "1"/"0")')
      }
      if (typeof val === 'number') return val === 1
      return val
    }),
  recruiterId: z.string().uuid().optional() // Optional for tenant isolation
})

export const SuggestionRequestSchema = z.object({
  q: z.string().min(1),
  type: z.enum(['jobs', 'profiles']).optional(),
  size: z
    .union([z.number().int().min(1).max(20), z.string()])
    .default(10)
    .transform((val) => {
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10)
        if (isNaN(parsed) || parsed < 1 || parsed > 20) {
          throw new Error('size must be an integer between 1 and 20')
        }
        return parsed
      }
      return val
    }),
  context: z
    .union([
      z.record(z.string(), z.any()),
      z.string()
    ])
    .optional()
    .transform((val) => {
      if (typeof val === 'string') {
        try {
          // Try to parse JSON string
          return JSON.parse(val)
        } catch {
          // If not valid JSON, treat as simple string context
          return { query: val }
        }
      }
      return val
    })
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

// Company Search DTOs
export const CompanySearchRequestSchema = z.object({
  q: z.string().optional(),
  industry: z.string().optional(),
  location: z.string().optional(),
  size_min: z.number().int().min(1).optional(),
  size_max: z.number().int().min(1).optional(),
  company_type: z.string().optional(),
  sort: z.enum(['relevance', 'name', 'size']).default('relevance'),
  page: z
    .union([z.number().int().min(1), z.string()])
    .default(1)
    .transform((val) => {
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10)
        if (isNaN(parsed) || parsed < 1) {
          throw new Error('page must be a positive integer')
        }
        return parsed
      }
      return val
    }),
  size: z
    .union([z.number().int().min(1).max(100), z.string()])
    .default(20)
    .transform((val) => {
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10)
        if (isNaN(parsed) || parsed < 1 || parsed > 100) {
          throw new Error('size must be an integer between 1 and 100')
        }
        return parsed
      }
      return val
    }),
  recruiterId: z.string().optional() // Optional for tenant isolation
})

export const CompanySuggestionsRequestSchema = z.object({
  q: z.string().min(1, 'Query is required'),
  size: z.number().int().min(1).max(20).default(10),
  context: z.record(z.string(), z.any()).optional()
})

export const PopularCompaniesRequestSchema = z.object({
  limit: z.number().int().min(1).max(50).default(10),
  sort_by: z.enum(['size', 'name', 'founded_year']).default('size'),
  industry: z.string().optional()
})

export const CompanySearchResponseSchema = z.object({
  total: z.number().int(),
  took_ms: z.number().int(),
  companies: z.array(z.any())
})

export const CompanySuggestionsResponseSchema = z.object({
  suggestions: z.array(z.object({
    text: z.string(),
    payload: z.any().optional(),
    score: z.number().optional()
  }))
})

export const PopularCompaniesResponseSchema = z.object({
  companies: z.array(z.any()),
  sort_by: z.string(),
  period: z.string()
})

// Validators
export const searchCompaniesValidator = zodValidate({ query: CompanySearchRequestSchema })
export const companiesSuggestionsValidator = zodValidate({ query: CompanySuggestionsRequestSchema })
export const getPopularCompaniesValidator = zodValidate({ query: PopularCompaniesRequestSchema })

// Export types
export type CompanySearchRequestDto = z.infer<typeof CompanySearchRequestSchema>
export type CompanySuggestionsRequestDto = z.infer<typeof CompanySuggestionsRequestSchema>
export type PopularCompaniesRequestDto = z.infer<typeof PopularCompaniesRequestSchema>
export type CompanySearchResponseDto = z.infer<typeof CompanySearchResponseSchema>
export type CompanySuggestionsResponseDto = z.infer<typeof CompanySuggestionsResponseSchema>
export type PopularCompaniesResponseDto = z.infer<typeof PopularCompaniesResponseSchema>
